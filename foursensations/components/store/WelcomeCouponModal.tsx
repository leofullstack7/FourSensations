"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import couponArt from "@/assets/foursensations/cupondescuento.webp";

const STORAGE_KEY = "fs_welcome_coupon_v1";
/** Espera mínima tras precargar el arte (no mostrar a medias). */
const SHOW_AFTER_READY_MS = 400;

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

function WhatsAppIcon() {
  return (
    <svg className="fs-welcome-coupon__icon" viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        fill="currentColor"
        d="M12.04 2c-5.46 0-9.9 4.43-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.39a9.86 9.86 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.65-1.03-5.14-2.9-7.01A9.84 9.84 0 0 0 12.04 2Zm0 18.07h-.01a8.16 8.16 0 0 1-4.16-1.14l-.3-.18-3.14.82.84-3.06-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.53 3.69-8.21 8.23-8.21 2.2 0 4.26.86 5.81 2.41a8.16 8.16 0 0 1 2.41 5.81c0 4.53-3.69 8.24-8.22 8.24Zm4.51-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.96-.14.16-.29.18-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.24-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.24.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.41-.56-.42h-.48c-.16 0-.43.06-.66.31-.23.24-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.16 1.75 2.67 4.24 3.74 1.49.64 2.07.7 2.81.59.43-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.23-.16-.48-.28Z"
      />
    </svg>
  );
}

function couponArtSrc(): string {
  if (typeof couponArt === "object" && couponArt && "src" in couponArt) {
    return String(couponArt.src);
  }
  return "";
}

export function WelcomeCouponModal() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<ClaimOk | null>(null);
  const [ready, setReady] = useState(false);

  // Precarga el arte YA; solo abre el modal cuando está listo (sin flash en blanco).
  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      /* ignore */
    }

    let cancelled = false;
    let finished = false;
    let showTimer: number | undefined;
    const src = couponArtSrc();

    const markReadyAndSchedule = () => {
      if (cancelled || finished) return;
      finished = true;
      setReady(true);
      showTimer = window.setTimeout(() => {
        if (!cancelled) setOpen(true);
      }, SHOW_AFTER_READY_MS);
    };

    if (!src) {
      markReadyAndSchedule();
      return () => {
        cancelled = true;
        if (showTimer) window.clearTimeout(showTimer);
      };
    }

    const img = new window.Image();
    img.decoding = "async";
    img.onload = () => {
      const finish = () => {
        if (!cancelled) markReadyAndSchedule();
      };
      if (typeof img.decode === "function") {
        img.decode().then(finish).catch(finish);
      } else {
        finish();
      }
    };
    img.onerror = () => {
      if (!cancelled) markReadyAndSchedule();
    };
    img.src = src;
    if (img.complete) {
      img.onload?.(new Event("load"));
    }

    return () => {
      cancelled = true;
      if (showTimer) window.clearTimeout(showTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar
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
        body: JSON.stringify({ email, whatsapp }),
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

  if (!open || !ready) return null;

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
            sizes="(max-width: 640px) 88vw, 420px"
            priority
            placeholder="blur"
            style={{ width: "100%", height: "auto", background: "transparent" }}
          />
          <div className={`fs-welcome-coupon__form-slot${done ? " is-done" : ""}`}>
            <h2 id="fs-welcome-coupon-title" className="sr-only">
              Cupón de bienvenida
            </h2>
            {done ? (
              <div className="fs-welcome-coupon__result">
                <p className="fs-welcome-coupon__result-msg">
                  {done.alreadySent
                    ? done.message
                    : "Revisa tu correo electrónico: tu cupón ya va en camino ✨"}
                </p>
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
                <label className="sr-only" htmlFor="fs-welcome-whatsapp">
                  WhatsApp
                </label>
                <div className="fs-welcome-coupon__field">
                  <WhatsAppIcon />
                  <input
                    id="fs-welcome-whatsapp"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                    placeholder="WhatsApp"
                    value={whatsapp}
                    disabled={busy}
                    onChange={(e) => setWhatsapp(e.target.value)}
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
