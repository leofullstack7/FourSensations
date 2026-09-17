"use client";

import { useStorefrontUi } from "@/components/store/storefront-ui-context";

export function AccountGate({ heading }: { heading: string }) {
  const { openAccount } = useStorefrontUi();

  return (
    <div className="fs-account-gate">
      <h1>{heading}</h1>
      <p>Inicia sesión o crea tu cuenta para ver tu perfil, tus pedidos y darte la bienvenida en la tienda.</p>
      <button type="button" onClick={openAccount}>
        Iniciar sesión
      </button>
    </div>
  );
}
