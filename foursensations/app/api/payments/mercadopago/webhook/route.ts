import { NextResponse } from "next/server";
import { applyMercadoPagoPayment } from "@/lib/server/mercadopago/apply-confirmation";
import { fetchMercadoPagoPayment } from "@/lib/server/mercadopago/client";
import { assertMercadoPagoConfig } from "@/lib/server/mercadopago/env";

function paymentIdFromPayload(body: unknown, search: URLSearchParams): string | null {
  if (body && typeof body === "object") {
    const rec = body as Record<string, unknown>;
    const data = rec.data && typeof rec.data === "object" ? (rec.data as Record<string, unknown>) : null;
    if (data && (data.id != null || data["id"] != null)) return String(data.id);
    if (typeof rec["data.id"] === "string") return rec["data.id"];
    if (rec.type === "payment" && rec.id != null) return String(rec.id);
    if (rec.resource != null) return String(rec.resource);
  }
  const q =
    search.get("data.id") ||
    search.get("id") ||
    (search.get("topic") === "payment" ? search.get("id") : null);
  return q?.trim() || null;
}

async function handle(req: Request) {
  const url = new URL(req.url);
  let body: unknown = null;
  if (req.method !== "GET") {
    const text = await req.text();
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = Object.fromEntries(new URLSearchParams(text));
      }
    }
  }

  const topic =
    (body && typeof body === "object" && "type" in body ? String((body as { type?: unknown }).type) : "") ||
    url.searchParams.get("type") ||
    url.searchParams.get("topic") ||
    "";

  if (topic && topic !== "payment") {
    return NextResponse.json({ ok: true, ignored: topic });
  }

  const paymentId = paymentIdFromPayload(body, url.searchParams);
  if (!paymentId) {
    return NextResponse.json({ ok: true, ignored: "sin payment id" });
  }

  let accessToken: string;
  try {
    ({ accessToken } = assertMercadoPagoConfig());
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Config Mercado Pago";
    return NextResponse.json({ error: msg }, { status: 503 });
  }

  try {
    const payment = await fetchMercadoPagoPayment(accessToken, paymentId);
    const result = await applyMercadoPagoPayment(payment);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }
    return NextResponse.json({ ok: true, reference: result.orderReference, duplicate: result.duplicate });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error webhook Mercado Pago";
    console.error("[mercadopago] webhook", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
