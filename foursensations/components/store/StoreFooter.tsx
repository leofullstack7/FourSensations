"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useStorefrontUi } from "@/components/store/storefront-ui-context";
import { resolveStoreCategoryHref } from "@/lib/store/menu-item-href";
import {
  getWhatsAppHref,
  WHATSAPP_CAREERS_MESSAGE,
  WHATSAPP_SUPPORT_MESSAGE,
} from "@/lib/storefront-contact";

function normalizeLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function footerProductNames(menuNames: string[]): string[] {
  const corporal = menuNames.filter((name) => normalizeLabel(name) === "cuidado corporal");
  const rest = menuNames.filter((name) => normalizeLabel(name) !== "cuidado corporal");
  return [...rest, ...(corporal.length > 0 ? corporal : ["Cuidado Corporal"])];
}

export function StoreFooter() {
  const { menuConfig, categoryPath } = useStorefrontUi();
  const productNames = footerProductNames(Object.keys(menuConfig));

  return (
    <footer>
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <BrandLogo variant="store" inverted />
            <p className="footer-desc">
              Four Sensations — marca colombiana de cuidado capilar. El Club de los Cabellos Perfectos.
              Envíos a todo Colombia desde Manizales.
            </p>
            <p className="footer-desc footer-desc--privileges">
              Ser Four Girl tiene sus privilegios,
              <br />
              SIEMPRE TIENEN LAS PRIMICIAS💌
              <br />
              Lanzamientos, ediciones limitadas, sorpresas, secretos capilares y novedades que
              definitivamente vas a querer tener en el radar.
            </p>
          </div>
          <div className="footer-col">
            <h4>Productos</h4>
            <div className="footer-links">
              {productNames.map((catName) => (
                <Link key={catName} href={resolveStoreCategoryHref(categoryPath(catName))} prefetch>
                  {catName}
                </Link>
              ))}
            </div>
          </div>
          <div className="footer-col">
            <h4>Empresa</h4>
            <div className="footer-links">
              <Link href="/sobre-nosotros">Sobre nosotros</Link>
              <Link href="/mayorista">Programa mayorista</Link>
              <a href={getWhatsAppHref(WHATSAPP_CAREERS_MESSAGE)} target="_blank" rel="noreferrer">
                Trabaja con nosotros
              </a>
            </div>
          </div>
          <div className="footer-col">
            <h4>Ayuda</h4>
            <div className="footer-links">
              <a href={getWhatsAppHref(WHATSAPP_SUPPORT_MESSAGE)} target="_blank" rel="noreferrer">
                WhatsApp de atención
              </a>
              <Link href="/cuenta/pedidos">Mis pedidos</Link>
              <Link href="/politicas-envio">Envíos, garantía y posventa</Link>
              <Link href="/politicas-privacidad">Política de privacidad</Link>
              <Link href="/terminos-condiciones">Términos y condiciones</Link>
            </div>
          </div>
        </div>
      </div>
      <div className="container">
        <div className="footer-bottom">
          <span>© 2026 Four Sensations. Todos los derechos reservados.</span>
          <div className="footer-payments">
            <span className="payment-chip">Mercado Pago</span>
            <span className="payment-chip">PSE</span>
            <span className="payment-chip">Visa</span>
            <span className="payment-chip">Mastercard</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
