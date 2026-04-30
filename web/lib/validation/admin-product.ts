import { z } from "zod";

const badgeValues = ["new", "hot", "sale", "best"] as const;

const optionalUrlOrEmpty = z
  .union([z.string().url(), z.literal(""), z.null()])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v));

/**
 * Actualización parcial: si `imageUrl` no viene en el JSON, debe seguir siendo `undefined`
 * para no pisar la imagen existente. (El helper de creación convierte omitido → `null`, lo cual
 * aquí borraría la foto al guardar solo categoría u otros campos.)
 */
const optionalUrlOrEmptyForUpdate = z
  .union([z.string().url(), z.literal(""), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined;
    if (v === "" || v === null) return null;
    return v;
  });

export const adminProductCreateSchema = z.object({
  name: z.string().trim().min(1, "Nombre requerido").max(200),
  brand: z.string().trim().min(1).max(120).optional(),
  category: z.string().trim().min(1).max(80),
  subcategory: z.string().trim().min(1).max(120),
  tags: z.array(z.string().trim().min(1).max(60)).max(30).optional().default([]),
  description: z.string().trim().min(1).max(20_000),
  price: z.coerce.number().int().positive(),
  originalPrice: z.coerce.number().int().positive().nullable().optional(),
  stock: z.coerce.number().int().min(0).default(0),
  rating: z.coerce.number().min(0).max(5).default(5),
  reviews: z.coerce.number().int().min(0).default(0),
  badge: z.enum(badgeValues).nullable().optional(),
  emoji: z.string().trim().max(8).nullable().optional(),
  imageUrl: optionalUrlOrEmpty,
  isNew: z.boolean().optional().default(false),
  featuredInHome: z.boolean().optional().default(false),
  active: z.boolean().optional().default(true),
  slug: z.string().trim().min(1).max(200).optional(),
  /** Referencia / código (importación masiva, único). */
  externalRef: z.string().trim().min(1).max(120).optional(),
  /** URLs ya subidas a nuestro CDN (vía `/api/admin/upload`); se validan en el handler. */
  extraImageUrls: z.array(z.string().url()).max(24).optional(),
});

export type AdminProductCreateInput = z.infer<typeof adminProductCreateSchema>;

/** Actualización parcial; el handler fusiona con el registro existente. */
export const adminProductUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    brand: z.string().trim().min(1).max(120).optional(),
    category: z.string().trim().min(1).max(80).optional(),
    subcategory: z.string().trim().min(1).max(120).optional(),
    tags: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
    description: z.string().trim().min(1).max(20_000).optional(),
    price: z.coerce.number().int().positive().optional(),
    originalPrice: z.coerce.number().int().positive().nullable().optional(),
    stock: z.coerce.number().int().min(0).optional(),
    rating: z.coerce.number().min(0).max(5).optional(),
    reviews: z.coerce.number().int().min(0).optional(),
    badge: z.enum(badgeValues).nullable().optional(),
    emoji: z.string().trim().max(8).nullable().optional(),
    imageUrl: optionalUrlOrEmptyForUpdate,
    isNew: z.boolean().optional(),
    featuredInHome: z.boolean().optional(),
    active: z.boolean().optional(),
    slug: z.string().trim().min(1).max(200).optional(),
    externalRef: z.string().trim().min(1).max(120).nullable().optional(),
  });

export type AdminProductUpdateInput = z.infer<typeof adminProductUpdateSchema>;

export function formatZodError(err: z.ZodError): { message: string; issues: z.ZodIssue[] } {
  return {
    message: err.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "),
    issues: err.issues,
  };
}

/** Debe coincidir con lo que el admin escribe en el segundo paso al borrar todo el catálogo. */
export const BULK_DELETE_ALL_CONFIRM_PHRASE = "ELIMINAR_TODOS_LOS_PRODUCTOS" as const;

export const adminProductBulkDeleteSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("ids"),
    ids: z.array(z.string().trim().min(1).max(200)).min(1).max(5000),
  }),
  z.object({
    mode: z.literal("all"),
    confirmPhrase: z.literal(BULK_DELETE_ALL_CONFIRM_PHRASE),
  }),
]);
