import type { Metadata } from "next";
import "../legal-pages.css";
import { LegalPageShell, LegalRevealSection } from "@/components/store/LegalPageShell";

export const metadata: Metadata = {
  title: "Políticas de Privacidad | Four Sensations",
  description:
    "Tratamiento y protección de datos personales de FOUR SENSATIONS S.A.S., NIT 901.038.691-2, conforme a la Ley 1581 de 2012.",
};

export const revalidate = 86400;

export default function PoliticasPrivacidadPage() {
  return (
    <LegalPageShell
      slug="politicas-privacidad"
      heroTitle="Protección de datos personales"
      heroSubtitle="Tu información, tus derechos y nuestra responsabilidad."
      footerNote="Política de FOUR SENSATIONS S.A.S. · NIT 901.038.691-2"
    >
      <div className="legal-intro">
        <p>
          <strong>Responsable:</strong> FOUR SENSATIONS S.A.S., NIT 901.038.691-2. Manizales, Caldas — Calle 65A
          #23A-15. Contacto:{" "}
          <a href="mailto:atencionalcliente.befs@gmail.com">atencionalcliente.befs@gmail.com</a> · +57 304 363 2492.
        </p>
      </div>

      <LegalRevealSection number={1} title="A quién aplica" variant="light">
        <p>
          Clientes y compradores, usuarios del sitio, personas que contactan canales oficiales, mayoristas y
          distribuidores, proveedores, contratistas, trabajadores y exempleados, candidatos, participantes de
          promociones y visitantes de establecimientos, entre otros.
        </p>
      </LegalRevealSection>

      <LegalRevealSection number={2} title="Finalidades generales" variant="blush">
        <ul>
          <li>Gestionar pedidos, pagos, facturación, despacho, guías y posventa.</li>
          <li>Atención al cliente, novedades, garantías y relaciones con mayoristas o proveedores.</li>
          <li>Cumplimiento legal y tributario, auditoría, seguridad, estadísticas internas, prevención de fraude y defensa legal.</li>
        </ul>
      </LegalRevealSection>

      <LegalRevealSection number={3} title="Finalidades comerciales" variant="light">
        <p>
          Solo con autorización o base legal: informar productos nuevos, lanzamientos, promociones, descuentos,
          campañas, invitaciones a eventos, encuestas y personalización de comunicaciones por correo y otros canales
          autorizados.
        </p>
      </LegalRevealSection>

      <LegalRevealSection number={4} title="Datos sensibles" variant="blush">
        <p>
          El tratamiento de datos sensibles se realizará únicamente cuando sea necesario y exista una base legal que lo
          permita. Cuando se requiera autorización, esta será previa, expresa e informada, indicando la finalidad del
          tratamiento y el carácter facultativo de suministrar este tipo de información.
        </p>
      </LegalRevealSection>

      <LegalRevealSection number={5} title="Datos de niños, niñas y adolescentes" variant="light">
        <p>
          La recolección de información de menores de edad no constituye una finalidad habitual de Four Sensations.
          Cuando excepcionalmente sea necesario tratar estos datos, se respetará su interés superior y sus derechos
          fundamentales, aplicando las condiciones y autorizaciones exigidas por la legislación colombiana.
        </p>
      </LegalRevealSection>

      <LegalRevealSection number={6} title="Derechos del titular (Ley 1581 de 2012)" variant="blush">
        <p>Como titular de tus datos personales puedes:</p>
        <ul className="legal-mt-md">
          <li>Conocer, actualizar y rectificar tus datos personales.</li>
          <li>Solicitar prueba de la autorización, cuando corresponda.</li>
          <li>Solicitar información sobre el uso dado a tus datos.</li>
          <li>Acceder gratuitamente a tus datos personales objeto de tratamiento.</li>
          <li>Solicitar la supresión de tus datos o revocar la autorización cuando legalmente proceda.</li>
          <li>
            Presentar quejas ante la Superintendencia de Industria y Comercio, una vez cumplidos los requisitos legales
            aplicables.
          </li>
          <li>
            Abstenerte de responder preguntas sobre datos sensibles o datos de niños, niñas y adolescentes cuando
            tengan carácter facultativo.
          </li>
        </ul>
      </LegalRevealSection>

      <LegalRevealSection number={7} title="Consultas y reclamos" variant="light">
        <ul>
          <li>
            <strong>Consultas:</strong> respuesta en máximo 10 días hábiles; si no puede atenderse en ese plazo, se
            informa la demora y la nueva fecha no puede exceder 5 días hábiles adicionales.
          </li>
          <li>
            <strong>Reclamos:</strong> si está incompleto, se requiere al interesado dentro de 5 días hábiles; si pasan
            2 meses sin aportar lo solicitado, se entiende desistido. El término para resolver un reclamo completo es
            máximo 15 días hábiles, prorrogables hasta 8 días hábiles adicionales informando la razón.
          </li>
        </ul>
        <p className="legal-muted legal-mt-md">
          Canales de atención: puedes presentar tus consultas o reclamos a través de nuestro correo electrónico,
          WhatsApp o en nuestra dirección física indicada al inicio de esta política. Aplicamos medidas técnicas,
          administrativas y humanas razonables; la confidencialidad puede mantenerse tras terminar la relación.
        </p>
      </LegalRevealSection>

      <LegalRevealSection number={8} title="Encargados del tratamiento y terceros" variant="blush">
        <p>
          Para prestar nuestros servicios podemos compartir únicamente la información necesaria con terceros o
          encargados que intervienen en la operación, como transportadoras (Envía e Interrapidísimo), proveedores
          tecnológicos, plataformas de comercio electrónico, pasarelas de pago (hoy Mercado Pago) y otros proveedores
          necesarios para procesar compras, pagos, entregas y comunicaciones autorizadas. No almacenamos datos de
          tarjeta.
        </p>
        <p className="legal-mt-md">
          Four Sensations no vende tus datos personales a terceros con fines publicitarios.
        </p>
      </LegalRevealSection>
    </LegalPageShell>
  );
}
