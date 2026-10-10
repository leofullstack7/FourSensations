import { CheckoutPageClient } from "@/components/store/CheckoutPageClient";
import "./checkout.css";

export const metadata = {
  title: "Checkout — Four Sensations",
  description: "Completa tu compra: despacho desde Manizales y pago en línea con Mercado Pago",
};

export default function CheckoutPage() {
  return <CheckoutPageClient />;
}
