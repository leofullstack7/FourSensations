import type { Metadata } from "next";
import "../legal-pages.css";
import { LegalPageShell, LegalRevealSection } from "@/components/store/LegalPageShell";

export const metadata: Metadata = {
  title: "Términos y Condiciones | GinnaBeauty",
  description:
    "Términos y condiciones de uso y compra en GinnaBeauty: productos, pagos, cancelaciones, devoluciones y legislación aplicable en Colombia.",
};

/** Contenido legal estable: ISR cada 24h para mejor TTFB y caché CDN. */
export const revalidate = 86400;

export default function TerminosCondicionesPage() {
  return (
    <LegalPageShell
      slug="terminos-condiciones"
      heroTitle="Términos y Condiciones"
      heroSubtitle="Conoce las reglas que nos unen"
    >
      <div className="legal-intro">
        <p>
          <strong>Ginna Beauty</strong> · Bogotá, Colombia. Contacto:{" "}
          <a href="mailto:ginnabeautycosmeticos@gmail.com">ginnabeautycosmeticos@gmail.com</a>
        </p>
      </div>

      <LegalRevealSection number={1} title="Aceptación de términos" variant="light">
        <p>
          Al realizar una compra en <strong>ginnabeauty.com</strong>, el usuario acepta estos términos. Si no está de
          acuerdo, debe abstenerse de usar el sitio.
        </p>
      </LegalRevealSection>

      <LegalRevealSection number={2} title="Productos y disponibilidad" variant="blush">
        <ul>
          <li>Todos los productos están sujetos a disponibilidad de inventario.</li>
          <li>Las imágenes son referenciales; el color puede variar ligeramente según la pantalla.</li>
          <li>Nos reservamos el derecho de modificar precios sin previo aviso.</li>
          <li>En caso de error de precio evidente, contactaremos al cliente antes de procesar.</li>
        </ul>
      </LegalRevealSection>

      <LegalRevealSection number={3} title="Proceso de compra" variant="light">
        <ul>
          <li>El pedido se confirma solo cuando el pago es aprobado por la pasarela.</li>
          <li>Recibirás un correo de confirmación con tu número de orden.</li>
          <li>No manejamos pago contra entrega.</li>
          <li>Aceptamos tarjetas débito/crédito y PSE.</li>
        </ul>
      </LegalRevealSection>

      <LegalRevealSection number={4} title="Cancelaciones y cambios" variant="blush">
        <ul>
          <li>
            Puedes cancelar tu pedido dentro de las <strong>2 horas</strong> siguientes al pago escribiendo al WhatsApp
            de atención.
          </li>
          <li>Una vez despachado, no es posible cancelar.</li>
          <li>Los cambios de dirección deben solicitarse antes del despacho.</li>
        </ul>
      </LegalRevealSection>

      <LegalRevealSection number={5} title="Devoluciones y garantía" variant="light">
        <ul>
          <li>Aceptamos devoluciones dentro de los 5 días hábiles siguientes a la recepción.</li>
          <li>El producto debe estar sin uso, en su empaque original.</li>
          <li>No aplica para productos de higiene personal abiertos.</li>
          <li>El cliente asume el costo del envío de devolución salvo defecto de fábrica.</li>
        </ul>
      </LegalRevealSection>

      <LegalRevealSection number={6} title="Propiedad intelectual" variant="blush">
        <p>
          Todo el contenido del sitio (imágenes, textos, logo, diseño) es propiedad de <strong>Ginna Beauty</strong>.
          Queda prohibida su reproducción sin autorización escrita.
        </p>
      </LegalRevealSection>

      <LegalRevealSection number={7} title="Limitación de responsabilidad" variant="light">
        <p>
          Ginna Beauty no se hace responsable por demoras causadas por terceros (transportadoras, pasarelas de pago),
          ni por uso inadecuado de los productos.
        </p>
      </LegalRevealSection>

      <LegalRevealSection number={8} title="Ley aplicable" variant="blush">
        <p>
          Estos términos se rigen por las leyes colombianas. Cualquier disputa se resolverá conforme a la legislación
          vigente en Colombia.
        </p>
      </LegalRevealSection>
    </LegalPageShell>
  );
}
