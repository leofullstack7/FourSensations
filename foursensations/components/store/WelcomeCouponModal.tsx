"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import couponArt from "@/assets/foursensations/cupondescuento.webp";

const STORAGE_KEY = "fs_welcome_coupon_v1";

type ClaimOk = {
  ok: true;
  alreadySent?: boolean;
  code?: string;
  valueLabel?: string;
  message?: string;
};

function MailIcon() {
  return (
    <svg className="fs-welcome-coupon__icon" viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        d="M4.5 6.75h15a1.5 1.5 0 0 1 1.5 1.5v7.5a1.5 1.5 0 0 1-1.5 1.5h-15a1.5 1.5 0 0 1-1.5-1.5v-7.5a1.5 1.5 0 0 1 1.5-1.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="m4 8.25 7.2 5.1a1.4 1.4 0 0 0 1.6 0L20 8.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function WelcomeCouponModal() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<ClaimOk | null>(null);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      /* ignore */
    }
    const timer = window.setTimeout(() => setOpen(true), 3000);
    return () => window.clearTimeout(timer);
  }, []);

  const dismiss = (permanent: boolean) => {
    setOpen(false);
    if (permanent) {
      try {
        window.localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/store/coupons/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as ClaimOk & { error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || "No pudimos enviar tu cupón.");
        return;
      }
      setDone(data);
      try {
        window.localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
    } catch {
      setError("Error de red. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fs-welcome-coupon"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fs-welcome-coupon-title"
    >
      <div className="fs-welcome-coupon__veil" aria-hidden />
      <div className="fs-welcome-coupon__orbs" aria-hidden>
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="fs-welcome-coupon__panel">
        <button
          type="button"
          className="fs-welcome-coupon__close"
          aria-label="Cerrar"
          onClick={() => dismiss(true)}
        >
          ✕
        </button>
        <div className="fs-welcome-coupon__art">
          <Image
            src={couponArt}
            alt="Cupón de descuento Four Sensations"
            className="fs-welcome-coupon__img"
            sizes="(max-width: 640px) 97vw, (max-width: 1100px) 86vw, 820px"
            priority
            placeholder="blur"
            style={{ width: "100%", height: "auto", background: "transparent" }}
          />
          <div className="fs-welcome-coupon__form-slot">
            <h2 id="fs-welcome-coupon-title" className="sr-only">
              Cupón de bienvenida
            </h2>
            {done ? (
              <div className="fs-welcome-coupon__result">
                <p>{done.message}</p>
                {done.alreadySent ? null : (
                  <>
                    <strong className="fs-welcome-coupon__code">{done.code}</strong>
                    <span>{done.valueLabel}</span>
                  </>
                )}
                <button
                  type="button"
                  className="fs-welcome-coupon__submit"
                  onClick={() => dismiss(true)}
                >
                  Seguir explorando
                </button>
              </div>
            ) : (
              <form className="fs-welcome-coupon__form" onSubmit={onSubmit}>
                <label className="sr-only" htmlFor="fs-welcome-email">
                  Tu correo electrónico
                </label>
                <div className="fs-welcome-coupon__field">
                  <MailIcon />
                  <input
                    id="fs-welcome-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    required
                    placeholder="Tu correo electrónico"
                    value={email}
                    disabled={busy}
                    onChange={(e) => setEmail(e.target.value)}
                    className="fs-welcome-coupon__input"
                  />
                </div>
                {error ? <p className="fs-welcome-coupon__error">{error}</p> : null}
                <button type="submit" className="fs-welcome-coupon__submit" disabled={busy}>
                  {busy ? (
                    "Enviando…"
                  ) : (
                    <>
                      Quiero mi descuento <span aria-hidden>♥</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
