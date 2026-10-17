import { z } from "zod";
import { SHIPPING_ZONE_IDS } from "@/lib/checkout/shipping-zones";

export const shippingAddressSchema = z.object({
  line1: z.string().min(1).max(300),
  line2: z.string().max(300).optional(),
  city: z.string().min(1).max(120).optional(),
  region: z.string().max(120).optional(),
  country: z.string().length(2).default("CO"),
  postalCode: z.string().max(20).optional(),
});

export const checkoutLineSchema = z
  .object({
    productId: z.string().min(1).optional(),
    comboId: z.string().min(1).optional(),
    quantity: z.number().int().min(1).max(99),
  })
  .superRefine((v, ctx) => {
    const hasProduct = Boolean(v.productId?.trim());
    const hasCombo = Boolean(v.comboId?.trim());
    if (hasProduct === hasCombo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cada línea debe tener productId o comboId (uno solo).",
      });
    }
  });

export const createCheckoutOrderSchema = z
  .object({
    items: z.array(checkoutLineSchema).min(1).max(50),
    customerEmail: z.string().email().max(320),
    customerName: z.string().min(2).max(200),
    customerPhone: z.string().min(7).max(40),
    shippingAddress: shippingAddressSchema,
    customerNote: z.string().max(2000).optional(),
    shippingZoneId: z.enum(SHIPPING_ZONE_IDS),
    /** Preferencia de pasarela; el costo de envío lo calcula el servidor. */
    paymentProvider: z.enum(["EPAYCO", "BOLD", "MERCADOPAGO", "ADDI", "CONTRAENTREGA"]).optional(),
    /** Mayorista: precios de volumen. Detal: precios públicos, sin mínimo. */
    pricingMode: z.enum(["wholesale", "retail"]).optional(),
    /** Cédula obligatoria en checkout. */
    customerDocument: z.string().min(5).max(20),
    /** Código de cupón opcional. */
    couponCode: z.string().min(1).max(40).optional(),
  })
  .superRefine((data, ctx) => {
    const line1 = data.shippingAddress.line1.trim();
    const city = (data.shippingAddress.city ?? "").trim();
    if (line1.length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Indica una dirección de entrega (mínimo 3 caracteres).",
        path: ["shippingAddress", "line1"],
      });
    }
    if (city.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Indica la ciudad de entrega.",
        path: ["shippingAddress", "city"],
      });
    }
    const phone = (data.customerPhone ?? "").replace(/\D/g, "");
    if (phone.length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Indica un celular válido (mínimo 10 dígitos).",
        path: ["customerPhone"],
      });
    }
    const doc = (data.customerDocument ?? "").replace(/\D/g, "");
    if (doc.length < 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Indica tu número de cédula.",
        path: ["customerDocument"],
      });
    }
  });

export type CreateCheckoutOrderInput = z.infer<typeof createCheckoutOrderSchema>;
