import { z } from "zod";

export const couponThemeSchema = z.enum(["rose", "gold", "violet", "emerald", "midnight"]);

export const couponUpsertSchema = z
  .object({
    code: z.string().min(3).max(40),
    name: z.string().min(2).max(120),
    description: z.string().max(2000).optional().nullable(),
    type: z.enum(["PERCENT", "FIXED", "FREE_SHIPPING"]),
    value: z.number().int().min(0).max(10_000_000),
    minSubtotal: z.number().int().min(0).max(50_000_000).optional().nullable(),
    maxDiscount: z.number().int().min(0).max(50_000_000).optional().nullable(),
    startsAt: z.string().datetime().optional().nullable(),
    endsAt: z.string().datetime().optional().nullable(),
    usageLimit: z.number().int().min(1).max(1_000_000).optional().nullable(),
    perUserLimit: z.number().int().min(1).max(100).optional().nullable(),
    status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "EXPIRED", "ARCHIVED"]).default("DRAFT"),
    theme: couponThemeSchema.default("rose"),
  })
  .superRefine((data, ctx) => {
    if (data.type === "PERCENT" && (data.value < 1 || data.value > 100)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El porcentaje debe estar entre 1 y 100", path: ["value"] });
    }
    if (data.type === "FIXED" && data.value < 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El monto fijo debe ser mayor a 0", path: ["value"] });
    }
    if (data.type === "FREE_SHIPPING") {
      // value ignored
    }
    if (data.startsAt && data.endsAt && new Date(data.startsAt) > new Date(data.endsAt)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "La fecha de fin debe ser posterior al inicio", path: ["endsAt"] });
    }
  });

export const couponSendEmailSchema = z.object({
  recipients: z
    .array(
      z.object({
        email: z.string().email().max(320),
        name: z.string().max(200).optional(),
      }),
    )
    .min(1)
    .max(50),
  subject: z.string().min(1).max(200).optional(),
  message: z.string().max(4000).optional(),
});

export const storeValidateCouponSchema = z.object({
  code: z.string().min(1).max(40),
  subtotal: z.number().int().min(0),
  shipping: z.number().int().min(0),
  customerEmail: z.string().email().max(320).optional(),
  productIds: z.array(z.string().min(1).max(80)).max(80).optional(),
  comboIds: z.array(z.string().min(1).max(80)).max(40).optional(),
  isWholesale: z.boolean().optional(),
});
