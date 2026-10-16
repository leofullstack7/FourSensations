import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductLandingClient } from "@/components/store/ProductLandingClient";
import { getStorefrontColorSiblings, getStorefrontProductBySlug } from "@/lib/products";
import { getProductFicha } from "@/lib/server/site-settings";

export const revalidate = 300;

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getStorefrontProductBySlug(params.slug);
  if (!product) return { title: "Producto | Four Sensations" };
  return {
    title: `${product.name} | Four Sensations`,
    description: product.description?.slice(0, 160) || `${product.name} — Four Sensations`,
  };
}

export default async function ProductPage({ params }: Props) {
  const product = await getStorefrontProductBySlug(params.slug);
  if (!product) return notFound();
  const [variants, ficha] = await Promise.all([
    getStorefrontColorSiblings(product),
    getProductFicha(product.id),
  ]);
  return <ProductLandingClient product={product} variants={variants} ficha={ficha} />;
}
