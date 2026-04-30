import { CheckoutPageClient } from "@/components/store/CheckoutPageClient";
import "./checkout.css";

export const metadata = {
  title: "Checkout — GinnaBeauty",
  description: "Completa tu compra: envío y pago seguro con ePayco o Bold",
};

export default function CheckoutPage() {
  return <CheckoutPageClient />;
}
