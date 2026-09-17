import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductLandingClient } from "@/components/store/ProductLandingClient";
import { getStorefrontProductBySlug } from "@/lib/products";

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
  return <ProductLandingClient product={product} />;
}
