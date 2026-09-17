import type { Metadata } from "next";
import { AccountFrame } from "@/components/store/account/AccountFrame";
import { AccountGate } from "@/components/store/account/AccountGate";
import { AccountOrders } from "@/components/store/account/AccountOrders";
import { getStoreCustomerSession, listCustomerOrders } from "@/lib/server/store-customer-account";

export const metadata: Metadata = {
  title: "Mis pedidos — Four Sensations",
  description: "Historial de compras de tu cuenta Four Sensations.",
};

export const dynamic = "force-dynamic";

export default async function AccountOrdersPage() {
  const customer = await getStoreCustomerSession();
  if (!customer) {
    return (
      <AccountFrame
        title="Tus pedidos"
        subtitle="Inicia sesión para ver el historial de compras ligado a tu cuenta."
      >
        <AccountGate heading="Mis pedidos" />
      </AccountFrame>
    );
  }

  const orders = await listCustomerOrders(customer.id, customer.email);

  return (
    <AccountFrame
      title="Mis pedidos"
      subtitle="Cada compra queda guardada aquí: estado, productos y total, con la misma calidez de la tienda."
    >
      <h2>Historial</h2>
      <p className="fs-account-lead">
        Pedidos ligados a tu cuenta o al mismo correo con el que compraste. El pago se confirma cuando la pasarela nos
        avisa.
      </p>
      <AccountOrders orders={orders} />
    </AccountFrame>
  );
}
