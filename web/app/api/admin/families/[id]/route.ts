import { NextRequest } from "next/request";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { noStoreJson } from "@/lib/server/no-store-json";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import {
  findProductFamilyByName,
  normalizeProductFamilyName,
} from "@/lib/server/product-family";
import { revalidateStorefrontProducts } from "@/lib/server/revalidate-storefront-products";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const updateSchema = z.object({
  name: z.string().trim().min(1, "Escribe el nombre de la familia").max(120),
});

type Ctx = { params: { id: string } };

export async function PUT(req: NextRequest, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { id } = params;
  try {
    const existing = await prisma.productFamily.findUnique({ where: { id } });
    if (!existing) {
      return noStoreJson({ error: "Familia no encontrada" }, { status: 404 });
    }

    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return noStoreJson({ error: "JSON inválido" }, { status: 400 });
    }
    const parsed = updateSchema.safeParse(json);
    if (!parsed.success) {
      return noStoreJson(
        { error: parsed.error.issues[0]?.message ?? "Nombre inválido" },
        { status: 400 }
      );
    }

    const name = normalizeProductFamilyName(parsed.data.name);
    const clash = await findProductFamilyByName(name);
    if (clash && clash.id !== id) {
      return noStoreJson({ error: `Ya existe la familia «${clash.name}»` }, { status: 409 });
    }

    const oldName = existing.name;
    const family = await prisma.$transaction(async (tx) => {
      const updated = await tx.productFamily.update({
        where: { id },
        data: { name },
      });
      if (oldName.trim().toLowerCase() !== name.toLowerCase()) {
        await tx.product.updateMany({
          where: { brand: { equals: oldName, mode: "insensitive" } },
          data: { brand: name },
        });
      }
      return updated;
    });

    const productCount = await prisma.product.count({
      where: { brand: { equals: name, mode: "insensitive" } },
    });
    revalidateStorefrontProducts();
    return noStoreJson({
      family: {
        id: family.id,
        name: family.name,
        productCount,
        createdAt: family.createdAt.toISOString(),
      },
    });
  } catch (e) {
    console.error("[PUT /api/admin/families/:id]", e);
    return noStoreJson({ error: "No se pudo actualizar la familia" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { id } = params;
  try {
    const existing = await prisma.productFamily.findUnique({ where: { id } });
    if (!existing) {
      return noStoreJson({ error: "Familia no encontrada" }, { status: 404 });
    }
    await prisma.productFamily.delete({ where: { id } });
    return noStoreJson({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/admin/families/:id]", e);
    return noStoreJson({ error: "No se pudo eliminar la familia" }, { status: 500 });
  }
}
