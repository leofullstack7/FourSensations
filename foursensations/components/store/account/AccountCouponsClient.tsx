"use client";

import { useEffect, useState } from "react";

type CouponRow = {
  id: string;
  code: string;
  name: string;
  reference: string;
  description?: string | null;
  valueLabel: string;
  typeLabel: string;
  status: "Ya Redimido" | "Listo para redimir" | string;
  redeemed: boolean;
  sentAt: string;
  endsAt: string | null;
};

export function AccountCouponsClient() {
  const [coupons, setCoupons] = useState<CouponRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/store/coupons/mine", { cache: "no-store" });
        const data = (await res.json()) as { coupons?: CouponRow[]; error?: string };
        if (!res.ok) {
          if (!cancelled) setError(data.error || "No se pudieron cargar tus cupones.");
          return;
        }
        if (!cancelled) setCoupons(data.coupons ?? []);
      } catch {
        if (!cancelled) setError("Error de red al cargar cupones.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p className="fs-account-lead" style={{ color: "var(--danger, #b00020)" }}>{error}</p>;
  }

  if (coupons == null) {
    return <p className="fs-account-lead">Cargando tus cupones…</p>;
  }

  if (coupons.length === 0) {
    return (
      <>
        <h2>Mis cupones</h2>
        <p className="fs-account-lead">
          Aún no tienes cupones asociados a este correo. Si pediste el cupón inicial desde el aviso de bienvenida,
          asegúrate de registrarte con el mismo correo.
        </p>
      </>
    );
  }

  return (
    <>
      <h2>Mis cupones</h2>
      <p className="fs-account-lead">
        Usa el código en el checkout. Funciona aunque no hayas iniciado sesión, siempre que compres con este correo.
      </p>
      <div className="fs-coupons-list">
        {coupons.map((c) => (
          <article key={c.id} className={`fs-coupon-card${c.redeemed ? " fs-coupon-card--used" : ""}`}>
            <div className="fs-coupon-card__top">
              <span className="fs-coupon-card__ref">{c.reference}</span>
              <span className={`fs-coupon-card__status${c.redeemed ? " is-used" : " is-ready"}`}>
                {c.status}
              </span>
            </div>
            <strong className="fs-coupon-card__code">{c.code}</strong>
            <p className="fs-coupon-card__value">{c.valueLabel}</p>
            {c.description ? <p className="fs-coupon-card__desc">{c.description}</p> : null}
          </article>
        ))}
      </div>
    </>
  );
}
