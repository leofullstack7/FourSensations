"use client";

import { useStorefrontUi } from "@/components/store/storefront-ui-context";

const DEFAULT_BODY =
  "Inicia sesión o crea tu cuenta para ver tu perfil, tus pedidos y darte la bienvenida en la tienda.";

export function AccountGate({
  heading,
  lead,
  body,
}: {
  heading: string;
  /** Línea destacada bajo el título (ej. pedidos). */
  lead?: string;
  body?: string;
}) {
  const { openAccount } = useStorefrontUi();

  return (
    <div className="fs-account-gate">
      <h1>{heading}</h1>
      {lead ? <p className="fs-account-gate__lead">{lead}</p> : null}
      <p>{body ?? DEFAULT_BODY}</p>
      <button type="button" onClick={openAccount}>
        Iniciar sesión
      </button>
    </div>
  );
}
