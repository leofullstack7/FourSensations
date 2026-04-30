"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CHECKOUT_BULK_SHIPPING_NOTICE,
  CHECKOUT_COURIER_NOTE,
  CHECKOUT_FREE_SHIPPING_THRESHOLD_COP,
  type ShippingZoneId,
  SHIPPING_ZONES,
  checkoutShippingCop,
  shippingZoneContextMessage,
} from "@/lib/checkout/shipping-zones";
import { loadCart, saveCart } from "@/lib/cart-storage";
import { formatPrice } from "@/lib/format";
import type { CartLine } from "@/lib/types/product";
import { isHttpImageUrl } from "@/lib/util/image-url";
import { createCheckoutOrderSchema } from "@/lib/validation/checkout-order";

type PayPhase = "idle" | "order" | "session" | "widget" | "integrity" | "error";

type PaymentMethod = "epayco" | "bold";

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

function mountBoldButton(opts: {
  reference: string;
  amount: number;
  integritySignature: string;
  apiKey: string;
  redirectionUrl: string;
  customerData: { email: string; fullName: string; phone?: string };
  mountEl: HTMLElement;
}): void {
  opts.mountEl.innerHTML = "";
  document.querySelectorAll("script[data-gb-bold-checkout='1']").forEach((n) => n.remove());

  const s = document.createElement("script");
  s.src = "https://checkout.bold.co/library/boldPaymentButton.js";
  s.async = true;
  s.setAttribute("data-gb-bold-checkout", "1");
  s.setAttribute("data-bold-button", "dark-L");
  s.setAttribute("data-order-id", opts.reference);
  s.setAttribute("data-currency", "COP");
  s.setAttribute("data-amount", String(opts.amount));
  s.setAttribute("data-api-key", opts.apiKey);
  s.setAttribute("data-integrity-signature", opts.integritySignature);
  s.setAttribute("data-redirection-url", opts.redirectionUrl);
  s.setAttribute("data-description", "Compra en GinnaBeauty");
  s.setAttribute("data-render-mode", "embedded");
  s.setAttribute("data-customer-data", JSON.stringify(opts.customerData));
  opts.mountEl.appendChild(s);
}

export function CheckoutPageClient() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const itemVariants = useMemo(() => listItem(Boolean(reduceMotion)), [reduceMotion]);
  const boldMountRef = useRef<HTMLDivElement>(null);

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

  const [shippingZoneId, setShippingZoneId] = useState<ShippingZoneId>("bogota");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);

  const [phase, setPhase] = useState<PayPhase>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setCart(loadCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    setErrorMsg(null);
    setPhase((p) => (p === "error" ? "idle" : p));
    if (paymentMethod !== "bold") {
      if (boldMountRef.current) boldMountRef.current.innerHTML = "";
      document.querySelectorAll("script[data-gb-bold-checkout='1']").forEach((n) => n.remove());
    }
  }, [paymentMethod]);

  const persist = useCallback((next: CartLine[]) => {
    setCart(next);
    saveCart(next);
  }, []);

  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.qty, 0), [cart]);
  const shippingAmount = useMemo(() => checkoutShippingCop(shippingZoneId, subtotal), [shippingZoneId, subtotal]);
  const total = subtotal + shippingAmount;
  const freeShippingBySubtotal = subtotal > CHECKOUT_FREE_SHIPPING_THRESHOLD_COP;
  const zoneHint = shippingZoneContextMessage(shippingZoneId);

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

  const buildOrderPayload = useCallback(
    (provider: PaymentMethod) => {
      const t = line1.trim();
      const c = city.trim();
      return {
        items: cart.map((x) => ({ productId: x.id, quantity: x.qty })),
        customerEmail: email.trim(),
        customerName: name.trim(),
        customerPhone: phone.trim().length >= 7 ? phone.trim() : undefined,
        shippingAddress: {
          line1: shippingZoneId === "pickup" && t.length < 3 ? "Recogida en tienda" : t,
          country: "CO" as const,
          city: c,
          ...(line2.trim() ? { line2: line2.trim() } : {}),
          ...(region.trim() ? { region: region.trim() } : {}),
          ...(postalCode.trim() ? { postalCode: postalCode.trim() } : {}),
        },
        customerNote: note.trim() || undefined,
        shippingZoneId,
        paymentProvider: provider === "epayco" ? ("EPAYCO" as const) : ("BOLD" as const),
      };
    },
    [cart, city, email, line1, line2, name, note, phone, postalCode, region, shippingZoneId],
  );

  const validateForm = useCallback((): string | null => {
    if (shippingZoneId !== "pickup") {
      if (line1.trim().length < 3) return "Escribe una dirección completa (mínimo 3 caracteres).";
    }
    if (city.trim().length < 2) return "Indica la ciudad.";
    if (!paymentMethod) return "Elige cómo quieres pagar (ePayco o Bold).";
    return null;
  }, [city, line1, paymentMethod, shippingZoneId]);

  const runEpaycoPayment = useCallback(
    async (checkoutType: "onpage" | "standard") => {
      setErrorMsg(null);
      const v = validateForm();
      if (v) {
        setPhase("error");
        setErrorMsg(v);
        return;
      }

      setPhase("order");
      const body = buildOrderPayload("epayco");
      const parsed = createCheckoutOrderSchema.safeParse(body);
      if (!parsed.success) {
        setPhase("error");
        setErrorMsg("Revisa correo, nombre, dirección y zona de envío.");
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
    [buildOrderPayload, router, validateForm],
  );

  const runBoldPayment = useCallback(async () => {
    setErrorMsg(null);
    const v = validateForm();
    if (v) {
      setPhase("error");
      setErrorMsg(v);
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_BOLD_API_KEY?.trim();
    if (!apiKey) {
      setPhase("error");
      setErrorMsg("Bold no está configurado en el sitio (NEXT_PUBLIC_BOLD_API_KEY).");
      return;
    }

    setPhase("order");
    const body = buildOrderPayload("bold");
    const parsed = createCheckoutOrderSchema.safeParse(body);
    if (!parsed.success) {
      setPhase("error");
      setErrorMsg("Revisa los datos del formulario.");
      return;
    }

    let reference: string;
    let orderTotal: number;

    try {
      const res = await fetch("/api/checkout/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = (await res.json()) as {
        error?: string;
        reference?: string;
        total?: number;
      };
      if (!res.ok) {
        throw new Error(data.error || "No se pudo crear el pedido");
      }
      if (!data.reference || data.total == null) throw new Error("Respuesta inválida");
      reference = data.reference;
      orderTotal = data.total;
    } catch (e) {
      setPhase("error");
      setErrorMsg(e instanceof Error ? e.message : "Error al crear el pedido");
      return;
    }

    setPhase("integrity");
    try {
      const res = await fetch("/api/payments/bold/integrity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference,
          amount: orderTotal,
          currency: "COP" as const,
        }),
      });
      const data = (await res.json()) as { error?: string; integritySignature?: string };
      if (!res.ok) {
        throw new Error(data.error || "No se pudo firmar el pago Bold");
      }
      if (!data.integritySignature) throw new Error("Sin firma Bold");

      const mount = boldMountRef.current;
      if (!mount) throw new Error("Contenedor Bold no disponible");

      const base =
        typeof window !== "undefined"
          ? (process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || window.location.origin)
          : "";
      const redirectionUrl = `${base}/checkout/resultado`;

      mountBoldButton({
        reference,
        amount: orderTotal,
        integritySignature: data.integritySignature,
        apiKey,
        redirectionUrl,
        customerData: {
          email: email.trim(),
          fullName: name.trim(),
          ...(phone.trim().length >= 7 ? { phone: phone.trim() } : {}),
        },
        mountEl: mount,
      });

      setPhase("widget");
    } catch (e) {
      setPhase("error");
      setErrorMsg(e instanceof Error ? e.message : "Error con Bold");
    }
  }, [buildOrderPayload, email, name, phone, validateForm]);

  const handlePay = () => {
    if (paymentMethod === "bold") void runBoldPayment();
    else if (paymentMethod === "epayco") void runEpaycoPayment("onpage");
  };

  const payBusy = phase === "order" || phase === "session" || phase === "widget" || phase === "integrity";

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
            <p>
              Elige envío y método de pago. Procesamos pagos con <strong>ePayco</strong> o <strong>Bold</strong>, sin
              almacenar datos de tarjeta.
            </p>
          </motion.div>

          <div className="gb-co-steps" aria-hidden>
            <span className="gb-co-step gb-co-step--active">1 · Carrito</span>
            <span className="gb-co-step gb-co-step--active">2 · Datos</span>
            <span className="gb-co-step gb-co-step--active">3 · Envío</span>
            <span className="gb-co-step gb-co-step--active">4 · Pago</span>
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
                Dirección de entrega
              </div>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: -8, marginBottom: 14, lineHeight: 1.5 }}>
                {CHECKOUT_COURIER_NOTE}
              </p>
              <div className="gb-co-field">
                <label className="gb-co-label" htmlFor="gb-line1">
                  Dirección {shippingZoneId === "pickup" ? "(opcional si solo recoges en tienda)" : ""}
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

            <motion.section variants={itemVariants} className="gb-co-card gb-co-card--shipping">
              <div className="gb-co-section-title">
                <span>✦</span>
                ¿Cómo quieres recibir tu pedido?
              </div>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: -8, marginBottom: 16 }}>
                {freeShippingBySubtotal ? (
                  <>
                    Tu compra supera <strong>{formatPrice(CHECKOUT_FREE_SHIPPING_THRESHOLD_COP)}</strong>:{" "}
                    <strong>envío gratis</strong> a domicilio en todas las zonas.
                  </>
                ) : (
                  <>
                    En compras hasta {formatPrice(CHECKOUT_FREE_SHIPPING_THRESHOLD_COP)} el envío tiene costo según la
                    zona. Recogida en tienda siempre es gratis.
                  </>
                )}
              </p>
              <div className="gb-co-zone-grid" role="radiogroup" aria-label="Zona de envío">
                {(Object.keys(SHIPPING_ZONES) as ShippingZoneId[]).map((zid) => {
                  const z = SHIPPING_ZONES[zid];
                  const selected = shippingZoneId === zid;
                  const baseRate = z.rateSubtotalLow;
                  const copForCard = checkoutShippingCop(zid, subtotal);
                  const showStruck = baseRate > 0 && copForCard === 0;
                  return (
                    <motion.button
                      key={zid}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={`gb-co-zone-card${selected ? " gb-co-zone-card--active" : ""}`}
                      onClick={() => setShippingZoneId(zid)}
                      whileHover={reduceMotion ? undefined : { scale: 1.02 }}
                      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                      layout
                    >
                      <span className="gb-co-zone-card-icon" aria-hidden>
                        {z.icon}
                      </span>
                      <span className="gb-co-zone-card-name">{z.name}</span>
                      <span className="gb-co-zone-card-price">
                        {showStruck && (
                          <>
                            <span className="gb-co-price-struck">{formatPrice(baseRate)}</span>{" "}
                          </>
                        )}
                        {copForCard === 0 ? (
                          <span className="gb-co-badge-gratis">GRATIS</span>
                        ) : (
                          <strong>{formatPrice(copForCard)}</strong>
                        )}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
              {zoneHint && (
                <motion.div
                  className="gb-co-zone-hint"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.35 }}
                >
                  {zoneHint}
                </motion.div>
              )}
              <p className="gb-co-bulk-notice">{CHECKOUT_BULK_SHIPPING_NOTICE}</p>
            </motion.section>
          </motion.div>
        </div>

        <aside className="gb-co-aside gb-co-aside-sticky">
          <motion.div
            className="gb-co-card gb-co-aside-card"
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
              <span>
                Envío <span className="gb-co-total-zone">({SHIPPING_ZONES[shippingZoneId].shortLabel})</span>
              </span>
              <strong>
                {shippingAmount === 0 ? (
                  <span className="gb-co-price-free">Gratis ✨</span>
                ) : (
                  formatPrice(shippingAmount)
                )}
              </strong>
            </div>
            <div className="gb-co-total-row gb-co-total-row--grand">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>

            <div className="gb-co-section-title gb-co-pay-title" style={{ marginTop: 22, marginBottom: 12 }}>
              <span>4</span>
              ¿Cómo quieres pagar?
            </div>
            <div className="gb-co-pay-grid" role="radiogroup" aria-label="Método de pago">
              <motion.button
                type="button"
                role="radio"
                aria-checked={paymentMethod === "epayco"}
                className={`gb-co-method-card${paymentMethod === "epayco" ? " gb-co-method-card--active" : ""}`}
                onClick={() => setPaymentMethod("epayco")}
                whileHover={reduceMotion ? undefined : { y: -3 }}
                whileTap={reduceMotion ? undefined : { scale: 0.99 }}
              >
                <span className="gb-co-method-badge">Recomendado</span>
                <span className="gb-co-method-icon">💳</span>
                <span className="gb-co-method-name">ePayco</span>
                <span className="gb-co-method-desc">Smart Checkout y pasarela clásica</span>
              </motion.button>
              <motion.button
                type="button"
                role="radio"
                aria-checked={paymentMethod === "bold"}
                className={`gb-co-method-card${paymentMethod === "bold" ? " gb-co-method-card--active" : ""}`}
                onClick={() => setPaymentMethod("bold")}
                whileHover={reduceMotion ? undefined : { y: -3 }}
                whileTap={reduceMotion ? undefined : { scale: 0.99 }}
              >
                <span className="gb-co-method-icon">⚡</span>
                <span className="gb-co-method-name">Bold</span>
                <span className="gb-co-method-desc">Pago embebido Bold</span>
              </motion.button>
            </div>

            <div ref={boldMountRef} className="gb-co-bold-mount" id="gb-bold-embed" />

            <div className="gb-co-trust">
              🔒 Pagos seguros. No almacenamos datos de tarjeta. La confirmación definitiva la envía la pasarela a nuestro
              servidor.
            </div>

            <button
              type="button"
              className="gb-co-pay"
              onClick={handlePay}
              disabled={payBusy || !paymentMethod}
            >
              {payBusy && <span className="gb-co-spinner" aria-hidden />}
              {phase === "order" && "Creando pedido…"}
              {phase === "integrity" && "Firmando pago…"}
              {phase === "session" && paymentMethod === "epayco" && "Conectando con ePayco…"}
              {phase === "widget" && paymentMethod === "epayco" && "Abriendo checkout…"}
              {phase === "widget" && paymentMethod === "bold" && "Completa el pago arriba ↑"}
              {phase === "idle" && !paymentMethod && "Selecciona un método de pago"}
              {phase === "idle" && paymentMethod === "epayco" && "Pagar con ePayco"}
              {phase === "idle" && paymentMethod === "bold" && "Preparar pago con Bold"}
              {phase === "error" && "Reintentar"}
            </button>

            {paymentMethod === "epayco" && (
              <button
                type="button"
                className="gb-co-pay-secondary"
                onClick={() => runEpaycoPayment("standard")}
                disabled={payBusy}
              >
                Pasarela clásica (nueva ventana) — si OnPage no carga
              </button>
            )}

            {errorMsg && (
              <div className="gb-co-status gb-co-status--error" role="alert">
                {errorMsg}
              </div>
            )}

            {phase === "session" && paymentMethod === "epayco" && (
              <div className="gb-co-status gb-co-status--loading gb-co-status--pulse">Preparando pasarela segura…</div>
            )}
          </motion.div>
        </aside>
      </div>
    </div>
  );
}
