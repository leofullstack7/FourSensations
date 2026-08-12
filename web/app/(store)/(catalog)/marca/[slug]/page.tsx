import { notFound } from "next/navigation";
import { BrandLandingClient } from "@/components/store/BrandLandingClient";
import { formatBrandDisplayName, brandSlugFromName } from "@/lib/brand-display";
import { listStorefrontBrands } from "@/lib/products";

export const revalidate = 120;

type Props = {
  params: { slug: string };
};

export default async function BrandPage({ params }: Props) {
  const slug = params.slug?.trim() ?? "";
  if (!slug) return notFound();

  const brands = await listStorefrontBrands();
  const brand = brands.find((b) => b.slug === slug);
  if (!brand) {
    // Fallback: slug válido aunque aún no esté en el listado cacheado
    const displayName = formatBrandDisplayName(slug.replace(/-/g, " "));
    if (!displayName || brandSlugFromName(displayName) !== slug) return notFound();
    return (
      <BrandLandingClient
        brandSlug={slug}
        brandName={displayName}
        brandDisplayName={displayName}
      />
    );
  }

  return (
    <BrandLandingClient
      brandSlug={brand.slug}
      brandName={brand.name}
      brandDisplayName={brand.displayName}
    />
  );
}
