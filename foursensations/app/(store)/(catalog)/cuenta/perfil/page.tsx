import type { Metadata } from "next";
import { AccountFrame } from "@/components/store/account/AccountFrame";
import { AccountGate } from "@/components/store/account/AccountGate";
import { getStoreCustomerSession } from "@/lib/server/store-customer-account";

export const metadata: Metadata = {
  title: "Mi Perfil — Four Sensations",
  description: "Tu espacio en el Club de los Cabellos Perfectos.",
};

export const dynamic = "force-dynamic";

export default async function AccountProfilePage() {
  const customer = await getStoreCustomerSession();
  if (!customer) {
    return (
      <AccountFrame
        title="Tu espacio Four Sensations"
        subtitle="Inicia sesión para ver tu perfil, tus pedidos y el pulso de la tienda."
      >
        <AccountGate heading="Mi Perfil" />
      </AccountFrame>
    );
  }

  const initials = customer.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");

  return (
    <AccountFrame
      title={`Hola, ${customer.name.split(/\s+/)[0] || customer.name}`}
      subtitle="Este es tu rincón en Four Sensations: datos de cuenta, pedidos y el pulso de la tienda."
    >
      <h2>Mi Perfil</h2>
      <p className="fs-account-lead">
        Tus datos de sesión. Los usamos para reconocerte en la tienda y asociar tus compras a esta cuenta.
      </p>
      <div className="fs-account-profile">
        <div className="fs-account-avatar">
          {customer.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={customer.image} alt="" />
          ) : (
            initials || "FS"
          )}
        </div>
        <div>
          <strong>{customer.name}</strong>
          <span>{customer.email || "Sin correo visible"}</span>
        </div>
      </div>
      <div className="fs-account-facts">
        <div className="fs-account-fact">
          <b>Club</b>
          El Club de los Cabellos Perfectos
        </div>
        <div className="fs-account-fact">
          <b>Acceso</b>
          Cliente de tienda
        </div>
      </div>
    </AccountFrame>
  );
}
