import type { Metadata } from "next";
import "../legal-pages.css";
import { LegalPageShell, LegalRevealSection } from "@/components/store/LegalPageShell";

export const metadata: Metadata = {
  title: "Políticas de Privacidad | GinnaBeauty",
  description:
    "Política de privacidad de GinnaBeauty: qué datos recopilamos, cómo los usamos, tus derechos según la Ley 1581 de 2012 y seguridad de la información.",
};

/** Contenido legal estable: ISR cada 24h para mejor TTFB y caché CDN. */
export const revalidate = 86400;

export default function PoliticasPrivacidadPage() {
  return (
    <LegalPageShell
      slug="politicas-privacidad"
      heroTitle="Políticas de Privacidad"
      heroSubtitle="Tu información, protegida con cuidado"
      footerNote="Última actualización: Mayo 2025"
    >
      <div className="legal-intro">
        <p>
          <strong>Ginna Beauty</strong> · Bogotá, Colombia. Contacto:{" "}
          <a href="mailto:ginnabeautycosmeticos@gmail.com">ginnabeautycosmeticos@gmail.com</a>
        </p>
      </div>

      <LegalRevealSection number={1} title="¿Qué información recopilamos?" variant="light">
        <ul>
          <li>Nombre completo</li>
          <li>Correo electrónico</li>
          <li>Teléfono</li>
          <li>Dirección de envío</li>
          <li>Información de pago (procesada por pasarelas seguras; no almacenamos datos de tarjeta)</li>
          <li>Historial de compras</li>
        </ul>
      </LegalRevealSection>

      <LegalRevealSection number={2} title="¿Para qué usamos tu información?" variant="blush">
        <ul>
          <li>Procesar y entregar tus pedidos</li>
          <li>Enviarte confirmaciones y actualizaciones de tu compra</li>
          <li>Mejorar nuestra tienda y experiencia de usuario</li>
          <li>Enviarte comunicaciones de marketing (solo si diste tu consentimiento)</li>
          <li>Cumplir obligaciones legales y fiscales</li>
        </ul>
      </LegalRevealSection>

      <LegalRevealSection number={3} title="¿Con quién compartimos tu información?" variant="light">
        <ul>
          <li>
            <strong>Transportadoras</strong> (Servientrega, Interrapidísimo) solo con los datos necesarios para la
            entrega
          </li>
          <li>
            <strong>Pasarelas de pago</strong> (ePayco, Bold) para procesar transacciones de forma segura
          </li>
          <li>No vendemos ni compartimos tu información con terceros para fines publicitarios</li>
        </ul>
      </LegalRevealSection>

      <LegalRevealSection number={4} title="Seguridad de los datos" variant="blush">
        <p>
          Utilizamos conexiones cifradas (HTTPS), almacenamiento seguro en la nube y acceso restringido a los datos. Sin
          embargo, ningún sistema es 100% infalible; en caso de brecha, notificaremos a los afectados.
        </p>
      </LegalRevealSection>

      <LegalRevealSection number={5} title="Tus derechos (Ley 1581 de 2012 — Colombia)" variant="light">
        <ul>
          <li>Conocer, actualizar y rectificar tus datos</li>
          <li>Solicitar la eliminación de tu información</li>
          <li>Revocar la autorización de tratamiento de datos</li>
        </ul>
        <p className="legal-muted legal-mt-md">
          Para ejercer estos derechos escríbenos a:{" "}
          <a href="mailto:ginnabeautycosmeticos@gmail.com">ginnabeautycosmeticos@gmail.com</a>
        </p>
      </LegalRevealSection>

      <LegalRevealSection number={6} title="Cookies" variant="blush">
        <p>
          Usamos cookies para mejorar la experiencia de navegación y recordar tu carrito. Puedes desactivarlas desde tu
          navegador aunque algunas funciones pueden verse afectadas.
        </p>
      </LegalRevealSection>

      <LegalRevealSection number={7} title="Cambios a esta política" variant="light">
        <p>
          Nos reservamos el derecho de actualizar esta política. La fecha de última actualización aparece al pie de
          esta página. Te recomendamos revisarla periódicamente.
        </p>
      </LegalRevealSection>
    </LegalPageShell>
  );
}
