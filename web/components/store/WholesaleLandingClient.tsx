"use client";

import Link from "next/link";
import { useReveal } from "@/hooks/useReveal";
import { formatPrice } from "@/lib/format";

const WHOLESALE_THRESHOLD = 700_000;

const BENEFITS = [
  {
    icon: "💎",
    title: "Precios exclusivos",
    desc: "Hasta 30% de ahorro en productos seleccionados del catálogo GinnaBeauty.",
  },
  {
    icon: "🤝",
    title: "Acompañamiento personal",
    desc: "Un agente de GinnaBeauty te contactará para armar tu pedido ideal.",
  },
  {
    icon: "📦",
    title: "Pedidos a tu medida",
    desc: "Combina marcas, categorías y volúmenes según tu negocio o emprendimiento.",
  },
  {
    icon: "⚡",
    title: "Prioridad en stock",
    desc: "Acceso preferencial a lanzamientos y reposiciones de productos top.",
  },
] as const;

const STEPS = [
  { n: "01", title: "Elige tus productos", desc: "Explora los destacados del catálogo y arma tu selección." },
  { n: "02", title: "Supera los $700.000", desc: "Al completar una compra mayor a este monto, activas el programa." },
  { n: "03", title: "Te contactamos", desc: "Nuestro equipo te escribe para confirmar tu cuenta mayorista." },
  { n: "04", title: "Disfruta beneficios", desc: "Accede a precios exclusivos en futuras compras." },
] as const;

export function WholesaleLandingClient() {
  useReveal();

  return (
    <div className="wholesale-page">
      <section className="wholesale-hero">
        <div className="wholesale-hero-bg" aria-hidden>
          <span className="wholesale-orb wholesale-orb--1" />
          <span className="wholesale-orb wholesale-orb--2" />
          <span className="wholesale-orb wholesale-orb--3" />
          <span className="wholesale-grid" />
        </div>
        <div className="container wholesale-hero-inner reveal">
          <span className="wholesale-eyebrow">Programa exclusivo GinnaBeauty</span>
          <h1 className="wholesale-title">
            Compra <em>mayorista</em>
            <br />
            y ahorra hasta un <span className="wholesale-highlight">30%</span>
          </h1>
          <p className="wholesale-lead">
            Si realizas una compra mayor a <strong>{formatPrice(WHOLESALE_THRESHOLD)}</strong>, te conviertes en
            mayorista oficial de GinnaBeauty con acceso a precios exclusivos. Nuestros agentes se comunicarán
            contigo para acompañarte en cada pedido.
          </p>
          <div className="wholesale-hero-actions">
            <Link href="/#featured" className="btn btn-primary wholesale-cta-main">
              Elegir Productos →
            </Link>
            <a href="#como-funciona" className="btn btn-outline wholesale-cta-secondary">
              Cómo funciona
            </a>
          </div>
          <div className="wholesale-hero-stats">
            <div className="wholesale-stat-pill">
              <span className="wholesale-stat-num">30%</span>
              <span className="wholesale-stat-label">Ahorro máximo</span>
            </div>
            <div className="wholesale-stat-pill">
              <span className="wholesale-stat-num">{formatPrice(WHOLESALE_THRESHOLD)}</span>
              <span className="wholesale-stat-label">Monto mínimo</span>
            </div>
            <div className="wholesale-stat-pill">
              <span className="wholesale-stat-num">1:1</span>
              <span className="wholesale-stat-label">Agente dedicado</span>
            </div>
          </div>
        </div>
      </section>

      <section className="wholesale-section wholesale-benefits section-pad">
        <div className="container">
          <div className="wholesale-section-head reveal">
            <span className="section-eyebrow">Ventajas</span>
            <h2 className="section-title">
              Todo lo que obtienes como <em>mayorista</em>
            </h2>
          </div>
          <div className="wholesale-benefits-grid">
            {BENEFITS.map((b) => (
              <article key={b.title} className="wholesale-benefit-card reveal">
                <span className="wholesale-benefit-icon" aria-hidden>
                  {b.icon}
                </span>
                <h3>{b.title}</h3>
                <p>{b.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="wholesale-section wholesale-threshold section-pad" id="como-funciona">
        <div className="container">
          <div className="wholesale-threshold-card reveal">
            <div className="wholesale-threshold-copy">
              <span className="wholesale-eyebrow wholesale-eyebrow--dark">Tu acceso al programa</span>
              <h2>
                Una compra desde <em>{formatPrice(WHOLESALE_THRESHOLD)}</em> te abre las puertas
              </h2>
              <p>
                No necesitas formularios complicados: realiza tu pedido en la tienda, supera el monto y nuestro
                equipo te contactará por WhatsApp o correo para activar tu perfil mayorista con precios especiales.
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
              <h2>¿Lista para empezar?</h2>
              <p>Ve a los productos destacados, arma tu carrito y desbloquea beneficios mayoristas.</p>
            </div>
            <Link href="/#featured" className="btn btn-primary btn-lg wholesale-cta-main">
              Elegir Productos →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
