import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { prismaProductToAdmin } from "@/lib/mappers/admin-product";
import { allocateUniqueProductSlug } from "@/lib/server/product-slug";
import { slugify } from "@/lib/slugify";
import { isTrustedCdnImageUrl } from "@/lib/server/bunny-config";
import { stripAiFlagsForManualEdit } from "@/lib/product-ai-fields";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import { revalidateStorefrontProducts } from "@/lib/server/revalidate-storefront-products";
import {
  CatalogActions,
  CatalogEntities,
  describeProductSnapshotDiff,
  loadProductSnapshot,
  snapshotProduct,
} from "@/lib/server/catalog-versioning";
import { recordCatalogVersionSafe } from "@/lib/server/record-catalog-version";
import { upsertProductFamilyByName } from "@/lib/server/product-family";
import {
  adminProductUpdateSchema,
  formatZodError,
} from "@/lib/validation/admin-product";

type RouteCtx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { id } = params;
  try {
    const row = await prisma.product.findUnique({
      where: { id },
      include: { images: true },
    });
    if (!row) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ product: prismaProductToAdmin(row) });
  } catch (e) {
    console.error("[GET /api/admin/products/[id]]", e);
    return NextResponse.json({ error: "Error al obtener producto" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteCtx) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { id } = params;
  try {
    const existing = await prisma.product.findUnique({
      where: { id },
      include: { images: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }
    const beforeSnap = snapshotProduct(existing);

    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const parsed = adminProductUpdateSchema.safeParse(json);
    if (!parsed.success) {
      const { message, issues } = formatZodError(parsed.error);
      return NextResponse.json({ error: message, details: issues }, { status: 400 });
    }

    const d = parsed.data;
    if (Object.keys(d).length === 0) {
      return NextResponse.json(
        { error: "Cuerpo vacío: no hay campos para actualizar" },
        { status: 400 }
      );
    }

    if (d.imageUrl !== undefined && d.imageUrl !== null && !isTrustedCdnImageUrl(d.imageUrl)) {
      return NextResponse.json(
        { error: "imageUrl debe ser una URL de tu CDN (BUNNY_CDN_BASE_URL)" },
        { status: 400 }
      );
    }

    let nextSlug = existing.slug;
    if (d.slug !== undefined) {
      const s = slugify(d.slug);
      const clash = await prisma.product.findFirst({
        where: { slug: s, NOT: { id } },
      });
      if (clash) {
        return NextResponse.json({ error: "Slug ya en uso" }, { status: 409 });
      }
      nextSlug = s;
    } else if (d.name !== undefined && d.name !== existing.name) {
      nextSlug = await allocateUniqueProductSlug(d.name, id);
    }

    let nextExternalRef = existing.externalRef;
    if (d.externalRef !== undefined) {
      const ref = d.externalRef?.trim() || null;
      if (ref) {
        const clash = await prisma.product.findFirst({
          where: { externalRef: ref, NOT: { id } },
        });
        if (clash) {
          return NextResponse.json({ error: "externalRef ya en uso" }, { status: 409 });
        }
      }
      nextExternalRef = ref;
    }

    const aiPatchKeys = Object.keys(d).filter((k) =>
      ["description", "tags", "emoji", "badge"].includes(k),
    );
    const nextAiFields =
      aiPatchKeys.length > 0
        ? stripAiFlagsForManualEdit(existing.aiGeneratedFields, aiPatchKeys)
        : undefined;

    if (d.brand !== undefined) {
      await upsertProductFamilyByName(d.brand);
    }

    // Solo columnas escalares; `ProductImage` (galería) no se toca aquí.
    // `imageUrl`: el esquema deja `undefined` si el cliente no envía la clave (no borrar foto);
    // `null` o `""` parseados borran la imagen a propósito.
    const row = await prisma.product.update({
      where: { id },
      data: {
        ...(d.name !== undefined && { name: d.name }),
        ...(d.brand !== undefined && { brand: d.brand }),
        ...(d.category !== undefined && { category: d.category }),
        ...(d.subcategory !== undefined && { subcategory: d.subcategory }),
        ...(d.tags !== undefined && { tags: d.tags.map((t) => t.trim()).filter(Boolean) }),
        ...(d.description !== undefined && { description: d.description }),
        ...(d.price !== undefined && { price: d.price }),
        ...(d.originalPrice !== undefined && { originalPrice: d.originalPrice }),
        ...(d.stock !== undefined && { stock: d.stock }),
        ...(d.rating !== undefined && { rating: d.rating }),
        ...(d.reviews !== undefined && { reviews: d.reviews }),
        ...(d.badge !== undefined && { badge: d.badge }),
        ...(d.emoji !== undefined && { emoji: d.emoji }),
        ...(d.imageUrl !== undefined && { imageUrl: d.imageUrl }),
        ...(d.externalRef !== undefined && { externalRef: nextExternalRef }),
        ...(d.colorHex !== undefined && { colorHex: d.colorHex ? d.colorHex.toUpperCase() : null }),
        ...(d.colorName !== undefined && { colorName: d.colorName?.trim() || null }),
        ...(d.isNew !== undefined && { isNew: d.isNew }),
        ...(d.featuredInHome !== undefined && { featuredInHome: d.featuredInHome }),
        ...(d.active !== undefined && { active: d.active }),
        ...(nextAiFields !== undefined && {
          aiGeneratedFields:
            nextAiFields === null ? Prisma.JsonNull : (nextAiFields as Prisma.InputJsonValue),
        }),
        slug: nextSlug,
      },
      include: { images: true },
    });

    if (d.colorHex !== undefined || d.colorName !== undefined) {
      revalidateStorefrontProducts();
    }

    await recordCatalogVersionSafe({
      label: `Producto actualizado: ${row.name}`,
      summary: describeProductSnapshotDiff(beforeSnap, snapshotProduct(row)),
      changes: [
        {
          entityType: CatalogEntities.PRODUCT,
          entityId: row.id,
          action: CatalogActions.UPDATE,
          label: `Producto: ${row.name}`,
          beforeData: beforeSnap,
          afterData: snapshotProduct(row),
        },
      ],
    });

    return NextResponse.json({ product: prismaProductToAdmin(row) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    console.error("[PUT /api/admin/products/[id]]", e);
    const staleClient =
      msg.includes("Unknown argument `colorHex`") || msg.includes("Unknown argument `colorName`");
    return NextResponse.json(
      {
        error: staleClient
          ? "Base de datos desactualizada en el servidor. Reinicia «npm run dev» y vuelve a intentar."
          : "Error al actualizar producto",
        ...(process.env.NODE_ENV === "development" && { detail: msg.slice(0, 400) }),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteCtx) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { id } = params;
  try {
    const before = await loadProductSnapshot(id);
    if (!before) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }
    await prisma.product.delete({ where: { id } });
    await recordCatalogVersionSafe({
      label: `Producto eliminado: ${before.name}`,
      summary: describeProductSnapshotDiff(before, null),
      changes: [
        {
          entityType: CatalogEntities.PRODUCT,
          entityId: id,
          action: CatalogActions.DELETE,
          label: `Producto: ${before.name}`,
          beforeData: before,
          afterData: null,
        },
      ],
    });
    return new NextResponse(null, { status: 204 });
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === "P2025") {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }
    console.error("[DELETE /api/admin/products/[id]]", e);
    return NextResponse.json(
      { error: "Error al eliminar producto" },
      { status: 500 }
    );
  }
}
