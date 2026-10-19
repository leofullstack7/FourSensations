"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchAdminFulfillmentOrders,
  patchAdminOrderFulfillmentStage,
} from "@/lib/api/admin-fulfillment";
import {
  FULFILLMENT_STAGES,
  bogotaDateKey,
  isFulfillmentStageLate,
  todayBogotaKey,
  type FulfillmentStageId,
} from "@/lib/fulfillment-kanban";
import { formatPrice } from "@/lib/format";
import { isHttpImageUrl } from "@/lib/util/image-url";
import type { AdminFulfillmentOrder } from "@/lib/types/admin-fulfillment";

type Mode = "all" | "day";

function addrLines(addr: Record<string, unknown> | null): string[] {
  if (!addr) return [];
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = addr[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
  };
  return [
    pick("line1", "address", "street", "direccion"),
    [pick("city", "ciudad"), pick("region", "state", "departamento")].filter(Boolean).join(", "),
    pick("postalCode", "zip", "codigoPostal"),
    pick("shippingZoneLabel"),
    pick("shippingCarrierLabel"),
    pick("fulfillment") === "store_pickup" ? "Recoger en tienda" : "",
  ].filter(Boolean);
}

export function AdminFulfillmentKanban({
  mode = "all",
  showToast,
  embedded = false,
}: {
  mode?: Mode;
  showToast: (msg: string, type?: string, icon?: string) => void;
  embedded?: boolean;
}) {
  const [orders, setOrders] = useState<AdminFulfillmentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState(todayBogotaKey);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<FulfillmentStageId | null>(null);
  const [selected, setSelected] = useState<AdminFulfillmentOrder | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchAdminFulfillmentOrders();
      setOrders(list);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Error al cargar pedidos", "danger", "⚠️");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const visible = useMemo(() => {
    if (mode !== "day") return orders;
    return orders.filter((o) => bogotaDateKey(o.fulfillmentStageAt) === day);
  }, [orders, mode, day, tick]);

  const byStage = useMemo(() => {
    const map = new Map<FulfillmentStageId, AdminFulfillmentOrder[]>();
    for (const s of FULFILLMENT_STAGES) map.set(s.id, []);
    for (const o of visible) {
      const list = map.get(o.fulfillmentStage) ?? map.get(1)!;
      list.push(o);
    }
    for (const list of map.values()) {
      list.sort((a, b) => b.fulfillmentStageAt.localeCompare(a.fulfillmentStageAt));
    }
    return map;
  }, [visible]);

  const moveToStage = async (orderId: string, stage: FulfillmentStageId) => {
    const current = orders.find((o) => o.id === orderId);
    if (!current || current.fulfillmentStage === stage) return;
    setSavingId(orderId);
    try {
      const res = await patchAdminOrderFulfillmentStage(orderId, stage);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                fulfillmentStage: res.fulfillmentStage as FulfillmentStageId,
                fulfillmentStageAt: res.fulfillmentStageAt,
              }
            : o,
        ),
      );
      setSelected((prev) =>
        prev?.id === orderId
          ? {
              ...prev,
              fulfillmentStage: res.fulfillmentStage as FulfillmentStageId,
              fulfillmentStageAt: res.fulfillmentStageAt,
            }
          : prev,
      );
      showToast(`Pedido movido a fase ${stage}`, "success", "💌");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudo mover", "danger", "⚠️");
    } finally {
      setSavingId(null);
      setDraggingId(null);
      setOverStage(null);
    }
  };

  return (
    <div className={`admin-kanban${embedded ? " admin-kanban--embedded" : ""}`}>
      <div className="admin-kanban__toolbar">
        <div>
          <div className="admin-kanban__kicker">
            {mode === "day" ? "Kanban del día" : "Gestión de envío · Kanban general"}
          </div>
          <p className="admin-kanban__lead">
            {mode === "day"
              ? "Solo pedidos cuya fase actual cambió en la fecha elegida. Si despachas mañana un pedido de ayer, aparecerá en el Kanban de mañana."
              : "Todas las cards de todos los pedidos y la fase en la que están. Arrastra para avanzar el envío."}
          </p>
        </div>
        <div className="admin-kanban__actions">
          {mode === "day" ? (
            <label className="admin-kanban__day">
              Día
              <input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
            </label>
          ) : null}
          <button type="button" className="btn btn-outline btn-sm" onClick={() => void load()} disabled={loading}>
            {loading ? "Cargando…" : "🔄 Actualizar"}
          </button>
        </div>
      </div>

      <div className="admin-kanban__board" role="list">
        {FULFILLMENT_STAGES.map((col) => {
          const cards = byStage.get(col.id) ?? [];
          const isOver = overStage === col.id;
          return (
            <section
              key={col.id}
              className={`admin-kanban__col${isOver ? " is-over" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setOverStage(col.id);
              }}
              onDragLeave={() => setOverStage((s) => (s === col.id ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/order-id") || draggingId;
                if (id) void moveToStage(id, col.id);
              }}
            >
              <header className="admin-kanban__col-head">
                <span className="admin-kanban__col-num">{col.id}</span>
                <div>
                  <h3>{col.title}</h3>
                  <p>{col.body}</p>
                </div>
                <span className="admin-kanban__col-count">{cards.length}</span>
              </header>
              <div className="admin-kanban__col-body">
                {cards.length === 0 ? (
                  <div className="admin-kanban__empty">Suelta un pedido aquí</div>
                ) : (
                  cards.map((o) => {
                    const late = isFulfillmentStageLate(o.fulfillmentStage);
                    const cover = o.items.find((i) => isHttpImageUrl(i.imageUrl ?? ""))?.imageUrl;
                    return (
                      <article
                        key={o.id}
                        className={`admin-kanban__card${late ? " is-late" : ""}${
                          draggingId === o.id ? " is-dragging" : ""
                        }${savingId === o.id ? " is-saving" : ""}`}
                        draggable
                        onDragStart={(e) => {
                          setDraggingId(o.id);
                          e.dataTransfer.setData("text/order-id", o.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setOverStage(null);
                        }}
                        onClick={() => setSelected(o)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelected(o);
                          }
                        }}
                      >
                        <div className="admin-kanban__card-top">
                          <div className="admin-kanban__thumb">
                            {cover && isHttpImageUrl(cover) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={cover} alt="" />
                            ) : (
                              <span>🛍️</span>
                            )}
                          </div>
                          <div>
                            <strong>{o.customerName}</strong>
                            <span className="admin-kanban__ref">{o.reference}</span>
                          </div>
                        </div>
                        <p className="admin-kanban__items">
                          {o.items.map((i) => `${i.quantity}× ${i.name}`).join(" · ")}
                        </p>
                        <div className="admin-kanban__card-foot">
                          <span>{formatPrice(o.total)}</span>
                          <span>{(o.paymentProvider || "WEB").toUpperCase()}</span>
                        </div>
                        {late ? <div className="admin-kanban__late-flag">Pasó de las 3:00 p. m. · enviar mañana</div> : null}
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          );
        })}
      </div>

      {selected ? (
        <div className="admin-kanban__modal-scrim" role="presentation" onClick={() => setSelected(null)}>
          <div
            className="admin-kanban__modal"
            role="dialog"
            aria-modal="true"
            aria-label={`Pedido ${selected.reference}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="admin-kanban__modal-close" onClick={() => setSelected(null)} aria-label="Cerrar">
              ✕
            </button>
            <p className="admin-kanban__modal-kicker">Detalle completo del pedido</p>
            <h2>{selected.customerName}</h2>
            <p className="admin-kanban__modal-sub">
              {selected.reference} · Fase {selected.fulfillmentStage} ·{" "}
              {new Date(selected.fulfillmentStageAt).toLocaleString("es-CO", {
                timeZone: "America/Bogota",
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>

            <div className="admin-kanban__detail-grid">
              <section>
                <h4>Cliente</h4>
                <ul>
                  <li>
                    <strong>Nombre:</strong> {selected.customerName}
                  </li>
                  <li>
                    <strong>Email:</strong> {selected.customerEmail}
                  </li>
                  <li>
                    <strong>Teléfono / WhatsApp:</strong> {selected.customerPhone || "—"}
                  </li>
                  <li>
                    <strong>Nota:</strong> {selected.customerNote || "—"}
                  </li>
                </ul>
              </section>
              <section>
                <h4>Envío</h4>
                <ul>
                  {addrLines(selected.shippingAddress).length === 0 ? (
                    <li>—</li>
                  ) : (
                    addrLines(selected.shippingAddress).map((line) => <li key={line}>{line}</li>)
                  )}
                </ul>
              </section>
              <section>
                <h4>Pago</h4>
                <ul>
                  <li>
                    <strong>Proveedor:</strong> {(selected.paymentProvider || "—").toUpperCase()}
                  </li>
                  <li>
                    <strong>Estado pago:</strong> {selected.paymentStatus}
                  </li>
                  <li>
                    <strong>Estado pedido:</strong> {selected.status}
                  </li>
                  <li>
                    <strong>Cupón:</strong> {selected.couponCode || "—"}
                  </li>
                </ul>
              </section>
              <section>
                <h4>Totales</h4>
                <ul>
                  <li>
                    <strong>Subtotal:</strong> {formatPrice(selected.subtotal)}
                  </li>
                  <li>
                    <strong>Envío:</strong> {formatPrice(selected.shipping)}
                  </li>
                  <li>
                    <strong>Descuento:</strong> {formatPrice(selected.discount)}
                  </li>
                  <li>
                    <strong>Total:</strong> {formatPrice(selected.total)} {selected.currency}
                  </li>
                </ul>
              </section>
            </div>

            <h4 style={{ marginTop: 18 }}>Productos</h4>
            <div className="admin-kanban__lines">
              {selected.items.map((i, idx) => (
                <div key={`${i.productId ?? i.name}-${idx}`} className="admin-kanban__line">
                  <div className="admin-kanban__thumb">
                    {i.imageUrl && isHttpImageUrl(i.imageUrl) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={i.imageUrl} alt="" />
                    ) : (
                      <span>📦</span>
                    )}
                  </div>
                  <div>
                    <strong>
                      {i.quantity}× {i.name}
                    </strong>
                    <span>
                      {formatPrice(i.unitPrice)} c/u · {formatPrice(i.lineTotal)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="admin-kanban__stage-picker">
              <h4>Mover a fase</h4>
              <div className="admin-kanban__stage-btns">
                {FULFILLMENT_STAGES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`admin-kanban__stage-btn${
                      selected.fulfillmentStage === s.id ? " is-active" : ""
                    }`}
                    disabled={savingId === selected.id}
                    onClick={() => void moveToStage(selected.id, s.id)}
                  >
                    {s.id}. {s.title}
                  </button>
                ))}
              </div>
            </div>

            <p className="admin-kanban__meta">
              Creado:{" "}
              {new Date(selected.createdAt).toLocaleString("es-CO", { timeZone: "America/Bogota" })}
              {" · "}
              Actualizado:{" "}
              {new Date(selected.updatedAt).toLocaleString("es-CO", { timeZone: "America/Bogota" })}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
