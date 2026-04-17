import { z } from "zod";

export const shippingAddressSchema = z.object({
  line1: z.string().min(3).max(300),
  line2: z.string().max(300).optional(),
  city: z.string().min(2).max(120).optional(),
  region: z.string().max(120).optional(),
  country: z.string().length(2).default("CO"),
  postalCode: z.string().max(20).optional(),
});

export const checkoutLineSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
});

export const createCheckoutOrderSchema = z.object({
  items: z.array(checkoutLineSchema).min(1).max(50),
  customerEmail: z.string().email().max(320),
  customerName: z.string().min(2).max(200),
  customerPhone: z.string().min(7).max(40).optional(),
  shippingAddress: shippingAddressSchema,
  customerNote: z.string().max(2000).optional(),
  /** Envío en COP (misma unidad que Product.price). */
  shipping: z.number().int().min(0).max(50_000_000).optional(),
});

export type CreateCheckoutOrderInput = z.infer<typeof createCheckoutOrderSchema>;
