import type { Metadata } from "next";
import "../legal-pages.css";
import { LegalPageShell, LegalRevealSection } from "@/components/store/LegalPageShell";

export const metadata: Metadata = {
  title: "Términos y Condiciones | Four Sensations",
  description:
    "Términos de uso y compra en Four Sensations: productos cosméticos, pagos, despacho desde Manizales y legislación colombiana.",
};

export const revalidate = 86400;

export default function TerminosCondicionesPage() {
  return (
    <LegalPageShell
      slug="terminos-condiciones"
      heroTitle="Términos y Condiciones"
      heroSubtitle="Las reglas que nos unen en el Club de los Cabellos Perfectos"
    >
      <div className="legal-intro">
        <p>
          <strong>FOUR SENSATIONS S.A.S.</strong> · NIT 901.038.691-2 · Manizales, Caldas, Colombia · Calle 65A
          #23A-15 ·{" "}
          <a href="mailto:atencionalcliente.befs@gmail.com">atencionalcliente.befs@gmail.com</a>
        </p>
      </div>

      <LegalRevealSection number={1} title="Aceptación" variant="light">
        <p>
          Al usar este sitio o realizar una compra, aceptas estos términos y las políticas de envío y de datos
          personales. Si no estás de acuerdo, abstente de usar el sitio.
        </p>
      </LegalRevealSection>

      <LegalRevealSection number={2} title="Productos y disponibilidad" variant="blush">
        <ul>
          <li>Productos de cuidado capilar, accesorios y, cuando aplique, otras líneas publicadas en el catálogo.</li>
          <li>Sujetos a inventario. Las imágenes son referenciales.</li>
          <li>Los precios pueden actualizarse; un error evidente se avisará antes de procesar el pedido.</li>
          <li>Los resultados cosméticos varían según el cabello y el uso; no constituyen promesa de un resultado único.</li>
        </ul>
      </LegalRevealSection>

      <LegalRevealSection number={3} title="Compra y pagos" variant="light">
        <ul>
          <li>El pedido se confirma cuando la pasarela aprueba el pago. El producto se paga en línea. Si el destino no tiene cobertura Envía, el flete de Interrapidísimo se paga contraentrega.</li>
          <li>Aceptamos los medios habilitados en el checkout (hoy Mercado Pago: tarjetas y PSE). No almacenamos datos de tarjeta.</li>
          <li>Recibirás confirmación al correo registrado, cuando el servicio de email esté configurado.</li>
        </ul>
      </LegalRevealSection>

      <LegalRevealSection number={4} title="Despacho" variant="blush">
        <ul>
          <li>Despacho desde Manizales. Preparación: máximo 2 días hábiles desde la confirmación.</li>
          <li>No hay recogida en tienda ni entrega el mismo día en Bogotá u otras ciudades.</li>
          <li>Los cambios de dirección deben pedirse antes del despacho, por WhatsApp o correo.</li>
        </ul>
      </LegalRevealSection>

      <LegalRevealSection number={5} title="Cambios, garantía y retracto" variant="light">
        <p>
          No hay cambios comerciales por gusto o resultado estético distinto al esperado. Sí aplica la garantía legal
          por calidad, idoneidad y seguridad. El retracto en ventas a distancia tiene excepción para bienes de uso
          personal. El detalle está en{" "}
          <a href="/politicas-envio">Políticas de envío</a>.
        </p>
      </LegalRevealSection>

      <LegalRevealSection number={6} title="Propiedad intelectual" variant="blush">
        <p>
          Textos, logo, diseño e imágenes del sitio son de FOUR SENSATIONS S.A.S. Queda prohibida su reproducción sin
          autorización escrita.
        </p>
      </LegalRevealSection>

      <LegalRevealSection number={7} title="Responsabilidad" variant="light">
        <p>
          Four Sensations no responde por demoras de transportadoras o pasarelas, ni por uso inadecuado de los
          productos. Estos términos se rigen por las leyes de Colombia.
        </p>
      </LegalRevealSection>
    </LegalPageShell>
  );
}
