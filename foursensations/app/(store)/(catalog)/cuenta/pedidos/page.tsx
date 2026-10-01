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

const ORDERS_HERO = {
  title: "¡Tu historial de obsesiones!",
  subtitle:
    "¿Quieres saber qué pediste, volver por un favorito o consultar tus compras? Inicia sesión y encuentra todos tus pedidos Four Sensations aquí. ✨",
} as const;

export default async function AccountOrdersPage() {
  const customer = await getStoreCustomerSession();
  if (!customer) {
    return (
      <AccountFrame title={ORDERS_HERO.title} subtitle={ORDERS_HERO.subtitle}>
        <AccountGate
          heading="Mis pedidos"
          lead="Tus favoritos, tus compras y tus próximas obsesiones 💗"
          body="Inicia sesión para consultar tus pedidos, guardar tus favoritos y hacer tus próximas compras mucho más fácil."
        />
      </AccountFrame>
    );
  }

  const orders = await listCustomerOrders(customer.id, customer.email);

  return (
    <AccountFrame
      title={ORDERS_HERO.title}
      subtitle="Cada compra queda guardada aquí: estado, productos y total. Vuelve cuando quieras por un favorito. ✨"
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
