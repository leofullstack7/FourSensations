"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import collageA from "@/assets/productos/FS001 Proteína 10 en 1/FS001-1.webp";
import collageB from "@/assets/productos/FS002 Dulce Renacer/FS002-1.webp";
import collageC from "@/assets/productos/FS005 Botanical/FS005-1.webp";
import { ProductCollage } from "@/components/store/ProductCollage";
import { getWhatsAppDisplayNumber, getWhatsAppHref } from "@/lib/storefront-contact";

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

  return (
    <div className="fs-account">
      <section className="fs-account-hero">
        <div className="fs-account-hero__copy">
          {eyebrow ? <p className="fs-account-hero__eyebrow">{eyebrow}</p> : null}
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <ProductCollage sources={[collageA, collageB, collageC]} />
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
            <h2>La tienda</h2>
            <p className="fs-account-lead">Cuidado capilar con ciencia y encanto, despachado desde Manizales.</p>
            <div className="fs-store-card">
              <h3>Envíos</h3>
              <p>Preparación en máximo 2 días hábiles. Cobertura a todo Colombia con Envía e Interrapidísimo. El tránsito no es una fecha de entrega prometida.</p>
            </div>
            <div className="fs-store-card">
              <h3>Posventa</h3>
              <p>
                Sin cambios por gusto (productos de uso personal). Sí garantía legal. Novedades de transporte: 24 horas.{" "}
                <Link href="/politicas-envio">Ver políticas</Link>.
              </p>
            </div>
            <div className="fs-store-card">
              <h3>Origen</h3>
              <p>FOUR SENSATIONS S.A.S. · Calle 65A #23A-15, Manizales, Caldas.</p>
            </div>
            <div className="fs-store-card">
              <h3>Atención</h3>
              <p>
                WhatsApp{" "}
                <a href={getWhatsAppHref("Hola Four Sensations, escribo desde mi cuenta.")} target="_blank" rel="noreferrer">
                  {wa}
                </a>
                <br />
                atencionalcliente.befs@gmail.com
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
