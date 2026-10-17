"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ENVIA_REEXPEDITION_DESTINATIONS, findEnviaExclusion } from "@/lib/checkout/envia-exclusions";
import {
  CHECKOUT_BULK_SHIPPING_NOTICE,
  CHECKOUT_COURIER_NOTE,
  ENVIA_NO_REEXPEDITION_NOTE,
  type ShippingCarrier,
  type ShippingZoneId,
  SHIPPING_ZONES,
  checkoutShippingCop,
  guessShippingZoneFromCity,
  resolveShippingCarrier,
  shippingZoneContextMessage,
} from "@/lib/checkout/shipping-zones";
import { loadCart, saveCart, syncCartPricesFromCatalog } from "@/lib/cart-storage";
import { searchColombiaCities, type ColombiaCity } from "@/lib/checkout/colombia-cities";
import { formatPrice } from "@/lib/format";
import { WHOLESALE_THRESHOLD_COP } from "@/lib/admin/customer-crm";
import { loadWholesaleCheckoutMode, saveWholesaleCheckoutMode, type WholesaleCheckoutMode } from "@/lib/wholesale-checkout-mode";
import { withWholesalePrices } from "@/lib/wholesale-pricing";
import { wholesaleMinimumReminder } from "@/lib/wholesale-rules";
import { useSession } from "next-auth/react";
import { formatDiscountBadge } from "@/lib/product-discount";
import Image from "next/image";
import type { CartLine, StoreProduct } from "@/lib/types/product";
import { isDisplayableImageUrl } from "@/lib/util/image-url";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { TechAmbient } from "@/components/ui/TechAmbient";
import { createCheckoutOrderSchema } from "@/lib/validation/checkout-order";
import addiLogo from "@/assets/foursensations/payments/addi.png";
import mercadoPagoLogo from "@/assets/foursensations/payments/mercado-pago.png";

function cartLineImageSrc(item: CartLine): string | null {
  const candidates = [item.img, item.imgHover, ...(item.gallery ?? [])];
  for (const c of candidates) {
    if (isDisplayableImageUrl(c)) return c!;
  }
  return null;
}

type PayPhase = "idle" | "order" | "session" | "widget" | "integrity" | "error";

type PaymentMethod = "mercadopago" | "addi" | "bold" | "contraentrega";

/** Bold deshabilitado temporalmente en checkout. */
const BOLD_CHECKOUT_ENABLED = false;

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
  s.setAttribute("data-amount", String(Math.round(Number(opts.amount))));
  s.setAttribute("data-api-key", opts.apiKey);
  s.setAttribute("data-integrity-signature", opts.integritySignature);
  s.setAttribute("data-redirection-url", opts.redirectionUrl);
  s.setAttribute("data-description", "Compra en Four Sensations");
  s.setAttribute("data-render-mode", "embedded");
  s.setAttribute("data-customer-data", JSON.stringify(opts.customerData));
  opts.mountEl.appendChild(s);
}

export function CheckoutPageClient() {
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const itemVariants = useMemo(() => listItem(Boolean(reduceMotion)), [reduceMotion]);
  const boldMountRef = useRef<HTMLDivElement>(null);
  const publicCatalogRef = useRef<StoreProduct[]>([]);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [cityOpen, setCityOpen] = useState(false);
  const [cityActive, setCityActive] = useState(0);
  const [region, setRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [note, setNote] = useState("");

  const [shippingZoneId, setShippingZoneId] = useState<ShippingZoneId>("nacional");
  const [shippingCarrier, setShippingCarrier] = useState<ShippingCarrier>("envia");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mercadopago");
  const [couponInput, setCouponInput] = useState("");
  const [couponApplied, setCouponApplied] = useState<{
    code: string;
    label: string;
    discount: number;
    shippingAfter: number;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);

  const [phase, setPhase] = useState<PayPhase>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoModal, setInfoModal] = useState<string | null>(null);
  const { data: session } = useSession();
  const isWholesaleCustomer = session?.user?.role === "CUSTOMER" && Boolean(session.user.isWholesale);
  const [wholesaleMin, setWholesaleMin] = useState(WHOLESALE_THRESHOLD_COP);
  const [wholesaleMode, setWholesaleMode] = useState<WholesaleCheckoutMode>("wholesale");
  const buyingAsWholesale = isWholesaleCustomer && wholesaleMode === "wholesale";

  const repriceCart = useCallback((mode: WholesaleCheckoutMode, wholesale: boolean) => {
    const catalog = publicCatalogRef.current;
    if (catalog.length === 0) return;
    const priced = wholesale && mode === "wholesale" ? withWholesalePrices(catalog) : catalog;
    setCart((prev) => {
      const next = syncCartPricesFromCatalog(prev, priced);
      if (next !== prev) saveCart(next);
      return next;
    });
  }, []);

  const chooseWholesaleMode = useCallback(
    (mode: WholesaleCheckoutMode) => {
      setWholesaleMode(mode);
      saveWholesaleCheckoutMode(mode);
      if (mode === "wholesale") {
        setPaymentMethod("contraentrega");
        setCouponApplied(null);
        setCouponError(null);
      } else if (paymentMethod === "contraentrega") {
        setPaymentMethod("mercadopago");
      }
      repriceCart(mode, isWholesaleCustomer);
    },
    [isWholesaleCustomer, paymentMethod, repriceCart],
  );

  useEffect(() => {
    const initialMode = loadWholesaleCheckoutMode();
    setWholesaleMode(initialMode);
    setCart(loadCart());
    setHydrated(true);
    void (async () => {
      try {
        const [catalogRes, wholesaleRes] = await Promise.all([
          fetch("/api/store/catalog", { cache: "no-store" }),
          fetch("/api/wholesale/me", { cache: "no-store" }),
        ]);
        if (wholesaleRes.ok) {
          const me = (await wholesaleRes.json()) as { isWholesale?: boolean; minimumOrder?: number };
          if (typeof me.minimumOrder === "number" && me.minimumOrder > 0) setWholesaleMin(me.minimumOrder);
        }
        if (!catalogRes.ok) return;
        const data = (await catalogRes.json()) as { products?: StoreProduct[] };
        if (!Array.isArray(data.products) || data.products.length === 0) return;
        publicCatalogRef.current = data.products;
        const priced =
          isWholesaleCustomer && initialMode === "wholesale" ? withWholesalePrices(data.products) : data.products;
        setCart((prev) => {
          const next = syncCartPricesFromCatalog(prev, priced);
          if (next !== prev) saveCart(next);
          return next;
        });
        if (isWholesaleCustomer && initialMode === "wholesale") setPaymentMethod("contraentrega");
      } catch {
        /* catálogo opcional: el checkout cobra precio de DB */
      }
    })();
  }, [isWholesaleCustomer]);

  useEffect(() => {
    setErrorMsg(null);
    setPhase((p) => (p === "error" ? "idle" : p));
    if (!BOLD_CHECKOUT_ENABLED || paymentMethod !== "bold") {
      if (boldMountRef.current) boldMountRef.current.innerHTML = "";
      document.querySelectorAll("script[data-gb-bold-checkout='1']").forEach((n) => n.remove());
    }
  }, [paymentMethod]);

  useEffect(() => {
    if (!BOLD_CHECKOUT_ENABLED && paymentMethod === "bold") {
      setPaymentMethod("mercadopago");
    }
  }, [paymentMethod]);

  useEffect(() => {
    const c = city.trim();
    if (c.length < 2) return;
    setShippingZoneId(guessShippingZoneFromCity(c));
    setShippingCarrier(resolveShippingCarrier(c, region.trim() || undefined));
  }, [city, region]);

  useEffect(() => {
    const header = document.querySelector<HTMLElement>(".gb-co-header");
    if (!header) return;
    const sync = () => {
      document.documentElement.style.setProperty("--gb-co-header-h", `${Math.round(header.offsetHeight)}px`);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(header);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty("--gb-co-header-h");
    };
  }, []);

  const chooseCity = (row: ColombiaCity) => {
    setCity(row.city);
    setRegion(row.department);
    setCityOpen(false);
  };

  const persist = useCallback((next: CartLine[]) => {
    setCart(next);
    saveCart(next);
  }, []);

  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.qty, 0), [cart]);
  const citySuggestions = useMemo(() => (city.trim().length < 1 ? [] : searchColombiaCities(city, 8)), [city]);
  const enviaExclusion = useMemo(() => findEnviaExclusion(city, region), [city, region]);
  const enviaBlocked = Boolean(enviaExclusion);
  const shippingAmount = useMemo(() => {
    if (buyingAsWholesale) return 0;
    return checkoutShippingCop(shippingZoneId, { city, region, carrier: shippingCarrier });
  }, [buyingAsWholesale, city, region, shippingCarrier, shippingZoneId]);
  const shippingPaid = buyingAsWholesale
    ? 0
    : couponApplied
      ? couponApplied.shippingAfter
      : shippingAmount;
  const couponDiscount = buyingAsWholesale ? 0 : couponApplied?.discount ?? 0;
  const total = buyingAsWholesale
    ? Math.max(0, subtotal)
    : couponApplied && couponApplied.shippingAfter < shippingAmount
      ? Math.max(0, subtotal + shippingPaid)
      : Math.max(0, subtotal + shippingPaid - couponDiscount);
  const zoneHint = shippingZoneContextMessage(shippingZoneId, shippingCarrier, city, region);

  useEffect(() => {
    // Si cambia el carrito/envío, el cupón aplicado puede quedar inválido.
    setCouponApplied(null);
    setCouponError(null);
  }, [subtotal, shippingAmount]);

  const applyCoupon = useCallback(async () => {
    const code = couponInput.trim();
    if (!code) {
      setCouponError("Escribe un código");
      return;
    }
    setCouponBusy(true);
    setCouponError(null);
    try {
      const res = await fetch("/api/store/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          subtotal,
          shipping: shippingAmount,
          ...(email.trim() ? { customerEmail: email.trim() } : {}),
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        code?: string;
        label?: string;
        discount?: number;
        shippingAfter?: number;
      };
      if (!res.ok || data.discount == null || !data.code) {
        setCouponApplied(null);
        setCouponError(data.error || "Cupón no válido");
        return;
      }
      setCouponApplied({
        code: data.code,
        label: data.label || data.code,
        discount: data.discount,
        shippingAfter: data.shippingAfter ?? shippingAmount,
      });
    } catch {
      setCouponError("No se pudo validar el cupón");
    } finally {
      setCouponBusy(false);
    }
  }, [couponInput, email, shippingAmount, subtotal]);

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
        items: cart.map((x) =>
          x.comboId
            ? { comboId: x.comboId, quantity: x.qty }
            : { productId: x.id, quantity: x.qty },
        ),
        customerEmail: email.trim(),
        customerName: name.trim(),
        customerPhone: phone.trim(),
        customerDocument: documentNumber.replace(/\D/g, ""),
        shippingAddress: {
          line1: t,
          country: "CO" as const,
          city: c,
          ...(line2.trim() ? { line2: line2.trim() } : {}),
          ...(region.trim() ? { region: region.trim() } : {}),
          ...(postalCode.trim() ? { postalCode: postalCode.trim() } : {}),
        },
        customerNote: note.trim() || undefined,
        shippingZoneId,
        paymentProvider:
          provider === "contraentrega"
            ? ("CONTRAENTREGA" as const)
            : provider === "mercadopago"
              ? ("MERCADOPAGO" as const)
              : provider === "addi"
                ? ("ADDI" as const)
                : ("BOLD" as const),
        pricingMode: buyingAsWholesale ? ("wholesale" as const) : ("retail" as const),
        ...(!buyingAsWholesale && couponApplied?.code ? { couponCode: couponApplied.code } : {}),
      };
    },
    [
      buyingAsWholesale,
      cart,
      city,
      couponApplied?.code,
      documentNumber,
      email,
      line1,
      line2,
      name,
      note,
      phone,
      postalCode,
      region,
      shippingZoneId,
    ],
  );

  const validateForm = useCallback((): string | null => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return "Completa un correo válido.";
    }
    if (name.trim().length < 2) return "Escribe tu nombre completo.";
    if (phone.replace(/\D/g, "").length < 10) return "Indica un celular válido (mínimo 10 dígitos).";
    if (documentNumber.replace(/\D/g, "").length < 5) return "Indica tu número de cédula.";
    if (line1.trim().length < 3) return "Escribe una dirección completa (mínimo 3 caracteres).";
    if (city.trim().length < 2) return "Indica la ciudad.";
    if (!paymentMethod) return "Elige un método de pago.";
    if (buyingAsWholesale && subtotal < wholesaleMin) {
      return wholesaleMinimumReminder(wholesaleMin, subtotal);
    }
    return null;
  }, [
    buyingAsWholesale,
    city,
    documentNumber,
    email,
    line1,
    name,
    paymentMethod,
    phone,
    subtotal,
    wholesaleMin,
  ]);

  const formError = useMemo(() => validateForm(), [validateForm]);
  const formComplete = useMemo(() => formError === null && cart.length > 0, [cart.length, formError]);

  useEffect(() => {
    if (!infoModal) return;
    const t = window.setTimeout(() => setInfoModal(null), 2800);
    return () => window.clearTimeout(t);
  }, [infoModal]);

  const createPendingOrder = useCallback(
    async (provider: PaymentMethod): Promise<string | null> => {
      const body = buildOrderPayload(provider);
      const parsed = createCheckoutOrderSchema.safeParse(body);
      if (!parsed.success) {
        const issue = parsed.error.issues[0]?.message;
        setInfoModal("Completa la información");
        setErrorMsg(issue || "Revisa correo, nombre, celular, cédula, dirección y zona de envío.");
        setPhase("idle");
        return null;
      }
      const res = await fetch("/api/checkout/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = (await res.json()) as { error?: string; reference?: string };
      if (!res.ok) throw new Error(data.error || "No se pudo crear el pedido");
      if (!data.reference) throw new Error("Respuesta inválida");
      return data.reference;
    },
    [buildOrderPayload],
  );

  const runMercadoPagoPayment = useCallback(async () => {
    setErrorMsg(null);
    const v = validateForm();
    if (v) {
      setInfoModal("Completa la información");
      setErrorMsg(v);
      setPhase("idle");
      return;
    }

    setPhase("order");
    let reference: string;
    try {
      const ref = await createPendingOrder("mercadopago");
      if (!ref) {
        setPhase("idle");
        return;
      }
      reference = ref;
    } catch (e) {
      setPhase("error");
      setErrorMsg(e instanceof Error ? e.message : "Error al crear el pedido");
      return;
    }

    setPhase("session");
    try {
      const res = await fetch("/api/payments/mercadopago/preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference }),
      });
      const data = (await res.json()) as { error?: string; initPoint?: string };
      if (!res.ok) {
        throw new Error(data.error || "No se pudo iniciar Mercado Pago");
      }
      if (!data.initPoint) throw new Error("Mercado Pago no devolvió el enlace de pago");
      window.location.assign(data.initPoint);
    } catch (e) {
      setPhase("error");
      setErrorMsg(e instanceof Error ? e.message : "Error al abrir Mercado Pago");
    }
  }, [createPendingOrder, validateForm]);

  const runAddiPayment = useCallback(async () => {
    setErrorMsg(null);
    const v = validateForm();
    if (v) {
      setInfoModal("Completa la información");
      setErrorMsg(v);
      setPhase("idle");
      return;
    }

    setPhase("order");
    let reference: string;
    try {
      const ref = await createPendingOrder("addi");
      if (!ref) {
        setPhase("idle");
        return;
      }
      reference = ref;
    } catch (e) {
      setPhase("error");
      setErrorMsg(e instanceof Error ? e.message : "Error al crear el pedido");
      return;
    }

    setPhase("session");
    try {
      const res = await fetch("/api/payments/addi/application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference,
          documentNumber: documentNumber.replace(/\D/g, ""),
        }),
      });
      const data = (await res.json()) as { error?: string; initPoint?: string };
      if (!res.ok) throw new Error(data.error || "No se pudo iniciar Addi");
      if (!data.initPoint) throw new Error("Addi no devolvió el enlace de pago");
      window.location.assign(data.initPoint);
    } catch (e) {
      setPhase("error");
      setErrorMsg(e instanceof Error ? e.message : "Error al abrir Addi");
    }
  }, [createPendingOrder, documentNumber, validateForm]);

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
      const totalNum = Number(data.total);
      if (!Number.isFinite(totalNum) || totalNum < 1 || !Number.isInteger(totalNum)) {
        throw new Error("Total del pedido inválido (entero en pesos COP, sin decimales)");
      }
      orderTotal = totalNum;
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

  const runContraentrega = useCallback(async () => {
    setErrorMsg(null);
    const v = validateForm();
    if (v) {
      setInfoModal("Completa la información");
      setErrorMsg(v);
      setPhase("idle");
      return;
    }
    setPhase("order");
    try {
      const ref = await createPendingOrder("contraentrega");
      if (!ref) {
        setPhase("idle");
        return;
      }
      saveCart([]);
      router.push(`/checkout/resultado?ref=${encodeURIComponent(ref)}`);
    } catch (e) {
      setPhase("error");
      setErrorMsg(e instanceof Error ? e.message : "No se pudo confirmar el pedido");
    }
  }, [createPendingOrder, router, validateForm]);

  const handlePay = () => {
    const v = validateForm();
    if (v) {
      setInfoModal("Completa la información");
      setErrorMsg(v);
      return;
    }
    if (paymentMethod === "contraentrega") void runContraentrega();
    else if (paymentMethod === "bold" && BOLD_CHECKOUT_ENABLED) void runBoldPayment();
    else if (paymentMethod === "addi") void runAddiPayment();
    else if (paymentMethod === "mercadopago") void runMercadoPagoPayment();
  };

  const payBusy = phase === "order" || phase === "session" || phase === "widget" || phase === "integrity";
  const payLabel = (() => {
    if (phase === "order") return "Creando pedido…";
    if (phase === "integrity") return "Firmando pago…";
    if (phase === "session" && paymentMethod === "mercadopago") return "Conectando con Mercado Pago…";
    if (phase === "session" && paymentMethod === "addi") return "Conectando con Addi…";
    if (phase === "widget" && paymentMethod === "bold") return "Completa el pago arriba ↑";
    if (!formComplete) {
      if (formError && formError.length <= 56) return formError;
      return "Completa tus datos para pagar";
    }
    if (phase === "error") return "Reintentar";
    if (paymentMethod === "contraentrega") return "Confirmar pedido contraentrega";
    if (paymentMethod === "bold") return "Preparar pago con Bold";
    if (paymentMethod === "addi") return "Pagar con Addi";
    return "Ir a Mercado Pago";
  })();

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
            <span className="gb-co-logo">Four Sensations</span>
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
      <TechAmbient variant="subtle" />
      <div className="gb-co-orb gb-co-orb--1" aria-hidden />
      <div className="gb-co-orb gb-co-orb--2" aria-hidden />

      <header className="gb-co-header">
        <div className="gb-co-header-inner">
          <Link href="/" className="gb-co-back">
            ← Volver a la tienda
          </Link>
          <div className="gb-co-brand-wrap">
            <BrandLogo variant="auth" className="gb-co-brand-logo" />
          </div>
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
              Completa tus datos y envío. Al pagar te llevamos al checkout seguro de <strong>Mercado Pago</strong> (tarjeta,
              PSE y más). No pedimos datos de tarjeta en esta página.
            </p>
          </motion.div>

          <div className="gb-co-steps" aria-hidden>
            <span className="gb-co-step gb-co-step--active">1 · Carrito</span>
            <span className="gb-co-step gb-co-step--active">2 · Datos</span>
            <span className="gb-co-step gb-co-step--active">3 · Envío</span>
            <span className="gb-co-step gb-co-step--active">4 · Pago</span>
          </div>

          <motion.div variants={listParent} initial="hidden" animate="show" className="gb-co-stack gb-co-stack--compact">
            <motion.section variants={itemVariants} className="gb-co-card gb-co-card--compact">
              <div className="gb-co-section-title">
                <span>1</span>
                Resumen del pedido
              </div>
              {cart.map((item) => {
                const imgSrc = cartLineImageSrc(item);
                return (
                <div key={item.id} className="gb-co-line-item">
                  <div className="gb-co-thumb gb-co-thumb--photo">
                    {imgSrc ? (
                      <Image
                        src={imgSrc}
                        alt={item.name}
                        fill
                        sizes="88px"
                        unoptimized={imgSrc.startsWith("/")}
                        className="gb-co-thumb__img"
                        style={{ objectFit: "cover" }}
                      />
                    ) : (
                      <span aria-hidden>{item.emoji || "🛍️"}</span>
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--dark)" }}>{item.name}</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                      {item.comboId ? "Combo promocional" : item.brand}
                    </div>
                    {item.comboItems && item.comboItems.length > 0 ? (
                      <ul style={{ margin: "6px 0 0", padding: "0 0 0 14px", fontSize: 12, color: "var(--text-muted)" }}>
                        {item.comboItems.map((ci, idx) => (
                          <li key={`${item.id}-ck-${idx}`}>
                            {ci.quantity > 1 ? `${ci.quantity}× ` : ""}
                            {ci.name}
                          </li>
                        ))}
                      </ul>
                    ) : null}
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
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 600, color: "var(--dusty-rose)" }}>{formatPrice(item.price * item.qty)}</div>
                    {item.discountPercent != null ? (
                      <div className="price-discount" style={{ marginTop: 4, display: "inline-block" }}>
                        {formatDiscountBadge(item.discountPercent)}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
              })}
            </motion.section>

            <motion.section variants={itemVariants} className="gb-co-card gb-co-card--compact">
              <div className="gb-co-section-title">
                <span>2</span>
                Tus datos
              </div>
              <div className="gb-co-grid2">
                <div className="gb-co-field">
                  <label className="gb-co-label" htmlFor="gb-email">
                    Correo *
                  </label>
                  <input
                    id="gb-email"
                    className="gb-co-input"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="hola@correo.com"
                    required
                  />
                </div>
                <div className="gb-co-field">
                  <label className="gb-co-label" htmlFor="gb-name">
                    Nombre completo *
                  </label>
                  <input
                    id="gb-name"
                    className="gb-co-input"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nombre y apellido"
                    required
                  />
                </div>
              </div>
              <div className="gb-co-grid2 gb-co-field--tight">
                <div className="gb-co-field">
                  <label className="gb-co-label" htmlFor="gb-phone">
                    Celular / WhatsApp *
                  </label>
                  <input
                    id="gb-phone"
                    className="gb-co-input"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+57 300 000 0000"
                    required
                  />
                </div>
                <div className="gb-co-field">
                  <label className="gb-co-label" htmlFor="gb-doc">
                    Cédula *
                  </label>
                  <input
                    id="gb-doc"
                    className="gb-co-input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value.replace(/[^\d]/g, ""))}
                    placeholder="Solo números"
                    required
                  />
                </div>
              </div>
            </motion.section>

            <motion.section variants={itemVariants} className="gb-co-card gb-co-card--compact">
              <div className="gb-co-section-title">
                <span>3</span>
                Dirección de entrega
              </div>
              <p className="gb-co-hint">{CHECKOUT_COURIER_NOTE}</p>
              <div className="gb-co-grid2">
                <div className="gb-co-field" style={{ gridColumn: "1 / -1" }}>
                  <label className="gb-co-label" htmlFor="gb-line1">
                    Dirección *
                  </label>
                  <input
                    id="gb-line1"
                    className="gb-co-input"
                    value={line1}
                    onChange={(e) => setLine1(e.target.value)}
                    placeholder="Calle, carrera, número, barrio"
                    required
                  />
                </div>
                <div className="gb-co-field">
                  <label className="gb-co-label" htmlFor="gb-line2">
                    Apto / torre
                  </label>
                  <input id="gb-line2" className="gb-co-input" value={line2} onChange={(e) => setLine2(e.target.value)} />
                </div>
                <div className="gb-co-field gb-co-city">
                  <label className="gb-co-label" htmlFor="gb-city">
                    Ciudad *
                  </label>
                  <input
                    id="gb-city"
                    className="gb-co-input"
                    autoComplete="off"
                    role="combobox"
                    aria-expanded={cityOpen && citySuggestions.length > 0}
                    aria-controls="gb-city-list"
                    aria-autocomplete="list"
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      setCityOpen(true);
                      setCityActive(0);
                    }}
                    onFocus={() => setCityOpen(true)}
                    onBlur={() => window.setTimeout(() => setCityOpen(false), 120)}
                    onKeyDown={(e) => {
                      if (!cityOpen || citySuggestions.length === 0) return;
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setCityActive((i) => (i + 1) % citySuggestions.length);
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setCityActive((i) => (i - 1 + citySuggestions.length) % citySuggestions.length);
                      } else if (e.key === "Enter" && citySuggestions[cityActive]) {
                        e.preventDefault();
                        const pick = citySuggestions[cityActive]!;
                        setCity(pick.city);
                        setRegion(pick.department);
                        setCityOpen(false);
                      } else if (e.key === "Escape") {
                        setCityOpen(false);
                      }
                    }}
                    placeholder="Manizales, Medellín…"
                    required
                  />
                  {cityOpen && citySuggestions.length > 0 ? (
                    <ul id="gb-city-list" className="gb-co-city-list" role="listbox">
                      {citySuggestions.map((row, i) => (
                        <li key={`${row.city}-${row.department}`}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={i === cityActive}
                            className={i === cityActive ? "is-active" : ""}
                            onMouseDown={(ev) => {
                              ev.preventDefault();
                              chooseCity(row);
                            }}
                          >
                            <strong>{row.city}</strong>
                            <span>{row.department}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
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
                    placeholder="Caldas, Antioquia…"
                  />
                </div>
                <div className="gb-co-field">
                  <label className="gb-co-label" htmlFor="gb-postal">
                    Cód. postal
                  </label>
                  <input id="gb-postal" className="gb-co-input" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
                </div>
                <div className="gb-co-field" style={{ gridColumn: "1 / -1" }}>
                  <label className="gb-co-label" htmlFor="gb-note">
                    Notas (opcional)
                  </label>
                  <textarea
                    id="gb-note"
                    className="gb-co-textarea gb-co-textarea--compact"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Indicaciones de entrega…"
                    rows={2}
                  />
                </div>
              </div>
            </motion.section>

            <motion.section variants={itemVariants} className="gb-co-card gb-co-card--shipping gb-co-card--compact">
              <div className="gb-co-section-title">
                <span>✦</span>
                Elige tu Entrega
              </div>
              {buyingAsWholesale ? (
                <p className="gb-co-hint">
                  Pedidos mayorista: pago contraentrega del pedido. No se cobra envío en el resumen (pedidos de volumen).
                </p>
              ) : (
              <>
              <p className="gb-co-hint">
                Envía según zona · Interrapidísimo contraentrega del flete. Los productos se pagan con Mercado Pago o Addi.
              </p>
              <div className="gb-co-carrier-grid" role="radiogroup" aria-label="Transportadora">
                <button
                  type="button"
                  role="radio"
                  aria-checked={shippingCarrier === "envia"}
                  disabled={enviaBlocked}
                  className={`gb-co-carrier-card${shippingCarrier === "envia" ? " gb-co-carrier-card--active" : ""}${enviaBlocked ? " gb-co-carrier-card--disabled" : ""}`}
                  onClick={() => {
                    if (enviaBlocked) return;
                    setShippingCarrier("envia");
                  }}
                >
                  <strong>Envía</strong>
                  <span>Tarifa según zona. Primera opción cuando hay cobertura.</span>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={shippingCarrier === "interrapidismo"}
                  className={`gb-co-carrier-card${shippingCarrier === "interrapidismo" ? " gb-co-carrier-card--active" : ""}`}
                  onClick={() => setShippingCarrier("interrapidismo")}
                >
                  <strong>Interrapidísimo</strong>
                  <span>El flete se paga contraentrega.</span>
                </button>
              </div>
              <div className="gb-co-zone-grid" role="radiogroup" aria-label="Zona de envío">
                {(Object.keys(SHIPPING_ZONES) as ShippingZoneId[]).map((zid) => {
                  const z = SHIPPING_ZONES[zid];
                  const selected = shippingZoneId === zid;
                  const enviaRate = z.rateSubtotalLow;
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
                        {shippingCarrier === "interrapidismo" ? (
                          <strong>Contraentrega</strong>
                        ) : (
                          <strong>{formatPrice(enviaRate)}</strong>
                        )}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
              <p className="gb-co-reexp-note">{ENVIA_NO_REEXPEDITION_NOTE}</p>
              <details className="gb-co-reexp-details">
                <summary>Ver destinos sin cobertura Envía</summary>
                <ul>
                  {ENVIA_REEXPEDITION_DESTINATIONS.map((row) => (
                    <li key={`${row.city}-${row.department}`}>
                      {row.city} · {row.department}
                    </li>
                  ))}
                </ul>
              </details>
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
              </>
              )}
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
            {buyingAsWholesale ? null : (
            <div className="gb-co-total-row">
              <span>
                Envío{" "}
                <span className="gb-co-total-zone">
                  ({SHIPPING_ZONES[shippingZoneId].shortLabel} · {shippingCarrier === "envia" ? "Envía" : "Interrapidísimo"})
                </span>
              </span>
              <strong>
                {shippingCarrier === "interrapidismo" ? (
                  <span className="gb-co-price-cod">Contraentrega</span>
                ) : shippingPaid === 0 && couponApplied ? (
                  <span className="gb-co-price-cod">Gratis</span>
                ) : (
                  formatPrice(shippingPaid)
                )}
              </strong>
            </div>
            )}
            {isWholesaleCustomer ? (
              <div className="cart-channel-switch" role="group" aria-label="Tipo de compra" style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className={wholesaleMode === "wholesale" ? "is-active" : ""}
                  aria-pressed={wholesaleMode === "wholesale"}
                  onClick={() => chooseWholesaleMode("wholesale")}
                >
                  Comprar como mayorista
                </button>
                <button
                  type="button"
                  className={wholesaleMode === "retail" ? "is-active" : ""}
                  aria-pressed={wholesaleMode === "retail"}
                  onClick={() => chooseWholesaleMode("retail")}
                >
                  Comprar al detal
                </button>
              </div>
            ) : null}
            {buyingAsWholesale ? null : (
            <div className="gb-co-coupon">
              <label className="gb-co-coupon__label" htmlFor="checkout-coupon">
                Cupón
              </label>
              <div className="gb-co-coupon__row">
                <input
                  id="checkout-coupon"
                  className="gb-co-input"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="Código"
                  disabled={couponBusy}
                />
                <button type="button" className="gb-co-coupon__btn" disabled={couponBusy} onClick={() => void applyCoupon()}>
                  {couponBusy ? "…" : couponApplied ? "OK" : "Aplicar"}
                </button>
                {couponApplied ? (
                  <button
                    type="button"
                    className="gb-co-coupon__clear"
                    onClick={() => {
                      setCouponApplied(null);
                      setCouponError(null);
                    }}
                  >
                    Quitar
                  </button>
                ) : null}
              </div>
              {couponError ? <p className="gb-co-coupon__err">{couponError}</p> : null}
              {couponApplied ? (
                <p className="gb-co-coupon__ok">
                  {couponApplied.label} · −{formatPrice(couponDiscount)}
                </p>
              ) : null}
            </div>
            )}
            {couponDiscount > 0 ? (
              <div className="gb-co-total-row">
                <span>Descuento cupón</span>
                <strong>−{formatPrice(couponDiscount)}</strong>
              </div>
            ) : null}
            <div className="gb-co-total-row gb-co-total-row--grand">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>

            <div className="gb-co-section-title gb-co-pay-title" style={{ marginTop: 22, marginBottom: 12 }}>
              <span>4</span>
              ¿Cómo quieres pagar?
            </div>
            <div className="gb-co-pay-grid" role="radiogroup" aria-label="Método de pago">
              {buyingAsWholesale ? (
                <motion.button
                  type="button"
                  role="radio"
                  aria-checked
                  className="gb-co-method-card gb-co-method-card--active"
                  onClick={() => setPaymentMethod("contraentrega")}
                >
                  <span className="gb-co-method-name">Pago contraentrega</span>
                  <span className="gb-co-method-desc">Los pedidos mayorista se pagan al recibir el pedido.</span>
                </motion.button>
              ) : (
              <>
              <motion.button
                type="button"
                role="radio"
                aria-checked={paymentMethod === "mercadopago"}
                className={`gb-co-method-card${paymentMethod === "mercadopago" ? " gb-co-method-card--active" : ""}`}
                onClick={() => setPaymentMethod("mercadopago")}
                whileHover={reduceMotion ? undefined : { y: -3 }}
                whileTap={reduceMotion ? undefined : { scale: 0.99 }}
              >
                <span className="gb-co-method-badge">Recomendado</span>
                <span className="gb-co-method-logo">
                  <Image src={mercadoPagoLogo} alt="" height={36} unoptimized />
                </span>
                <span className="gb-co-method-name">Mercado Pago</span>
                <span className="gb-co-method-desc">Te redirige a Mercado Pago (tarjeta, PSE…)</span>
              </motion.button>
              <motion.button
                type="button"
                role="radio"
                aria-checked={paymentMethod === "addi"}
                className={`gb-co-method-card${paymentMethod === "addi" ? " gb-co-method-card--active" : ""}`}
                onClick={() => setPaymentMethod("addi")}
                whileHover={reduceMotion ? undefined : { y: -3 }}
                whileTap={reduceMotion ? undefined : { scale: 0.99 }}
              >
                <span className="gb-co-method-logo">
                  <Image src={addiLogo} alt="" height={32} unoptimized />
                </span>
                <span className="gb-co-method-name">Addi</span>
                <span className="gb-co-method-desc">Paga a cuotas · Buy now, pay later</span>
              </motion.button>
              {BOLD_CHECKOUT_ENABLED ? (
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
              ) : null}
              </>
              )}
            </div>

            {BOLD_CHECKOUT_ENABLED ? <div ref={boldMountRef} className="gb-co-bold-mount" id="gb-bold-embed" /> : null}

            <div className="gb-co-trust">
              🔒 Pagos seguros. No almacenamos datos de tarjeta. La confirmación definitiva la envía la pasarela a nuestro
              servidor.
            </div>

            {buyingAsWholesale ? (
              <p className="gb-co-wholesale-hint" role="status">
                {wholesaleMinimumReminder(wholesaleMin, subtotal)}
              </p>
            ) : null}

            <button
              type="button"
              className={`gb-co-pay${!formComplete && !payBusy ? " gb-co-pay--incomplete" : ""}`}
              onClick={handlePay}
              disabled={payBusy || !formComplete || !paymentMethod}
            >
              {payBusy && <span className="gb-co-spinner" aria-hidden />}
              {payLabel}
            </button>

            {!formComplete ? (
              <p className="gb-co-pay-hint">
                {formError ||
                  "Correo, nombre, celular, cédula, dirección y ciudad son obligatorios."}
              </p>
            ) : null}

            {errorMsg && (
              <div className="gb-co-status gb-co-status--error" role="alert">
                {errorMsg}
              </div>
            )}

            {phase === "session" && paymentMethod === "mercadopago" && (
              <div className="gb-co-status gb-co-status--loading gb-co-status--pulse">Preparando Mercado Pago…</div>
            )}
            {phase === "session" && paymentMethod === "addi" && (
              <div className="gb-co-status gb-co-status--loading gb-co-status--pulse">Preparando Addi…</div>
            )}
          </motion.div>
        </aside>
      </div>

      {infoModal ? (
        <div className="gb-co-toast-modal" role="status" aria-live="polite">
          <div className="gb-co-toast-modal__card">
            <strong>{infoModal}</strong>
            {errorMsg ? <p>{errorMsg}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
