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
  title: "Girl, ¡Qué buenas elecciones! 🛍️🩷",
  subtitle:
    "Consulta tus compras, revisa cada detalle y encuentra fácilmente esos productos que tanto te encantaron 🎀 Porque elegir solo uno es ¡IMPOSIBLE!",
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
      subtitle={ORDERS_HERO.subtitle}
    >
      <h2>Historial</h2>
      <AccountOrders orders={orders} />
    </AccountFrame>
  );
}
