"use client";

import Link from "next/link";
import { useReveal } from "@/hooks/useReveal";
import { ProductCollage } from "@/components/store/ProductCollage";
import { WHOLESALE_THRESHOLD_COP } from "@/lib/admin/customer-crm";
import { formatPrice } from "@/lib/format";
import { getWhatsAppHref } from "@/lib/storefront-contact";

const REASONS = [
  {
    n: "01",
    title: "EMPIEZA SIN COMPLICARTE 💗",
    text: "No necesitas una inversión enorme para comenzar. Puedes iniciar con un pedido desde $700.000 y hacer crecer tu inventario a tu ritmo.",
  },
  {
    n: "02",
    title: "PRODUCTOS QUE DA GUSTO RECOMENDAR ✨",
    text: "Fórmulas cuidadosamente desarrolladas, ingredientes seleccionados y productos pensados para responder a diferentes necesidades del cabello. Vendes algo en lo que puedes confiar.",
  },
  {
    n: "03",
    title: "UN MARGEN QUE SÍ MOTIVA 💸",
    text: "Accede a precios especiales para mayoristas y construye una ganancia atractiva en cada venta. Porque si vas a emprender, también queremos que sea un buen negocio para ti.",
  },
  {
    n: "04",
    title: "NO EMPIEZAS DESDE CERO 🎀",
    text: "Four Sensations ya tiene una historia, una comunidad y clientes que conocen y aman nuestros productos. Tú llevas esa experiencia a nuevos clientes desde tu propio negocio.",
  },
  {
    n: "05",
    title: "TE DAMOS MATERIAL PARA VENDER MÁS 📲",
    text: "No tienes que inventarte todo el contenido. Te apoyamos con piezas y material de la marca para que puedas mostrar, recomendar y promocionar tus productos en redes sociales.",
  },
  {
    n: "06",
    title: "TIENES MUCHO PARA OFRECER 🌸",
    text: "Nuestro portafolio te permite atender diferentes necesidades: nutrición, reparación, frizz, brillo, protección, cuero cabelludo, crecimiento y mucho más. Más opciones para tus clientes, más oportunidades de venta para ti.",
  },
  {
    n: "07",
    title: "NO TE DEJAMOS SOLA 💗",
    text: "Queremos que conozcas lo que vendes y sepas cómo recomendarlo. Por eso cuentas con capacitación y acompañamiento para conocer mejor el portafolio y asesorar a tus clientes con seguridad.",
  },
  {
    n: "08",
    title: "VENDES MUCHO MÁS QUE PRODUCTOS ✨",
    text: "El cabello también hace parte de cómo nos sentimos y nos vemos. Con Four Sensations puedes acompañar a tus clientes a construir rutinas de cuidado, consentirse y sentirse increíbles con su cabello.",
  },
] as const;

export function WholesaleLandingClient({ collageUrls }: { collageUrls: string[] }) {
  useReveal();
  const waHref = getWhatsAppHref(
    "Hola Four Sensations, quiero información del programa mayorista (volumen, precios y despacho desde Manizales).",
  );

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
            <a href={waHref} className="btn btn-primary btn-sm" target="_blank" rel="noreferrer">
              Escribir por WhatsApp
            </a>
            <a href="#razones" className="btn btn-outline btn-sm">
              8 razones
            </a>
          </div>
        </div>
        <ProductCollage sources={collageUrls} />
      </section>

      <section className="wholesale-section wholesale-threshold section-pad" id="razones">
        <div className="container">
          <div className="wholesale-threshold-card wholesale-reasons-card reveal">
            <div className="wholesale-threshold-copy">
              <h2>8 RAZONES PARA LLEVAR FOUR SENSATIONS A TU NEGOCIO 💗</h2>
              <p>
                Porque vender una marca que te encanta también puede convertirse en una gran oportunidad.
              </p>
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
