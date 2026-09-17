import { Suspense } from "react";
import { CheckoutResultadoClient } from "@/components/store/CheckoutResultadoClient";
import "../checkout.css";

export const metadata = {
  title: "Resultado del pago — Four Sensations",
  description: "Estado de tu compra con ePayco",
};

export default function CheckoutResultadoPage() {
  return (
    <Suspense
      fallback={
        <div className="container" style={{ padding: "3rem 1rem", textAlign: "center" }}>
          Cargando…
        </div>
      }
    >
      <CheckoutResultadoClient />
    </Suspense>
  );
}
