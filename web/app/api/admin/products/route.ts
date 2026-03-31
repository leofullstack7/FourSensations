import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { prismaProductToAdmin } from "@/lib/mappers/admin-product";
import { allocateUniqueProductSlug } from "@/lib/server/product-slug";
import { slugify } from "@/lib/slugify";
import { isTrustedCdnImageUrl } from "@/lib/server/bunny-config";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import {
  adminProductCreateSchema,
  formatZodError,
} from "@/lib/validation/admin-product";

/** Siempre datos frescos de la DB (evita caché de Route Handler / CDN con lista vacía del build). */
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

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  try {
    const rows = await prisma.product.findMany({
      orderBy: { updatedAt: "desc" },
      include: { images: true },
    });
    return noStoreJson({
      products: rows.map(prismaProductToAdmin),
    });
  } catch (e) {
    console.error("[GET /api/admin/products]", e);
    const devHint =
      process.env.NODE_ENV === "development" && e instanceof Error ? e.message : undefined;
    return noStoreJson(
      {
        error: "Error al listar productos",
        ...(devHint && {
          hint:
            devHint.includes("externalRef") || devHint.includes("BulkImportJob")
              ? "La base de datos no coincide con prisma/schema.prisma. Ejecuta en la carpeta web: npm run db:push"
              : devHint,
        }),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  try {
    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const parsed = adminProductCreateSchema.safeParse(json);
    if (!parsed.success) {
      const { message, issues } = formatZodError(parsed.error);
      return NextResponse.json({ error: message, details: issues }, { status: 400 });
    }

    const data = parsed.data;
    const brand = data.brand?.trim() || "GinnaBeauty";
    const tags = (data.tags ?? []).map((t) => t.trim()).filter(Boolean);

    const mainUrl = data.imageUrl ?? null;
    if (mainUrl && !isTrustedCdnImageUrl(mainUrl)) {
      return NextResponse.json(
        { error: "imageUrl debe ser una URL de tu CDN (BUNNY_CDN_BASE_URL)" },
        { status: 400 }
      );
    }

    const extras = (data.extraImageUrls ?? []).filter((u) => isTrustedCdnImageUrl(u));
    if (extras.length < (data.extraImageUrls?.length ?? 0)) {
      return NextResponse.json(
        { error: "Todas las extraImageUrls deben pertenecer a tu CDN configurado" },
        { status: 400 }
      );
    }

    let slug: string;
    if (data.slug) {
      slug = slugify(data.slug);
      const clash = await prisma.product.findUnique({ where: { slug } });
      if (clash) {
        return NextResponse.json({ error: "Slug ya existe" }, { status: 409 });
      }
    } else {
      slug = await allocateUniqueProductSlug(data.name);
    }

    const externalRef = data.externalRef?.trim() || null;
    if (externalRef) {
      const clashRef = await prisma.product.findUnique({ where: { externalRef } });
      if (clashRef) {
        return NextResponse.json({ error: "externalRef ya existe" }, { status: 409 });
      }
    }

    const row = await prisma.product.create({
      data: {
        slug,
        name: data.name,
        brand,
        category: data.category,
        subcategory: data.subcategory,
        tags,
        description: data.description,
        price: data.price,
        originalPrice: data.originalPrice ?? null,
        stock: data.stock,
        rating: data.rating,
        reviews: data.reviews,
        badge: data.badge ?? null,
        emoji: data.emoji ?? null,
        imageUrl: mainUrl,
        externalRef,
        isNew: data.isNew,
        featuredInHome: data.featuredInHome,
        active: data.active,
        ...(extras.length > 0 && {
          images: {
            create: extras.map((url, i) => ({ url, sortOrder: i })),
          },
        }),
      },
      include: { images: true },
    });

    return noStoreJson({ product: prismaProductToAdmin(row) }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/admin/products]", e);
    return noStoreJson({ error: "Error al crear producto" }, { status: 500 });
  }
}
