import type { Metadata } from "next";
import "../legal-pages.css";
import {
  LegalGlassCard,
  LegalPageShell,
  LegalRevealSection,
} from "@/components/store/LegalPageShell";

export const metadata: Metadata = {
  title: "Políticas de Envío | GinnaBeauty",
  description:
    "Conoce cómo enviamos tus pedidos GinnaBeauty: tiempos, tarifas, recogida en tienda y garantías de entrega en Colombia.",
};

/** Contenido legal estable: ISR cada 24h para mejor TTFB y caché CDN. */
export const revalidate = 86400;

export default function PoliticasEnvioPage() {
  return (
    <LegalPageShell
      slug="politicas-envio"
      heroTitle="Políticas de Envío"
      heroSubtitle="Transparencia y compromiso en cada entrega"
    >
      <LegalRevealSection number={1} title="Cómo funciona nuestro envío" variant="light">
        <div className="legal-card-grid legal-card-grid--4">
          <LegalGlassCard icon="🚚" title="Envío gratis">
            Envío gratis en compras mayores a <span className="legal-highlight">$130.000</span>.
          </LegalGlassCard>
          <LegalGlassCard icon="⚡" title="Bogotá Express">
            Recibe hoy si compras antes de las 12m (lunes a viernes).
          </LegalGlassCard>
          <LegalGlassCard icon="🏪" title="Recogida en tienda">
            Gratis. Confirmamos disponibilidad por WhatsApp.
          </LegalGlassCard>
          <LegalGlassCard icon="💳" title="Pagos seguros">
            Tarjetas y PSE; no manejamos pago contra entrega.
          </LegalGlassCard>
        </div>
      </LegalRevealSection>

      <LegalRevealSection number={2} title="Tiempos de entrega" variant="blush">
        <ul>
          <li>
            <strong>Bogotá:</strong> mismo día (si compras antes de mediodía) o 24–48h hábiles.
          </li>
          <li>
            <strong>Nacional:</strong> 3 a 5 días hábiles vía Servientrega o Interrapidísimo.
          </li>
          <li>
            <strong>Fines de semana y festivos:</strong> se gestionan el siguiente día hábil.
          </li>
        </ul>
      </LegalRevealSection>

      <LegalRevealSection number={3} title="Tarifas de envío" variant="light">
        <div className="legal-table-wrap">
          <table className="legal-table">
            <thead>
              <tr>
                <th>Zona</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Bogotá y Soacha</td>
                <td>$9.000</td>
              </tr>
              <tr>
                <td>Regional (Chía, Cajicá, Zipaquirá, Funza, Madrid)</td>
                <td>$12.000</td>
              </tr>
              <tr>
                <td>Nacional principal (Medellín, Cali, Barranquilla, Bucaramanga)</td>
                <td>$14.500</td>
              </tr>
              <tr>
                <td>Nacional resto</td>
                <td>$19.900</td>
              </tr>
              <tr>
                <td>Recogida en tienda</td>
                <td>
                  <strong>GRATIS</strong>
                </td>
              </tr>
              <tr>
                <td>Compras mayores a $130.000</td>
                <td>
                  <strong>GRATIS</strong> (todas las zonas)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </LegalRevealSection>

      <LegalRevealSection number={4} title="Recogida en tienda (Pick-up)" variant="blush">
        <p>
          Puedes recoger tu pedido sin costo. Confirmado el pago, te avisamos por WhatsApp en aproximadamente{" "}
          <strong>4 horas hábiles</strong> con el mensaje <span className="legal-highlight">«Pedido Listo»</span>. Por
          favor no acudas sin confirmación previa.
        </p>
      </LegalRevealSection>

      <LegalRevealSection number={5} title="Recepción y garantía" variant="light">
        <ul>
          <li>Revisa tu paquete al recibirlo.</li>
          <li>
            Si lo recibe un tercero (por ejemplo portería), tienes <strong>12 horas</strong> para reportar daños al
            WhatsApp de atención.
          </li>
          <li>Después de ese plazo se acepta entrega en perfecto estado.</li>
        </ul>
      </LegalRevealSection>

      <LegalRevealSection number={6} title="Envíos de gran volumen" variant="blush">
        <p>
          Para kits capilares grandes o compras mayoristas que superen el peso estándar, nuestro equipo te contactará
          para coordinar el flete adicional.
        </p>
      </LegalRevealSection>
    </LegalPageShell>
  );
}
