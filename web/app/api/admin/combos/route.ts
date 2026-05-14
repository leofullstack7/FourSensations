import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { allocateUniqueComboSlug } from "@/lib/server/combo-slug";
import { requireAdminApi } from "@/lib/server/require-admin-api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noStoreJson = (body: unknown, init?: ResponseInit) =>
  NextResponse.json(body, {
    ...init,
    headers: {
      "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
      ...(init?.headers as Record<string, string> | undefined),
    },
  });

const createComboSchema = z.object({
  name: z.string().trim().min(2).max(120),
  comboPrice: z.number().int().min(0).max(500_000_000),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(99).optional(),
      })
    )
    .min(1)
    .max(30),
});

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    const rows = await prisma.productCombo.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                imageUrl: true,
                emoji: true,
              },
            },
          },
        },
      },
    });

    return noStoreJson({ combos: rows });
  } catch (e) {
    console.error("[GET /api/admin/combos]", e);
    return noStoreJson({ error: "Error al listar combos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return noStoreJson({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = createComboSchema.safeParse(json);
  if (!parsed.success) {
    return noStoreJson({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const { name, comboPrice, items } = parsed.data;
  const productIds = [...new Set(items.map((i) => i.productId))];
  const found = await prisma.product.findMany({
    where: { id: { in: productIds }, active: true },
    select: { id: true },
  });
  if (found.length !== productIds.length) {
    return noStoreJson({ error: "Uno o más productos no existen o están inactivos" }, { status: 400 });
  }

  try {
    const slug = await allocateUniqueComboSlug(name);
    const combo = await prisma.$transaction(async (tx) => {
      const c = await tx.productCombo.create({
        data: {
          name: name.trim(),
          slug,
          comboPrice,
        },
      });
      let order = 0;
      for (const line of items) {
        const qty = line.quantity ?? 1;
        await tx.productComboItem.create({
          data: {
            comboId: c.id,
            productId: line.productId,
            quantity: qty,
            sortOrder: order++,
          },
        });
      }
      return tx.productCombo.findUniqueOrThrow({
        where: { id: c.id },
        include: {
          items: {
            orderBy: { sortOrder: "asc" },
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  imageUrl: true,
                  emoji: true,
                },
              },
            },
          },
        },
      });
    });

    return noStoreJson({ combo });
  } catch (e) {
    console.error("[POST /api/admin/combos]", e);
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("ProductCombo") || msg.includes("product_combo")) {
      return noStoreJson(
        {
          error:
            "La base de datos no tiene las tablas de combos. Ejecuta en la carpeta web: npm run db:push",
        },
        { status: 500 }
      );
    }
    return noStoreJson({ error: "No se pudo crear el combo" }, { status: 500 });
  }
}
