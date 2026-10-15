export const WHOLESALE_CHECKOUT_MODE_KEY = "fs_wholesale_checkout_mode";

export type WholesaleCheckoutMode = "wholesale" | "retail";

export function loadWholesaleCheckoutMode(): WholesaleCheckoutMode {
  if (typeof window === "undefined") return "wholesale";
  try {
    return localStorage.getItem(WHOLESALE_CHECKOUT_MODE_KEY) === "retail" ? "retail" : "wholesale";
  } catch {
    return "wholesale";
  }
}

export function saveWholesaleCheckoutMode(mode: WholesaleCheckoutMode): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(WHOLESALE_CHECKOUT_MODE_KEY, mode);
}
