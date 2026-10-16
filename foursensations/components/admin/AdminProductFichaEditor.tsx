"use client";

import type { ProductFichaCopy } from "@/lib/product-ficha";
import { formatPrice } from "@/lib/format";
import { isDisplayableImageUrl } from "@/lib/util/image-url";

type Props = {
  title: string;
  onTitle: (value: string) => void;
  brand: string;
  onBrand: (value: string) => void;
  price: string;
  onPrice: (value: string) => void;
  subcategory: string;
  onSubcategory: (value: string) => void;
  description: string;
  onDescription: (value: string) => void;
  imageUrl: string | null;
  ficha: ProductFichaCopy;
  onFicha: (next: ProductFichaCopy) => void;
  disabled?: boolean;
};

function patch(ficha: ProductFichaCopy, onFicha: (next: ProductFichaCopy) => void, partial: Partial<ProductFichaCopy>) {
  onFicha({ ...ficha, ...partial });
}

export function AdminProductFichaEditor({
  title,
  onTitle,
  brand,
  onBrand,
  price,
  onPrice,
  subcategory,
  onSubcategory,
  description,
  onDescription,
  imageUrl,
  ficha,
  onFicha,
  disabled,
}: Props) {
  const priceNumber = Number(String(price).replace(",", "."));
  const priceLabel = Number.isFinite(priceNumber) ? formatPrice(priceNumber) : price;

  return (
    <div className="admin-ficha">
      <p className="admin-ficha__hint">
        Así ve la clienta la ficha. El título, la marca, el precio, la subcategoría y la descripción son los mismos de los campos.
      </p>
      <section className="admin-ficha__hero">
        <div className="admin-ficha__photo">
          {isDisplayableImageUrl(imageUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl!} alt="" />
          ) : (
            <span>Sin foto</span>
          )}
        </div>
        <div className="admin-ficha__hero-copy">
          <input
            className="admin-ficha__kicker"
            value={ficha.tagline}
            disabled={disabled}
            placeholder="Etiqueta superior"
            onChange={(e) => patch(ficha, onFicha, { tagline: e.target.value })}
          />
          <input
            className="admin-ficha__title"
            value={title}
            disabled={disabled}
            placeholder="Título"
            onChange={(e) => onTitle(e.target.value)}
          />
          <input
            className="admin-ficha__subtitle"
            value={ficha.subtitle}
            disabled={disabled}
            placeholder="Subtítulo"
            onChange={(e) => patch(ficha, onFicha, { subtitle: e.target.value })}
          />
          <textarea
            className="admin-ficha__hook"
            value={ficha.hook}
            disabled={disabled}
            rows={2}
            placeholder="Frase de enganche"
            onChange={(e) => patch(ficha, onFicha, { hook: e.target.value })}
          />
          <input
            className="admin-ficha__pill"
            value={ficha.content}
            disabled={disabled}
            placeholder="Contenido, por ejemplo 250 ml"
            onChange={(e) => patch(ficha, onFicha, { content: e.target.value })}
          />
        </div>
      </section>

      <div className="admin-ficha__grid">
        <aside className="admin-ficha__buy">
          <label>
            Marca
            <input value={brand} disabled={disabled} onChange={(e) => onBrand(e.target.value)} />
          </label>
          <label>
            Nombre en la compra
            <input value={title} disabled={disabled} onChange={(e) => onTitle(e.target.value)} />
          </label>
          <label>
            Precio
            <input value={price} disabled={disabled} inputMode="numeric" onChange={(e) => onPrice(e.target.value)} />
            <small>{priceLabel}</small>
          </label>
          <label>
            Subcategoría
            <input value={subcategory} disabled={disabled} onChange={(e) => onSubcategory(e.target.value)} />
          </label>
          <label>
            Ideal para
            <textarea
              value={ficha.idealFor}
              disabled={disabled}
              rows={2}
              onChange={(e) => patch(ficha, onFicha, { idealFor: e.target.value })}
            />
          </label>
        </aside>
        <div className="admin-ficha__dossier">
          <label>
            Descripción
            <textarea value={description} disabled={disabled} rows={5} onChange={(e) => onDescription(e.target.value)} />
          </label>
          <label>
            Beneficios, uno por línea
            <textarea
              value={ficha.benefits.join("\n")}
              disabled={disabled}
              rows={5}
              onChange={(e) => patch(ficha, onFicha, { benefits: e.target.value.split("\n").slice(0, 8) })}
            />
          </label>
          <label>
            Modo de uso
            <textarea
              value={ficha.howTo}
              disabled={disabled}
              rows={3}
              onChange={(e) => patch(ficha, onFicha, { howTo: e.target.value })}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
