import { CouponStatus, CouponType } from "@prisma/client";
import { z } from "zod";
import { requireAdminApiWithActor } from "@/lib/server/require-admin-api";
import { noStoreJson } from "@/lib/server/no-store-json";
import { prisma } from "@/lib/prisma";
import { normalizeCouponCode } from "@/lib/coupons";
import { generateWelcomeCouponCode } from "@/lib/coupon-eligibility";
import { ensureStoreSchemaExtras } from "@/lib/server/ensure-schema";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const batchSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("WELCOME"),
    quantity: z.number().int().min(1).max(500),
    value: z.number().int().min(1).max(100).optional(),
  }),
  z.object({
    kind: z.literal("CLASSIC"),
    code: z.string().min(3).max(40),
    name: z.string().min(2).max(120).optional(),
    type: z.enum(["PERCENT", "FIXED", "FREE_SHIPPING"]).default("PERCENT"),
    value: z.number().int().min(0).max(10_000_000),
    endsAt: z.string().datetime(),
    perUserLimit: z.number().int().min(1).max(100).nullable().optional(),
  }),
]);

export async function POST(req: Request) {
  const { denied, actor } = await requireAdminApiWithActor();
  if (denied) return denied;

  await ensureStoreSchemaExtras();

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return noStoreJson({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = batchSchema.safeParse(json);
  if (!parsed.success) {
    return noStoreJson({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  if (data.kind === "WELCOME") {
    const value = data.value ?? 10;
    const created: string[] = [];
    for (let i = 0; i < data.quantity; i++) {
      let code = "";
      for (let attempt = 0; attempt < 20; attempt++) {
        const candidate = normalizeCouponCode(generateWelcomeCouponCode());
        const exists = await prisma.coupon.findUnique({ where: { code: candidate } });
        if (!exists) {
          code = candidate;
          break;
        }
      }
      if (!code) continue;
      await prisma.coupon.create({
        data: {
          code,
          name: "Cupón inicial",
          description: "Cupón de bienvenida Four Sensations (10% en tu primera compra).",
          type: CouponType.PERCENT,
          value,
          perUserLimit: 1,
          status: CouponStatus.ACTIVE,
          theme: "rose",
          kind: "WELCOME",
          assignedEmail: null,
          createdBy: actor,
        },
      });
      created.push(code);
    }
    return noStoreJson({ ok: true, kind: "WELCOME", created: created.length, codes: created });
  }

  const code = normalizeCouponCode(data.code);
  const existing = await prisma.coupon.findUnique({ where: { code } });
  if (existing) {
    return noStoreJson({ error: `Ya existe el cupón ${code}` }, { status: 409 });
  }

  const coupon = await prisma.coupon.create({
    data: {
      code,
      name: (data.name || code).trim(),
      description: "Cupón clásico compartido Four Sensations.",
      type: data.type as CouponType,
      value: data.type === "FREE_SHIPPING" ? 0 : data.value,
      endsAt: new Date(data.endsAt),
      perUserLimit: data.perUserLimit ?? null,
      usageLimit: null,
      status: CouponStatus.ACTIVE,
      theme: "rose",
      kind: "CLASSIC",
      createdBy: actor,
    },
  });

  return noStoreJson({ ok: true, kind: "CLASSIC", created: 1, id: coupon.id, code: coupon.code });
}
