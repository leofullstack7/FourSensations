import { createHash } from "node:crypto";
import { getEpaycoServerConfig } from "@/lib/server/epayco/env";

export type EpaycoWebhookFields = {
  x_ref_payco: string;
  x_transaction_id: string;
  x_amount: string;
  x_currency_code: string;
  x_signature: string;
};

/**
 * SHA256(p_cust_id_cliente^p_key^x_ref_payco^x_transaction_id^x_amount^x_currency_code)
 * @see https://docs.epayco.com/docs/checkout-respuesta-y-confirmacion
 */
export function computeEpaycoSignature(
  customerId: string,
  pKey: string,
  data: Pick<EpaycoWebhookFields, "x_ref_payco" | "x_transaction_id" | "x_amount" | "x_currency_code">,
): string {
  const raw = `${customerId}^${pKey}^${data.x_ref_payco}^${data.x_transaction_id}^${data.x_amount}^${data.x_currency_code}`;
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export function validateEpaycoWebhookSignature(fields: EpaycoWebhookFields): { ok: boolean; reason?: string } {
  const { customerId, pKey } = getEpaycoServerConfig();
  if (!customerId || !pKey) {
    return { ok: false, reason: "Faltan EPAYCO_CUSTOMER_ID o EPAYCO_P_KEY para validar firma" };
  }
  const expected = computeEpaycoSignature(customerId, pKey, fields);
  if (expected !== fields.x_signature) {
    return { ok: false, reason: "Firma no coincide" };
  }
  return { ok: true };
}
