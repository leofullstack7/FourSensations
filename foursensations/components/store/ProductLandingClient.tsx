"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ProductHeroPan } from "@/components/store/ProductHeroPan";
import { ProductModalZoomImage } from "@/components/store/ProductModalZoomImage";
import { useStorefrontUi } from "@/components/store/storefront-ui-context";
import { StoreProductPrice } from "@/components/store/StoreProductPrice";
import type { StoreProduct } from "@/lib/types/product";
import {
  isDisplayableImageUrl,
  preferFastStorefrontUrls,
  shouldBypassNextImageOptimizer,
} from "@/lib/util/image-url";
import { productHeroThemeFromSlug } from "@/lib/store/product-hero-theme";
import { getCategoryLabel } from "@/lib/category-labels";
import { getCatalogProductCopy } from "@/lib/catalog-product-copy";
import { getProductDisplayName } from "@/lib/product-display-names";
import type { ProductFichaCopy } from "@/lib/product-ficha";
import { ProductColorSwatchField } from "@/components/store/ProductColorSwatchField";

/** Galería de ficha = solo principal + extras del editor (sin dump local del SKU). */
function galleryPool(product: StoreProduct): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const raw of [product.img, product.imgHover, ...(product.gallery ?? [])]) {
    const url = raw?.trim() || "";
    if (!url || seen.has(url) || !isDisplayableImageUrl(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  return urls;
}

function MosaicImage({
  src,
  alt,
  width,
  height,
  className,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
}) {
  const candidates = useMemo(() => preferFastStorefrontUrls([src]), [src]);
  const [index, setIndex] = useState(0);
  const current = index < candidates.length ? candidates[index] : "";
  if (!current) return null;
  return (
    <Image
      key={current}
      src={current}
      alt={alt}
      width={width}
      height={height}
      className={className}
      unoptimized={shouldBypassNextImageOptimizer(current)}
      onError={() => setIndex((i) => (i + 1 < candidates.length ? i + 1 : candidates.length))}
    />
  );
}

export function ProductLandingClient({
  product,
  variants = [],
  ficha = null,
}: {
  product: StoreProduct;
  variants?: StoreProduct[];
  ficha?: ProductFichaCopy | null;
}) {
  const { addToCart, toggleFavorite, favorites } = useStorefrontUi();
  const theme = productHeroThemeFromSlug(product.slug || product.id);
  const copy = getCatalogProductCopy(product.name);
  const displayName = getProductDisplayName(ficha?.title || product.name);
  const images = useMemo(() => galleryPool(product), [product]);
  const [activeSrc, setActiveSrc] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const isFav = favorites.includes(product.id);
  const categoryHref = `/categoria/${product.category}${
    product.subcategory ? `?grupo=${encodeURIComponent(product.subcategory)}` : ""
  }`;

  const featured = activeSrc || images[0] || "";
  const title = ficha?.title?.trim() || displayName.title;
  const subtitle = ficha ? ficha.subtitle : displayName.subtitle;
  const kicker = ficha?.tagline?.trim() || copy?.tagline || product.subcategory || getCategoryLabel(product.category);
  const lead = ficha ? ficha.hook : copy?.hook || "";
  const blurb = ficha?.description?.trim()
    || copy?.description
    || product.description?.trim()
    || "Ficha Four Sensations extraída del catálogo oficial.";
  const idealFor = ficha ? ficha.idealFor : copy?.idealFor || "";
  const benefits = ficha ? ficha.benefits : copy?.benefits ?? [];
  const howTo = ficha ? ficha.howTo : copy?.howTo || "";
  const content = ficha ? ficha.content : copy?.content || "";

  useEffect(() => {
    if (!lightboxSrc) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxSrc(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [lightboxSrc]);

  return (
    <main className={`product-landing-page product-landing-page--${theme}`}>
      <section className="product-hero" aria-label={product.name}>
        <div className="product-hero__stage">
          <ProductHeroPan urls={images} alt={product.name} />
          <div className="product-hero__fade" aria-hidden />
          <div className="product-hero__copy">
            <p className="product-hero__kicker">{kicker}</p>
            <h1 className="product-hero__title">{title}</h1>
            {subtitle ? <p className="product-hero__subtitle">{subtitle}</p> : null}
            {lead ? <p className="product-hero__hook">{lead}</p> : null}
            <div className="product-hero__pills">
              {content ? <span>{content}</span> : null}
              {product.subcategory ? <span>{product.subcategory}</span> : null}
            </div>
            <Link href={categoryHref} className="product-hero__back">
              ← {product.subcategory || getCategoryLabel(product.category)}
            </Link>
          </div>
        </div>
      </section>

      <section className="product-shop">
        <div className="container product-shop__grid">
          <div className="product-buy-col">
            <aside className="product-buy">
              {featured ? (
                <div className="product-buy__preview">
                  <ProductModalZoomImage
                    src={featured}
                    alt={product.name}
                    objectFit="cover"
                    sizes="(max-width: 900px) 92vw, 360px"
                  />
                </div>
              ) : null}
              <p className="product-buy__brand">{product.brand}</p>
              <h2 className="product-buy__name">{title}</h2>
              {subtitle ? <p className="product-buy__subtitle">{subtitle}</p> : null}
              <div className="product-buy__price">
                <StoreProductPrice product={product} currentStyle={{ fontSize: 30 }} />
              </div>
              {variants.length > 1 ? (
                <div className="product-buy__colors">
                  <p className="product-buy__colors-label">Elige el color</p>
                  <ProductColorSwatchField
                    items={variants}
                    selectedId={product.id}
                    onSelect={(id) => {
                      const next = variants.find((item) => item.id === id);
                      if (next?.slug) window.location.assign(`/producto/${next.slug}`);
                    }}
                  />
                </div>
              ) : null}
              <div className="product-buy__actions">
                <button type="button" className="btn btn-primary" onClick={() => addToCart(product.id, product, { confirmVariant: true })}>
                  Añadir al carrito
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  aria-pressed={isFav}
                  onClick={() => toggleFavorite(product.id)}
                >
                  {isFav ? "En favoritos" : "Guardar"}
                </button>
              </div>
              {idealFor ? (
                <p className="product-buy__ideal">
                  <strong>Ideal para:</strong> {idealFor}
                </p>
              ) : null}
            </aside>
          </div>

          <div className="product-dossier">
            <p className="product-dossier__lead">{blurb}</p>
            {benefits.length > 0 ? (
              <ul className="product-dossier__benefits">
                {benefits.slice(0, 6).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
            {howTo ? (
              <div className="product-dossier__how">
                <h3>Modo de uso</h3>
                <p>{howTo}</p>
              </div>
            ) : null}

            {images.length > 0 ? (
              <div className="product-mosaic" aria-label={`Galería de ${product.name}`}>
                {images.map((src, i) => {
                  const selected = featured === src;
                  return (
                    <div
                      key={`${src}-${i}`}
                      className={`product-mosaic__cell${i === 0 ? " product-mosaic__cell--hero" : ""}${
                        selected ? " is-active" : ""
                      }`}
                    >
                      <button
                        type="button"
                        className="product-mosaic__pick"
                        onClick={() => setActiveSrc(src)}
                      >
                        <MosaicImage
                          src={src}
                          alt={`${product.name} ${i + 1}`}
                          width={i === 0 ? 640 : 280}
                          height={i === 0 ? 640 : 280}
                          className="product-mosaic__img"
                        />
                      </button>
                      {selected ? (
                        <button
                          type="button"
                          className="product-mosaic__view"
                          onClick={() => setLightboxSrc(src)}
                        >
                          Ver
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {lightboxSrc ? (
        <div
          className="product-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`Foto de ${product.name}`}
          onClick={() => setLightboxSrc(null)}
        >
          <button type="button" className="product-lightbox__close" onClick={() => setLightboxSrc(null)}>
            Cerrar
          </button>
          <div className="product-lightbox__stage" onClick={(e) => e.stopPropagation()}>
            <ProductModalZoomImage
              src={lightboxSrc}
              alt={product.name}
              objectFit="contain"
              sizes="100vw"
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}
