"use client";

import Image from "next/image";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useStorefrontUi } from "@/components/store/storefront-ui-context";
import { resolveStoreCategoryHref } from "@/lib/store/menu-item-href";
import {
  getWhatsAppHref,
  WHATSAPP_CAREERS_MESSAGE,
  WHATSAPP_SUPPORT_MESSAGE,
} from "@/lib/storefront-contact";
import addiLogo from "@/assets/foursensations/payments/addi.png";
import mercadoPagoLogo from "@/assets/foursensations/payments/mercado-pago.png";
import sistecreditoLogo from "@/assets/foursensations/payments/sistecredito.png";

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
              Four Sensations
              <br />
              ¡Creamos nuevas formas de amar, cuidar y disfrutar tu cabello!💗
              <br />
              <strong>BE YOU, BE FOUR SENSATIONS</strong>
              <br />
              Marca Colombiana 🇨🇴 · Hecho en Colombia
            </p>
          </div>
          <div className="footer-cols">
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
      </div>
      <div className="container">
        <div className="footer-bottom">
          <span>© 2026 Four Sensations S.A.S. Todos los derechos reservados</span>
          <div className="footer-payments" aria-label="Medios de pago">
            <span className="payment-logo payment-logo--mp">
              <Image src={mercadoPagoLogo} alt="Mercado Pago" height={28} unoptimized />
            </span>
            <span className="payment-logo payment-logo--addi">
              <Image src={addiLogo} alt="Addi" height={26} unoptimized />
            </span>
            <span className="payment-logo payment-logo--siste">
              <Image src={sistecreditoLogo} alt="Sistecrédito" height={22} unoptimized />
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
