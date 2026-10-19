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
    <div className="fs-welcome-coupon" role="dialog" aria-modal="true" aria-labelledby="fs-welcome-coupon-title">
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
            sizes="(max-width: 640px) 92vw, 520px"
            priority
            placeholder="blur"
          />
          <div className="fs-welcome-coupon__form-wrap">
            <p id="fs-welcome-coupon-title" className="fs-welcome-coupon__kicker">
              Un detalle para ti
            </p>
            {done ? (
              <div className="fs-welcome-coupon__result">
                <p>{done.message}</p>
                {done.alreadySent ? null : (
                  <>
                    <strong className="fs-welcome-coupon__code">{done.code}</strong>
                    <span>{done.valueLabel}</span>
                  </>
                )}
                <button type="button" className="btn btn-primary btn-sm" onClick={() => dismiss(true)}>
                  Seguir explorando
                </button>
              </div>
            ) : (
              <form className="fs-welcome-coupon__form" onSubmit={onSubmit}>
                <label className="fs-welcome-coupon__label" htmlFor="fs-welcome-email">
                  Tu correo electrónico
                </label>
                <input
                  id="fs-welcome-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  placeholder="tu@correo.com"
                  value={email}
                  disabled={busy}
                  onChange={(e) => setEmail(e.target.value)}
                  className="fs-welcome-coupon__input"
                />
                {error ? <p className="fs-welcome-coupon__error">{error}</p> : null}
                <button type="submit" className="btn btn-primary fs-welcome-coupon__submit" disabled={busy}>
                  {busy ? "Enviando…" : "Quiero mi cupón"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
