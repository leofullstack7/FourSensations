import type { AdminProduct } from "@/lib/types/admin";
import type { AdminSale } from "@/lib/types/admin";

/** Métricas de catálogo compartidas entre dashboard, lista de productos e inventario. */
export type AdminCatalogStats = {
  /** Total de SKUs en base de datos (incluye variantes). */
  totalProducts: number;
  /** Productos marcados como activos. */
  activeProducts: number;
  stockNormal: number;
  stockLow: number;
  stockOut: number;
  salesCount: number;
  totalRevenue: number;
};

export function computeAdminCatalogStats(
  products: AdminProduct[],
  sales: AdminSale[]
): AdminCatalogStats {
  let stockNormal = 0;
  let stockLow = 0;
  let stockOut = 0;
  let activeProducts = 0;

  for (const p of products) {
    if (p.active) activeProducts++;
    if (p.stock === 0) stockOut++;
    else if (p.stock < 5) stockLow++;
    else stockNormal++;
  }

  return {
    totalProducts: products.length,
    activeProducts,
    stockNormal,
    stockLow,
    stockOut,
    salesCount: sales.length,
    totalRevenue: sales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0),
  };
}
