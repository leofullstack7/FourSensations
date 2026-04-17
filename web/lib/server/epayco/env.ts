import "@/lib/load-env";

function parseBool(v: string | undefined, defaultVal: boolean): boolean {
  if (v == null || v === "") return defaultVal;
  return ["1", "true", "yes", "on"].includes(v.trim().toLowerCase());
}

/** Configuración ePayco (servidor). */
export function getEpaycoServerConfig() {
  const publicKey = process.env.EPAYCO_PUBLIC_KEY?.trim();
  const privateKey = process.env.EPAYCO_PRIVATE_KEY?.trim();
  const test = parseBool(process.env.EPAYCO_TEST, true);
  const apiBaseUrl = (process.env.EPAYCO_API_BASE_URL?.trim() || "https://apify.epayco.co").replace(/\/$/, "");
  const responseUrl = process.env.EPAYCO_RESPONSE_URL?.trim();
  const confirmationUrl = process.env.EPAYCO_CONFIRMATION_URL?.trim();
  const merchantName = process.env.EPAYCO_MERCHANT_NAME?.trim() || "GinnaBeauty";
  const validationBase =
    process.env.EPAYCO_VALIDATION_BASE_URL?.trim() || "https://secure.epayco.co/validation/v1/reference";
  const customerId = process.env.EPAYCO_CUSTOMER_ID?.trim();
  const pKey = process.env.EPAYCO_P_KEY?.trim();

  return {
    publicKey,
    privateKey,
    test,
    apiBaseUrl,
    responseUrl,
    confirmationUrl,
    merchantName,
    validationBase: validationBase.replace(/\/$/, ""),
    /** Para validar `x_signature` en el webhook (distintas de PUBLIC_KEY / PRIVATE_KEY de Apify). */
    customerId,
    pKey,
  };
}

export function assertApifyKeys(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = getEpaycoServerConfig();
  if (!publicKey || !privateKey) {
    throw new Error("Faltan EPAYCO_PUBLIC_KEY o EPAYCO_PRIVATE_KEY");
  }
  return { publicKey, privateKey };
}

export function assertCheckoutUrls(): { responseUrl: string; confirmationUrl: string } {
  const { responseUrl, confirmationUrl } = getEpaycoServerConfig();
  if (!responseUrl || !confirmationUrl) {
    throw new Error("Faltan EPAYCO_RESPONSE_URL o EPAYCO_CONFIRMATION_URL");
  }
  return { responseUrl, confirmationUrl };
}
