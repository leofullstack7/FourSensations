import type { AdminProduct } from "@/lib/types/admin";
import type { AdminSale } from "@/lib/types/admin";
import { getCategoryLabel } from "@/lib/category-labels";

const LAUNCH_BUCKETS = ["Cuidado capilar", "Accesorios", "Mayorista"] as const;
const DONUT_COLORS = ["#C9A6E8", "#BFE8D7", "#F6B7D7", "#D4B896"] as const;

/** Métricas de catálogo compartidas entre dashboard, lista de productos e inventario. */
export type AdminCatalogStats = {
  totalProducts: number;
  activeProducts: number;
  stockNormal: number;
  stockLow: number;
  stockOut: number;
  salesCount: number;
  totalRevenue: number;
  /** SKUs por categoría pública de lanzamiento (+ Otros). */
  categoryShares: { label: string; count: number; pct: number; color: string }[];
};

function bucketLabel(category: string): string {
  const label = getCategoryLabel(category);
  if ((LAUNCH_BUCKETS as readonly string[]).includes(label)) return label;
  const folded = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (folded.includes("capilar")) return "Cuidado capilar";
  if (folded.includes("accesor")) return "Accesorios";
  if (folded.includes("mayorista")) return "Mayorista";
  return "Otros";
}

export function computeAdminCatalogStats(
  products: AdminProduct[],
  sales: AdminSale[]
): AdminCatalogStats {
  let stockNormal = 0;
  let stockLow = 0;
  let stockOut = 0;
  let activeProducts = 0;
  const counts = new Map<string, number>();

  for (const p of products) {
    if (p.active) activeProducts++;
    if (p.stock === 0) stockOut++;
    else if (p.stock < 5) stockLow++;
    else stockNormal++;
    const key = bucketLabel(p.category);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const order = [...LAUNCH_BUCKETS, "Otros"];
  const total = products.length;
  const categoryShares = order
    .filter((label) => (counts.get(label) ?? 0) > 0 || label !== "Otros")
    .map((label, i) => {
      const count = counts.get(label) ?? 0;
      return {
        label,
        count,
        pct: total === 0 ? 0 : Math.round((count / total) * 100),
        color: DONUT_COLORS[i % DONUT_COLORS.length]!,
      };
    })
    .filter((row) => row.count > 0 || total === 0);

  const withData = categoryShares.filter((r) => r.count > 0);
  const shares = total === 0 ? categoryShares.slice(0, 3) : withData.length ? withData : categoryShares;

  return {
    totalProducts: products.length,
    activeProducts,
    stockNormal,
    stockLow,
    stockOut,
    salesCount: sales.length,
    totalRevenue: sales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0),
    categoryShares: shares,
  };
}

export function categorySharesConic(shares: AdminCatalogStats["categoryShares"]): string {
  if (shares.length === 0 || shares.every((s) => s.pct === 0)) {
    return "conic-gradient(#EDE6F3 0deg 360deg)";
  }
  let deg = 0;
  const parts: string[] = [];
  for (const s of shares) {
    const slice = (s.pct / 100) * 360;
    const next = deg + slice;
    parts.push(`${s.color} ${deg}deg ${next}deg`);
    deg = next;
  }
  if (deg < 360) parts.push(`#EDE6F3 ${deg}deg 360deg`);
  return `conic-gradient(${parts.join(", ")})`;
}
