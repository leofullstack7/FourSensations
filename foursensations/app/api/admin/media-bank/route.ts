import { requireAdminApi } from "@/lib/server/require-admin-api";
import { noStoreJson } from "@/lib/server/no-store-json";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Banco de imágenes: StoredImage + URLs de productos / galería / site settings. */
export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const urls: { url: string; source: string; createdAt?: string }[] = [];
  const seen = new Set<string>();

  const push = (url: string | null | undefined, source: string, createdAt?: Date) => {
    const u = url?.trim();
    if (!u || seen.has(u)) return;
    seen.add(u);
    urls.push({ url: u, source, createdAt: createdAt?.toISOString() });
  };

  try {
    const stored = await prisma.storedImage.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, createdAt: true },
    });
    for (const s of stored) {
      push(`/api/media/stored/${s.id}`, "stored", s.createdAt);
    }
  } catch {
    /* tabla puede no existir aún */
  }

  const products = await prisma.product.findMany({
    where: { imageUrl: { not: null } },
    orderBy: { updatedAt: "desc" },
    take: 300,
    select: { imageUrl: true, updatedAt: true, images: { select: { url: true }, take: 12 } },
  });
  for (const p of products) {
    push(p.imageUrl, "product", p.updatedAt);
    for (const img of p.images) push(img.url, "gallery", p.updatedAt);
  }

  try {
    const settings = await prisma.siteSettings.findFirst({ orderBy: { updatedAt: "desc" } });
    if (settings?.data && typeof settings.data === "object") {
      const walk = (node: unknown) => {
        if (!node) return;
        if (typeof node === "string" && /^https?:\/\//i.test(node)) {
          push(node, "site");
          return;
        }
        if (Array.isArray(node)) {
          for (const x of node) walk(x);
          return;
        }
        if (typeof node === "object") {
          for (const v of Object.values(node as Record<string, unknown>)) walk(v);
        }
      };
      walk(settings.data);
    }
  } catch {
    /* ignore */
  }

  return noStoreJson({ images: urls.slice(0, 400) });
}
