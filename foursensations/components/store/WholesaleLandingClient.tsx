"use client";

import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ProductCollage } from "@/components/store/ProductCollage";
import { StoreFooter } from "@/components/store/StoreFooter";
import { StoreProductCard } from "@/components/store/store-product-card";
import { useReveal } from "@/hooks/useReveal";
import { WHOLESALE_THRESHOLD_COP } from "@/lib/admin/customer-crm";
import { formatPrice } from "@/lib/format";
import { getWhatsAppHref, WHATSAPP_WHOLESALE_MESSAGE } from "@/lib/storefront-contact";
import type { StoreProduct } from "@/lib/types/product";
import { withWholesalePrices } from "@/lib/wholesale-pricing";
import { useStorefrontUi } from "@/components/store/storefront-ui-context";

const REASONS = [
  {
    n: "01",
    title: "EMPIEZA SIN COMPLICARTE \u{1F497}",
    text: "No necesitas una inversi\u00F3n enorme para comenzar. Puedes iniciar con un pedido desde $700.000 y hacer crecer tu inventario a tu ritmo.",
  },
  {
    n: "02",
    title: "PRODUCTOS QUE DA GUSTO RECOMENDAR \u2728",
    text: "F\u00F3rmulas cuidadosamente desarrolladas, ingredientes seleccionados y productos pensados para responder a diferentes necesidades del cabello. Vendes algo en lo que puedes confiar.",
  },
  {
    n: "03",
    title: "UN MARGEN QUE S\u00CD MOTIVA \u{1F4B8}",
    text: "Accede a precios especiales para mayoristas y construye una ganancia atractiva en cada venta. Porque si vas a emprender, tambi\u00E9n queremos que sea un buen negocio para ti.",
  },
  {
    n: "04",
    title: "NO EMPIEZAS DESDE CERO \u{1F380}",
    text: "Four Sensations ya tiene una historia, una comunidad y clientes que conocen y aman nuestros productos. T\u00FA llevas esa experiencia a nuevos clientes desde tu propio negocio.",
  },
  {
    n: "05",
    title: "TE DAMOS MATERIAL PARA VENDER M\u00C1S \u{1F4F2}",
    text: "No tienes que inventarte todo el contenido. Te apoyamos con piezas y material de la marca para que puedas mostrar, recomendar y promocionar tus productos en redes sociales.",
  },
  {
    n: "06",
    title: "TIENES MUCHO PARA OFRECER \u{1F338}",
    text: "Nuestro portafolio te permite atender diferentes necesidades: nutrición, reparación, frizz, brillo, protección, cuero cabelludo, crecimiento y mucho más. Más opciones para tus clientes, más oportunidades de venta para ti.",
  },
  {
    n: "07",
    title: "NO TE DEJAMOS SOLA \u{1F497}",
    text: "Queremos que conozcas lo que vendes y sepas cómo recomendarlo. Por eso cuentas con capacitación y acompañamiento para conocer mejor el portafolio y asesorar a tus clientes con seguridad.",
  },
  {
    n: "08",
    title: "VENDES MUCHO M\u00C1S QUE PRODUCTOS \u2728",
    text: "El cabello también hace parte de cómo nos sentimos y nos vemos. Con Four Sensations puedes acompañar a tus clientes a construir rutinas de cuidado, consentirse y sentirse increíbles con su cabello.",
  },
] as const;

type WholesaleMe = {
  isWholesale: boolean;
  authenticated?: boolean;
  accumulatedSpend?: number;
  minimumOrder?: number;
  name?: string | null;
};

export function WholesaleLandingClient({
  collageUrls,
  products,
}: {
  collageUrls: string[];
  products: StoreProduct[];
}) {
  useReveal();
  const router = useRouter();
  const { update } = useSession();
  const { favorites, openProductModal, toggleFavorite, addToCart, showToast, cartCount } = useStorefrontUi();
  const waHref = getWhatsAppHref(WHATSAPP_WHOLESALE_MESSAGE);
  const priced = useMemo(() => withWholesalePrices(products), [products]);

  const [formOpen, setFormOpen] = useState(false);
  const [me, setMe] = useState<WholesaleMe | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isWholesale = Boolean(me?.isWholesale);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/wholesale/me", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as WholesaleMe;
        setMe(data);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const submitRegister = async () => {
    setError(null);
    if (!name.trim() || !email.trim() || !password || !city.trim() || !address.trim()) {
      setError("Completa correo, contraseña, nombre, ciudad y dirección.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/customer/register-wholesale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          city: city.trim(),
          address: address.trim(),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "No se pudo completar el registro");
        return;
      }
      const signInResult = await signIn("customer-credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });
      if (!signInResult?.ok) {
        setError("Cuenta creada, pero no se pudo iniciar sesión. Entra desde tu perfil.");
        return;
      }
      await update();
      router.push("/cuenta/perfil");
      router.refresh();
      showToast("Registro mayorista listo. Ya estás dentro.", "success", "\u2705");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wholesale-page">
      <section className="fs-account-hero fs-cat-hero">
        <div className="fs-account-hero__copy">
          <p className="fs-account-hero__eyebrow">Programa mayorista · FOUR SENSATIONS S.A.S.</p>
          <h1>TU VITRINA ESTÁ PIDIENDO FOUR SENSATIONS 👀💗</h1>
          <p>
            Una marca que tus clientes van a querer descubrir, probar y volver a comprar. Productos con identidad,
            fórmulas increíbles y una comunidad que ya ama Four Sensations.
          </p>
          <p className="fs-cat-commercial">
            Desde {formatPrice(WHOLESALE_THRESHOLD_COP)} por pedido entras a tarifa mayorista.
          </p>
          <div className="category-landing-cta-row" style={{ marginTop: 18 }}>
            {isWholesale ? null : (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setFormOpen((v) => !v)}>
                Quiero registrarme
              </button>
            )}
            <a href="#catalogo-mayorista" className="btn btn-outline btn-sm">
              Ver catálogo
            </a>
          </div>
        </div>
        <ProductCollage sources={collageUrls} />
      </section>

      <section className="wholesale-register-band" id="registro-mayorista">
        <div className="container">
          {isWholesale ? (
            <div className="wholesale-spend-card reveal">
              <p className="wholesale-spend-kicker">Tu acumulado mayorista</p>
              <strong className="wholesale-spend-value">{formatPrice(me?.accumulatedSpend ?? 0)}</strong>
              <p>
                Suma de tus pedidos pagados en el ciclo vigente. El mínimo de este pedido es{" "}
                {formatPrice(me?.minimumOrder ?? WHOLESALE_THRESHOLD_COP)}.
              </p>
            </div>
          ) : formOpen ? (
            <form
              className="wholesale-register-card reveal"
              onSubmit={(e) => {
                e.preventDefault();
                void submitRegister();
              }}
            >
              <div>
                <h2>Regístrate como mayorista</h2>
                <p>Al crear tu cuenta inicias sesión de inmediato y abres tu perfil Four Sensations.</p>
              </div>
              {error ? <p className="wholesale-register-error">{error}</p> : null}
              <div className="wholesale-register-grid">
                <label>
                  Nombre
                  <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                </label>
                <label>
                  Correo
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                </label>
                <label>
                  Contraseña
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
                </label>
                <label>
                  Ciudad
                  <input value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" />
                </label>
                <label className="wholesale-register-grid__full">
                  Dirección
                  <input value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" />
                </label>
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Creando tu cuenta…" : "Crear cuenta mayorista"}
              </button>
            </form>
          ) : null}
        </div>
      </section>

      <section className="wholesale-section wholesale-threshold section-pad" id="razones">
        <div className="container">
          <div className="wholesale-threshold-card wholesale-reasons-card reveal">
            <div className="wholesale-threshold-copy">
              <h2>8 RAZONES PARA LLEVAR FOUR SENSATIONS A TU NEGOCIO 💗</h2>
              <p>Porque vender una marca que te encanta también puede convertirse en una gran oportunidad.</p>
            </div>
            <div className="wholesale-steps">
              {REASONS.map((s) => (
                <article key={s.n} className="wholesale-step">
                  <span className="wholesale-step-n">{s.n}</span>
                  <div>
                    <strong>{s.title}</strong>
                    <p>{s.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="wholesale-section section-pad" id="catalogo-mayorista">
        <div className="container">
          <div className="wholesale-catalog-head">
            <h2>Catálogo mayorista</h2>
            <p>
              Todos los productos con precio de volumen. El valor grande es mayorista; el tachado es el precio al público.
              {cartCount > 0 ? ` Llevas ${cartCount} ítem(s) en el carrito.` : ""}
            </p>
          </div>
          <div className="cat-mosaic">
            {priced.map((p, i) => (
              <div key={p.id} className="cat-mosaic__cell">
                <StoreProductCard
                  product={p}
                  isFav={favorites.includes(p.id)}
                  onOpen={openProductModal}
                  onToggleFav={toggleFavorite}
                  onAddCart={addToCart}
                  imagePriority={i < 4}
                  compact
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="wholesale-section wholesale-cta-band section-pad">
        <div className="container">
          <div className="wholesale-cta-card reveal">
            <div>
              <h2>¿Lista para surtir tu negocio?</h2>
              <p>Arma el pedido con tarifas de volumen. El carrito te muestra el acumulado de este pedido.</p>
            </div>
            <div className="wholesale-hero-actions">
              <Link href="#catalogo-mayorista" className="btn btn-primary btn-lg">
                Seguir eligiendo
              </Link>
              <a href={waHref} className="btn btn-outline btn-lg" target="_blank" rel="noreferrer">
                WhatsApp mayorista
              </a>
            </div>
          </div>
        </div>
      </section>
      <StoreFooter />
    </div>
  );
}
