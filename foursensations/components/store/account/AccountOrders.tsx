import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { isDisplayableImageUrl } from "@/lib/util/image-url";
import type { CustomerOrderView } from "@/lib/server/store-customer-account";
import type { OrderStatus, PaymentStatus } from "@prisma/client";

function orderChip(status: OrderStatus, payment: PaymentStatus): { label: string; kind: "paid" | "pending" | "other" } {
  if (status === "PAID" || payment === "APPROVED") return { label: "Pagado", kind: "paid" };
  if (status === "CANCELLED") return { label: "Cancelado", kind: "other" };
  if (status === "FAILED" || payment === "DECLINED") return { label: "No aprobado", kind: "other" };
  if (payment === "EXPIRED") return { label: "Expirado", kind: "other" };
  if (payment === "PROCESSING") return { label: "En proceso", kind: "pending" };
  return { label: "Por pagar", kind: "pending" };
}

function formatOrderDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-CO", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function AccountOrders({ orders }: { orders: CustomerOrderView[] }) {
  if (orders.length === 0) {
    return (
      <div className="fs-orders-empty">
        <p>Aún no hay pedidos en esta cuenta. Cuando compres, aparecerán aquí con su estado y detalle.</p>
        <Link href="/">Explorar la tienda</Link>
      </div>
    );
  }

  return (
    <div className="fs-orders">
      {orders.map((order) => {
        const chip = orderChip(order.status, order.paymentStatus);
        return (
          <article key={order.id} className="fs-order-card">
            <div className="fs-order-head">
              <div>
                <p className="fs-order-ref">{order.reference}</p>
                <p className="fs-order-date">
                  {formatOrderDate(order.createdAt)}
                  {order.city ? ` · ${order.city}` : ""}
                </p>
              </div>
              <span className={`fs-order-chip fs-order-chip--${chip.kind}`}>{chip.label}</span>
            </div>
            <div className="fs-order-items">
              {order.items.map((item) => (
                <div key={item.id} className="fs-order-item">
                  <div className="fs-order-thumb">
                    {isDisplayableImageUrl(item.imageUrl) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl!} alt="" />
                    ) : (
                      "✦"
                    )}
                  </div>
                  <span>
                    {item.quantity}× {item.name}
                  </span>
                </div>
              ))}
            </div>
            <div className="fs-order-foot">
              <span>
                Envío {formatPrice(order.shipping)} · {order.items.reduce((n, i) => n + i.quantity, 0)} productos
              </span>
              <strong>{formatPrice(order.total)}</strong>
            </div>
          </article>
        );
      })}
    </div>
  );
}
