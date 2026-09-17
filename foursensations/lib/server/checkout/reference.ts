import { randomBytes } from "node:crypto";

/** Referencia única legible para `invoice` ePayco y trazas. */
export function generateOrderReference(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  const rnd = randomBytes(4).toString("hex");
  return `GB-${y}${m}${day}-${h}${min}${s}-${rnd}`;
}
