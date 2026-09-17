import skuTable from "./product-skus.json";

export type ProductSkuEntry = {
  sku: string;
  name: string;
  kind: "catalog" | "photos";
  aliases: string[];
};

export const PRODUCT_SKUS = skuTable as ProductSkuEntry[];

export function skuFolderName(entry: ProductSkuEntry): string {
  return `${entry.sku} ${entry.name}`;
}
