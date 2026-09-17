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
      heroSubtitle="Tratamos tu información con el cuidado que merece tu cabello"
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

      <LegalRevealSection number={4} title="Datos sensibles y menores" variant="blush">
        <p>
          Los datos sensibles se tratan solo cuando es indispensable, informando finalidad y carácter opcional cuando
          aplique, con autorización explícita si la ley lo exige. Nunca se condiciona un servicio a dar información
          sensible innecesaria.
        </p>
        <p>
          La recolección no está dirigida específicamente a menores. Si excepcionalmente aplica, se siguen las reglas
          especiales de la ley colombiana (interés superior del menor y autorización del representante legal).
        </p>
      </LegalRevealSection>

      <LegalRevealSection number={5} title="Derechos del titular (Ley 1581 de 2012)" variant="light">
        <ul>
          <li>Conocer, acceder, actualizar y rectificar tus datos.</li>
          <li>Pedir prueba de la autorización y ser informado del uso.</li>
          <li>Consultar, reclamar, suprimir cuando proceda y revocar autorización.</li>
          <li>Quejarte ante la SIC y abstenerte de responder preguntas sobre información sensible facultativa.</li>
        </ul>
      </LegalRevealSection>

      <LegalRevealSection number={6} title="Consultas y reclamos" variant="blush">
        <ul>
          <li>
            <strong>Consultas:</strong> respuesta en máximo 10 días hábiles (prorrogable 5 días hábiles adicionales
            informando el motivo).
          </li>
          <li>
            <strong>Reclamos:</strong> si está incompleto, se requiere completar en 5 días hábiles (se entiende
            desistido si pasan 2 meses sin respuesta). Completo: respuesta en máximo 15 días hábiles (prorrogable 8
            días hábiles adicionales informando el motivo).
          </li>
        </ul>
        <p className="legal-muted legal-mt-md">
          Canal: el mismo correo, WhatsApp y dirección de arriba. Aplicamos medidas técnicas, administrativas y humanas
          razonables; la confidencialidad puede mantenerse tras terminar la relación.
        </p>
      </LegalRevealSection>

      <LegalRevealSection number={7} title="Encargados y terceros" variant="light">
        <ul>
          <li>Transportadoras (Envía, Interrapidísimo) con los datos necesarios para la entrega.</li>
          <li>Pasarelas de pago habilitadas (hoy ePayco) para procesar transacciones. No almacenamos datos de tarjeta.</li>
          <li>No vendemos tu información a terceros para publicidad de terceros.</li>
        </ul>
      </LegalRevealSection>
    </LegalPageShell>
  );
}
