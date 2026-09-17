import { NextResponse } from "next/server";
import { applyEpaycoConfirmation } from "@/lib/server/checkout/apply-confirmation";
import {
  epaycoWebhookAllowUnsignedInDev,
  getEpaycoServerConfig,
} from "@/lib/server/epayco/env";
import { validateEpaycoWebhookSignature, type EpaycoWebhookFields } from "@/lib/server/epayco/webhook-signature";

export const dynamic = "force-dynamic";

function parseFlatParams(url: URL): Record<string, string> {
  const out: Record<string, string> = {};
  url.searchParams.forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

async function readBodyFlat(req: Request): Promise<Record<string, string>> {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const j = (await req.json()) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(j)) {
      if (v != null) out[k] = String(v);
    }
    return out;
  }
  if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
    const form = await req.formData();
    const out: Record<string, string> = {};
    form.forEach((v, k) => {
      out[k] = typeof v === "string" ? v : "";
    });
    return out;
  }
  const text = await req.text();
  if (!text) return {};
  try {
    const j = JSON.parse(text) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(j)) {
      if (v != null) out[k] = String(v);
    }
    return out;
  } catch {
    return {};
  }
}

async function handleConfirmation(req: Request): Promise<Response> {
  const url = new URL(req.url);
  let flat: Record<string, string> =
    req.method === "GET" ? parseFlatParams(url) : await readBodyFlat(req);

  if (req.method === "POST" && Object.keys(flat).length === 0) {
    flat = parseFlatParams(url);
  }

  const sigFields: Partial<EpaycoWebhookFields> = {
    x_ref_payco: flat.x_ref_payco,
    x_transaction_id: flat.x_transaction_id,
    x_amount: flat.x_amount,
    x_currency_code: flat.x_currency_code,
    x_signature: flat.x_signature,
  };

  const { customerId, pKey } = getEpaycoServerConfig();
  const keysOk = Boolean(customerId && pKey);
  const hasSig =
    Boolean(sigFields.x_ref_payco) &&
    Boolean(sigFields.x_transaction_id) &&
    Boolean(sigFields.x_amount) &&
    Boolean(sigFields.x_currency_code) &&
    Boolean(sigFields.x_signature);

  const isProd = process.env.NODE_ENV === "production";
  const allowUnsignedDev = epaycoWebhookAllowUnsignedInDev();

  /**
   * Seguridad webhook ePayco:
   * - Producción: EPAYCO_CUSTOMER_ID + EPAYCO_P_KEY obligatorias; payload debe incluir los 5 campos de firma y validar SHA256.
   * - Desarrollo: mismo comportamiento por defecto; solo si EPAYCO_WEBHOOK_ALLOW_UNSIGNED=true se aceptan confirmaciones sin firma (solo pruebas locales).
   */
  if (isProd && !keysOk) {
    console.error("[epayco] webhook: producción sin EPAYCO_CUSTOMER_ID / EPAYCO_P_KEY");
    return new NextResponse("CONFIG", { status: 503 });
  }

  const mustVerifySignature = isProd || !allowUnsignedDev;

  if (mustVerifySignature) {
    if (!hasSig) {
      console.warn("[epayco] webhook rechazado: parámetros de firma incompletos", Object.keys(flat));
      return new NextResponse("MISSING SIGNATURE", { status: 400 });
    }
    if (!keysOk) {
      console.error("[epayco] webhook rechazado: faltan claves P_KEY / Customer ID para validar firma");
      return new NextResponse("CONFIG", { status: 503 });
    }
    const check = validateEpaycoWebhookSignature(sigFields as EpaycoWebhookFields);
    if (!check.ok) {
      console.error("[epayco] webhook: firma inválida", check.reason);
      return new NextResponse("INVALID SIGNATURE", { status: 400 });
    }
  } else {
    if (hasSig && keysOk) {
      const check = validateEpaycoWebhookSignature(sigFields as EpaycoWebhookFields);
      if (!check.ok) {
        console.error("[epayco] webhook: firma inválida", check.reason);
        return new NextResponse("INVALID SIGNATURE", { status: 400 });
      }
    } else if (hasSig && !keysOk) {
      console.warn(
        "[epayco] webhook: firma presente pero sin EPAYCO_CUSTOMER_ID/P_KEY; no se valida (EPAYCO_WEBHOOK_ALLOW_UNSIGNED)",
      );
    } else {
      console.warn(
        "[epayco] webhook: aceptado sin firma — solo desarrollo (EPAYCO_WEBHOOK_ALLOW_UNSIGNED). No uses esto en producción.",
      );
    }
  }

  const result = await applyEpaycoConfirmation(flat);
  if (!result.ok) {
    console.error("[epayco] webhook: negocio", result.error);
    return new NextResponse("ERROR", { status: 500 });
  }

  if (result.orderReference) {
    console.info("[epayco] webhook OK", {
      reference: result.orderReference,
      duplicate: result.duplicate,
    });
  }

  return new NextResponse("OK", { status: 200 });
}

export async function POST(req: Request) {
  return handleConfirmation(req);
}

export async function GET(req: Request) {
  return handleConfirmation(req);
}
