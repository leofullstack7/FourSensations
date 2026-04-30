import { Suspense } from "react";
import { CheckoutResultadoClient } from "@/components/store/CheckoutResultadoClient";
import "../checkout.css";

export const metadata = {
  title: "Resultado del pago — GinnaBeauty",
  description: "Estado de tu compra (ePayco o Bold)",
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
