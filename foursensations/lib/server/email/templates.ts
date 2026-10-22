/** Plantillas HTML compartidas — tipografía alineada a la tienda (Nunito = --font-display). */

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatCop(amount: number): string {
  return `$${amount.toLocaleString("es-CO")} COP`;
}

/** Misma familia que los títulos de hero de categoría en la web. */
export const EMAIL_FONT_DISPLAY = "'Nunito', Arial, Helvetica, sans-serif";
export const EMAIL_FONT_BODY = "'Nunito', Arial, Helvetica, sans-serif";
export const EMAIL_GOOGLE_FONTS =
  `<link href="https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,400;0,600;0,700;0,800;1,600&display=swap" rel="stylesheet"/>`;

/** Fecha/hora en zona Colombia (UTC-5). Render corre en UTC; sin timeZone la hora sale mal. */
export function formatColombiaDateTime(value?: Date | string | null): string {
  const d = value != null ? new Date(value) : new Date();
  const safe = Number.isNaN(d.getTime()) ? new Date() : d;
  return safe.toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

const FONT = EMAIL_FONT_DISPLAY;
const SANS = EMAIL_FONT_BODY;

type ShellOpts = {
  preheader: string;
  heroTitle: string;
  heroSubtitle: string;
  bodyHtml: string;
  footerNote?: string;
};

/** Envoltura visual rich (tablas para clientes de correo). */
export function emailShell(opts: ShellOpts): string {
  const footerNote =
    opts.footerNote ||
    "Four Sensations S.A.S. · NIT 901.038.691-2 · Manizales, Caldas, Colombia";
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  ${EMAIL_GOOGLE_FONTS}
  <title>${escapeHtml(opts.heroTitle)}</title>
</head>
<body style="margin:0;padding:0;background:#120914;font-family:${FONT};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">
    ${escapeHtml(opts.preheader)}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#120914;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:0 0 14px;text-align:center;">
              <p style="margin:0;font-family:${SANS};font-size:11px;letter-spacing:0.35em;text-transform:uppercase;color:#d4af7a;">
                El Club de los Cabellos Perfectos
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:linear-gradient(160deg,#2a1528 0%,#1a0f1c 42%,#241018 100%);border:1px solid rgba(212,175,122,0.35);border-radius:22px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,0.45);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:36px 28px 28px;text-align:center;background:radial-gradient(ellipse at 50% 0%, rgba(196,84,122,0.45), transparent 62%), linear-gradient(180deg, #3d1a35 0%, #1a0f1c 100%);">
                    <p style="margin:0 0 10px;font-size:22px;line-height:1;">✦ · ☾ · ✦</p>
                    <h1 style="margin:0;color:#fff8f2;font-size:30px;letter-spacing:0.08em;font-weight:600;">
                      Four Sensations
                    </h1>
                    <p style="margin:14px 0 0;color:#f0c9d4;font-size:18px;font-style:italic;line-height:1.35;">
                      ${escapeHtml(opts.heroTitle)}
                    </p>
                    <p style="margin:10px 0 0;font-family:${SANS};font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#d4af7a;">
                      ${escapeHtml(opts.heroSubtitle)}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 28px 0;">
                    <div style="height:1px;background:linear-gradient(90deg, transparent, rgba(212,175,122,0.65), transparent);"></div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px 28px 8px;color:#f4e8ee;">
                    ${opts.bodyHtml}
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 28px 32px;text-align:center;">
                    <p style="margin:0;font-family:${SANS};font-size:12px;line-height:1.6;color:#c9a8b4;">
                      ${escapeHtml(footerNote)}
                    </p>
                    <p style="margin:10px 0 0;font-size:18px;letter-spacing:0.4em;color:#d4af7a;">❀</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function goldDivider(): string {
  return `<div style="height:1px;margin:22px 0;background:linear-gradient(90deg, transparent, rgba(212,175,122,0.55), transparent);"></div>`;
}

export function softCard(inner: string, accent = "rgba(212,175,122,0.28)"): string {
  return `<div style="background:rgba(255,248,242,0.06);border:1px solid ${accent};border-radius:16px;padding:18px 18px 16px;margin:0 0 18px;">${inner}</div>`;
}

export function sectionTitle(label: string): string {
  return `<p style="margin:0 0 12px;font-family:${SANS};font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#d4af7a;">${escapeHtml(label)}</p>`;
}

export function itemsTable(
  items: Array<{ productName: string; quantity: number; unitPrice: number }>,
): string {
  const rows = items
    .map(
      (item, i) => `
      <tr style="background:${i % 2 === 0 ? "rgba(255,255,255,0.03)" : "transparent"};">
        <td style="padding:12px 10px;color:#fff8f2;font-size:14px;border-bottom:1px solid rgba(212,175,122,0.12);">${escapeHtml(item.productName)}</td>
        <td style="padding:12px 10px;color:#f0c9d4;font-size:14px;text-align:center;border-bottom:1px solid rgba(212,175,122,0.12);">${item.quantity}</td>
        <td style="padding:12px 10px;color:#fff8f2;font-size:14px;text-align:right;border-bottom:1px solid rgba(212,175,122,0.12);">${formatCop(item.unitPrice)}</td>
      </tr>`,
    )
    .join("");

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 8px;">
    <thead>
      <tr>
        <th style="padding:10px;text-align:left;font-family:${SANS};font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#d4af7a;border-bottom:1px solid rgba(212,175,122,0.35);">Producto</th>
        <th style="padding:10px;text-align:center;font-family:${SANS};font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#d4af7a;border-bottom:1px solid rgba(212,175,122,0.35);">Cant.</th>
        <th style="padding:10px;text-align:right;font-family:${SANS};font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#d4af7a;border-bottom:1px solid rgba(212,175,122,0.35);">Precio</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

export function totalsBlock(opts: {
  subtotal: number;
  shipping: number;
  shippingLabel: string;
  total: number;
}): string {
  const ship =
    opts.shipping === 0
      ? "Contraentrega / $0"
      : formatCop(opts.shipping);
  return softCard(`
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr>
        <td style="padding:4px 0;color:#c9a8b4;font-size:14px;">Subtotal</td>
        <td style="padding:4px 0;color:#fff8f2;font-size:14px;text-align:right;">${formatCop(opts.subtotal)}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#c9a8b4;font-size:14px;">Envío (${escapeHtml(opts.shippingLabel)})</td>
        <td style="padding:4px 0;color:#fff8f2;font-size:14px;text-align:right;">${ship}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding-top:12px;">
          <div style="height:1px;background:rgba(212,175,122,0.35);"></div>
        </td>
      </tr>
      <tr>
        <td style="padding:14px 0 0;color:#d4af7a;font-size:13px;letter-spacing:0.16em;text-transform:uppercase;font-family:${SANS};">Total</td>
        <td style="padding:14px 0 0;color:#fff8f2;font-size:24px;text-align:right;font-weight:600;">${formatCop(opts.total)}</td>
      </tr>
    </table>
  `);
}

export function statusPill(text: string, tone: "ok" | "info" = "ok"): string {
  const bg = tone === "ok" ? "rgba(34,197,94,0.16)" : "rgba(212,175,122,0.16)";
  const border = tone === "ok" ? "rgba(34,197,94,0.45)" : "rgba(212,175,122,0.45)";
  const color = tone === "ok" ? "#86efac" : "#f0d9a8";
  return `<div style="display:inline-block;padding:8px 14px;border-radius:999px;background:${bg};border:1px solid ${border};color:${color};font-family:${SANS};font-size:12px;letter-spacing:0.12em;text-transform:uppercase;">${escapeHtml(text)}</div>`;
}
