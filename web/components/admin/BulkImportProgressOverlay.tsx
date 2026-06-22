"use client";

const R = 52;
const C = 2 * Math.PI * R;

type Props = {
  open: boolean;
  percent: number;
  label: string;
};

export function BulkImportProgressOverlay({ open, percent, label }: Props) {
  if (!open) return null;
  const p = Math.min(100, Math.max(0, percent));
  const offset = C * (1 - p / 100);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 20000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(45, 31, 26, 0.42)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "var(--radius-lg, 16px)",
          padding: "28px 36px",
          boxShadow: "0 24px 60px rgba(45,31,26,0.2)",
          textAlign: "center",
          maxWidth: 320,
        }}
      >
        <svg width={132} height={132} viewBox="0 0 120 120" style={{ display: "block", margin: "0 auto 12px" }}>
          <circle cx="60" cy="60" r={R} fill="none" stroke="var(--cream, #F5EDE3)" strokeWidth="9" />
          <circle
            cx="60"
            cy="60"
            r={R}
            fill="none"
            stroke="var(--dusty-rose, #B87070)"
            strokeWidth="9"
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
            strokeDasharray={C}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.35s ease-out" }}
          />
        </svg>
        <div style={{ fontSize: 26, fontWeight: 800, color: "var(--dark, #2D1F1A)", fontVariantNumeric: "tabular-nums" }}>
          {Math.round(p)}%
        </div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.45 }}>{label}</div>
      </div>
    </div>
  );
}
