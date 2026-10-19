import type { Metadata } from "next";
import { AccountFrame } from "@/components/store/account/AccountFrame";
import { AccountGate } from "@/components/store/account/AccountGate";
import { AccountCouponsClient } from "@/components/store/account/AccountCouponsClient";
import { getStoreCustomerSession } from "@/lib/server/store-customer-account";

export const metadata: Metadata = {
  title: "Mis cupones — Four Sensations",
  description: "Tus cupones de Four Sensations: iniciales y regalos del club.",
};

export const dynamic = "force-dynamic";

export default async function AccountCouponsPage() {
  const customer = await getStoreCustomerSession();
  if (!customer) {
    return (
      <AccountFrame
        title="Tus cupones Four Sensations"
        subtitle="Inicia sesión para ver el cupón inicial y todos los detalles que te enviemos."
      >
        <AccountGate heading="Mis cupones" />
      </AccountFrame>
    );
  }

  return (
    <AccountFrame
      title="Mis cupones"
      subtitle="Aquí viven tus detalles especiales: el cupón inicial y todo lo que el club te envíe."
    >
      <AccountCouponsClient />
    </AccountFrame>
  );
}
