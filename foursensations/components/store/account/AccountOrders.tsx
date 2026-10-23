"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { isDisplayableImageUrl } from "@/lib/util/image-url";
import { FULFILLMENT_STAGES, clampFulfillmentStage } from "@/lib/fulfillment-kanban";
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

function OrderTrackingTimeline({ stage }: { stage: number }) {
  const current = clampFulfillmentStage(stage);
  return (
    <div className="fs-order-track" role="list" aria-label="Estado del pedido">
      <ol className="fs-order-track__line">
        {FULFILLMENT_STAGES.map((step) => {
          const done = step.id < current;
          const active = step.id === current;
          return (
            <li
              key={step.id}
              role="listitem"
              className={`fs-order-track__step${done ? " is-done" : ""}${active ? " is-active" : ""}`}
            >
              <span className="fs-order-track__dot" aria-hidden>
                {done || active ? "●" : "○"}
              </span>
              <span className="fs-order-track__title">{step.title}</span>
              {active ? <span className="fs-order-track__body">{step.body}</span> : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function OrderCard({ order }: { order: CustomerOrderView }) {
  const [open, setOpen] = useState(false);
  const chip = orderChip(order.status, order.paymentStatus);
  const stage = clampFulfillmentStage(order.fulfillmentStage);

  return (
    <article className="fs-order-card">
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
      <div className="fs-order-track-actions">
        <button
          type="button"
          className="fs-order-track-btn"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Ocultar estado" : "Ver estado de mi pedido"}
        </button>
      </div>
      {open ? <OrderTrackingTimeline stage={stage} /> : null}
    </article>
  );
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
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  );
}
