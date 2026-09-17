"use client";

import Link from "next/link";
import { useReveal } from "@/hooks/useReveal";
import { ProductCollage } from "@/components/store/ProductCollage";
import { WHOLESALE_THRESHOLD_COP } from "@/lib/admin/customer-crm";
import { formatPrice } from "@/lib/format";
import { getWhatsAppDisplayNumber, getWhatsAppHref } from "@/lib/storefront-contact";

const BENEFITS = [
  {
    icon: "📍",
    title: "Origen Manizales",
    desc: "FOUR SENSATIONS S.A.S. despacha desde Calle 65A #23A-15, Manizales, Caldas, a todo Colombia.",
  },
  {
    icon: "⏱️",
    title: "Preparación ágil",
    desc: "Máximo 2 días hábiles desde la confirmación del pedido. El tránsito lo define la transportadora.",
  },
  {
    icon: "🚚",
    title: "Cobertura nacional",
    desc: "Envía como vía principal e Interrapidísimo en zonas con reexpedición. No hay recogida en tienda ni entrega el mismo día.",
  },
  {
    icon: "💎",
    title: "Tarifa de volumen",
    desc: `Pedidos desde ${formatPrice(WHOLESALE_THRESHOLD_COP)} acceden a precios mayoristas y a un agente dedicado.`,
  },
] as const;

const OBJECTIVES = [
  {
    title: "Aliados, no solo pedidos",
    text: "Salones, tiendas y emprendedoras que quieren stock con la misma calidad que ve la clienta final.",
  },
  {
    title: "Trazabilidad y posventa",
    text: "Garantía legal, canales oficiales y evidencia en novedades de transporte: el mismo estándar de la tienda.",
  },
  {
    title: "Relación 1:1",
    text: "Un agente arma contigo mix de líneas capilares, accesorios y kits según tu vitrina.",
  },
] as const;

const STEPS = [
  { n: "01", title: "Elige tu mix", desc: "Explora cuidado capilar y accesorios; arma el surtido de tu negocio." },
  { n: "02", title: "Escríbenos", desc: "WhatsApp oficial: cuéntanos volumen, ciudad y tipo de punto de venta." },
  { n: "03", title: "Confirmamos condiciones", desc: "El equipo valida tarifa mayorista, flete y fechas de despacho desde Manizales." },
  { n: "04", title: "Compras con beneficio", desc: "Quedas en el programa: precios de volumen y prioridad en reposiciones." },
] as const;

export function WholesaleLandingClient({ collageUrls }: { collageUrls: string[] }) {
  useReveal();
  const wa = getWhatsAppDisplayNumber();
  const waHref = getWhatsAppHref(
    "Hola Four Sensations, quiero información del programa mayorista (volumen, precios y despacho desde Manizales).",
  );

  return (
    <div className="wholesale-page">
      <section className="fs-account-hero fs-cat-hero">
        <div className="fs-account-hero__copy">
          <p className="fs-account-hero__eyebrow">Programa mayorista · FOUR SENSATIONS S.A.S.</p>
          <h1>Lleva Four Sensations a tu negocio</h1>
          <p>
            Precios de volumen, acompañamiento cercano y despacho nacional desde Manizales. El objetivo es simple:
            que tu vitrina tenga fórmulas con intención y que tu operación tenga un aliado claro, no un catálogo frío.
          </p>
          <p className="fs-cat-commercial">
            Desde {formatPrice(WHOLESALE_THRESHOLD_COP)} por pedido entras a tarifa mayorista.
          </p>
          <div className="category-landing-cta-row" style={{ marginTop: 18 }}>
            <a href={waHref} className="btn btn-primary btn-sm" target="_blank" rel="noreferrer">
              Escribir por WhatsApp
            </a>
            <a href="#como-funciona" className="btn btn-outline btn-sm">
              Cómo funciona
            </a>
          </div>
        </div>
        <ProductCollage sources={collageUrls} />
      </section>

      <section className="fs-cat-benefits">
        <div className="container fs-cat-benefits__grid">
          {BENEFITS.map((b) => (
            <article key={b.title} className="fs-cat-benefit">
              <span aria-hidden>{b.icon}</span>
              <h3>{b.title}</h3>
              <p>{b.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="wholesale-section wholesale-benefits section-pad">
        <div className="container">
          <div className="wholesale-section-head reveal">
            <span className="section-eyebrow">Para qué existe el programa</span>
            <h2 className="section-title">
              Objetivos de <em>Four Sensations</em>
            </h2>
          </div>
          <div className="wholesale-benefits-grid">
            {OBJECTIVES.map((b) => (
              <article key={b.title} className="wholesale-benefit-card reveal">
                <h3>{b.title}</h3>
                <p>{b.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="wholesale-section wholesale-threshold section-pad" id="como-funciona">
        <div className="container">
          <div className="wholesale-threshold-card reveal">
            <div className="wholesale-threshold-copy">
              <span className="wholesale-eyebrow wholesale-eyebrow--dark">Tu acceso</span>
              <h2>El equipo te abre las puertas</h2>
              <p>
                Atención de lunes a sábado, 9:00 a. m. a 6:00 p. m. WhatsApp {wa} · atencionalcliente.befs@gmail.com.
                Políticas de envío y posventa iguales a las de la tienda: transparencia en cada pedido.
              </p>
            </div>
            <div className="wholesale-steps">
              {STEPS.map((s) => (
                <div key={s.n} className="wholesale-step">
                  <span className="wholesale-step-n">{s.n}</span>
                  <div>
                    <strong>{s.title}</strong>
                    <p>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="wholesale-section wholesale-cta-band section-pad">
        <div className="container">
          <div className="wholesale-cta-card reveal">
            <div>
              <h2>¿Lista para surtir tu negocio?</h2>
              <p>Explora el catálogo capilar o escríbenos: armamos el pedido con tarifas de volumen.</p>
            </div>
            <div className="wholesale-hero-actions">
              <Link href="/categoria/cuidado-capilar" className="btn btn-primary btn-lg">
                Ver cuidado capilar
              </Link>
              <a href={waHref} className="btn btn-outline btn-lg" target="_blank" rel="noreferrer">
                WhatsApp mayorista
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
