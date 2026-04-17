"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { saveCart } from "@/lib/cart-storage";

type OrderPoll = {
  reference: string;
  status: string;
  paymentStatus: string;
  total: number;
  currency: string;
  customerName: string;
};

export function CheckoutResultadoClient() {
  const searchParams = useSearchParams();
  const [syncDone, setSyncDone] = useState(false);
  const [reference, setReference] = useState<string | null>(searchParams.get("ref"));
  const [order, setOrder] = useState<OrderPoll | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refPayco = searchParams.get("ref_payco");

  const fetchOrder = useCallback(async (ref: string) => {
    const res = await fetch(`/api/checkout/orders/${encodeURIComponent(ref)}`, { cache: "no-store" });
    if (!res.ok) {
      setError("No pudimos cargar el pedido.");
      return;
    }
    const data = (await res.json()) as OrderPoll;
    setOrder(data);
  }, []);

  useEffect(() => {
    if (syncDone) return;
    const q: Record<string, string> = {};
    searchParams.forEach((v, k) => {
      q[k] = v;
    });
    const refFromUrl = searchParams.get("ref");

    (async () => {
      try {
        const res = await fetch("/api/payments/epayco/sync-response", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            refPayco: refPayco ?? undefined,
            reference: refFromUrl ?? undefined,
            query: q,
          }),
        });
        const data = (await res.json()) as { linked?: boolean; reference?: string };
        if (data.linked && data.reference) {
          setReference(data.reference);
        }
      } catch {
        /* sync es best-effort */
      } finally {
        setSyncDone(true);
      }
    })();
  }, [syncDone, refPayco, searchParams]);

  useEffect(() => {
    if (!reference) return;
    fetchOrder(reference);
    const t = window.setInterval(() => fetchOrder(reference), 4000);
    return () => window.clearInterval(t);
  }, [reference, fetchOrder]);

  const paid = order?.status === "PAID" && order?.paymentStatus === "APPROVED";

  useEffect(() => {
    if (paid) saveCart([]);
  }, [paid]);

  return (
    <div className="gb-co-page">
      <div className="gb-co-orb gb-co-orb--1" aria-hidden />
      <div className="container" style={{ paddingTop: 48, paddingBottom: 80, maxWidth: 560, position: "relative", zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          style={{
            textAlign: "center",
            padding: "2rem 1.5rem",
            borderRadius: "var(--radius-lg, 16px)",
            background: "linear-gradient(145deg, var(--ivory, #faf8f5) 0%, #fff 100%)",
            border: "1px solid var(--cream, #eee8e0)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.06)",
          }}
        >
        <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>{paid ? "✨" : "💳"}</div>
        <h1 style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: "1.75rem", marginBottom: 8 }}>
          {paid ? "¡Pago confirmado!" : "Procesando tu pago"}
        </h1>
        <p style={{ color: "var(--text-muted, #6b6560)", lineHeight: 1.6, marginBottom: 20 }}>
          {paid
            ? "Gracias por tu compra en GinnaBeauty. Recibirás la confirmación por correo."
            : "La confirmación definitiva llega por notificación segura de ePayco. Esta página se actualiza sola."}
        </p>
        {reference && (
          <p style={{ fontSize: 14, marginBottom: 8 }}>
            Referencia: <strong>{reference}</strong>
          </p>
        )}
        {refPayco && !reference && (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Referencia ePayco: {refPayco}</p>
        )}
        {order && (
          <p style={{ fontSize: 15, marginTop: 12 }}>
            Total:{" "}
            <strong>
              {order.currency} ${order.total.toLocaleString("es-CO")}
            </strong>
          </p>
        )}
        {error && <p style={{ color: "#b44", marginTop: 12 }}>{error}</p>}
        <div style={{ marginTop: 28, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/" className="btn btn-primary">
            Volver a la tienda
          </Link>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 24, lineHeight: 1.5 }}>
          ¿Necesitas ayuda? Escríbenos por WhatsApp desde el sitio. No confirmamos el pago solo por esta pantalla: el
          cobro queda registrado cuando ePayco notifica a nuestro servidor.
        </p>
        </motion.div>
      </div>
    </div>
  );
}
