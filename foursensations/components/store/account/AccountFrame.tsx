"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ProductCollage } from "@/components/store/ProductCollage";
import { getWhatsAppDisplayNumber, getWhatsAppHref } from "@/lib/storefront-contact";

/** Fotos Juliana (@img4–6) para el collage de cuenta. */
const ACCOUNT_COLLAGE = [
  "/cuenta/hero-collage-1.jpg",
  "/cuenta/hero-collage-2.jpg",
  "/cuenta/hero-collage-3.jpg",
] as const;

const WA_ORDER_HELP =
  "Holaaa Four Sensations 💗 Tengo una duda sobre mi pedido, envío o entrega. ¿Me ayudan? ✨";

const STORE_POINTS = [
  {
    name: "Centro Comercial Fundadores",
    lines: ["Local C-101 / Primer piso", "Enseguida de Totto"],
    hours: ["Lunes a sábado 10:00 a. m. – 8:00 p. m.", "Domingos 11:00 a. m. – 8:00 p. m."],
  },
  {
    name: "Centro Comercial Mall Plaza",
    lines: ["Segundo piso", "Al frente de Pink Rose"],
    hours: ["Domingo a jueves 10:30 a. m. – 8:00 p. m.", "Viernes y sábado 10:30 a. m. – 9:00 p. m."],
  },
  {
    name: "Centro Comercial Parque Caldas",
    lines: ["Entrada principal carrera 22", "Al frente de McDonald's"],
    hours: ["Domingo a jueves 10:00 a. m. – 7:00 p. m.", "Viernes y sábado 10:00 a. m. – 8:00 p. m."],
  },
  {
    name: "El Cable · Glorieta de Guayacanes",
    lines: ["Calle 65A #23A-15"],
    hours: ["Lunes a viernes 9:00 a. m. – 12:30 p. m.", "3:00 p. m. – 6:00 p. m."],
  },
] as const;

export function AccountFrame({
  title,
  subtitle,
  children,
  eyebrow,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Si se omite, no se muestra eyebrow (evita repetir el slogan de marca). */
  eyebrow?: string | null;
}) {
  const pathname = usePathname();
  const wa = getWhatsAppDisplayNumber();
  const waHref = getWhatsAppHref(WA_ORDER_HELP);

  return (
    <div className="fs-account">
      <section className="fs-account-hero">
        <div className="fs-account-hero__copy">
          {eyebrow ? <p className="fs-account-hero__eyebrow">{eyebrow}</p> : null}
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <ProductCollage sources={[...ACCOUNT_COLLAGE]} />
      </section>

      <div className="fs-account-wrap">
        <nav className="fs-account-tabs" aria-label="Tu cuenta">
          <Link
            href="/cuenta/perfil"
            className={`fs-account-tab${pathname === "/cuenta/perfil" ? " is-active" : ""}`}
          >
            Mi Perfil
          </Link>
          <Link
            href="/cuenta/pedidos"
            className={`fs-account-tab${pathname === "/cuenta/pedidos" ? " is-active" : ""}`}
          >
            Mis pedidos
          </Link>
        </nav>

        <div className="fs-account-grid">
          <div className="fs-account-panel">{children}</div>
          <aside className="fs-account-aside">
            <h2>¿Necesitas ayuda? 💗</h2>
            <p className="fs-account-lead">
              Estamos para ayudarte con tu pedido.
              <br />
              Si tienes alguna duda sobre tu compra, envío o entrega, escríbenos y una de nuestras asesoras te ayudará. ✨
            </p>

            <div className="fs-store-card">
              <h3>💬 WhatsApp</h3>
              <p>
                <a href={waHref} target="_blank" rel="noreferrer">
                  {wa}
                </a>
                <br />
                Lunes a sábado · 9:00 a. m. – 6:00 p. m.
              </p>
            </div>

            <div className="fs-store-card">
              <h3>📦 Sobre tu envío</h3>
              <p>
                Preparamos tu pedido en máximo 2 días hábiles y el tiempo de entrega corre por cuenta de la
                transportadora.
              </p>
            </div>

            <div className="fs-store-card">
              <h3>💌 ¿Algo pasó con tu pedido?</h3>
              <p>
                Cuéntanos por WhatsApp y revisaremos tu caso contigo.
                <br />
                <a className="fs-account-wa-cta" href={waHref} target="_blank" rel="noreferrer">
                  HABLAR CON NOSOTRAS 💗
                </a>
              </p>
            </div>

            <div className="fs-store-card fs-store-card--points">
              <h3>🛒 Puntos de venta físicos en Manizales</h3>
              <ul className="fs-store-points">
                {STORE_POINTS.map((point) => (
                  <li key={point.name}>
                    <strong>{point.name}</strong>
                    {point.lines.map((line) => (
                      <span key={line}>{line}</span>
                    ))}
                    {point.hours.map((h) => (
                      <span key={h} className="fs-store-points__hours">
                        {h}
                      </span>
                    ))}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
