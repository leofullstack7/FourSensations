import { CheckoutPageClient } from "@/components/store/CheckoutPageClient";
import "./checkout.css";

export const metadata = {
  title: "Checkout — GinnaBeauty",
  description: "Completa tu compra con pago seguro ePayco",
};

export default function CheckoutPage() {
  return <CheckoutPageClient />;
}
