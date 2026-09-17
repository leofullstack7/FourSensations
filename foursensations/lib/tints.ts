import { unstable_cache } from "next/cache";
import { TINTES_CATEGORY_SLUG } from "@/lib/bulk-import/tintes";
import { prisma } from "@/lib/prisma";

export type TintBubbleItem = {
  id: string;
  name: string;
  colorImageUrl: string;
  mainImageUrl: string;
  level?: string | null;
  group?: string | null;
  family?: string | null;
  type?: string | null;
  subcategory?: string | null;
  price: number;
  slug: string;
};

function pickTintImageUrls(imageUrl: string | null, gallery: string[]): { main: string; color: string } {
  const all = [imageUrl, ...gallery].map((u) => u?.trim()).filter((u): u is string => !!u);
  if (all.length === 0) return { main: "", color: "" };

  const colorCandidate = all.find((u) => /_color/i.test(u)) ?? all[1] ?? all[0]!;
  const mainCandidate = all.find((u) => !/_color/i.test(u)) ?? all[0]!;

  return {
    main: mainCandidate,
    color: colorCandidate,
  };
}

type TintProductRow = {
  id: string;
  slug: string;
  name: string;
  price: number;
  subcategory: string;
  imageUrl: string | null;
  tintLevel: string | null;
  tintGroup: string | null;
  tintFamily: { name: string } | null;
  tintType: { name: string } | null;
  images: { url: string; sortOrder: number }[];
};

export function productRowToTintBubbleItem(p: TintProductRow): TintBubbleItem | null {
  const gallery = [...p.images].sort((a, b) => a.sortOrder - b.sortOrder).map((i) => i.url);
  const { main, color } = pickTintImageUrls(p.imageUrl, gallery);
  if (!main && !color) return null;

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    mainImageUrl: main || color,
    colorImageUrl: color || main,
    level: p.tintLevel,
    group: p.tintGroup,
    family: p.tintFamily?.name ?? null,
    type: p.tintType?.name ?? null,
    subcategory: p.subcategory,
  };
}

async function fetchTintBubbleItemsFromDb(): Promise<TintBubbleItem[]> {
  const rows = await prisma.product.findMany({
    where: { active: true, category: TINTES_CATEGORY_SLUG },
    orderBy: [{ tintTypeId: "asc" }, { tintFamilyId: "asc" }, { tintLevel: "asc" }, { name: "asc" }],
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      tintFamily: { select: { name: true } },
      tintType: { select: { name: true } },
    },
  });

  const items: TintBubbleItem[] = [];
  for (const row of rows) {
    const item = productRowToTintBubbleItem(row);
    if (item) items.push(item);
  }
  return items;
}

const getCachedTintBubbleItems = unstable_cache(
  fetchTintBubbleItemsFromDb,
  ["storefront-tint-bubble-items-v1"],
  { revalidate: 300, tags: ["storefront-tint-bubble-items-v1"] }
);

/** Productos Tintes mapeados para burbujas / preview home (caché 5 min). */
export async function getTintBubbleItems(): Promise<TintBubbleItem[]> {
  if (!process.env.DATABASE_URL) return [];
  try {
    return await getCachedTintBubbleItems();
  } catch {
    return [];
  }
}
