import type { Metadata } from "next";
import "../legal-pages.css";
import {
  LegalGlassCard,
  LegalPageShell,
  LegalRevealSection,
} from "@/components/store/LegalPageShell";
import { getWhatsAppDisplayNumber, getWhatsAppHref } from "@/lib/storefront-contact";

export const metadata: Metadata = {
  title: "Políticas de Envío | Four Sensations",
  description:
    "Envíos, cambios, devoluciones, garantías, retracto y reversión del pago de FOUR SENSATIONS S.A.S. Despacho desde Manizales a todo Colombia.",
};

export const revalidate = 86400;

const WA_POLICY_MSG =
  "Holaaa Four Sensations 💗 Tuve una novedad con la entrega de mi pedido. ¿Me ayudan a revisarlo? ✨";

export default function PoliticasEnvioPage() {
  const wa = getWhatsAppDisplayNumber();
  const waHref = getWhatsAppHref(WA_POLICY_MSG);

  return (
    <LegalPageShell
      slug="politicas-envio"
      heroTitle="Políticas de envío y posventa"
      heroSubtitle="Todo lo que necesitas saber sobre tu compra, envío y servicio posventa."
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
            Todo Colombia.
          </LegalGlassCard>
        </div>
        <p className="legal-muted legal-mt-md">
          El plazo de hasta 2 días hábiles corresponde únicamente a la preparación de tu pedido. Una vez entregado a
          la transportadora, el tiempo de tránsito y la fecha de entrega dependen de esta.
        </p>
      </LegalRevealSection>

      <LegalRevealSection number={2} title="Novedades de transporte" variant="blush">
        <p>
          <strong>¿Tuviste alguna novedad con la entrega?</strong>
        </p>
        <p className="legal-mt-md">
          Si tu pedido presenta faltantes, productos equivocados, rotos, abiertos o derramados, te recomendamos
          reportarlo dentro de las primeras <strong>24 horas</strong> posteriores a la entrega registrada por la
          transportadora.
        </p>
        <p className="legal-mt-md">
          Para ayudarnos a revisar el caso más rápido, conserva y envíanos fotografías o videos del estado exterior de
          la caja, la guía, el proceso de apertura y los productos recibidos.
        </p>
        <p className="legal-mt-md">
          💗 Puedes comunicarte con nosotros a través de{" "}
          <a href={waHref} target="_blank" rel="noreferrer">
            WhatsApp ({wa})
          </a>
          .
        </p>
      </LegalRevealSection>

      <LegalRevealSection number={3} title="Cambios y devoluciones comerciales" variant="light">
        <p>
          Por tratarse de productos cosméticos y de cuidado personal, Four Sensations no ofrece cambios o devoluciones
          voluntarias por cambio de opinión, elección equivocada o porque el resultado cosmético obtenido sea diferente
          al esperado.
        </p>
        <p className="legal-muted legal-mt-md">
          Esto no limita los derechos que correspondan al consumidor conforme a la legislación colombiana, incluida la
          garantía legal y los demás mecanismos aplicables en cada caso.
        </p>
      </LegalRevealSection>

      <LegalRevealSection number={4} title="Garantía legal" variant="blush">
        <p>
          Four Sensations responde por la calidad, idoneidad y seguridad de sus productos en los términos establecidos
          por la legislación colombiana. Ten en cuenta que un resultado cosmético diferente al esperado no implica, por
          sí solo, que el producto sea defectuoso, ya que la experiencia de uso puede variar según las características
          del cabello, cuero cabelludo, procesos previos y hábitos de cada persona.
        </p>
        <p className="legal-mt-md">
          Si compraste en un distribuidor, el reclamo inicial se hace en el punto de compra; Four Sensations puede
          acompañar la validación si corresponde.
        </p>
      </LegalRevealSection>

      <LegalRevealSection number={5} title="Derecho de retracto" variant="light">
        <p>
          En las compras realizadas a distancia, el derecho de retracto se aplicará en los casos y bajo las condiciones
          previstas en el artículo 47 de la Ley 1480 de 2011. La misma norma establece excepciones, entre ellas la
          adquisición de bienes de uso personal.
        </p>
        <p className="legal-muted legal-mt-md">
          Cada solicitud será revisada de acuerdo con la naturaleza del producto adquirido y las disposiciones legales
          aplicables.
        </p>
      </LegalRevealSection>

      <LegalRevealSection number={6} title="Reversión del pago" variant="blush">
        <p>
          En las compras realizadas mediante mecanismos de comercio electrónico y pagadas con tarjeta u otro
          instrumento de pago electrónico, la reversión del pago podrá solicitarse en los casos previstos por la
          legislación colombiana, como fraude, operación no solicitada, producto no recibido, producto diferente al
          solicitado o producto defectuoso.
        </p>
        <p className="legal-mt-md">
          La solicitud deberá realizarse dentro de los <strong>cinco (5) días hábiles</strong> correspondientes,
          presentando la reclamación ante Four Sensations y notificando al emisor del instrumento de pago, conforme a
          la normativa aplicable.
        </p>
      </LegalRevealSection>
    </LegalPageShell>
  );
}
