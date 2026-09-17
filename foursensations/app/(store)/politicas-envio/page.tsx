import type { Metadata } from "next";
import "../legal-pages.css";
import {
  LegalGlassCard,
  LegalPageShell,
  LegalRevealSection,
} from "@/components/store/LegalPageShell";

export const metadata: Metadata = {
  title: "Políticas de Envío | Four Sensations",
  description:
    "Envíos, cambios, devoluciones, garantías, retracto y reversión del pago de FOUR SENSATIONS S.A.S. Despacho desde Manizales a todo Colombia.",
};

export const revalidate = 86400;

export default function PoliticasEnvioPage() {
  return (
    <LegalPageShell
      slug="politicas-envio"
      heroTitle="Políticas de envío y posventa"
      heroSubtitle="Despacho desde Manizales · Transparencia en cada pedido"
      footerNote="Resumen fiel a la política oficial de FOUR SENSATIONS S.A.S. Última actualización: 2026."
    >
      <LegalRevealSection number={1} title="Cómo enviamos" variant="light">
        <div className="legal-card-grid legal-card-grid--4">
          <LegalGlassCard icon="📍" title="Origen">
            Despacho desde Manizales, Caldas — Calle 65A #23A-15.
          </LegalGlassCard>
          <LegalGlassCard icon="⏱️" title="Preparación">
            Máximo <span className="legal-highlight">2 días hábiles</span> desde la confirmación del pedido.
          </LegalGlassCard>
          <LegalGlassCard icon="🚚" title="Transportadoras">
            Envía (principal). Interrapidísimo en zonas con reexpedición.
          </LegalGlassCard>
          <LegalGlassCard icon="🇨🇴" title="Cobertura">
            Todo Colombia. No hay recogida en tienda ni entrega el mismo día.
          </LegalGlassCard>
        </div>
        <p className="legal-muted legal-mt-md">
          El plazo de 2 días hábiles es solo el proceso interno de preparación. No se compromete una fecha exacta de
          entrega: el tránsito depende de la transportadora.
        </p>
      </LegalRevealSection>

      <LegalRevealSection number={2} title="Novedades de transporte" variant="blush">
        <p>
          Retraso, guía marcada como entregada sin recepción, producto faltante, equivocado, roto, abierto o derramado:
          reportar <strong>dentro de las primeras 24 horas</strong> posteriores a la entrega registrada por la
          transportadora, con evidencia fotográfica o video (caja antes y durante la apertura, estado exterior, guía,
          productos y daños visibles).
        </p>
        <p className="legal-muted legal-mt-md">
          Canales: atencionalcliente.befs@gmail.com · WhatsApp +57 304 363 2492 · horario 9:00 a. m. a 6:00 p. m.
        </p>
      </LegalRevealSection>

      <LegalRevealSection number={3} title="Cambios y devoluciones comerciales" variant="light">
        <p>
          <strong>No se aceptan</strong> por gusto personal, elección equivocada, cambio de opinión o resultado
          cosmético distinto al esperado: son productos cosméticos / de cuidado personal (higiene, seguridad y
          trazabilidad). Un producto que ya salió de las instalaciones no puede reingresar al inventario.
        </p>
        <p className="legal-muted legal-mt-md">
          Esto no afecta la garantía legal ni la reversión de pago cuando aplique.
        </p>
      </LegalRevealSection>

      <LegalRevealSection number={4} title="Garantía legal" variant="blush">
        <p>
          Four Sensations responde por calidad, idoneidad y seguridad del producto conforme a la ley colombiana. Un
          resultado cosmético distinto al esperado <strong>no</strong> equivale por sí solo a un producto defectuoso:
          los resultados varían según cabello, cuero cabelludo, procesos previos y hábitos.
        </p>
        <p>
          Si compraste en un distribuidor, el reclamo inicial se hace en el punto de compra; Four Sensations puede
          acompañar la validación si corresponde.
        </p>
      </LegalRevealSection>

      <LegalRevealSection number={5} title="Derecho de retracto" variant="light">
        <p>
          La ley colombiana lo contempla para ventas a distancia (Ley 1480 de 2011), <strong>con excepción legal para
          bienes de uso personal</strong>, como suele ser el caso de los productos cosméticos de Four Sensations, sin
          perjuicio de la garantía legal.
        </p>
      </LegalRevealSection>

      <LegalRevealSection number={6} title="Reversión del pago" variant="blush">
        <p>
          En compras con tarjeta o medio electrónico procede en casos de fraude, operación no solicitada, producto no
          recibido, producto distinto al pedido o producto defectuoso. Debe solicitarse dentro de los{" "}
          <strong>5 días hábiles</strong> siguientes al hecho, reclamando ante Four Sensations y notificando al emisor
          del medio de pago, conforme a la Ley 1480 de 2011.
        </p>
      </LegalRevealSection>
    </LegalPageShell>
  );
}
