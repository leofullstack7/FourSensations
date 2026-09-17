/** Widget Smart Checkout v2 (checkout.epayco.co/checkout-v2.js) */
export type EpaycoCheckoutWidget = {
  open: () => void;
  onCreated: (cb: () => void) => void;
  onErrors: (cb: (errors: unknown) => void) => void;
  onClosed: (cb: () => void) => void;
};

declare global {
  interface Window {
    ePayco?: {
      checkout: {
        configure: (opts: { sessionId: string; type: "onpage" | "standard"; test: boolean }) => EpaycoCheckoutWidget;
      };
    };
  }
}

export {};
