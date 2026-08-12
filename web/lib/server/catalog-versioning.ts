import {
  CatalogChangeAction,
  CatalogEntityType,
  Prisma,
  type Category,
  type Product,
  type ProductCombo,
  type ProductComboItem,
  type ProductImage,
  type Subcategory,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { revalidateStorefrontMenu } from "@/lib/server/revalidate-storefront-menu";
import { revalidateStorefrontProducts } from "@/lib/server/revalidate-storefront-products";

export type CatalogChangeInput = {
  entityType: CatalogEntityType;
  entityId: string;
  action: CatalogChangeAction;
  label?: string;
  beforeData?: unknown | null;
  afterData?: unknown | null;
};

export type CatalogVersionListItem = {
  id: string;
  number: number;
  label: string;
  summary: string | null;
  isBaseline: boolean;
  createdAt: string;
  createdBy: string | null;
  changeCount: number;
  isCurrent: boolean;
  isHead: boolean;
};

export type ProductVersionSnapshot = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  subcategory: string;
  description: string;
  price: number;
  originalPrice: number | null;
  discountPercent: number | null;
  discountEndsAt: string | null;
  discountBasePrice: number | null;
  stock: number;
  rating: number;
  reviews: number;
  badge: string | null;
  emoji: string | null;
  imageUrl: string | null;
  externalRef: string | null;
  variantGroupCode: string | null;
  variantGroupOrder: number | null;
  tags: string[];
  isNew: boolean;
  featuredInHome: boolean;
  tintFamilyId: string | null;
  tintTypeId: string | null;
  tintLevel: string | null;
  tintGroup: string | null;
  colorHex: string | null;
  colorName: string | null;
  active: boolean;
  aiGeneratedFields: unknown;
  images: Array<{ id: string; url: string; sortOrder: number }>;
};

export type CategoryVersionSnapshot = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  sortOrder: number;
  storefrontFeaturedProductIds: string[];
};

export type SubcategoryVersionSnapshot = {
  id: string;
  slug: string;
  name: string;
  menuTag: string | null;
  sortOrder: number;
  categoryId: string;
};

export type ComboVersionSnapshot = {
  id: string;
  name: string;
  slug: string;
  comboPrice: number;
  active: boolean;
  items: Array<{ id: string; productId: string; quantity: number; sortOrder: number }>;
};

export type SiteMenuVersionSnapshot = {
  id: string;
  data: unknown;
};

export type AiSpendVersionSnapshot = {
  id: string;
  adjustmentCop: number;
  eventsTotalCop: number;
  displayTotalCop: number;
};

type Tx = Prisma.TransactionClient;

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function nullableJson(value: unknown | null | undefined): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === null || value === undefined) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

export function snapshotProduct(
  p: Product & { images?: ProductImage[] },
): ProductVersionSnapshot {
  const images = [...(p.images ?? [])]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((i) => ({ id: i.id, url: i.url, sortOrder: i.sortOrder }));
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    category: p.category,
    subcategory: p.subcategory,
    description: p.description,
    price: p.price,
    originalPrice: p.originalPrice,
    discountPercent: p.discountPercent ?? null,
    discountEndsAt: p.discountEndsAt ? p.discountEndsAt.toISOString() : null,
    discountBasePrice: p.discountBasePrice ?? null,
    stock: p.stock,
    rating: p.rating,
    reviews: p.reviews,
    badge: p.badge,
    emoji: p.emoji,
    imageUrl: p.imageUrl,
    externalRef: p.externalRef,
    variantGroupCode: p.variantGroupCode,
    variantGroupOrder: p.variantGroupOrder,
    tags: Array.isArray(p.tags) ? p.tags : [],
    isNew: p.isNew,
    featuredInHome: p.featuredInHome,
    tintFamilyId: p.tintFamilyId,
    tintTypeId: p.tintTypeId,
    tintLevel: p.tintLevel,
    tintGroup: p.tintGroup,
    colorHex: p.colorHex,
    colorName: p.colorName,
    active: p.active,
    aiGeneratedFields: p.aiGeneratedFields ?? null,
    images,
  };
}

export function snapshotCategory(c: Category): CategoryVersionSnapshot {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    icon: c.icon,
    sortOrder: c.sortOrder,
    storefrontFeaturedProductIds: c.storefrontFeaturedProductIds ?? [],
  };
}

export function snapshotSubcategory(s: Subcategory): SubcategoryVersionSnapshot {
  return {
    id: s.id,
    slug: s.slug,
    name: s.name,
    menuTag: s.menuTag,
    sortOrder: s.sortOrder,
    categoryId: s.categoryId,
  };
}

export function snapshotCombo(
  combo: ProductCombo,
  items: ProductComboItem[],
): ComboVersionSnapshot {
  return {
    id: combo.id,
    name: combo.name,
    slug: combo.slug,
    comboPrice: combo.comboPrice,
    active: combo.active,
    items: [...items]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((i) => ({
        id: i.id,
        productId: i.productId,
        quantity: i.quantity,
        sortOrder: i.sortOrder,
      })),
  };
}

export async function loadProductSnapshot(id: string, client: Tx | typeof prisma = prisma) {
  const row = await client.product.findUnique({
    where: { id },
    include: { images: true },
  });
  return row ? snapshotProduct(row) : null;
}

export async function loadCategorySnapshot(id: string, client: Tx | typeof prisma = prisma) {
  const row = await client.category.findUnique({ where: { id } });
  return row ? snapshotCategory(row) : null;
}

export async function loadSubcategorySnapshot(id: string, client: Tx | typeof prisma = prisma) {
  const row = await client.subcategory.findUnique({ where: { id } });
  return row ? snapshotSubcategory(row) : null;
}

export async function loadComboSnapshot(id: string, client: Tx | typeof prisma = prisma) {
  const combo = await client.productCombo.findUnique({
    where: { id },
    include: { items: true },
  });
  return combo ? snapshotCombo(combo, combo.items) : null;
}

/** Crea v1 (baseline) y el puntero meta si aún no existen. */
export async function ensureCatalogVersionBaseline(createdBy?: string | null) {
  const existing = await prisma.catalogVersion.findUnique({ where: { number: 1 } });
  if (existing) {
    await prisma.catalogVersionMeta.upsert({
      where: { id: 1 },
      create: { id: 1, currentVersionNumber: 1, headVersionNumber: 1 },
      update: { id: 1 },
    });
    return existing;
  }

  return prisma.$transaction(async (tx) => {
    const version = await tx.catalogVersion.create({
      data: {
        number: 1,
        label: "Versión 1 — Estado inicial",
        summary: "Baseline del catálogo al activar el versionamiento. No incluye diffs.",
        isBaseline: true,
        createdBy: createdBy ?? null,
      },
    });
    await tx.catalogVersionMeta.upsert({
      where: { id: 1 },
      create: { id: 1, currentVersionNumber: 1, headVersionNumber: 1 },
      update: { currentVersionNumber: 1, headVersionNumber: 1 },
    });
    return version;
  });
}

async function getMeta(client: Tx | typeof prisma = prisma) {
  await ensureCatalogVersionBaseline();
  return client.catalogVersionMeta.upsert({
    where: { id: 1 },
    create: { id: 1, currentVersionNumber: 1, headVersionNumber: 1 },
    update: { id: 1 },
  });
}

/**
 * Registra una nueva versión con solo los cambios de esta mutación.
 * Si el admin no está en la cabeza (restauró antes), descarta versiones futuras.
 */
export async function commitCatalogChanges(opts: {
  label: string;
  summary?: string;
  createdBy?: string | null;
  changes: CatalogChangeInput[];
}) {
  const changes = opts.changes.filter(Boolean);
  if (changes.length === 0) return null;

  await ensureCatalogVersionBaseline(opts.createdBy);

  return prisma.$transaction(
    async (tx) => {
      const meta = await tx.catalogVersionMeta.findUnique({ where: { id: 1 } });
      if (!meta) throw new Error("CatalogVersionMeta no inicializado");

      if (meta.currentVersionNumber < meta.headVersionNumber) {
        await tx.catalogVersion.deleteMany({
          where: { number: { gt: meta.currentVersionNumber } },
        });
      }

      const nextNumber = meta.currentVersionNumber + 1;
      const version = await tx.catalogVersion.create({
        data: {
          number: nextNumber,
          label: opts.label.slice(0, 200),
          summary: opts.summary?.slice(0, 2000) ?? null,
          isBaseline: false,
          createdBy: opts.createdBy ?? null,
          changes: {
            create: changes.map((c, i) => ({
              entityType: c.entityType,
              entityId: c.entityId,
              action: c.action,
              label: c.label?.slice(0, 200) ?? null,
              beforeData: nullableJson(c.beforeData),
              afterData: nullableJson(c.afterData),
              sortOrder: i,
            })),
          },
        },
        include: { changes: true },
      });

      await tx.catalogVersionMeta.update({
        where: { id: 1 },
        data: {
          currentVersionNumber: nextNumber,
          headVersionNumber: nextNumber,
        },
      });

      return version;
    },
    { timeout: 120_000, maxWait: 20_000 },
  );
}

export async function listCatalogVersions(): Promise<{
  currentVersionNumber: number;
  headVersionNumber: number;
  versions: CatalogVersionListItem[];
}> {
  await ensureCatalogVersionBaseline();
  const meta = await getMeta();
  const rows = await prisma.catalogVersion.findMany({
    orderBy: { number: "desc" },
    include: { _count: { select: { changes: true } } },
  });

  return {
    currentVersionNumber: meta.currentVersionNumber,
    headVersionNumber: meta.headVersionNumber,
    versions: rows.map((v) => ({
      id: v.id,
      number: v.number,
      label: v.label,
      summary: v.summary,
      isBaseline: v.isBaseline,
      createdAt: v.createdAt.toISOString(),
      createdBy: v.createdBy,
      changeCount: v._count.changes,
      isCurrent: v.number === meta.currentVersionNumber,
      isHead: v.number === meta.headVersionNumber,
    })),
  };
}

export async function getCatalogVersionDetail(number: number) {
  await ensureCatalogVersionBaseline();
  const meta = await getMeta();
  const version = await prisma.catalogVersion.findUnique({
    where: { number },
    include: {
      changes: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!version) return null;
  return {
    id: version.id,
    number: version.number,
    label: version.label,
    summary: version.summary,
    isBaseline: version.isBaseline,
    createdAt: version.createdAt.toISOString(),
    createdBy: version.createdBy,
    isCurrent: version.number === meta.currentVersionNumber,
    isHead: version.number === meta.headVersionNumber,
    changes: version.changes.map((c) => ({
      id: c.id,
      entityType: c.entityType,
      entityId: c.entityId,
      action: c.action,
      label: c.label,
      beforeData: c.beforeData,
      afterData: c.afterData,
      sortOrder: c.sortOrder,
    })),
  };
}

async function applyProductSnapshot(tx: Tx, snap: ProductVersionSnapshot) {
  const ai =
    snap.aiGeneratedFields === null || snap.aiGeneratedFields === undefined
      ? Prisma.JsonNull
      : asJson(snap.aiGeneratedFields);

  await tx.product.upsert({
    where: { id: snap.id },
    create: {
      id: snap.id,
      slug: snap.slug,
      name: snap.name,
      brand: snap.brand,
      category: snap.category,
      subcategory: snap.subcategory,
      description: snap.description,
      price: snap.price,
      originalPrice: snap.originalPrice,
      discountPercent: snap.discountPercent ?? null,
      discountEndsAt: snap.discountEndsAt ? new Date(snap.discountEndsAt) : null,
      discountBasePrice: snap.discountBasePrice ?? null,
      stock: snap.stock,
      rating: snap.rating,
      reviews: snap.reviews,
      badge: snap.badge,
      emoji: snap.emoji,
      imageUrl: snap.imageUrl,
      externalRef: snap.externalRef,
      variantGroupCode: snap.variantGroupCode,
      variantGroupOrder: snap.variantGroupOrder,
      tags: snap.tags,
      isNew: snap.isNew,
      featuredInHome: snap.featuredInHome,
      tintFamilyId: snap.tintFamilyId,
      tintTypeId: snap.tintTypeId,
      tintLevel: snap.tintLevel,
      tintGroup: snap.tintGroup,
      colorHex: snap.colorHex,
      colorName: snap.colorName,
      active: snap.active,
      aiGeneratedFields: ai,
    },
    update: {
      slug: snap.slug,
      name: snap.name,
      brand: snap.brand,
      category: snap.category,
      subcategory: snap.subcategory,
      description: snap.description,
      price: snap.price,
      originalPrice: snap.originalPrice,
      discountPercent: snap.discountPercent ?? null,
      discountEndsAt: snap.discountEndsAt ? new Date(snap.discountEndsAt) : null,
      discountBasePrice: snap.discountBasePrice ?? null,
      stock: snap.stock,
      rating: snap.rating,
      reviews: snap.reviews,
      badge: snap.badge,
      emoji: snap.emoji,
      imageUrl: snap.imageUrl,
      externalRef: snap.externalRef,
      variantGroupCode: snap.variantGroupCode,
      variantGroupOrder: snap.variantGroupOrder,
      tags: snap.tags,
      isNew: snap.isNew,
      featuredInHome: snap.featuredInHome,
      tintFamilyId: snap.tintFamilyId,
      tintTypeId: snap.tintTypeId,
      tintLevel: snap.tintLevel,
      tintGroup: snap.tintGroup,
      colorHex: snap.colorHex,
      colorName: snap.colorName,
      active: snap.active,
      aiGeneratedFields: ai,
    },
  });

  await tx.productImage.deleteMany({ where: { productId: snap.id } });
  if (snap.images.length > 0) {
    await tx.productImage.createMany({
      data: snap.images.map((img) => ({
        id: img.id,
        productId: snap.id,
        url: img.url,
        sortOrder: img.sortOrder,
      })),
    });
  }
}

async function applyCategorySnapshot(tx: Tx, snap: CategoryVersionSnapshot) {
  await tx.category.upsert({
    where: { id: snap.id },
    create: {
      id: snap.id,
      slug: snap.slug,
      name: snap.name,
      icon: snap.icon,
      sortOrder: snap.sortOrder,
      storefrontFeaturedProductIds: snap.storefrontFeaturedProductIds,
    },
    update: {
      slug: snap.slug,
      name: snap.name,
      icon: snap.icon,
      sortOrder: snap.sortOrder,
      storefrontFeaturedProductIds: snap.storefrontFeaturedProductIds,
    },
  });
}

async function applySubcategorySnapshot(tx: Tx, snap: SubcategoryVersionSnapshot) {
  await tx.subcategory.upsert({
    where: { id: snap.id },
    create: {
      id: snap.id,
      slug: snap.slug,
      name: snap.name,
      menuTag: snap.menuTag,
      sortOrder: snap.sortOrder,
      categoryId: snap.categoryId,
    },
    update: {
      slug: snap.slug,
      name: snap.name,
      menuTag: snap.menuTag,
      sortOrder: snap.sortOrder,
      categoryId: snap.categoryId,
    },
  });
}

async function applyComboSnapshot(tx: Tx, snap: ComboVersionSnapshot) {
  await tx.productCombo.upsert({
    where: { id: snap.id },
    create: {
      id: snap.id,
      name: snap.name,
      slug: snap.slug,
      comboPrice: snap.comboPrice,
      active: snap.active,
    },
    update: {
      name: snap.name,
      slug: snap.slug,
      comboPrice: snap.comboPrice,
      active: snap.active,
    },
  });
  await tx.productComboItem.deleteMany({ where: { comboId: snap.id } });
  if (snap.items.length > 0) {
    await tx.productComboItem.createMany({
      data: snap.items.map((i) => ({
        id: i.id,
        comboId: snap.id,
        productId: i.productId,
        quantity: i.quantity,
        sortOrder: i.sortOrder,
      })),
    });
  }
}

async function applySiteMenuSnapshot(tx: Tx, snap: SiteMenuVersionSnapshot) {
  await tx.siteMenu.upsert({
    where: { id: snap.id },
    create: { id: snap.id, data: asJson(snap.data) },
    update: { data: asJson(snap.data) },
  });
}

async function applyAiSpendSnapshot(tx: Tx, snap: AiSpendVersionSnapshot) {
  await tx.aiSpendMeta.upsert({
    where: { id: 1 },
    create: { id: 1, adjustmentCop: snap.adjustmentCop },
    update: { adjustmentCop: snap.adjustmentCop },
  });
}

async function deleteEntity(tx: Tx, entityType: CatalogEntityType, entityId: string) {
  switch (entityType) {
    case "PRODUCT":
      await tx.product.deleteMany({ where: { id: entityId } });
      break;
    case "CATEGORY":
      await tx.category.deleteMany({ where: { id: entityId } });
      break;
    case "SUBCATEGORY":
      await tx.subcategory.deleteMany({ where: { id: entityId } });
      break;
    case "PRODUCT_COMBO":
      await tx.productCombo.deleteMany({ where: { id: entityId } });
      break;
    case "SITE_MENU":
      await tx.siteMenu.deleteMany({ where: { id: entityId } });
      break;
    case "AI_SPEND":
      // No se elimina el singleton; al revertir se restaura el ajuste.
      break;
    default:
      break;
  }
}

async function applyChangeForward(
  tx: Tx,
  change: {
    entityType: CatalogEntityType;
    entityId: string;
    action: CatalogChangeAction;
    beforeData: unknown;
    afterData: unknown;
  },
) {
  if (change.action === "CREATE" || change.action === "UPDATE") {
    const data = change.afterData;
    if (!data || typeof data !== "object") return;
    switch (change.entityType) {
      case "PRODUCT":
        await applyProductSnapshot(tx, data as ProductVersionSnapshot);
        break;
      case "CATEGORY":
        await applyCategorySnapshot(tx, data as CategoryVersionSnapshot);
        break;
      case "SUBCATEGORY":
        await applySubcategorySnapshot(tx, data as SubcategoryVersionSnapshot);
        break;
      case "PRODUCT_COMBO":
        await applyComboSnapshot(tx, data as ComboVersionSnapshot);
        break;
      case "SITE_MENU":
        await applySiteMenuSnapshot(tx, data as SiteMenuVersionSnapshot);
        break;
      case "AI_SPEND":
        await applyAiSpendSnapshot(tx, data as AiSpendVersionSnapshot);
        break;
      default:
        break;
    }
    return;
  }

  if (change.action === "DELETE") {
    await deleteEntity(tx, change.entityType, change.entityId);
  }
}

async function applyChangeReverse(
  tx: Tx,
  change: {
    entityType: CatalogEntityType;
    entityId: string;
    action: CatalogChangeAction;
    beforeData: unknown;
    afterData: unknown;
  },
) {
  if (change.action === "CREATE") {
    await deleteEntity(tx, change.entityType, change.entityId);
    return;
  }

  if (change.action === "DELETE" || change.action === "UPDATE") {
    const data = change.beforeData;
    if (!data || typeof data !== "object") return;
    switch (change.entityType) {
      case "PRODUCT":
        await applyProductSnapshot(tx, data as ProductVersionSnapshot);
        break;
      case "CATEGORY":
        await applyCategorySnapshot(tx, data as CategoryVersionSnapshot);
        break;
      case "SUBCATEGORY":
        await applySubcategorySnapshot(tx, data as SubcategoryVersionSnapshot);
        break;
      case "PRODUCT_COMBO":
        await applyComboSnapshot(tx, data as ComboVersionSnapshot);
        break;
      case "SITE_MENU":
        await applySiteMenuSnapshot(tx, data as SiteMenuVersionSnapshot);
        break;
      case "AI_SPEND":
        await applyAiSpendSnapshot(tx, data as AiSpendVersionSnapshot);
        break;
      default:
        break;
    }
  }
}

/**
 * Restaura el catálogo a `targetNumber`.
 * Hacia atrás: deshace diffs. Hacia adelante: reaplica diffs.
 */
export async function restoreCatalogVersion(targetNumber: number) {
  await ensureCatalogVersionBaseline();
  const meta = await getMeta();
  const current = meta.currentVersionNumber;

  if (targetNumber === current) {
    return { currentVersionNumber: current, changed: false };
  }

  const target = await prisma.catalogVersion.findUnique({ where: { number: targetNumber } });
  if (!target) {
    throw new Error(`La versión ${targetNumber} no existe`);
  }

  if (targetNumber > meta.headVersionNumber) {
    throw new Error(`La versión ${targetNumber} está fuera del historial`);
  }

  await prisma.$transaction(
    async (tx) => {
      if (targetNumber < current) {
        const toUndo = await tx.catalogVersion.findMany({
          where: { number: { gt: targetNumber, lte: current } },
          orderBy: { number: "desc" },
          include: { changes: { orderBy: { sortOrder: "desc" } } },
        });
        for (const version of toUndo) {
          for (const change of version.changes) {
            await applyChangeReverse(tx, change);
          }
        }
      } else {
        const toApply = await tx.catalogVersion.findMany({
          where: { number: { gt: current, lte: targetNumber } },
          orderBy: { number: "asc" },
          include: { changes: { orderBy: { sortOrder: "asc" } } },
        });
        for (const version of toApply) {
          for (const change of version.changes) {
            await applyChangeForward(tx, change);
          }
        }
      }

      await tx.catalogVersionMeta.update({
        where: { id: 1 },
        data: { currentVersionNumber: targetNumber },
      });
    },
    { timeout: 60_000 },
  );

  revalidateStorefrontMenu();
  revalidateStorefrontProducts();

  return { currentVersionNumber: targetNumber, changed: true };
}

/** Atajo tipado para commits desde rutas API. */
export const CatalogEntities = CatalogEntityType;
export const CatalogActions = CatalogChangeAction;

const PRODUCT_DIFF_FIELDS: Array<{
  key: keyof ProductVersionSnapshot;
  label: string;
  format?: (v: unknown) => string;
}> = [
  { key: "name", label: "nombre" },
  { key: "price", label: "precio", format: (v) => `$${Number(v).toLocaleString("es-CO")}` },
  { key: "discountPercent", label: "descuento %" },
  { key: "stock", label: "stock" },
  { key: "category", label: "categoría" },
  { key: "subcategory", label: "subcategoría" },
  { key: "description", label: "descripción" },
  { key: "brand", label: "marca" },
  { key: "active", label: "activo" },
  { key: "variantGroupCode", label: "código de barras / grupo" },
  { key: "colorHex", label: "color" },
  { key: "imageUrl", label: "imagen principal" },
  { key: "externalRef", label: "código" },
];

function fmtSnapValue(v: unknown, format?: (v: unknown) => string): string {
  if (v == null || v === "") return "—";
  if (format) return format(v);
  if (typeof v === "boolean") return v ? "sí" : "no";
  if (typeof v === "string") {
    const t = v.trim();
    return t.length > 80 ? `${t.slice(0, 77)}…` : t;
  }
  return String(v);
}

/** Texto legible de qué cambió en un producto (para summary de versión). */
export function describeProductSnapshotDiff(
  before: ProductVersionSnapshot | null | undefined,
  after: ProductVersionSnapshot | null | undefined,
): string {
  if (!before && after) {
    return `Producto nuevo «${after.name}» · ${after.category}/${after.subcategory} · $${after.price.toLocaleString("es-CO")}.`;
  }
  if (before && !after) {
    return `Se eliminó el producto «${before.name}».`;
  }
  if (!before || !after) return "Cambio en producto.";

  const parts: string[] = [];
  for (const f of PRODUCT_DIFF_FIELDS) {
    const a = before[f.key];
    const b = after[f.key];
    if (a === b) continue;
    parts.push(`${f.label}: ${fmtSnapValue(a, f.format)} → ${fmtSnapValue(b, f.format)}`);
  }
  const beforeImgCount = before.images?.length ?? 0;
  const afterImgCount = after.images?.length ?? 0;
  if (beforeImgCount !== afterImgCount) {
    parts.push(`galería: ${beforeImgCount} → ${afterImgCount} imagen(es)`);
  }
  if (parts.length === 0) {
    return `Se tocó «${after.name}» sin cambios visibles en campos principales.`;
  }
  return `«${after.name}»: ${parts.slice(0, 8).join("; ")}${parts.length > 8 ? "…" : ""}.`;
}

/** Summary de una versión a partir de sus cambios (qué pasó vs la anterior). */
export function buildCatalogVersionSummary(changes: CatalogChangeInput[]): string {
  if (changes.length === 0) return "Sin cambios.";

  const creates = changes.filter((c) => c.action === CatalogChangeAction.CREATE);
  const updates = changes.filter((c) => c.action === CatalogChangeAction.UPDATE);
  const deletes = changes.filter((c) => c.action === CatalogChangeAction.DELETE);

  const nameOf = (c: CatalogChangeInput) =>
    (c.label ?? "").replace(/^(Producto|Categoría|Subcategoría|Combo):\s*/i, "").trim() || c.entityId;

  const lines: string[] = [];
  if (creates.length > 0) {
    const names = creates.map(nameOf).filter(Boolean).slice(0, 20);
    lines.push(
      `Respecto a la versión anterior se agregaron ${creates.length} elemento(s)${
        names.length ? `: ${names.join(", ")}${creates.length > names.length ? "…" : ""}` : ""
      }.`,
    );
  }
  if (updates.length > 0) {
    const names = updates.map(nameOf).filter(Boolean).slice(0, 15);
    lines.push(
      `Se actualizaron ${updates.length}${
        names.length ? ` (${names.join(", ")}${updates.length > names.length ? "…" : ""})` : ""
      }.`,
    );
  }
  if (deletes.length > 0) {
    const names = deletes.map(nameOf).filter(Boolean).slice(0, 15);
    lines.push(
      `Se eliminaron ${deletes.length}${
        names.length ? `: ${names.join(", ")}${deletes.length > names.length ? "…" : ""}` : ""
      }.`,
    );
  }

  if (changes.length === 1) {
    const only = changes[0]!;
    if (only.entityType === CatalogEntityType.PRODUCT) {
      const detail = describeProductSnapshotDiff(
        only.beforeData as ProductVersionSnapshot | null,
        only.afterData as ProductVersionSnapshot | null,
      );
      return detail;
    }
  }

  return lines.join(" ");
}
