"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { computeShippingCop, loadCart, saveCart } from "@/lib/cart-storage";
import { formatPrice } from "@/lib/format";
import type { CartLine } from "@/lib/types/product";
import { isHttpImageUrl } from "@/lib/util/image-url";
import { createCheckoutOrderSchema } from "@/lib/validation/checkout-order";

type PayPhase = "idle" | "order" | "session" | "widget" | "error";

const listParent = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.06 },
  },
};

const listItem = (reduce: boolean) => ({
  hidden: { opacity: 0, y: reduce ? 0 : 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: reduce ? 0.01 : 0.42, ease: [0.22, 1, 0.36, 1] as const },
  },
});

function loadEpaycoScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.ePayco?.checkout) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.epayco.co/checkout-v2.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("No se pudo cargar el script de ePayco"));
    document.body.appendChild(s);
  });
}

export function CheckoutPageClient() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const itemVariants = useMemo(() => listItem(Boolean(reduceMotion)), [reduceMotion]);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [note, setNote] = useState("");

  const [phase, setPhase] = useState<PayPhase>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setCart(loadCart());
    setHydrated(true);
  }, []);

  const persist = useCallback((next: CartLine[]) => {
    setCart(next);
    saveCart(next);
  }, []);

  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.qty, 0), [cart]);
  const shipping = useMemo(() => computeShippingCop(subtotal), [subtotal]);
  const total = subtotal + shipping;

  const changeQty = (id: string, delta: number) => {
    const item = cart.find((i) => i.id === id);
    if (!item) return;
    const q = item.qty + delta;
    if (q <= 0) persist(cart.filter((i) => i.id !== id));
    else persist(cart.map((i) => (i.id === id ? { ...i, qty: q } : i)));
  };

  const removeLine = (id: string) => {
    persist(cart.filter((i) => i.id !== id));
  };

  const runPayment = useCallback(
    async (checkoutType: "onpage" | "standard") => {
      setErrorMsg(null);
      setPhase("order");

      const t = line1.trim();
      const c = city.trim();
      if (t.length < 3) {
        setPhase("error");
        setErrorMsg("Escribe una dirección completa (mínimo 3 caracteres).");
        return;
      }
      if (c.length < 2) {
        setPhase("error");
        setErrorMsg("Indica la ciudad de entrega.");
        return;
      }

      const body = {
        items: cart.map((c) => ({ productId: c.id, quantity: c.qty })),
        customerEmail: email.trim(),
        customerName: name.trim(),
        customerPhone: phone.trim().length >= 7 ? phone.trim() : undefined,
        shippingAddress: {
          line1: t,
          country: "CO" as const,
          city: c,
          ...(line2.trim() ? { line2: line2.trim() } : {}),
          ...(region.trim() ? { region: region.trim() } : {}),
          ...(postalCode.trim() ? { postalCode: postalCode.trim() } : {}),
        },
        customerNote: note.trim() || undefined,
        shipping,
      };

      const parsed = createCheckoutOrderSchema.safeParse(body);
      if (!parsed.success) {
        setPhase("error");
        setErrorMsg("Revisa correo, nombre y dirección (formato válido).");
        return;
      }

      let reference: string;

      try {
        const res = await fetch("/api/checkout/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        });
        const data = (await res.json()) as { error?: string; reference?: string };
        if (!res.ok) {
          throw new Error(data.error || "No se pudo crear el pedido");
        }
        if (!data.reference) throw new Error("Respuesta inválida");
        reference = data.reference;
      } catch (e) {
        setPhase("error");
        setErrorMsg(e instanceof Error ? e.message : "Error al crear el pedido");
        return;
      }

      setPhase("session");
      try {
        const res = await fetch("/api/payments/epayco/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference, checkoutType }),
        });
        const data = (await res.json()) as {
          error?: string;
          sessionId?: string;
          test?: boolean;
        };
        if (!res.ok) {
          throw new Error(data.error || "No se pudo iniciar ePayco");
        }
        if (!data.sessionId) throw new Error("Sin sessionId");

        await loadEpaycoScript();
        if (!window.ePayco?.checkout) {
          throw new Error("ePayco no disponible en el navegador");
        }

        setPhase("widget");
        const checkout = window.ePayco.checkout.configure({
          sessionId: data.sessionId,
          type: checkoutType,
          test: Boolean(data.test),
        });

        checkout.onCreated(() => {
          console.info("[checkout] ePayco widget creado");
        });
        checkout.onErrors((errs) => {
          console.error("[checkout] ePayco", errs);
          setErrorMsg("Error en el checkout de ePayco. Intenta de nuevo o usa la pasarela clásica.");
          setPhase("error");
        });
        checkout.onClosed(() => {
          setPhase("idle");
          router.push(`/checkout/resultado?ref=${encodeURIComponent(reference)}`);
        });

        checkout.open();
      } catch (e) {
        setPhase("error");
        setErrorMsg(e instanceof Error ? e.message : "Error al abrir el pago");
      }
    },
    [cart, city, email, line1, line2, name, note, phone, postalCode, region, router, shipping],
  );

  const handlePay = () => runPayment("onpage");

  if (!hydrated) {
    return (
      <div className="gb-co-page">
        <div className="gb-co-empty">
          <div className="gb-co-spinner" style={{ borderColor: "var(--cream)", borderTopColor: "var(--dusty-rose)" }} />
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="gb-co-page">
        <header className="gb-co-header">
          <div className="gb-co-header-inner">
            <Link href="/" className="gb-co-back">
              ← Volver a la tienda
            </Link>
            <span className="gb-co-logo">GinnaBeauty</span>
            <span style={{ width: 100 }} />
          </div>
        </header>
        <motion.div
          className="gb-co-empty"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="gb-co-empty-icon">🛍️</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", marginBottom: 8 }}>Tu carrito está vacío</h1>
          <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>Agrega productos desde la tienda para continuar.</p>
          <Link href="/" className="btn btn-primary" style={{ display: "inline-flex" }}>
            Explorar productos
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="gb-co-page">
      <div className="gb-co-orb gb-co-orb--1" aria-hidden />
      <div className="gb-co-orb gb-co-orb--2" aria-hidden />

      <header className="gb-co-header">
        <div className="gb-co-header-inner">
          <Link href="/" className="gb-co-back">
            ← Volver a la tienda
          </Link>
          <span className="gb-co-logo">GinnaBeauty</span>
          <Link href="/" style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Seguir comprando
          </Link>
        </div>
      </header>

      <div className="gb-co-main">
        <div>
          <motion.div
            className="gb-co-hero"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="gb-co-hero-badge">Checkout seguro</div>
            <h1>Finalizar compra</h1>
            <p>Un último paso para disfrutar tu ritual de belleza. Pago con ePayco, cifrado y confiable.</p>
          </motion.div>

          <div className="gb-co-steps" aria-hidden>
            <span className="gb-co-step gb-co-step--active">1 · Carrito</span>
            <span className="gb-co-step gb-co-step--active">2 · Datos</span>
            <span className="gb-co-step gb-co-step--active">3 · Pago</span>
          </div>

          <motion.div variants={listParent} initial="hidden" animate="show" className="gb-co-stack" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <motion.section variants={itemVariants} className="gb-co-card">
              <div className="gb-co-section-title">
                <span>1</span>
                Resumen del pedido
              </div>
              {cart.map((item) => (
                <div key={item.id} className="gb-co-line-item">
                  <div className="gb-co-thumb">
                    {isHttpImageUrl(item.img) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.img} alt="" />
                    ) : (
                      item.emoji
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--dark)" }}>{item.name}</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{item.brand}</div>
                    <div className="gb-co-qty">
                      <button type="button" onClick={() => changeQty(item.id, -1)} aria-label="Menos">
                        −
                      </button>
                      <span style={{ minWidth: 24, textAlign: "center", fontWeight: 600 }}>{item.qty}</span>
                      <button type="button" onClick={() => changeQty(item.id, 1)} aria-label="Más">
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => removeLine(item.id)}
                        style={{
                          marginLeft: 8,
                          fontSize: 12,
                          color: "var(--text-muted)",
                          textDecoration: "underline",
                        }}
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                  <div style={{ fontWeight: 600, color: "var(--dusty-rose)" }}>{formatPrice(item.price * item.qty)}</div>
                </div>
              ))}
            </motion.section>

            <motion.section variants={itemVariants} className="gb-co-card">
              <div className="gb-co-section-title">
                <span>2</span>
                Tus datos
              </div>
              <div className="gb-co-grid2">
                <div className="gb-co-field">
                  <label className="gb-co-label" htmlFor="gb-email">
                    Correo
                  </label>
                  <input
                    id="gb-email"
                    className="gb-co-input"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="hola@correo.com"
                  />
                </div>
                <div className="gb-co-field">
                  <label className="gb-co-label" htmlFor="gb-name">
                    Nombre completo
                  </label>
                  <input
                    id="gb-name"
                    className="gb-co-input"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nombre y apellido"
                  />
                </div>
              </div>
              <div className="gb-co-field" style={{ marginTop: 14 }}>
                <label className="gb-co-label" htmlFor="gb-phone">
                  Teléfono / WhatsApp
                </label>
                <input
                  id="gb-phone"
                  className="gb-co-input"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+57 300 000 0000"
                />
              </div>
            </motion.section>

            <motion.section variants={itemVariants} className="gb-co-card">
              <div className="gb-co-section-title">
                <span>3</span>
                Envío
              </div>
              <div className="gb-co-field">
                <label className="gb-co-label" htmlFor="gb-line1">
                  Dirección
                </label>
                <input
                  id="gb-line1"
                  className="gb-co-input"
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                  placeholder="Calle, carrera, número, barrio"
                />
              </div>
              <div className="gb-co-field" style={{ marginTop: 12 }}>
                <label className="gb-co-label" htmlFor="gb-line2">
                  Apartamento / torre (opcional)
                </label>
                <input id="gb-line2" className="gb-co-input" value={line2} onChange={(e) => setLine2(e.target.value)} />
              </div>
              <div className="gb-co-grid2" style={{ marginTop: 12 }}>
                <div className="gb-co-field">
                  <label className="gb-co-label" htmlFor="gb-city">
                    Ciudad
                  </label>
                  <input
                    id="gb-city"
                    className="gb-co-input"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Bogotá, Medellín…"
                  />
                </div>
                <div className="gb-co-field">
                  <label className="gb-co-label" htmlFor="gb-region">
                    Departamento
                  </label>
                  <input
                    id="gb-region"
                    className="gb-co-input"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="Cundinamarca, Antioquia…"
                  />
                </div>
              </div>
              <div className="gb-co-field" style={{ marginTop: 12 }}>
                <label className="gb-co-label" htmlFor="gb-postal">
                  Código postal (opcional)
                </label>
                <input id="gb-postal" className="gb-co-input" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
              </div>
              <div className="gb-co-field" style={{ marginTop: 12 }}>
                <label className="gb-co-label" htmlFor="gb-note">
                  Notas del pedido
                </label>
                <textarea
                  id="gb-note"
                  className="gb-co-textarea"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Indicaciones de entrega, referencia del edificio…"
                />
              </div>
            </motion.section>
          </motion.div>
        </div>

        <aside className="gb-co-aside gb-co-aside-sticky">
          <motion.div
            className="gb-co-card"
            initial={{ opacity: 0, x: reduceMotion ? 0 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            whileHover={reduceMotion ? undefined : { y: -2 }}
          >
            <div className="gb-co-section-title" style={{ marginBottom: 12 }}>
              <span>✦</span>
              Totales
            </div>
            <div className="gb-co-total-row">
              <span>Subtotal</span>
              <strong>{formatPrice(subtotal)}</strong>
            </div>
            <div className="gb-co-total-row">
              <span>Envío</span>
              <strong>{shipping === 0 ? "Gratis ✨" : formatPrice(shipping)}</strong>
            </div>
            <div className="gb-co-total-row gb-co-total-row--grand">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
            <div className="gb-co-trust">
              🔒 Pagos procesados por ePayco. No almacenamos datos de tarjeta. El cargo queda confirmado cuando ePayco
              notifica a nuestro servidor (no solo esta pantalla).
            </div>

            <button
              type="button"
              className="gb-co-pay"
              onClick={handlePay}
              disabled={phase === "order" || phase === "session" || phase === "widget"}
            >
              {(phase === "order" || phase === "session" || phase === "widget") && (
                <span className="gb-co-spinner" aria-hidden />
              )}
              {phase === "order" && "Creando pedido…"}
              {phase === "session" && "Conectando con ePayco…"}
              {phase === "widget" && "Abriendo checkout…"}
              {phase === "idle" && "Pagar con ePayco"}
              {phase === "error" && "Reintentar pago con ePayco"}
            </button>

            <button
              type="button"
              className="gb-co-pay-secondary"
              onClick={() => runPayment("standard")}
              disabled={phase === "order" || phase === "session" || phase === "widget"}
            >
              Pasarela clásica (nueva ventana) — si OnPage no carga
            </button>

            {errorMsg && (
              <div className="gb-co-status gb-co-status--error" role="alert">
                {errorMsg}
              </div>
            )}

            {phase === "session" && (
              <div className="gb-co-status gb-co-status--loading gb-co-status--pulse">Preparando pasarela segura…</div>
            )}

          </motion.div>
        </aside>
      </div>
    </div>
  );
}
