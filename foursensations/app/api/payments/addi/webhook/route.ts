import { NextResponse } from "next/server";
import { applyAddiWebhook, type AddiWebhookPayload } from "@/lib/server/addi/apply-confirmation";

async function handle(req: Request) {
  let body: AddiWebhookPayload = {};
  try {
    const text = await req.text();
    if (text) {
      try {
        body = JSON.parse(text) as AddiWebhookPayload;
      } catch {
        body = Object.fromEntries(new URLSearchParams(text)) as AddiWebhookPayload;
      }
    }
  } catch {
    body = {};
  }

  const url = new URL(req.url);
  if (!body.orderId && url.searchParams.get("orderId")) {
    body.orderId = url.searchParams.get("orderId") || undefined;
  }
  if (!body.status && url.searchParams.get("status")) {
    body.status = url.searchParams.get("status") || undefined;
  }

  try {
    const result = await applyAddiWebhook(body);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }
    return NextResponse.json({
      ok: true,
      reference: result.orderReference,
      duplicate: result.duplicate,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error webhook Addi";
    console.error("[addi] webhook", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
