"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import type { Session } from "next-auth";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createAdminCategory,
  createAdminSubcategory,
  deleteAdminCategory,
  deleteAdminSubcategory,
  fetchAdminCategories,
  normalizeAdminCategoryTexts,
  updateAdminCategory,
  updateAdminSubcategory,
} from "@/lib/api/admin-categories";
import {
  createAdminFamily,
  fetchAdminFamilies,
} from "@/lib/api/admin-families";
import { AdminFamiliesPanel } from "@/components/admin/AdminFamiliesPanel";
import {
  BULK_DELETE_ALL_CONFIRM_PHRASE,
  createAdminProduct,
  deleteAdminProduct,
  fetchAdminProducts,
  postAdminProductsAiCompleteOne,
  postAdminProductsBulkDelete,
  postAdminProductsNormalizeNames,
  postAdminProductsMerge,
  postAdminProductsGroupVariants,
  postAdminProductsAiClear,
  updateAdminProduct,
} from "@/lib/api/admin-products";
import { runAdminProductsAiCompleteParallel } from "@/lib/api/admin-products-ai-runner";
import { productNeedsAiComplete, productNeedsDescription, countAiEligibleAmongSelected, formatAiActionCount, type AiCompleteFieldOptions } from "@/lib/product-ai-fields";
import { normalizeColorHex } from "@/lib/product-color";
import {
  buildPrimaryVariantByGroup,
  buildVariantCountByGroup,
  collapseProductsForAdminList,
  groupListThumbnail,
  listVariantsInGroup,
  resolveAdminListRowsAfterFilter,
} from "@/lib/admin/variant-groups";
import { computeAdminCatalogStats, type AdminCatalogStats } from "@/lib/admin/catalog-stats";
import { compactChartAmount, computeSemesterSalesChart } from "@/lib/admin/sales-semester-chart";
import { AdminCategoryStorefrontPanel } from "@/components/admin/AdminCategoryStorefrontPanel";
import { AdminCustomersPanel } from "@/components/admin/AdminCustomersPanel";
import { AdminVersionsPanel } from "@/components/admin/AdminVersionsPanel";
import { AdminAiSpendStatCard } from "@/components/admin/AdminAiSpendStatCard";
import {
  AdminAiBulkProgressModal,
  type AiBulkProgressItem,
} from "@/components/admin/AdminAiBulkProgressModal";
import { AdminProductVariantsModal } from "@/components/admin/AdminProductVariantsModal";
import { AdminProductColorModal } from "@/components/admin/AdminProductColorModal";
import { AdminBulkTemplateModal } from "@/components/admin/AdminBulkTemplateModal";
import { AdminBulkRowEditModal } from "@/components/admin/AdminBulkRowEditModal";
import {
  AdminBulkMissingPriceModal,
  BULK_INVALID_PRICE_BATCH_THRESHOLD,
} from "@/components/admin/AdminBulkMissingPriceModal";
import { BulkDiffCell, BulkModePicker } from "@/components/admin/AdminBulkModeUi";
import { AdminBulkMatchedImages } from "@/components/admin/AdminBulkMatchedImages";
import {
  AdminChangeFamilyModal,
  AdminZeroPriceBrandModal,
  AdminZeroPriceStockPanel,
  bulkSetProductsActive,
  productsWithZeroPrice,
} from "@/components/admin/AdminZeroPriceTools";
import { AdminProductAiDetailPanel, AdminProductDescriptionBlock } from "@/components/admin/AdminProductAiUi";
import {
  AdminCreatableSelect,
  AdminTagsCreatableField,
} from "@/components/admin/AdminCreatableSelect";
import { computeBulkRowFieldDiffs, bulkRowHasUpdatableDiffs } from "@/lib/bulk-import/bulk-field-diff";
import type { BulkFieldDiff } from "@/lib/bulk-import/bulk-field-diff";
import { validateBulkRowCombine } from "@/lib/bulk-import/bulk-row-combine";
import { BulkZipImageUrlCache } from "@/lib/bulk-import/zip-image-cache";
import { suggestNameCombineGroups, type NameCombineSuggestionGroup } from "@/lib/bulk-import/name-similarity";
import { postAdminAiSpendRecord } from "@/lib/api/admin-ai-spend";
import { menuTagForProduct, productOwnTags } from "@/lib/product-tags";
import { fetchAdminPaidOrders } from "@/lib/api/admin-orders";
import {
  addProductGalleryImage,
  removeProductGalleryImage,
  uploadAdminProductImage,
} from "@/lib/api/admin-upload";
import {
  deleteBulkImportJob,
  patchBulkImportJob,
  postBulkImportCommit,
  postBulkImportPreview,
  postBulkImportRowImage,
  postBulkImportZip,
  postBulkZipOptimize,
  type BulkPreviewResponse,
} from "@/lib/api/admin-bulk-import";
import { bulkImportStableRowId } from "@/lib/bulk-import/bulk-import-row-id";
import {
  bulkRowBlockingIssues,
  bulkRowIsAlreadyVariantGrouped,
  bulkRowIsReadyForVariantGroupAssign,
  bulkRowIsVariantGroupAssign,
  type BulkExistingPolicy,
} from "@/lib/bulk-import/variant-group-assign";
import {
  describeBulkRowStatus,
  variantGroupColorAt,
  type VariantGroupColor,
} from "@/lib/bulk-import/bulk-row-status";
import {
  formatZipBytes,
  inspectZipFileClient,
  type ZipInspectResult,
} from "@/lib/bulk-import/zip-client-inspect";
import { optimizeZipFileClient, optimizeImageFileClient } from "@/lib/bulk-import/zip-client-optimize";
import { canonicalVariantGroupCode } from "@/lib/bulk-import/variant-group-code";
import type { BulkPreviewDbVariant } from "@/lib/bulk-import/variant-groups-preview";
import type {
  BulkPreviewNewTaxonomyItem,
  BulkPreviewResult,
  BulkTaxonomyRehomeHint,
} from "@/lib/bulk-import/build-preview";
import { taxonomyPairKey, normalizeTaxonomyNameForDb } from "@/lib/bulk-import/category-resolve";
import { effectiveProductTitle } from "@/lib/bulk-import/semantic-map";
import {
  effectiveTintFamily,
  bulkPreviewRowIsTintes,
} from "@/lib/bulk-import/tintes";
import {
  buildCsvTintFamilyOptions,
  countTintRowsInPreview,
  normalizeTintCatalogName,
} from "@/lib/bulk-import/tint-catalog";
import type { CsvTintTypeOption } from "@/lib/bulk-import/tint-catalog";
import {
  computeBulkCsvZipMatchBreakdown,
  formatBulkMatchPercent,
  isBulkCsvZipMatchRateTooLow,
} from "@/lib/bulk-import/match-rate";

import { isHttpImageUrl } from "@/lib/util/image-url";
import type { AdminCategoryTree } from "@/lib/types/admin-category";
import type { AdminProduct, AdminSale } from "@/lib/types/admin";
import { formatPrice } from "@/lib/format";
import { AdminCombosPanel } from "@/components/admin/AdminCombosPanel";
import { AdminDiscountsPanel } from "@/components/admin/AdminDiscountsPanel";
import { AdminProductListBoard } from "@/components/admin/AdminProductListBoard";
import { AdminMenuTab } from "@/components/admin/AdminMenuTab";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { BulkImportProgressOverlay } from "@/components/admin/BulkImportProgressOverlay";
import { useBufferedProgress } from "@/hooks/useBufferedProgress";
import { useReveal } from "@/hooks/useReveal";
import {
  MENU_TAG_CUSTOM_VALUE,
  menuTagOptionsFromTree,
  resolveMenuTagFromEditor,
} from "@/lib/admin/menu-utils";

type AdminPageId = "dashboard" | "products" | "category-products" | "combos" | "discounts" | "sales" | "stock" | "customers" | "categories" | "families" | "menu" | "versions" | "reports";

type GoPageOptions = {
  productTab?: "list" | "add" | "bulk";
};

const ADMIN_PAGE_TITLES: Record<AdminPageId, string> = {
  dashboard: "Dashboard",
  products: "Gestión de Productos",
  "category-products": "Gestión de PRODUCTOS en Categorías",
  combos: "Crear Combos",
  discounts: "Descuentos",
  sales: "Ventas",
  stock: "Inventario",
  customers: "Clientes CRM",
  categories: "Categorías y subcategorías",
  families: "Familias",
  menu: "Gestión del Menú",
  versions: "Versiones",
  reports: "Reportes",
};

const ADMIN_NAV_ITEMS: {
  id: AdminPageId;
  icon: string;
  label: string;
  section?: "config";
}[] = [
  { id: "dashboard", icon: "📊", label: "Dashboard" },
  { id: "products", icon: "📦", label: "Productos" },
  { id: "category-products", icon: "✨", label: "Productos en Categorías" },
  { id: "combos", icon: "🧩", label: "Crear Combos" },
  { id: "discounts", icon: "🏷️", label: "Descuentos" },
  { id: "sales", icon: "💰", label: "Ventas" },
  { id: "customers", icon: "👥", label: "Clientes CRM" },
  { id: "stock", icon: "📋", label: "Inventario" },
  { id: "categories", icon: "🏷️", label: "Categorías", section: "config" },
  { id: "families", icon: "🧬", label: "Familias", section: "config" },
  { id: "menu", icon: "🗂️", label: "Gestión de Menú", section: "config" },
  { id: "versions", icon: "🕘", label: "Versiones", section: "config" },
  { id: "reports", icon: "📈", label: "Reportes", section: "config" },
];

function categoryDisplayName(slug: string, tree: AdminCategoryTree[]): string {
  return tree.find((c) => c.slug === slug)?.name ?? slug;
}

function parseTagsInput(raw: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of raw.split(",")) {
    const tag = part.trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}

function AdminProductThumb({ imageUrl, emoji }: { imageUrl: string | null; emoji: string }) {
  return (
    <div className="table-product-img">
      {isHttpImageUrl(imageUrl) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl!} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        emoji || "📦"
      )}
    </div>
  );
}

function AdminRetryImage({
  src,
  alt,
  style,
  maxRetries = 3,
}: {
  src: string;
  alt: string;
  style: React.CSSProperties;
  maxRetries?: number;
}) {
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setAttempt(0);
  }, [src]);

  const srcWithRetry = useMemo(() => {
    const sep = src.includes("?") ? "&" : "?";
    return `${src}${sep}retry=${attempt}`;
  }, [src, attempt]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={srcWithRetry}
      alt={alt}
      style={style}
      onError={() => {
        if (attempt >= maxRetries) return;
        window.setTimeout(() => setAttempt((n) => n + 1), 700 * (attempt + 1));
      }}
    />
  );
}

export function AdminApp({ initialSession }: { initialSession?: Session | null }) {
  const router = useRouter();
  const { data: clientSession, status } = useSession();
  const session = clientSession ?? initialSession ?? null;
  const hasServerAdminSession = initialSession?.user?.role === "ADMIN";
  const sessionReady = hasServerAdminSession || status !== "loading";

  const [page, setPage] = useState<AdminPageId>("dashboard");
  const [pageTitle, setPageTitle] = useState("Dashboard");
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [categoriesTree, setCategoriesTree] = useState<AdminCategoryTree[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [familyNames, setFamilyNames] = useState<string[]>([]);
  const [productMutation, setProductMutation] = useState<"add" | "bulk" | "edit" | null>(null);
  const [stockSavingId, setStockSavingId] = useState<string | null>(null);
  const [onlineSales, setOnlineSales] = useState<AdminSale[]>([]);
  const [manualSales, setManualSales] = useState<AdminSale[]>([]);
  const [productTab, setProductTab] = useState<"list" | "add" | "bulk" | "zero-stock">("list");
  const [zeroPriceBrandModalOpen, setZeroPriceBrandModalOpen] = useState(false);
  const [changeFamilyModalOpen, setChangeFamilyModalOpen] = useState(false);
  const [showHiddenProducts, setShowHiddenProducts] = useState(false);
  const [productHideBusy, setProductHideBusy] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productFilterBrand, setProductFilterBrand] = useState("");
  const [productFilterCategorySlug, setProductFilterCategorySlug] = useState("");
  const [productFilterSubcategory, setProductFilterSubcategory] = useState("");
  const [productFilterTag, setProductFilterTag] = useState("");
  const [productListSelectedIds, setProductListSelectedIds] = useState<Set<string>>(() => new Set());
  const [productBulkMenuOpen, setProductBulkMenuOpen] = useState(false);
  const [productBulkDeleting, setProductBulkDeleting] = useState(false);
  const [productNameNormBusy, setProductNameNormBusy] = useState(false);
  const [productNameNormProgress, setProductNameNormProgress] = useState<{ done: number; total: number } | null>(null);
  const [productMergeOpen, setProductMergeOpen] = useState(false);
  const [productMergeBusy, setProductMergeBusy] = useState(false);
  const [productMergeNameMode, setProductMergeNameMode] = useState<"pick" | "custom">("pick");
  const [productMergePickedId, setProductMergePickedId] = useState("");
  const [productMergeCustomName, setProductMergeCustomName] = useState("");
  const [productVariantGroupOpen, setProductVariantGroupOpen] = useState(false);
  const [productVariantGroupBusy, setProductVariantGroupBusy] = useState(false);
  const [productVariantPrimaryId, setProductVariantPrimaryId] = useState("");
  const [productAiBusy, setProductAiBusy] = useState(false);
  const [aiBulkModalOpen, setAiBulkModalOpen] = useState(false);
  const [aiBulkPhase, setAiBulkPhase] = useState<"intro" | "running" | "done">("intro");
  const [aiBulkMode, setAiBulkMode] = useState<"all" | "descriptions" | "descriptions-rewrite">("all");
  const [aiBulkItems, setAiBulkItems] = useState<AiBulkProgressItem[]>([]);
  const aiBulkRunLock = useRef(false);
  const productBulkMenuRef = useRef<HTMLDivElement>(null);
  /** Menú lateral expandido (texto + iconos); al colapsar solo iconos y más ancho útil. */
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const sidebarAutoCollapseDone = useRef(false);

  const [addSaleOpen, setAddSaleOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailProductId, setDetailProductId] = useState<string | null>(null);
  const [featuredHomeSavingId, setFeaturedHomeSavingId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<
    { id: number; msg: string; type: string; icon: string }[]
  >([]);
  const toastTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const toastSeqRef = useRef(0);

  const dismissToast = useCallback((id: number) => {
    const timer = toastTimersRef.current.get(id);
    if (timer != null) {
      clearTimeout(timer);
      toastTimersRef.current.delete(id);
    }
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const showToast = useCallback(
    (msg: string, type = "default", icon = "✅") => {
      toastSeqRef.current += 1;
      const id = Date.now() * 1000 + (toastSeqRef.current % 1000);
      setToasts((t) => [...t.slice(-7), { id, msg, type, icon }]);
      const timer = setTimeout(() => dismissToast(id), 10_000);
      toastTimersRef.current.set(id, timer);
    },
    [dismissToast]
  );

  useEffect(() => {
    return () => {
      for (const timer of toastTimersRef.current.values()) clearTimeout(timer);
      toastTimersRef.current.clear();
    };
  }, []);

  useReveal();

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    setProductsError(null);
    try {
      const list = await fetchAdminProducts();
      setProducts(list);
      if (process.env.NODE_ENV === "development") {
        console.debug("[AdminApp] Productos cargados desde API:", list.length);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al cargar productos";
      setProductsError(msg);
      showToast(msg, "danger", "⚠️");
    } finally {
      setProductsLoading(false);
    }
  }, [showToast]);

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    setCategoriesError(null);
    try {
      const list = await fetchAdminCategories();
      setCategoriesTree(list);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al cargar categorías";
      setCategoriesError(msg);
      showToast(msg, "danger", "⚠️");
    } finally {
      setCategoriesLoading(false);
    }
  }, [showToast]);

  const loadFamilies = useCallback(async () => {
    try {
      const list = await fetchAdminFamilies();
      setFamilyNames(list.map((f) => f.name));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al cargar familias";
      showToast(msg, "danger", "⚠️");
    }
  }, [showToast]);

  const loadPaidOrders = useCallback(async () => {
    try {
      const list = await fetchAdminPaidOrders();
      setOnlineSales(list);
    } catch (e) {
      console.error("[AdminApp] pedidos tienda:", e);
      showToast(e instanceof Error ? e.message : "No se cargaron pedidos de la tienda", "danger", "⚠️");
    }
  }, [showToast]);

  const sales = useMemo(
    () =>
      [...onlineSales, ...manualSales].sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0)),
    [onlineSales, manualSales],
  );

  const sessionUserId = session?.user?.id;

  /** Carga cuando hay sesión admin (servidor o cliente). */
  useEffect(() => {
    if (!sessionReady || !sessionUserId || session?.user?.role !== "ADMIN") return;
    void loadProducts();
  }, [sessionReady, sessionUserId, session?.user?.role, loadProducts]);

  useEffect(() => {
    if (productTab !== "list") {
      setProductListSelectedIds(new Set());
      setProductBulkMenuOpen(false);
    }
  }, [productTab]);

  useEffect(() => {
    if (!productBulkMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (productBulkMenuRef.current && !productBulkMenuRef.current.contains(e.target as Node)) {
        setProductBulkMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProductBulkMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [productBulkMenuOpen]);

  useEffect(() => {
    if (!sessionReady || !sessionUserId || session?.user?.role !== "ADMIN") return;
    void loadCategories();
  }, [sessionReady, sessionUserId, session?.user?.role, loadCategories]);

  useEffect(() => {
    if (!sessionReady || !sessionUserId || session?.user?.role !== "ADMIN") return;
    void loadFamilies();
  }, [sessionReady, sessionUserId, session?.user?.role, loadFamilies]);

  useEffect(() => {
    if (!sessionReady || !sessionUserId || session?.user?.role !== "ADMIN") return;
    void loadPaidOrders();
  }, [sessionReady, sessionUserId, session?.user?.role, loadPaidOrders]);

  useEffect(() => {
    if (!sessionReady) return;
    if (status === "unauthenticated" && !initialSession) {
      router.replace("/admin/login");
      return;
    }
    if (session?.user?.role && session.user.role !== "ADMIN") {
      router.replace("/admin/login?error=forbidden");
    }
  }, [sessionReady, status, session, initialSession, router]);

  /** Al entrar al panel: menú abierto y cierre automático a los 4 s (una sola vez por carga). */
  useEffect(() => {
    if (!sessionReady || session?.user?.role !== "ADMIN") return;
    if (sidebarAutoCollapseDone.current) return;
    sidebarAutoCollapseDone.current = true;
    const t = window.setTimeout(() => setSidebarExpanded(false), 4000);
    return () => window.clearTimeout(t);
  }, [status, session?.user?.role]);

  const titles = ADMIN_PAGE_TITLES;

  const goPage = useCallback(
    (p: AdminPageId, opts?: GoPageOptions) => {
      if (p === page && !opts?.productTab) return;

      setPage(p);
      setPageTitle(titles[p]);
      if (opts?.productTab) setProductTab(opts.productTab);

      if (p === "products" || p === "stock" || p === "dashboard") void loadProducts();
      else if (p === "discounts") void loadCategories();
      else if (p === "categories" || p === "menu") void loadCategories();
      else if (p === "families") void loadFamilies();
      else if (p === "sales") void loadPaidOrders();
    },
    [page, loadProducts, loadCategories, loadFamilies, loadPaidOrders]
  );

  const MOBILE_BREAKPOINT = 768;

  // En móvil: el sidebar empieza colapsado (drawer oculto).
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    if (mq.matches) setSidebarExpanded(false);
    const onMqChange = (e: MediaQueryListEvent) => { if (e.matches) setSidebarExpanded(false); };
    mq.addEventListener("change", onMqChange);
    return () => mq.removeEventListener("change", onMqChange);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarExpanded((v) => !v);
  }, []);

  const handleLogout = useCallback(async () => {
    // Evita depender de callbackUrl absoluto (p. ej. localhost en entornos mal configurados).
    await signOut({ redirect: false });
    router.replace("/admin/login");
  }, [router]);

  const productListSortedCategories = useMemo(
    () => [...categoriesTree].sort((a, b) => a.sortOrder - b.sortOrder),
    [categoriesTree]
  );

  const productFilterBrandOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const name of familyNames) {
      const b = name.trim();
      if (!b) continue;
      const key = b.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(b);
    }
    for (const p of products) {
      const b = (p.brand ?? "").trim();
      if (!b) continue;
      const key = b.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(b);
    }
    out.sort((a, b) => a.localeCompare(b, "es"));
    return out;
  }, [familyNames, products]);

  const zeroPriceProductCount = useMemo(
    () => productsWithZeroPrice(products.filter((p) => p.active !== false)).length,
    [products]
  );

  const hiddenProductCount = useMemo(
    () => products.filter((p) => p.active === false).length,
    [products]
  );

  const productFilterSubcategoryOptions = useMemo(() => {
    const pool = productFilterCategorySlug
      ? products.filter((p) => p.category === productFilterCategorySlug)
      : products;
    const seen = new Set<string>();
    const out: string[] = [];
    for (const p of pool) {
      const s = (p.subcategory ?? "").trim();
      if (!s) continue;
      if (seen.has(s)) continue;
      seen.add(s);
      out.push(s);
    }
    out.sort((a, b) => a.localeCompare(b, "es"));
    return out;
  }, [products, productFilterCategorySlug]);

  const productFilterTagOptions = useMemo(() => {
    const pool = productFilterCategorySlug
      ? products.filter((p) => p.category === productFilterCategorySlug)
      : products;
    const seen = new Set<string>();
    const out: string[] = [];
    for (const p of pool) {
      for (const raw of p.tags ?? []) {
        const tag = raw.trim();
        if (!tag) continue;
        const key = tag.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(tag);
      }
    }
    out.sort((a, b) => a.localeCompare(b, "es"));
    return out;
  }, [products, productFilterCategorySlug]);

  const catalogStats = useMemo(() => computeAdminCatalogStats(products, sales), [products, sales]);

  const aiSelectionCounts = useMemo(
    () => ({
      all: countAiEligibleAmongSelected(products, productListSelectedIds, "all"),
      descriptions: countAiEligibleAmongSelected(products, productListSelectedIds, "descriptions"),
      rewrite: countAiEligibleAmongSelected(products, productListSelectedIds, "descriptions-rewrite"),
      clear: countAiEligibleAmongSelected(products, productListSelectedIds, "clear"),
    }),
    [products, productListSelectedIds],
  );

  const semesterSalesChart = useMemo(() => computeSemesterSalesChart(sales), [sales]);

  const { filteredProducts, filteredMatchCount } = useMemo(() => {
    let list = products;
    const q = productSearch.trim().toLowerCase();
    if (q) {
      list = list.filter((x) => x.name.toLowerCase().includes(q));
    }
    if (productFilterBrand) {
      list = list.filter((x) => (x.brand ?? "").trim() === productFilterBrand);
    }
    if (productFilterCategorySlug) {
      list = list.filter((x) => x.category === productFilterCategorySlug);
    }
    if (productFilterSubcategory) {
      list = list.filter((x) => (x.subcategory ?? "").trim() === productFilterSubcategory);
    }
    if (productFilterTag) {
      list = list.filter((x) =>
        (x.tags ?? []).some((t) => t.trim().toLowerCase() === productFilterTag.toLowerCase())
      );
    }
    if (showHiddenProducts) {
      list = list.filter((x) => x.active === false);
    } else {
      list = list.filter((x) => x.active !== false);
    }
    const filteredMatchCount = list.length;
    const visibilityPool = showHiddenProducts
      ? products.filter((x) => x.active === false)
      : products.filter((x) => x.active !== false);
    const filteredProducts = resolveAdminListRowsAfterFilter(list, visibilityPool);
    return { filteredProducts, filteredMatchCount };
  }, [
    products,
    productSearch,
    productFilterBrand,
    productFilterCategorySlug,
    productFilterSubcategory,
    productFilterTag,
    showHiddenProducts,
  ]);

  const toggleProductListSelection = useCallback((id: string) => {
    setProductListSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const applyProductListSelectionForVisible = useCallback((visibleIds: string[], select: boolean) => {
    setProductListSelectedIds((prev) => {
      const n = new Set(prev);
      for (const id of visibleIds) {
        if (select) n.add(id);
        else n.delete(id);
      }
      return n;
    });
  }, []);

  const clearProductListSelection = useCallback(() => {
    setProductListSelectedIds(new Set());
  }, []);

  const selectAllCatalogProducts = useCallback(() => {
    setProductListSelectedIds(new Set(products.map((p) => p.id)));
    setProductBulkMenuOpen(false);
    showToast(`${products.length} producto(s) seleccionado(s)`, "success", "☑️");
  }, [products, showToast]);

  const selectAllVisibleProducts = useCallback(() => {
    applyProductListSelectionForVisible(
      filteredProducts.map((p) => p.id),
      true,
    );
    setProductBulkMenuOpen(false);
    showToast(`${filteredProducts.length} producto(s) visibles seleccionado(s)`, "success", "☑️");
  }, [applyProductListSelectionForVisible, filteredProducts, showToast]);

  const handleNormalizeSelectedNames = useCallback(async () => {
    const ids = Array.from(productListSelectedIds);
    if (ids.length === 0) {
      showToast("Selecciona uno o más productos (o usa «Seleccionar todos»).", "danger", "⚠️");
      return;
    }
    if (
      !confirm(
        `¿Normalizar ${ids.length} nombre(s)?\n\nCada palabra quedará con mayúscula inicial.\nEjemplo: SERUM LABIAL → Serum Labial`,
      )
    ) {
      return;
    }
    setProductBulkMenuOpen(false);
    setProductNameNormBusy(true);
    setProductNameNormProgress({ done: 0, total: ids.length });
    const CHUNK = 40;
    let updated = 0;
    let unchanged = 0;
    try {
      for (let i = 0; i < ids.length; i += CHUNK) {
        const chunk = ids.slice(i, i + CHUNK);
        const isLast = i + CHUNK >= ids.length;
        const res = await postAdminProductsNormalizeNames({
          ids: chunk,
          recordVersion: false,
        });
        updated += res.updated;
        unchanged += res.unchanged;
        setProductNameNormProgress({ done: Math.min(i + chunk.length, ids.length), total: ids.length });
        if (isLast && updated > 0) {
          await postAdminProductsNormalizeNames({
            ids: chunk.slice(0, 1),
            recordVersion: true,
            reportUpdated: updated,
          });
        }
      }
      showToast(
        updated > 0
          ? `Nombres normalizados: ${updated} actualizado(s)${unchanged ? `, ${unchanged} sin cambios` : ""}.`
          : unchanged > 0
            ? `Ningún nombre cambió (${unchanged} ya estaban normalizados).`
            : "No se actualizó ningún nombre.",
        updated > 0 ? "success" : "default",
        "✏️",
      );
      await loadProducts();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudieron normalizar los nombres", "danger", "⚠️");
    } finally {
      setProductNameNormBusy(false);
      setProductNameNormProgress(null);
    }
  }, [productListSelectedIds, showToast, loadProducts]);

  const handleHideZeroPriceProducts = useCallback(async () => {
    const ids = productsWithZeroPrice(products.filter((p) => p.active !== false)).map((p) => p.id);
    if (ids.length === 0) {
      showToast("No hay productos visibles con precio 0.", "default", "ℹ️");
      return;
    }
    if (
      !confirm(
        `¿Ocultar ${ids.length} producto(s) con precio 0?\n\nDejarán de aparecer en la tienda. Podrás verlos con «Ver productos ocultos».`
      )
    ) {
      return;
    }
    setProductBulkMenuOpen(false);
    setProductHideBusy(true);
    try {
      const updated = await bulkSetProductsActive({
        ids,
        active: false,
        versionLabel: `Ocultos en tienda: ${ids.length} producto(s) con precio 0`,
      });
      showToast(`${updated} producto(s) ocultos. Ya no salen en la tienda.`, "success", "🙈");
      await loadProducts();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudieron ocultar", "danger", "⚠️");
    } finally {
      setProductHideBusy(false);
    }
  }, [products, showToast, loadProducts]);

  const handleSetSelectedActive = useCallback(
    async (active: boolean) => {
      const ids = Array.from(productListSelectedIds);
      if (ids.length === 0) {
        showToast("Selecciona uno o más productos.", "default", "ℹ️");
        return;
      }
      const label = active ? "mostrar en la tienda" : "ocultar";
      if (!confirm(`¿${active ? "Mostrar" : "Ocultar"} ${ids.length} producto(s) seleccionado(s)?`)) {
        return;
      }
      setProductBulkMenuOpen(false);
      setProductHideBusy(true);
      try {
        const updated = await bulkSetProductsActive({
          ids,
          active,
          versionLabel: active
            ? `Visibles en tienda: ${ids.length} producto(s)`
            : `Ocultos en tienda: ${ids.length} producto(s)`,
        });
        showToast(
          active
            ? `${updated} producto(s) visibles otra vez en la tienda.`
            : `${updated} producto(s) ocultos.`,
          "success",
          active ? "👁️" : "🙈"
        );
        clearProductListSelection();
        await loadProducts();
      } catch (e) {
        showToast(e instanceof Error ? e.message : `No se pudieron ${label}`, "danger", "⚠️");
      } finally {
        setProductHideBusy(false);
      }
    },
    [productListSelectedIds, showToast, loadProducts, clearProductListSelection]
  );

  const handleBulkDeleteSelected = useCallback(async () => {
    const ids = Array.from(productListSelectedIds);
    if (ids.length === 0) {
      showToast("No hay productos seleccionados", "danger", "⚠️");
      return;
    }
    if (
      !confirm(
        `¿Eliminar ${ids.length} producto(s) seleccionado(s)? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }
    setProductBulkDeleting(true);
    setProductBulkMenuOpen(false);
    try {
      const { deleted } = await postAdminProductsBulkDelete({ mode: "ids", ids });
      clearProductListSelection();
      showToast(`${deleted} producto(s) eliminado(s)`, "default", "🗑️");
      await loadProducts();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Error al eliminar", "danger", "⚠️");
    } finally {
      setProductBulkDeleting(false);
    }
  }, [productListSelectedIds, showToast, loadProducts, clearProductListSelection]);

  const selectedProductsForMerge = useMemo(() => {
    return products.filter((p) => productListSelectedIds.has(p.id));
  }, [products, productListSelectedIds]);

  const openProductMergeModal = useCallback(() => {
    if (selectedProductsForMerge.length < 2) {
      showToast("Selecciona al menos 2 productos para unirlos", "default", "ℹ️");
      return;
    }
    setProductBulkMenuOpen(false);
    setProductMergePickedId(selectedProductsForMerge[0]!.id);
    setProductMergeCustomName("");
    setProductMergeNameMode("pick");
    setProductMergeOpen(true);
  }, [selectedProductsForMerge, showToast]);

  const confirmProductMerge = useCallback(() => {
    if (selectedProductsForMerge.length < 2) return;
    const picked = selectedProductsForMerge.find((p) => p.id === productMergePickedId);
    const name =
      productMergeNameMode === "custom"
        ? productMergeCustomName.trim()
        : (picked?.name ?? "").trim();
    if (!name) {
      showToast("Elige o escribe el nombre del producto unificado", "default", "ℹ️");
      return;
    }
    const survivorId =
      productMergeNameMode === "pick" && productMergePickedId
        ? productMergePickedId
        : selectedProductsForMerge[0]!.id;
    const absorbedIds = selectedProductsForMerge.map((p) => p.id).filter((id) => id !== survivorId);
    void (async () => {
      setProductMergeBusy(true);
      try {
        const res = await postAdminProductsMerge({ survivorId, absorbedIds, name });
        setProductMergeOpen(false);
        clearProductListSelection();
        await loadProducts();
        showToast(
          `Unidos ${res.mergedCount} productos en «${res.product.name}» (${res.imageCount} imagen(es)).`,
          "success",
          "🔗"
        );
      } catch (e) {
        showToast(e instanceof Error ? e.message : "No se pudieron unir", "danger", "⚠️");
      } finally {
        setProductMergeBusy(false);
      }
    })();
  }, [
    selectedProductsForMerge,
    productMergePickedId,
    productMergeNameMode,
    productMergeCustomName,
    showToast,
    clearProductListSelection,
    loadProducts,
  ]);

  const openProductVariantGroupModal = useCallback(() => {
    if (selectedProductsForMerge.length < 2) {
      showToast("Selecciona al menos 2 productos para agruparlos como variantes", "default", "ℹ️");
      return;
    }
    setProductBulkMenuOpen(false);
    setProductVariantPrimaryId(selectedProductsForMerge[0]!.id);
    setProductVariantGroupOpen(true);
  }, [selectedProductsForMerge, showToast]);

  const confirmProductVariantGroup = useCallback(() => {
    if (selectedProductsForMerge.length < 2 || !productVariantPrimaryId) return;
    if (!selectedProductsForMerge.some((p) => p.id === productVariantPrimaryId)) {
      showToast("Elige qué producto será la cara principal", "default", "ℹ️");
      return;
    }
    void (async () => {
      setProductVariantGroupBusy(true);
      try {
        const res = await postAdminProductsGroupVariants({
          primaryId: productVariantPrimaryId,
          ids: selectedProductsForMerge.map((p) => p.id),
        });
        setProductVariantGroupOpen(false);
        clearProductListSelection();
        await loadProducts();
        showToast(
          `${res.grouped} productos agrupados como variantes. Cara principal: «${res.primaryName}».`,
          "success",
          "📦"
        );
      } catch (e) {
        showToast(e instanceof Error ? e.message : "No se pudieron agrupar", "danger", "⚠️");
      } finally {
        setProductVariantGroupBusy(false);
      }
    })();
  }, [
    selectedProductsForMerge,
    productVariantPrimaryId,
    showToast,
    clearProductListSelection,
    loadProducts,
  ]);

  const handleBulkAiComplete = useCallback(() => {
    const ids = Array.from(productListSelectedIds);
    if (ids.length === 0) {
      showToast("Selecciona al menos un producto", "danger", "⚠️");
      return;
    }
    const items: AiBulkProgressItem[] = ids.map((id) => {
      const p = products.find((x) => x.id === id);
      const needs = p ? productNeedsAiComplete(p) : true;
      return {
        id,
        name: p?.name ?? id,
        status: needs ? "pending" : "skipped",
        filled: [],
      };
    });
    const pending = items.filter((i) => i.status === "pending").length;
    if (pending === 0) {
      showToast("Los productos seleccionados ya tienen todos los datos completos", "default", "ℹ️");
      return;
    }
    setAiBulkItems(items);
    setAiBulkPhase("intro");
    setAiBulkMode("all");
    setAiBulkModalOpen(true);
    setProductBulkMenuOpen(false);
  }, [productListSelectedIds, products, showToast]);

  const handleBulkAiDescriptions = useCallback(() => {
    const ids = Array.from(productListSelectedIds);
    if (ids.length === 0) {
      showToast("Selecciona al menos un producto", "danger", "⚠️");
      return;
    }
    const items: AiBulkProgressItem[] = ids.map((id) => {
      const p = products.find((x) => x.id === id);
      const needs = p ? productNeedsDescription(p) : true;
      return {
        id,
        name: p?.name ?? id,
        status: needs ? "pending" : "skipped",
        filled: [],
      };
    });
    const pending = items.filter((i) => i.status === "pending").length;
    if (pending === 0) {
      showToast("Los productos seleccionados ya tienen descripción", "default", "ℹ️");
      return;
    }
    setAiBulkItems(items);
    setAiBulkPhase("intro");
    setAiBulkMode("descriptions");
    setAiBulkModalOpen(true);
    setProductBulkMenuOpen(false);
  }, [productListSelectedIds, products, showToast]);

  const handleBulkAiRewriteDescriptions = useCallback(() => {
    const ids = Array.from(productListSelectedIds);
    if (ids.length === 0) {
      showToast("Selecciona al menos un producto", "danger", "⚠️");
      return;
    }
    const items: AiBulkProgressItem[] = ids.map((id) => {
      const p = products.find((x) => x.id === id);
      return {
        id,
        name: p?.name ?? id,
        status: "pending",
        filled: [],
      };
    });
    setAiBulkItems(items);
    setAiBulkPhase("intro");
    setAiBulkMode("descriptions-rewrite");
    setAiBulkModalOpen(true);
    setProductBulkMenuOpen(false);
  }, [productListSelectedIds, products, showToast]);

  const closeAiBulkModal = useCallback(() => {
    if (aiBulkPhase === "running") return;
    setAiBulkModalOpen(false);
    setAiBulkItems([]);
    setAiBulkPhase("intro");
    setAiBulkMode("all");
  }, [aiBulkPhase]);

  const runAiBulkComplete = useCallback(async () => {
    if (aiBulkRunLock.current) return;
    aiBulkRunLock.current = true;
    setAiBulkPhase("running");
    setProductAiBusy(true);

    const pendingIds = aiBulkItems.filter((i) => i.status === "pending").map((i) => i.id);
    const aiOptions: AiCompleteFieldOptions | undefined =
      aiBulkMode === "descriptions"
        ? { fields: ["description"] }
        : aiBulkMode === "descriptions-rewrite"
          ? { fields: ["description"], forceRegenerate: true, rewriteDescriptions: true }
          : undefined;

    try {
      const { summary } = await runAdminProductsAiCompleteParallel(
        pendingIds,
        {
          onStart(id) {
            setAiBulkItems((prev) =>
              prev.map((it) => (it.id === id ? { ...it, status: "running" as const } : it)),
            );
          },
          onDone(result) {
            setAiBulkItems((prev) =>
              prev.map((it) => {
                if (it.id !== result.id) return it;
                if (result.ok && result.filled.length > 0) {
                  return {
                    ...it,
                    status: "done" as const,
                    filled: result.filled,
                    product: result.product,
                    name: result.name,
                  };
                }
                if (result.ok) {
                  return { ...it, status: "skipped" as const, name: result.name };
                }
                return {
                  ...it,
                  status: "error" as const,
                  error: result.error,
                  name: result.name,
                };
              }),
            );
            if (result.product) {
              setProducts((prev) => prev.map((x) => (x.id === result.product!.id ? result.product! : x)));
            }
          },
        },
        undefined,
        aiOptions,
      );

      await loadProducts();
      setAiBulkPhase("done");
      showToast(
        aiBulkMode === "descriptions-rewrite"
          ? `Descripciones reescritas: ${summary.succeeded} actualizada(s), ${summary.failed} sin cambios o error`
          : aiBulkMode === "descriptions"
            ? `Descripciones: ${summary.succeeded} creada(s), ${summary.failed} sin cambios o error`
            : `IA: ${summary.succeeded} enriquecido(s), ${summary.failed} sin cambios o error`,
        summary.succeeded > 0 ? "success" : "default",
        "✦",
      );
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Error al completar con IA", "danger", "⚠️");
      setAiBulkPhase("done");
    } finally {
      setProductAiBusy(false);
      aiBulkRunLock.current = false;
    }
  }, [aiBulkItems, aiBulkMode, loadProducts, showToast]);

  const handleBulkAiClear = useCallback(async () => {
    const ids = Array.from(productListSelectedIds);
    if (ids.length === 0) {
      showToast("Selecciona al menos un producto", "danger", "⚠️");
      return;
    }
    const { eligible } = countAiEligibleAmongSelected(products, productListSelectedIds, "clear");
    if (eligible === 0) {
      showToast("Ningún producto seleccionado tiene datos marcados como IA", "default", "ℹ️");
      setProductBulkMenuOpen(false);
      return;
    }
    if (
      !confirm(
        `¿Quitar los valores generados por IA en ${eligible} producto(s)? (${ids.length} seleccionado(s), ${ids.length - eligible} sin datos IA). Los campos quedarán vacíos o por defecto.`,
      )
    ) {
      return;
    }
    setProductAiBusy(true);
    setProductBulkMenuOpen(false);
    try {
      const { clearedProducts, clearedFields } = await postAdminProductsAiClear(ids);
      clearProductListSelection();
      await loadProducts();
      showToast(
        clearedProducts > 0
          ? `Datos IA eliminados en ${clearedProducts} producto(s) (${clearedFields} campos)`
          : "Ningún producto seleccionado tenía datos marcados como IA",
        clearedProducts > 0 ? "default" : "default",
        "🧹",
      );
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Error al quitar datos IA", "danger", "⚠️");
    } finally {
      setProductAiBusy(false);
    }
  }, [productListSelectedIds, products, showToast, loadProducts, clearProductListSelection]);

  const selectIncompleteVisibleProducts = useCallback(
    (visible: AdminProduct[]) => {
      const ids = visible.filter(productNeedsAiComplete).map((p) => p.id);
      setProductListSelectedIds(new Set(ids));
      showToast(`${ids.length} producto(s) incompleto(s) seleccionado(s)`, "default", "✦");
      setProductBulkMenuOpen(false);
    },
    [showToast],
  );

  const selectWithoutDescriptionVisibleProducts = useCallback(
    (visible: AdminProduct[]) => {
      const ids = visible.filter(productNeedsDescription).map((p) => p.id);
      setProductListSelectedIds(new Set(ids));
      showToast(`${ids.length} producto(s) sin descripción seleccionado(s)`, "default", "📝");
      setProductBulkMenuOpen(false);
    },
    [showToast],
  );

  const handleBulkDeleteAll = useCallback(async () => {
    if (products.length === 0) {
      showToast("No hay productos en el catálogo", "default", "ℹ️");
      return;
    }
    if (
      !confirm(
        "Se eliminarán todos los productos del catálogo. Los pedidos existentes se conservan, pero esta acción no se puede deshacer. ¿Continuar?"
      )
    ) {
      return;
    }
    const typed = window.prompt(
      `Para confirmar, escribe exactamente:\n${BULK_DELETE_ALL_CONFIRM_PHRASE}`
    )?.trim();
    if (typed !== BULK_DELETE_ALL_CONFIRM_PHRASE) {
      if (typed != null && typed !== "") {
        showToast("Frase de confirmación incorrecta", "danger", "⚠️");
      }
      return;
    }
    setProductBulkDeleting(true);
    setProductBulkMenuOpen(false);
    try {
      const { deleted } = await postAdminProductsBulkDelete({
        mode: "all",
        confirmPhrase: BULK_DELETE_ALL_CONFIRM_PHRASE,
      });
      clearProductListSelection();
      showToast(`Se eliminaron ${deleted} producto(s)`, "default", "🗑️");
      await loadProducts();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Error al eliminar", "danger", "⚠️");
    } finally {
      setProductBulkDeleting(false);
    }
  }, [products.length, showToast, loadProducts, clearProductListSelection]);

  const setProductFilterCategorySlugAndResetSub = useCallback((slug: string) => {
    setProductFilterCategorySlug(slug);
    setProductFilterSubcategory("");
  }, []);

  useEffect(() => {
    if (
      productFilterSubcategory &&
      !productFilterSubcategoryOptions.includes(productFilterSubcategory)
    ) {
      setProductFilterSubcategory("");
    }
  }, [productFilterSubcategory, productFilterSubcategoryOptions]);

  const renderDashboard = () => {
    const chartValues = semesterSalesChart.months.map((m) => m.total);
    const chartMax = Math.max(...chartValues, 1);
    return (
      <>
        <div className="admin-dashboard-hero reveal">
          <div className="admin-dashboard-hero-copy">
            <span className="gb-tech-live-badge">
              <span className="gb-tech-live-dot" aria-hidden />
              Sistema en línea
            </span>
            <h2>Panel de control</h2>
            <p>Monitorea ventas, inventario y catálogo con datos en tiempo real.</p>
          </div>
          <div className="admin-dashboard-hero-meta">
            <span className="admin-dashboard-pill">◈ {catalogStats.totalProducts} SKUs</span>
            <span className="admin-dashboard-pill">⬡ {catalogStats.salesCount} ventas</span>
            <span className="admin-dashboard-pill">✦ IA catálogo activa</span>
          </div>
        </div>
        <div className="stats-grid">
          <div className="stat-card stat-card--tech">
            <div className="stat-icon">💰</div>
            <div className="stat-num">{formatPrice(catalogStats.totalRevenue)}</div>
            <div className="stat-label">Ingresos totales</div>
            <div className="stat-trend up">↑ {catalogStats.salesCount} venta(s) registrada(s)</div>
          </div>
          <div className="stat-card stat-card--tech">
            <div className="stat-icon">🛒</div>
            <div className="stat-num">{catalogStats.salesCount}</div>
            <div className="stat-label">Ventas registradas</div>
            <div className="stat-trend up">↑ Pedidos web + manuales</div>
          </div>
          <div className="stat-card stat-card--tech">
            <div className="stat-icon">📦</div>
            <div className="stat-num">{catalogStats.activeProducts}</div>
            <div className="stat-label">Productos activos</div>
            <div className={`stat-trend ${catalogStats.stockLow > 0 ? "down" : "up"}`}>
              {catalogStats.stockLow > 0
                ? `↓ ${catalogStats.stockLow} con stock bajo`
                : `✓ ${catalogStats.totalProducts} en catálogo`}
            </div>
          </div>
          <AdminAiSpendStatCard showToast={showToast} />
        </div>
        <div className="charts-row">
          <div className="admin-card admin-card--tech">
            <div className="admin-card-title">{semesterSalesChart.title}</div>
            <div className="bar-chart" id="bar-chart">
              {semesterSalesChart.months.map((month) => {
                const h = Math.round((month.total / chartMax) * 140);
                return (
                  <div key={month.monthIndex} className="bar-group">
                    <span className="bar-value">{compactChartAmount(month.total)}</span>
                    <div
                      className="bar"
                      style={{
                        height: Math.max(h, month.total > 0 ? 4 : 0),
                        background: "linear-gradient(180deg,var(--rose),var(--blush))",
                      }}
                      title={formatPrice(month.total)}
                    />
                    <span className="bar-label">{month.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="admin-card admin-card--tech">
            <div className="admin-card-title">Ventas por categoría</div>
            <div className="donut-chart">
              <div className="donut-visual" />
              <div className="donut-legend">
                <div className="legend-item">
                  <div className="legend-dot" style={{ background: "var(--rose)" }} />
                  Maquillaje <span className="legend-pct">46%</span>
                </div>
                <div className="legend-item">
                  <div className="legend-dot" style={{ background: "var(--lavender)" }} />
                  Cuidado Piel <span className="legend-pct">20%</span>
                </div>
                <div className="legend-item">
                  <div className="legend-dot" style={{ background: "var(--sage)" }} />
                  Capilar <span className="legend-pct">19%</span>
                </div>
                <div className="legend-item">
                  <div className="legend-dot" style={{ background: "var(--gold)" }} />
                  Otros <span className="legend-pct">15%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="admin-card admin-recent-sales">
          <div className="admin-card-title">Ventas recientes</div>
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table className="admin-table" style={{ minWidth: 560 }}>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cliente</th>
                <th>Canal</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                    Sin ventas registradas aún
                  </td>
                </tr>
              ) : (
                sales.slice(0, 8).map((s) => {
                  const prod = products.find((p) => p.id === s.productId);
                  return (
                    <tr key={String(s.id)}>
                      <td>
                        <div className="table-product-cell">
                          <AdminProductThumb imageUrl={prod?.imageUrl ?? null} emoji={prod?.emoji ?? "📦"} />
                          <div className="table-product-name">{prod ? prod.name : s.productName}</div>
                        </div>
                      </td>
                      <td>{s.client || "—"}</td>
                      <td>{s.channel || "—"}</td>
                      <td>{formatPrice(s.total)}</td>
                      <td>
                        <span className={`status-chip ${s.status === "Completada" ? "status-active" : "status-low"}`}>{s.status}</span>
                      </td>
                      <td>{s.date}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>
        </div>
      </>
    );
  };

  if (!sessionReady) {
    return (
      <div className="admin-login-gate">
        <div style={{ textAlign: "center" }}>
          <div className="admin-boot-spinner" role="status" aria-label="Cargando panel" />
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Cargando panel…</p>
        </div>
      </div>
    );
  }

  if (!session?.user || session.user.role !== "ADMIN") {
    return (
      <div className="admin-login-gate">
        <div style={{ textAlign: "center" }}>
          <div className="admin-boot-spinner" role="status" aria-label="Redirigiendo" />
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Redirigiendo…</p>
        </div>
      </div>
    );
  }

  const navLinkLabel = (text: string) => <span className="sidebar-link-label">{text}</span>;

  const renderNavItem = (item: (typeof ADMIN_NAV_ITEMS)[number]) => {
    const isActive = page === item.id;
    return (
      <button
        key={item.id}
        type="button"
        className={`sidebar-link${isActive ? " active" : ""}`}
        title={item.label}
        aria-current={isActive ? "page" : undefined}
        onClick={() => {
          goPage(item.id);
          // En móvil: cerrar drawer al navegar
          if (window.matchMedia("(max-width: 768px)").matches) setSidebarExpanded(false);
        }}
      >
        <span className="icon">{item.icon}</span>
        {navLinkLabel(item.label)}
      </button>
    );
  };

  return (
    <div className={`admin-app-shell${sidebarExpanded ? "" : " admin-sidebar-collapsed"}`}>
      {/* Backdrop móvil: cierra el sidebar al tocar fuera */}
      {sidebarExpanded && (
        <div
          className="admin-sidebar-backdrop"
          aria-hidden
          onClick={() => setSidebarExpanded(false)}
        />
      )}
      <div className="admin-layout">
        <aside className="admin-sidebar" aria-label="Navegación del panel">
          <div className="admin-sidebar-header">
            <BrandLogo variant="admin" />
            <div className="admin-role">Panel Administrativo</div>
          </div>
          <nav id="admin-sidebar-nav" className="sidebar-nav">
            <div className="nav-section-label">Principal</div>
            {ADMIN_NAV_ITEMS.filter((item) => !item.section).map(renderNavItem)}
            <div className="nav-section-label">Configuración</div>
            {ADMIN_NAV_ITEMS.filter((item) => item.section === "config").map(renderNavItem)}
            <div className="nav-section-label">Tienda</div>
            <Link href="/" className="sidebar-link" target="_blank" title="Ver tienda en nueva pestaña">
              <span className="icon">🌐</span>
              {navLinkLabel("Ver Tienda")}
            </Link>
          </nav>
          <div className="sidebar-bottom">
            <div className="admin-user-chip">
              <div className="admin-avatar">G</div>
              <div className="admin-user-chip-text">
                <div className="admin-user-name">{session.user.name || "Admin"}</div>
                <div className="admin-user-role">Administradora</div>
              </div>
            </div>
          </div>
        </aside>

        <main className="admin-main">
          <div className="admin-topbar">
            <div className="admin-topbar-leading">
              <button
                type="button"
                className={`admin-sidebar-toggle${sidebarExpanded ? "" : " admin-sidebar-toggle--pulse"}`}
                onClick={toggleSidebar}
                aria-expanded={sidebarExpanded}
                aria-controls="admin-sidebar-nav"
                title={sidebarExpanded ? "Contraer menú lateral" : "Expandir menú lateral"}
              >
                <span className="admin-sidebar-toggle-icon" aria-hidden>
                  {sidebarExpanded ? "◀" : "▶"}
                </span>
              </button>
              <h1 className="admin-page-title">{pageTitle}</h1>
            </div>
            <div className="admin-topbar-actions">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => goPage("products", { productTab: "add" })}
              >
                + Agregar Producto
              </button>
              <button type="button" className="btn btn-rose btn-sm" onClick={() => setAddSaleOpen(true)}>
                + Registrar Venta
              </button>
              <button type="button" className="btn btn-sm" style={{ color: "var(--text-muted)" }} onClick={() => void handleLogout()}>
                Salir
              </button>
            </div>
          </div>

          <div className="admin-content">
            <div className={`admin-page ${page === "dashboard" ? "active" : ""}`} style={{ display: page === "dashboard" ? "block" : "none" }}>
              {renderDashboard()}
            </div>

            <div className={`admin-page ${page === "products" ? "active" : ""}`} style={{ display: page === "products" ? "block" : "none" }}>
              {productsError && (
                <div className="admin-card" style={{ marginBottom: 16, padding: 14, background: "var(--lavender-light)", border: "1px solid var(--dusty-rose)", fontSize: 13 }}>
                  <strong>Error:</strong> {productsError}{" "}
                  <button type="button" className="btn btn-outline btn-sm" style={{ marginLeft: 8 }} onClick={() => void loadProducts()}>
                    Reintentar
                  </button>
                </div>
              )}
              {productsLoading && products.length === 0 && (
                <p style={{ color: "var(--text-muted)", marginBottom: 16 }}>Cargando productos desde la base de datos…</p>
              )}
              <div className="tabs" style={{ flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  <button type="button" className={`tab-btn ${productTab === "list" ? "active" : ""}`} onClick={() => setProductTab("list")}>
                    📋 Lista de productos
                  </button>
                  <button type="button" className={`tab-btn ${productTab === "add" ? "active" : ""}`} onClick={() => setProductTab("add")}>
                    + Agregar producto
                  </button>
                  <button type="button" className={`tab-btn ${productTab === "bulk" ? "active" : ""}`} onClick={() => setProductTab("bulk")}>
                    📤 Carga masiva
                  </button>
                </div>
                <div ref={productBulkMenuRef} style={{ position: "relative", display: "flex", alignItems: "center", marginBottom: -1 }}>
                  <button
                    type="button"
                    className={`tab-btn ${productBulkMenuOpen ? "active" : ""}`}
                    aria-expanded={productBulkMenuOpen}
                    aria-haspopup="menu"
                    disabled={productBulkDeleting || productAiBusy || productHideBusy || productNameNormBusy || productVariantGroupBusy}
                    title="Más acciones (lote)"
                    onClick={() => setProductBulkMenuOpen((o) => !o)}
                    style={{ minWidth: 44, padding: "10px 14px" }}
                  >
                    ⋯
                  </button>
                  {productBulkMenuOpen && (
                    <div
                      role="menu"
                      style={{
                        position: "absolute",
                        top: "calc(100% + 6px)",
                        right: 0,
                        minWidth: 280,
                        background: "var(--ivory)",
                        border: "1px solid var(--cream)",
                        borderRadius: "var(--radius-md)",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                        zIndex: 40,
                        padding: 8,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      <button
                        type="button"
                        role="menuitem"
                        className="btn btn-outline btn-sm"
                        disabled={productNameNormBusy || filteredProducts.length === 0}
                        style={{ width: "100%", justifyContent: "flex-start", textAlign: "left" }}
                        onClick={selectAllVisibleProducts}
                      >
                        ☑️ Seleccionar todos (visibles) ({filteredProducts.length})
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="btn btn-outline btn-sm"
                        disabled={productNameNormBusy || products.length === 0}
                        style={{ width: "100%", justifyContent: "flex-start", textAlign: "left" }}
                        onClick={selectAllCatalogProducts}
                      >
                        ☑️ Seleccionar todos (catálogo) ({products.length})
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="btn btn-outline btn-sm"
                        disabled={productNameNormBusy || productListSelectedIds.size === 0}
                        style={{ width: "100%", justifyContent: "flex-start", textAlign: "left" }}
                        onClick={() => {
                          clearProductListSelection();
                          setProductBulkMenuOpen(false);
                        }}
                      >
                        Limpiar selección ({productListSelectedIds.size})
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="btn btn-primary btn-sm"
                        disabled={productNameNormBusy || productListSelectedIds.size === 0}
                        style={{ width: "100%", justifyContent: "flex-start", textAlign: "left" }}
                        onClick={() => void handleNormalizeSelectedNames()}
                      >
                        ✏️ Normalizar nombres de productos ({productListSelectedIds.size})
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="btn btn-primary btn-sm"
                        disabled={productAiBusy || aiSelectionCounts.all.eligible === 0}
                        style={{ width: "100%", justifyContent: "flex-start", textAlign: "left" }}
                        onClick={() => void handleBulkAiComplete()}
                      >
                        ✦ Completar datos con IA ({formatAiActionCount(aiSelectionCounts.all.eligible, aiSelectionCounts.all.selected)})
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="btn btn-outline btn-sm"
                        disabled={productAiBusy || aiSelectionCounts.descriptions.eligible === 0}
                        style={{ width: "100%", justifyContent: "flex-start", textAlign: "left" }}
                        onClick={() => void handleBulkAiDescriptions()}
                      >
                        📝 Generar descripciones (solo vacías) ({formatAiActionCount(aiSelectionCounts.descriptions.eligible, aiSelectionCounts.descriptions.selected)})
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="btn btn-outline btn-sm"
                        disabled={productAiBusy || aiSelectionCounts.rewrite.selected === 0}
                        style={{ width: "100%", justifyContent: "flex-start", textAlign: "left" }}
                        onClick={() => void handleBulkAiRewriteDescriptions()}
                      >
                        ✨ Reescribir descripciones comerciales (IA) ({aiSelectionCounts.rewrite.selected})
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="btn btn-outline btn-sm"
                        disabled={productAiBusy || filteredProducts.length === 0}
                        style={{ width: "100%", justifyContent: "flex-start", textAlign: "left" }}
                        onClick={() => selectWithoutDescriptionVisibleProducts(filteredProducts)}
                      >
                        Seleccionar sin descripción (visibles)
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="btn btn-outline btn-sm"
                        disabled={productAiBusy || filteredProducts.length === 0}
                        style={{ width: "100%", justifyContent: "flex-start", textAlign: "left" }}
                        onClick={() => selectIncompleteVisibleProducts(filteredProducts)}
                      >
                        Seleccionar incompletos visibles
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="btn btn-outline btn-sm"
                        disabled={productAiBusy || aiSelectionCounts.clear.eligible === 0}
                        style={{
                          width: "100%",
                          justifyContent: "flex-start",
                          textAlign: "left",
                          borderColor: "var(--sage-dark)",
                          color: "var(--sage-dark)",
                        }}
                        onClick={() => void handleBulkAiClear()}
                      >
                        Quitar datos generados por IA ({formatAiActionCount(aiSelectionCounts.clear.eligible, aiSelectionCounts.clear.selected)})
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="btn btn-outline btn-sm"
                        disabled={
                          productBulkDeleting ||
                          productAiBusy ||
                          productHideBusy ||
                          productListSelectedIds.size === 0
                        }
                        style={{ width: "100%", justifyContent: "flex-start", textAlign: "left" }}
                        onClick={() => {
                          setProductBulkMenuOpen(false);
                          setChangeFamilyModalOpen(true);
                        }}
                      >
                        Cambiar familia ({productListSelectedIds.size})
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="btn btn-outline btn-sm"
                        disabled={productBulkDeleting || productAiBusy || productHideBusy || zeroPriceProductCount === 0}
                        style={{ width: "100%", justifyContent: "flex-start", textAlign: "left" }}
                        title={
                          zeroPriceProductCount === 0
                            ? "No hay productos con precio 0"
                            : `Afecta ${zeroPriceProductCount} producto(s) con precio 0`
                        }
                        onClick={() => {
                          setProductBulkMenuOpen(false);
                          setZeroPriceBrandModalOpen(true);
                        }}
                      >
                        Cambiar familia / marca (precio 0) ({zeroPriceProductCount})
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="btn btn-outline btn-sm"
                        disabled={productBulkDeleting || productAiBusy || productHideBusy || zeroPriceProductCount === 0}
                        style={{ width: "100%", justifyContent: "flex-start", textAlign: "left" }}
                        title={
                          zeroPriceProductCount === 0
                            ? "No hay productos con precio 0"
                            : `Ocultar ${zeroPriceProductCount} producto(s) con precio 0`
                        }
                        onClick={() => void handleHideZeroPriceProducts()}
                      >
                        Ocultar productos (precio 0) ({zeroPriceProductCount})
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="btn btn-outline btn-sm"
                        disabled={productBulkDeleting || productAiBusy || productHideBusy || productListSelectedIds.size === 0}
                        style={{ width: "100%", justifyContent: "flex-start", textAlign: "left" }}
                        onClick={() => void handleSetSelectedActive(false)}
                      >
                        Ocultar seleccionados ({productListSelectedIds.size})
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="btn btn-outline btn-sm"
                        disabled={productBulkDeleting || productAiBusy || productHideBusy || productListSelectedIds.size === 0}
                        style={{ width: "100%", justifyContent: "flex-start", textAlign: "left" }}
                        onClick={() => void handleSetSelectedActive(true)}
                      >
                        Mostrar en la tienda ({productListSelectedIds.size})
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="btn btn-outline btn-sm"
                        disabled={productBulkDeleting || productAiBusy || zeroPriceProductCount === 0}
                        style={{ width: "100%", justifyContent: "flex-start", textAlign: "left" }}
                        title={
                          zeroPriceProductCount === 0
                            ? "No hay productos con precio 0"
                            : `Editar stock de ${zeroPriceProductCount} producto(s)`
                        }
                        onClick={() => {
                          setProductBulkMenuOpen(false);
                          setProductTab("zero-stock");
                        }}
                      >
                        Asignar stock (precio 0) ({zeroPriceProductCount})
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="btn btn-outline btn-sm"
                        disabled={
                          productBulkDeleting ||
                          productMergeBusy ||
                          productVariantGroupBusy ||
                          productListSelectedIds.size < 2
                        }
                        style={{ width: "100%", justifyContent: "flex-start", textAlign: "left" }}
                        onClick={openProductVariantGroupModal}
                      >
                        Poner productos como variantes ({productListSelectedIds.size})
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="btn btn-outline btn-sm"
                        disabled={
                          productBulkDeleting ||
                          productMergeBusy ||
                          productListSelectedIds.size < 2
                        }
                        style={{ width: "100%", justifyContent: "flex-start", textAlign: "left" }}
                        onClick={openProductMergeModal}
                      >
                        Unir seleccionados en uno solo ({productListSelectedIds.size})
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="btn btn-outline btn-sm"
                        disabled={productBulkDeleting || productListSelectedIds.size === 0}
                        style={{ width: "100%", justifyContent: "flex-start", textAlign: "left" }}
                        onClick={() => void handleBulkDeleteSelected()}
                      >
                        Eliminar seleccionados ({productListSelectedIds.size})
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="btn btn-outline btn-sm"
                        disabled={productBulkDeleting || products.length === 0}
                        style={{
                          width: "100%",
                          justifyContent: "flex-start",
                          textAlign: "left",
                          borderColor: "var(--dusty-rose)",
                          color: "var(--dusty-rose)",
                        }}
                        onClick={() => void handleBulkDeleteAll()}
                      >
                        Eliminar todos los productos…
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {productNameNormProgress ? (
                <div
                  role="status"
                  aria-live="polite"
                  style={{
                    marginTop: 12,
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: "1px solid var(--dusty-rose)",
                    background: "linear-gradient(135deg, #fffafc 0%, #f3e8ff 100%)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#7a2f5a" }}>
                    <span>
                      <span className="admin-inline-spinner" aria-hidden style={{ marginRight: 8 }} />
                      Normalizando nombres…
                    </span>
                    <span>
                      {productNameNormProgress.done} / {productNameNormProgress.total} (
                      {productNameNormProgress.total > 0
                        ? Math.round((productNameNormProgress.done / productNameNormProgress.total) * 100)
                        : 0}
                      %)
                    </span>
                  </div>
                  <div style={{ height: 10, borderRadius: 999, background: "rgba(200,145,139,0.2)", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${
                          productNameNormProgress.total > 0
                            ? Math.round((productNameNormProgress.done / productNameNormProgress.total) * 100)
                            : 0
                        }%`,
                        borderRadius: 999,
                        background: "linear-gradient(90deg, var(--rose, #c8918b), #8b5cf6)",
                        transition: "width 0.25s ease",
                      }}
                    />
                  </div>
                </div>
              ) : null}
              {productTab === "list" && (
                <AdminProductListTab
                  sidebarExpanded={sidebarExpanded}
                  productSearch={productSearch}
                  setProductSearch={setProductSearch}
                  filterBrand={productFilterBrand}
                  setFilterBrand={setProductFilterBrand}
                  filterCategorySlug={productFilterCategorySlug}
                  setFilterCategorySlug={setProductFilterCategorySlugAndResetSub}
                  filterSubcategory={productFilterSubcategory}
                  setFilterSubcategory={setProductFilterSubcategory}
                  filterTag={productFilterTag}
                  setFilterTag={setProductFilterTag}
                  brandOptions={productFilterBrandOptions}
                  subcategoryOptions={productFilterSubcategoryOptions}
                  tagOptions={productFilterTagOptions}
                  sortedCategories={productListSortedCategories}
                  filteredProducts={filteredProducts}
                  filteredMatchCount={filteredMatchCount}
                  allProducts={products}
                  totalProductCount={catalogStats.totalProducts}
                  hiddenProductCount={hiddenProductCount}
                  showHiddenProducts={showHiddenProducts}
                  onToggleShowHidden={() => setShowHiddenProducts((v) => !v)}
                  listLoading={productsLoading}
                  categoryTree={categoriesTree}
                  selectedIds={productListSelectedIds}
                  onToggleSelect={toggleProductListSelection}
                  onSelectAllVisible={applyProductListSelectionForVisible}
                  featuredHomeSavingId={featuredHomeSavingId}
                  onToggleFeaturedInHome={async (id, value) => {
                    setFeaturedHomeSavingId(id);
                    try {
                      await updateAdminProduct(id, { featuredInHome: value });
                      showToast(
                        value
                          ? "Este producto saldrá entre los primeros en Productos Destacados del home"
                          : "Orden normal en la tienda para este producto",
                        "success",
                        "✨"
                      );
                      await loadProducts();
                    } catch (e) {
                      showToast(e instanceof Error ? e.message : "No se pudo actualizar", "danger", "⚠️");
                    } finally {
                      setFeaturedHomeSavingId(null);
                    }
                  }}
                  onView={(p) => {
                    setDetailProductId(p.id);
                    setDetailOpen(true);
                  }}
                  onDelete={async (id) => {
                    if (!confirm("¿Eliminar este producto?")) return;
                    try {
                      await deleteAdminProduct(id);
                      setProductListSelectedIds((prev) => {
                        const n = new Set(prev);
                        n.delete(id);
                        return n;
                      });
                      showToast("Producto eliminado", "default", "🗑️");
                      await loadProducts();
                    } catch (e) {
                      showToast(e instanceof Error ? e.message : "No se pudo eliminar", "danger", "⚠️");
                    }
                  }}
                  onDeleteVariant={async (id) => {
                    await deleteAdminProduct(id);
                    setProductListSelectedIds((prev) => {
                      const n = new Set(prev);
                      n.delete(id);
                      return n;
                    });
                    await loadProducts();
                  }}
                  onProductsRefresh={loadProducts}
                  showToast={showToast}
                />
              )}
              {productTab === "add" && (
                <AdminAddProductForm
                  categories={categoriesTree}
                  categoriesLoading={categoriesLoading}
                  saving={productMutation === "add"}
                  showToast={showToast}
                  onSubmit={async (body) => {
                    setProductMutation("add");
                    try {
                      await createAdminProduct(body);
                      showToast(`"${String(body.name)}" agregado exitosamente`, "success", "✅");
                      setProductTab("list");
                      await loadProducts();
                    } catch (e) {
                      showToast(e instanceof Error ? e.message : "Error al crear", "danger", "⚠️");
                    } finally {
                      setProductMutation(null);
                    }
                  }}
                />
              )}
              {productTab === "bulk" && (
                <AdminBulkTab
                  categories={categoriesTree}
                  categoriesLoading={categoriesLoading}
                  saving={productMutation === "bulk"}
                  showToast={showToast}
                  setMutation={setProductMutation}
                  onImported={async () => {
                    await loadProducts();
                  }}
                  onCategoriesUpdated={async () => {
                    await loadCategories();
                  }}
                />
              )}
              {productTab === "zero-stock" && (
                <AdminZeroPriceStockPanel
                  products={products}
                  onBack={() => setProductTab("list")}
                  onApplied={loadProducts}
                  showToast={showToast}
                />
              )}
            </div>

            <div className={`admin-page ${page === "category-products" ? "active" : ""}`} style={{ display: page === "category-products" ? "block" : "none" }}>
              <AdminCategoryStorefrontPanel
                active={page === "category-products"}
                categories={categoriesTree}
                showToast={showToast}
              />
            </div>

            <div className={`admin-page ${page === "combos" ? "active" : ""}`} style={{ display: page === "combos" ? "block" : "none" }}>
              <AdminCombosPanel active={page === "combos"} showToast={showToast} />
            </div>

            <div className={`admin-page ${page === "discounts" ? "active" : ""}`} style={{ display: page === "discounts" ? "block" : "none" }}>
              <AdminDiscountsPanel
                active={page === "discounts"}
                categories={categoriesTree}
                showToast={showToast}
              />
            </div>

            <div className={`admin-page ${page === "sales" ? "active" : ""}`} style={{ display: page === "sales" ? "block" : "none" }}>
              <AdminSalesTab sales={sales} products={products} onReloadOnline={() => void loadPaidOrders()} />
            </div>

            <div className={`admin-page ${page === "customers" ? "active" : ""}`} style={{ display: page === "customers" ? "block" : "none" }}>
              <AdminCustomersPanel active={page === "customers"} showToast={showToast} />
            </div>

            <div className={`admin-page ${page === "stock" ? "active" : ""}`} style={{ display: page === "stock" ? "block" : "none" }}>
              <AdminStockTab
                products={products}
                catalogStats={catalogStats}
                categoryTree={categoriesTree}
                stockSavingId={stockSavingId}
                onPersistStock={async (id, stock) => {
                  const p = products.find((x) => x.id === id);
                  if (!p) return;
                  setStockSavingId(id);
                  try {
                    await updateAdminProduct(id, { stock });
                    await loadProducts();
                  } catch (e) {
                    showToast(e instanceof Error ? e.message : "No se pudo guardar stock", "danger", "⚠️");
                  } finally {
                    setStockSavingId(null);
                  }
                }}
              />
            </div>

            <div className={`admin-page ${page === "categories" ? "active" : ""}`} style={{ display: page === "categories" ? "block" : "none" }}>
              <AdminCategoriesTab
                tree={categoriesTree}
                products={products}
                loading={categoriesLoading}
                error={categoriesError}
                onReload={() => void loadCategories()}
                showToast={showToast}
              />
            </div>

            <div className={`admin-page ${page === "families" ? "active" : ""}`} style={{ display: page === "families" ? "block" : "none" }}>
              <AdminFamiliesPanel
                active={page === "families"}
                showToast={showToast}
                onFamiliesChanged={async () => {
                  await Promise.all([loadFamilies(), loadProducts()]);
                }}
              />
            </div>

            <div className={`admin-page ${page === "menu" ? "active" : ""}`} style={{ display: page === "menu" ? "block" : "none" }}>
              <AdminMenuTab
                tree={categoriesTree}
                loading={categoriesLoading}
                error={categoriesError}
                onReload={() => void loadCategories()}
                showToast={showToast}
                onGoCategories={() => goPage("categories")}
              />
            </div>

            <div className={`admin-page ${page === "versions" ? "active" : ""}`} style={{ display: page === "versions" ? "block" : "none" }}>
              <AdminVersionsPanel
                active={page === "versions"}
                showToast={showToast}
                onCatalogMutated={async () => {
                  await Promise.all([loadProducts(), loadCategories()]);
                }}
              />
            </div>

            <div className={`admin-page ${page === "reports" ? "active" : ""}`} style={{ display: page === "reports" ? "block" : "none" }}>
              <AdminReportsTab sales={sales} showToast={showToast} />
            </div>
          </div>
        </main>
      </div>

      <AdminAddSaleModal
        open={addSaleOpen}
        onClose={() => setAddSaleOpen(false)}
        products={products}
        onSave={(sale) => {
          setManualSales((s) => [
            ...s,
            {
              ...sale,
              id: `manual-${Date.now()}`,
              source: "manual",
              createdAtMs: Date.now(),
            },
          ]);
          setProducts((prev) =>
            prev.map((p) => {
              if (p.id !== sale.productId) return p;
              return { ...p, stock: Math.max(0, p.stock - sale.qty) };
            }),
          );
          showToast("Venta registrada exitosamente", "success", "💰");
        }}
      />

      <AdminProductDetailModal
        open={detailOpen}
        product={products.find((p) => p.id === detailProductId) ?? null}
        saving={productMutation === "edit"}
        categoryTree={categoriesTree}
        brandOptions={productFilterBrandOptions}
        tagOptions={productFilterTagOptions}
        onReloadCategories={loadCategories}
        onReloadFamilies={loadFamilies}
        onClose={() => {
          setDetailOpen(false);
          setDetailProductId(null);
        }}
        onSave={async (patch) => {
          if (!detailProductId) return;
          setProductMutation("edit");
          try {
            await updateAdminProduct(detailProductId, patch);
            showToast("Producto actualizado", "success", "✅");
            await Promise.all([loadProducts(), loadFamilies()]);
          } catch (e) {
            showToast(e instanceof Error ? e.message : "Error al guardar", "danger", "⚠️");
            throw e;
          } finally {
            setProductMutation(null);
          }
        }}
        onDelete={async (id) => {
          if (!confirm("¿Eliminar este producto?")) return;
          setProductMutation("edit");
          try {
            await deleteAdminProduct(id);
            showToast("Producto eliminado", "default", "🗑️");
            setDetailOpen(false);
            setDetailProductId(null);
            await loadProducts();
          } catch (e) {
            showToast(e instanceof Error ? e.message : "No se pudo eliminar", "danger", "⚠️");
          } finally {
            setProductMutation(null);
          }
        }}
        onProductRefresh={(p) => {
          setProducts((prev) => prev.map((x) => (x.id === p.id ? p : x)));
        }}
        showToast={showToast}
      />

      {zeroPriceBrandModalOpen ? (
        <AdminZeroPriceBrandModal
          open={zeroPriceBrandModalOpen}
          products={products}
          brandOptions={productFilterBrandOptions}
          saving={productBulkDeleting}
          onClose={() => setZeroPriceBrandModalOpen(false)}
          onApplied={async () => {
            await Promise.all([loadProducts(), loadFamilies()]);
          }}
          showToast={showToast}
        />
      ) : null}

      {changeFamilyModalOpen ? (
        <AdminChangeFamilyModal
          open={changeFamilyModalOpen}
          ids={Array.from(productListSelectedIds)}
          title="Cambiar familia"
          description={`Se actualizará la familia de ${productListSelectedIds.size} producto(s) seleccionado(s).`}
          brandOptions={productFilterBrandOptions}
          saving={productHideBusy}
          onClose={() => setChangeFamilyModalOpen(false)}
          onApplied={async () => {
            await Promise.all([loadProducts(), loadFamilies()]);
          }}
          showToast={showToast}
        />
      ) : null}

      {productMergeOpen ? (
        <div
          className="admin-modal-overlay open"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !productMergeBusy) setProductMergeOpen(false);
          }}
        >
          <div
            className="admin-modal"
            style={{ maxWidth: 480, padding: "22px 20px" }}
            role="dialog"
            aria-modal="true"
            aria-label="Unir productos"
          >
            <h3 style={{ margin: "0 0 8px", fontSize: 18 }}>Unir productos en uno solo</h3>
            <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.45 }}>
              Se conservará un producto, se juntarán todas las imágenes y se eliminarán los demás
              ({selectedProductsForMerge.length} seleccionados).
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14, maxHeight: 320, overflow: "auto" }}>
              {selectedProductsForMerge.map((p) => {
                const imgCount = (p.imageUrl ? 1 : 0) + (p.images?.length ?? 0);
                return (
                  <label
                    key={p.id}
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "flex-start",
                      fontSize: 13,
                      padding: "8px 10px",
                      borderRadius: 8,
                      border:
                        productMergeNameMode === "pick" && productMergePickedId === p.id
                          ? "1px solid var(--dusty-rose)"
                          : "1px solid var(--cream)",
                      background: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="admin-merge-name"
                      checked={productMergeNameMode === "pick" && productMergePickedId === p.id}
                      onChange={() => {
                        setProductMergeNameMode("pick");
                        setProductMergePickedId(p.id);
                      }}
                    />
                    <span>
                      <strong>{p.name}</strong>
                      <span
                        style={{
                          display: "block",
                          fontFamily: "monospace",
                          fontSize: 12,
                          color: "var(--text-muted)",
                        }}
                      >
                        {p.externalRef ?? p.id.slice(0, 8)}
                        {imgCount ? ` · ${imgCount} imagen(es)` : ""}
                      </span>
                    </span>
                  </label>
                );
              })}
              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  fontSize: 13,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border:
                    productMergeNameMode === "custom" ? "1px solid var(--dusty-rose)" : "1px solid var(--cream)",
                }}
              >
                <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="radio"
                    name="admin-merge-name"
                    checked={productMergeNameMode === "custom"}
                    onChange={() => setProductMergeNameMode("custom")}
                  />
                  Escribir otro nombre
                </span>
                <input
                  className="form-input"
                  value={productMergeCustomName}
                  disabled={productMergeNameMode !== "custom"}
                  placeholder="Nombre del producto unificado"
                  onChange={(e) => setProductMergeCustomName(e.target.value)}
                  onFocus={() => setProductMergeNameMode("custom")}
                />
              </label>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn-outline"
                disabled={productMergeBusy}
                onClick={() => setProductMergeOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={productMergeBusy}
                onClick={confirmProductMerge}
              >
                {productMergeBusy ? (
                  <>
                    <span className="admin-inline-spinner" aria-hidden />
                    Uniendo…
                  </>
                ) : (
                  "Unir y juntar imágenes"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {productVariantGroupOpen ? (
        <div
          className="admin-modal-overlay open"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !productVariantGroupBusy) setProductVariantGroupOpen(false);
          }}
        >
          <div
            className="admin-modal"
            style={{ maxWidth: 480, padding: "22px 20px" }}
            role="dialog"
            aria-modal="true"
            aria-label="Poner productos como variantes"
          >
            <h3 style={{ margin: "0 0 8px", fontSize: 18 }}>Poner productos como variantes</h3>
            <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.45 }}>
              Elige la <strong>cara principal</strong>: esa es la que se verá en el catálogo. Los demás
              quedarán como variantes del mismo producto ({selectedProductsForMerge.length} seleccionados).
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14, maxHeight: 360, overflow: "auto" }}>
              {selectedProductsForMerge.map((p) => (
                <label
                  key={p.id}
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "flex-start",
                    fontSize: 13,
                    padding: "8px 10px",
                    borderRadius: 8,
                    border:
                      productVariantPrimaryId === p.id
                        ? "1px solid var(--dusty-rose)"
                        : "1px solid var(--cream)",
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="admin-variant-primary"
                    checked={productVariantPrimaryId === p.id}
                    onChange={() => setProductVariantPrimaryId(p.id)}
                  />
                  <span>
                    <strong>{p.name}</strong>
                    <span
                      style={{
                        display: "block",
                        fontFamily: "monospace",
                        fontSize: 12,
                        color: "var(--text-muted)",
                      }}
                    >
                      {p.externalRef ?? p.id.slice(0, 8)}
                      {p.colorName ? ` · ${p.colorName}` : ""}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn-outline"
                disabled={productVariantGroupBusy}
                onClick={() => setProductVariantGroupOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={productVariantGroupBusy || !productVariantPrimaryId}
                onClick={confirmProductVariantGroup}
              >
                {productVariantGroupBusy ? (
                  <>
                    <span className="admin-inline-spinner" aria-hidden />
                    Agrupando…
                  </>
                ) : (
                  "Agrupar como variantes"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <AdminAiBulkProgressModal
        open={aiBulkModalOpen}
        phase={aiBulkPhase}
        mode={aiBulkMode}
        items={aiBulkItems}
        onStart={() => void runAiBulkComplete()}
        onClose={closeAiBulkModal}
      />

      <div className="admin-toast-container" id="admin-toast-container" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`} role="status">
            <span className="toast-icon" aria-hidden>
              {t.icon}
            </span>
            <span className="toast-msg">{t.msg}</span>
            <button
              type="button"
              className="toast-close"
              aria-label="Cerrar notificación"
              onClick={() => dismissToast(t.id)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminProductListTab({
  sidebarExpanded,
  productSearch,
  setProductSearch,
  filterBrand,
  setFilterBrand,
  filterCategorySlug,
  setFilterCategorySlug,
  filterSubcategory,
  setFilterSubcategory,
  filterTag,
  setFilterTag,
  brandOptions,
  subcategoryOptions,
  tagOptions,
  sortedCategories,
  filteredProducts,
  filteredMatchCount,
  allProducts,
  totalProductCount,
  hiddenProductCount,
  showHiddenProducts,
  onToggleShowHidden,
  listLoading,
  categoryTree,
  selectedIds,
  onToggleSelect,
  onSelectAllVisible,
  featuredHomeSavingId,
  onToggleFeaturedInHome,
  onView,
  onDelete,
  onDeleteVariant,
  onProductsRefresh,
  showToast,
}: {
  sidebarExpanded: boolean;
  productSearch: string;
  setProductSearch: (v: string) => void;
  filterBrand: string;
  setFilterBrand: (v: string) => void;
  filterCategorySlug: string;
  setFilterCategorySlug: (v: string) => void;
  filterSubcategory: string;
  setFilterSubcategory: (v: string) => void;
  filterTag: string;
  setFilterTag: (v: string) => void;
  brandOptions: string[];
  subcategoryOptions: string[];
  tagOptions: string[];
  sortedCategories: AdminCategoryTree[];
  filteredProducts: AdminProduct[];
  filteredMatchCount: number;
  allProducts: AdminProduct[];
  totalProductCount: number;
  hiddenProductCount: number;
  showHiddenProducts: boolean;
  onToggleShowHidden: () => void;
  listLoading: boolean;
  categoryTree: AdminCategoryTree[];
  selectedIds: ReadonlySet<string>;
  onToggleSelect: (id: string) => void;
  onSelectAllVisible: (visibleIds: string[], select: boolean) => void;
  featuredHomeSavingId: string | null;
  onToggleFeaturedInHome: (id: string, value: boolean) => void | Promise<void>;
  onView: (p: AdminProduct) => void;
  onDelete: (id: string) => void | Promise<void>;
  onDeleteVariant: (id: string) => void | Promise<void>;
  onProductsRefresh: () => void | Promise<void>;
  showToast: (msg: string, type?: string, icon?: string) => void;
}) {
  const [variantsModalProduct, setVariantsModalProduct] = useState<AdminProduct | null>(null);
  const [variantDeletingId, setVariantDeletingId] = useState<string | null>(null);
  const [colorModalProduct, setColorModalProduct] = useState<AdminProduct | null>(null);
  const [colorSaving, setColorSaving] = useState(false);

  const variantCountByGroup = useMemo(() => buildVariantCountByGroup(allProducts), [allProducts]);
  const primaryByGroup = useMemo(() => buildPrimaryVariantByGroup(allProducts), [allProducts]);

  useEffect(() => {
    if (!variantsModalProduct?.variantGroupCode?.trim()) return;
    const code = variantsModalProduct.variantGroupCode.trim();
    const inGroup = listVariantsInGroup(allProducts, code);
    if (inGroup.length < 1) {
      setVariantsModalProduct(null);
      return;
    }
    if (!inGroup.some((p) => p.id === variantsModalProduct.id)) {
      setVariantsModalProduct(inGroup[0] ?? null);
    }
  }, [allProducts, variantsModalProduct]);

  const hasActiveFilters =
    !!filterBrand || !!filterCategorySlug || !!filterSubcategory || !!filterTag || !!productSearch.trim();

  const visibleIds = useMemo(() => filteredProducts.map((p) => p.id), [filteredProducts]);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  return (
    <>
      <AdminProductListBoard
        sidebarExpanded={sidebarExpanded}
        toolbar={
          <>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "flex-end",
                gap: 12,
              }}
            >
              <div className="search-bar" style={{ width: 260, minWidth: 200, flex: "1 1 200px" }}>
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input type="text" placeholder="Buscar producto..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
              </div>
              <div className="form-group" style={{ margin: 0, minWidth: 160, flex: "1 1 140px" }}>
                <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>
                  Marca
                </label>
                <select
                  className="form-select"
                  value={filterBrand}
                  onChange={(e) => setFilterBrand(e.target.value)}
                  aria-label="Filtrar por marca"
                >
                  <option value="">Todas</option>
                  {brandOptions.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0, minWidth: 160, flex: "1 1 140px" }}>
                <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>
                  Categoría
                </label>
                <select
                  className="form-select"
                  value={filterCategorySlug}
                  onChange={(e) => setFilterCategorySlug(e.target.value)}
                  aria-label="Filtrar por categoría"
                >
                  <option value="">Todas</option>
                  {sortedCategories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0, minWidth: 160, flex: "1 1 140px" }}>
                <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>
                  Subcategoría
                </label>
                <select
                  className="form-select"
                  value={filterSubcategory}
                  onChange={(e) => setFilterSubcategory(e.target.value)}
                  aria-label="Filtrar por subcategoría"
                  disabled={subcategoryOptions.length === 0}
                >
                  <option value="">Todas</option>
                  {subcategoryOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0, minWidth: 160, flex: "1 1 140px" }}>
                <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>
                  Etiqueta producto
                </label>
                <select
                  className="form-select"
                  value={filterTag}
                  onChange={(e) => setFilterTag(e.target.value)}
                  aria-label="Filtrar por etiqueta"
                  disabled={tagOptions.length === 0}
                >
                  <option value="">Todas</option>
                  {tagOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ height: 38, alignSelf: "flex-end" }}
                  onClick={() => {
                    setProductSearch("");
                    setFilterBrand("");
                    setFilterCategorySlug("");
                    setFilterSubcategory("");
                    setFilterTag("");
                  }}
                >
                  Limpiar filtros
                </button>
              )}
            </div>
            {!listLoading && totalProductCount > 0 && (
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "10px 0 0" }}>
                {showHiddenProducts
                  ? `Mostrando ${filteredProducts.length} producto(s) oculto(s) · no salen en la tienda`
                  : hasActiveFilters
                    ? `Mostrando ${filteredProducts.length} fila(s) · ${filteredMatchCount} de ${totalProductCount} producto(s)`
                    : `${totalProductCount} producto(s) en el sistema · ${filteredProducts.length} fila(s) en la lista`}
              </p>
            )}
            <div style={{ marginTop: 10 }}>
              <button
                type="button"
                className={`btn btn-sm ${showHiddenProducts ? "btn-primary" : "btn-outline"}`}
                onClick={onToggleShowHidden}
              >
                {showHiddenProducts
                  ? "Volver a productos visibles"
                  : `Ver productos ocultos${hiddenProductCount > 0 ? ` (${hiddenProductCount})` : ""}`}
              </button>
            </div>
          </>
        }
      >
        <table className="admin-table admin-table--product-list">
          <thead style={{ padding: "0 16px" }}>
            <tr>
              <th style={{ width: 44, padding: "16px 8px 16px 16px", textAlign: "center" }} title="Seleccionar para eliminación en lote">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  disabled={visibleIds.length === 0}
                  aria-label="Seleccionar o anular todos los productos visibles"
                  onChange={() => onSelectAllVisible(visibleIds, !allVisibleSelected)}
                />
              </th>
              <th style={{ padding: 16 }}>Producto</th>
              <th>Marca</th>
              <th>Categoría</th>
              <th title="Orden en la sección Productos Destacados del home (sin etiqueta pública)">Prioridad home</th>
              <th>Precio</th>
              <th>Stock</th>
              <th style={{ textAlign: "center" }}>Variantes</th>
              <th style={{ textAlign: "center" }}>Color</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {listLoading && filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                  Cargando…
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                  {totalProductCount === 0
                    ? "Sin productos"
                    : showHiddenProducts
                      ? "No hay productos ocultos."
                      : "Ningún producto coincide con la búsqueda o los filtros seleccionados."}
                </td>
              </tr>
            ) : (
              filteredProducts.map((p) => {
                const stockStatus = p.stock === 0 ? "status-out" : p.stock < 5 ? "status-low" : "status-active";
                const stockLabel = p.stock === 0 ? "Sin stock" : p.stock < 5 ? "Stock bajo" : "Disponible";
                const groupKey = canonicalVariantGroupCode(p.variantGroupCode);
                const variantCount = groupKey ? (variantCountByGroup.get(groupKey) ?? 0) : 0;
                const listThumb = groupListThumbnail(p, primaryByGroup);
                const isGroupRow = variantCount >= 2;
                const colorHex = normalizeColorHex(p.colorHex);
                return (
                  <tr key={p.id}>
                    <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(p.id)}
                        aria-label={`Seleccionar ${p.name}`}
                        onChange={() => onToggleSelect(p.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td>
                      <div className="table-product-cell" style={{ cursor: "pointer" }} onClick={() => onView(p)} title="Ver detalle">
                        <AdminProductThumb imageUrl={listThumb} emoji={p.emoji} />
                        <div>
                          <div className="table-product-name">{p.name}</div>
                          <div className="table-product-cat">
                            {isGroupRow ? `Grupo · ${variantCount} variantes` : p.subcategory}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{p.brand || "—"}</td>
                    <td>{categoryDisplayName(p.category, categoryTree)}</td>
                    <td style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={p.featuredInHome === true}
                        disabled={featuredHomeSavingId === p.id}
                        title="Marcar para mostrar primero en Productos Destacados del home (solo orden, sin insignia en la tienda)"
                        aria-label={`Prioridad en home: ${p.name}`}
                        onChange={(e) => {
                          void onToggleFeaturedInHome(p.id, e.target.checked);
                        }}
                      />
                    </td>
                    <td>{formatPrice(p.price)}</td>
                    <td>{p.stock}</td>
                    <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                      {isGroupRow ? (
                        <button
                          type="button"
                          title={`Ver ${variantCount} variantes`}
                          aria-label={`Ver ${variantCount} variantes del grupo`}
                          onClick={() => setVariantsModalProduct(p)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minWidth: 32,
                            height: 32,
                            padding: "0 10px",
                            borderRadius: 999,
                            border: "none",
                            background: "var(--rose)",
                            color: "white",
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: "pointer",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                          }}
                        >
                          {variantCount}
                        </button>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                      {colorHex ? (
                        <button
                          type="button"
                          title={`Color ${colorHex}${p.colorName ? ` · ${p.colorName}` : ""}`}
                          onClick={() => setColorModalProduct(p)}
                          style={{
                            display: "inline-flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 4,
                            border: "none",
                            background: "none",
                            cursor: "pointer",
                            padding: 0,
                          }}
                        >
                          <span
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              backgroundColor: colorHex,
                              border: "2px solid white",
                              boxShadow: "0 0 0 1px var(--line)",
                              display: "block",
                            }}
                          />
                          {p.colorName?.trim() ? (
                            <span style={{ fontSize: 10, color: "var(--text-muted)", maxWidth: 72, lineHeight: 1.2 }}>
                              {p.colorName.trim()}
                            </span>
                          ) : null}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => setColorModalProduct(p)}
                        >
                          Agregar color
                        </button>
                      )}
                    </td>
                    <td>
                      {p.active === false ? (
                        <span className="status-chip status-out">Oculto</span>
                      ) : (
                        <span className={`status-chip ${stockStatus}`}>{stockLabel}</span>
                      )}
                    </td>
                    <td>
                      <div className="action-group">
                        <button type="button" className="btn-table" onClick={() => onView(p)}>👁 Ver</button>
                        <button type="button" className="btn-table danger" onClick={() => onDelete(p.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </AdminProductListBoard>
      <AdminProductVariantsModal
        open={variantsModalProduct != null}
        anchorProduct={variantsModalProduct}
        allProducts={allProducts}
        categoryTree={categoryTree}
        deletingId={variantDeletingId}
        onClose={() => setVariantsModalProduct(null)}
        categoryDisplayName={categoryDisplayName}
        onDeleteVariant={async (id) => {
          if (!confirm("¿Eliminar esta variante del producto?")) return;
          setVariantDeletingId(id);
          try {
            await onDeleteVariant(id);
            showToast("Variante eliminada", "default", "🗑️");
          } catch (e) {
            showToast(e instanceof Error ? e.message : "No se pudo eliminar", "danger", "⚠️");
          } finally {
            setVariantDeletingId(null);
          }
        }}
        onEditVariantColor={(variant) => setColorModalProduct(variant)}
        onMergeVariants={async ({ survivorId, absorbedIds, name }) => {
          try {
            const res = await postAdminProductsMerge({ survivorId, absorbedIds, name });
            await onProductsRefresh();
            showToast(
              `Juntados ${res.mergedCount} en «${res.product.name}» (${res.imageCount} foto(s)).`,
              "success",
              "🔗"
            );
            setVariantsModalProduct(res.product.variantGroupCode ? res.product : null);
          } catch (e) {
            showToast(e instanceof Error ? e.message : "No se pudieron juntar", "danger", "⚠️");
            throw e;
          }
        }}
      />
      <AdminProductColorModal
        open={colorModalProduct != null}
        product={colorModalProduct}
        saving={colorSaving}
        onClose={() => setColorModalProduct(null)}
        onSave={async (payload) => {
          if (!colorModalProduct) return;
          setColorSaving(true);
          try {
            await updateAdminProduct(colorModalProduct.id, payload);
            showToast(
              payload.colorHex ? "Color guardado" : "Color eliminado",
              "success",
              "🎨"
            );
            setColorModalProduct(null);
            await onProductsRefresh();
          } catch (e) {
            showToast(e instanceof Error ? e.message : "No se pudo guardar el color", "danger", "⚠️");
          } finally {
            setColorSaving(false);
          }
        }}
      />
    </>
  );
}

function AdminAddProductForm({
  categories,
  categoriesLoading,
  onSubmit,
  saving,
  showToast,
}: {
  categories: AdminCategoryTree[];
  categoriesLoading: boolean;
  onSubmit: (body: Record<string, unknown>) => Promise<void>;
  saving: boolean;
  showToast: (msg: string, type?: string, icon?: string) => void;
}) {
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("GinnaBeauty");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [stock, setStock] = useState("10");
  const [emoji, setEmoji] = useState("");
  const [description, setDescription] = useState("");
  const [badge, setBadge] = useState<string>("");
  const [mainImageUrl, setMainImageUrl] = useState<string | null>(null);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const subOptions = useMemo(() => {
    if (!category) return [];
    const c = categories.find((x) => x.slug === category);
    return c ? [...c.subcategories].sort((a, b) => a.sortOrder - b.sortOrder) : [];
  }, [category, categories]);

  return (
    <div className="admin-card">
      <div className="admin-card-title">Nuevo Producto</div>
      {categoriesLoading && categories.length === 0 && (
        <p style={{ color: "var(--text-muted)", marginBottom: 12, fontSize: 13 }}>Cargando categorías desde la base de datos…</p>
      )}
      {!categoriesLoading && categories.length === 0 && (
        <p style={{ color: "var(--dusty-rose)", marginBottom: 12, fontSize: 13 }}>
          No hay categorías en la base de datos. Crea al menos una categoría y subcategorías en <strong>Configuración → Categorías</strong>.
        </p>
      )}
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Nombre del producto *</label>
          <input type="text" className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Labial Velvet Rose" />
        </div>
        <div className="form-group">
          <label className="form-label">Marca</label>
          <input type="text" className="form-input" value={brand} onChange={(e) => setBrand(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Categoría *</label>
          <select className="form-select" value={category} onChange={(e) => { setCategory(e.target.value); setSubcategory(""); }}>
            <option value="">Seleccionar...</option>
            {[...categories].sort((a, b) => a.sortOrder - b.sortOrder).map((c) => (
              <option key={c.id} value={c.slug}>
                {c.icon ? `${c.icon} ` : ""}{c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Subcategoría *</label>
          <select className="form-select" value={subcategory} onChange={(e) => setSubcategory(e.target.value)}>
            <option value="">{category ? "Seleccionar..." : "Seleccionar categoría primero"}</option>
            {subOptions.map((s) => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group full-width">
          <label className="form-label">Etiquetas del producto (separadas por coma)</label>
          <input
            type="text"
            className="form-input"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="Ej: Base, Cobertura media, Larga duración"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Precio *</label>
          <input type="number" className="form-input" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
        </div>
        <div className="form-group">
          <label className="form-label">Precio original (tachado)</label>
          <input type="number" className="form-input" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} placeholder="Opcional" />
        </div>
        <div className="form-group">
          <label className="form-label">Stock inicial *</label>
          <input type="number" className="form-input" value={stock} onChange={(e) => setStock(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Emoji representativo</label>
          <input type="text" className="form-input" value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="💄" maxLength={4} />
        </div>
        <div className="form-group full-width">
          <label className="form-label">Imagen principal (Bunny CDN)</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <label className="btn btn-outline btn-sm" style={{ cursor: uploadingMain ? "wait" : "pointer" }}>
              {uploadingMain ? "Subiendo…" : "📤 Elegir imagen"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                style={{ display: "none" }}
                disabled={uploadingMain || saving}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  setUploadingMain(true);
                  void (async () => {
                    try {
                      const url = await uploadAdminProductImage(f);
                      setMainImageUrl(url);
                      showToast("Imagen principal lista", "success", "🖼️");
                    } catch (err) {
                      showToast(err instanceof Error ? err.message : "Error al subir", "danger", "⚠️");
                    } finally {
                      setUploadingMain(false);
                    }
                  })();
                }}
              />
            </label>
            {mainImageUrl && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mainImageUrl} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid var(--line)" }} />
                <button type="button" className="btn btn-sm" style={{ color: "var(--text-muted)" }} onClick={() => setMainImageUrl(null)}>
                  Quitar
                </button>
              </>
            )}
          </div>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>JPEG, PNG, WebP o GIF. Máx. 8 MB. Requiere variables Bunny en el servidor.</p>
        </div>
        <div className="form-group full-width">
          <label className="form-label">Más imágenes (galería)</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <label className="btn btn-outline btn-sm" style={{ cursor: uploadingGallery ? "wait" : "pointer" }}>
              {uploadingGallery ? "Subiendo…" : "➕ Añadir foto"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                style={{ display: "none" }}
                disabled={uploadingGallery || saving || galleryUrls.length >= 24}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  setUploadingGallery(true);
                  void (async () => {
                    try {
                      const url = await uploadAdminProductImage(f);
                      setGalleryUrls((g) => [...g, url]);
                      showToast("Imagen añadida a la galería", "success", "🖼️");
                    } catch (err) {
                      showToast(err instanceof Error ? err.message : "Error al subir", "danger", "⚠️");
                    } finally {
                      setUploadingGallery(false);
                    }
                  })();
                }}
              />
            </label>
            {galleryUrls.map((u) => (
              <span key={u} style={{ position: "relative", display: "inline-block" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6, border: "1px solid var(--line)" }} />
                <button
                  type="button"
                  aria-label="Quitar"
                  onClick={() => setGalleryUrls((g) => g.filter((x) => x !== u))}
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    border: "none",
                    background: "var(--dusty-rose)",
                    color: "#fff",
                    fontSize: 12,
                    cursor: "pointer",
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
        <div className="form-group full-width">
          <label className="form-label">Descripción *</label>
          <textarea className="form-textarea" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Descripción del producto..." />
        </div>
        <div className="form-group full-width">
          <label className="form-label">Badge</label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              ["new", "Nuevo"],
              ["hot", "🔥 Hot"],
              ["sale", "Oferta"],
              ["best", "⭐ Top"],
              ["", "Sin badge"],
            ].map(([v, l]) => (
              <label key={v || "none"} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
                <input type="radio" name="new-badge" value={v} checked={badge === v} onChange={() => setBadge(v)} />
                {l}
              </label>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={saving}
          onClick={() => {
            void (async () => {
              const pr = Number(price);
              if (!name.trim() || !pr || !category || !subcategory.trim()) return;
              if (!description.trim()) return;
              await onSubmit({
                name: name.trim(),
                brand: brand || "GinnaBeauty",
                category,
                subcategory: subcategory.trim(),
                tags: parseTagsInput(tagsText),
                price: pr,
                originalPrice: originalPrice ? Number(originalPrice) : null,
                stock: Number(stock) || 0,
                rating: 5,
                reviews: 0,
                badge: badge || null,
                description: description.trim(),
                emoji: emoji || "💄",
                imageUrl: mainImageUrl,
                extraImageUrls: galleryUrls.length ? galleryUrls : undefined,
                active: true,
                isNew: false,
              });
            })();
          }}
        >
          {saving ? "Guardando…" : "✅ Guardar producto"}
        </button>
      </div>
    </div>
  );
}

/** Selección automática tras analizar (modo nuevos): solo productos nuevos con estado «✓ OK». */
function collectBulkAutoSelectIds(
  preview: BulkPreviewResult,
  existingPolicy: BulkExistingPolicy
): string[] {
  const source = preview.csvHasVariantGroupColumn
    ? preview.rows ?? []
    : (preview.matchedRows?.length ? preview.matchedRows : preview.rows) ?? [];
  const ids: string[] = [];
  for (const r of source) {
    if (r.isExistingProduct) continue;
    if (bulkRowIsAlreadyVariantGrouped(r)) continue;
    if (bulkRowIsReadyForVariantGroupAssign(r, "skip")) continue;
    const hasImageMatch = r.imageMatches.some(
      (m) =>
        m.matchedBy === "exact" ||
        m.matchedBy === "numericPrefix" ||
        m.matchedBy === "sixDigitPrefix" ||
        m.matchedBy === "tintLevel" ||
        m.matchedBy === "fuzzy"
    );
    if (!hasImageMatch) continue;
    const errors = bulkRowBlockingIssues(r, existingPolicy);
    if (errors.length > 0) continue;
    const warnings = r.issues.filter(
      (x) =>
        x === "Sin imagen en ZIP para este código" ||
        x === "Sin imagen en ZIP para este nivel" ||
        x === "Código de barras distinto al registrado en tienda" ||
        x.startsWith("Aviso:")
    );
    const status = describeBulkRowStatus(
      {
        errors,
        warnings,
        hasExisting: false,
        readyForVariantGroup: false,
        alreadyVariantGrouped: false,
        hasImageMatch,
        barcodeRaw: r.mapped.variantGroupCode?.trim() || null,
        nameValue: effectiveProductTitle(r.mapped) ?? r.mapped.name,
        categorySlug: r.mapped.categorySlug,
        subcategoryValue: r.mapped.subcategoryName,
        priceValue: r.mapped.price,
      },
      existingPolicy
    );
    if (status.tone === "ok") ids.push(bulkImportStableRowId(r));
  }
  return Array.from(new Set(ids));
}

/** Selección automática (modo actualizar): existentes con al menos un campo distinto. */
function collectBulkUpdateSelectIds(preview: BulkPreviewResult): string[] {
  const seenCodes = new Set<string>();
  const ids: string[] = [];
  for (const r of preview.rows ?? []) {
    if (!r.isExistingProduct || !bulkRowHasUpdatableDiffs(r)) continue;
    if (bulkRowBlockingIssues(r, "replace").length > 0) continue;
    const code = r.normalizedCode;
    if (code) {
      if (seenCodes.has(code)) continue;
      seenCodes.add(code);
    }
    ids.push(bulkImportStableRowId(r));
  }
  return ids;
}

function AdminBulkTab({
  categories,
  categoriesLoading,
  saving,
  showToast,
  setMutation,
  onImported,
  onCategoriesUpdated,
}: {
  categories: AdminCategoryTree[];
  categoriesLoading: boolean;
  saving: boolean;
  showToast: (msg: string, type?: string, icon?: string) => void;
  setMutation: React.Dispatch<React.SetStateAction<"add" | "bulk" | "edit" | null>>;
  onImported: () => Promise<void>;
  onCategoriesUpdated: () => Promise<void>;
}) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [zipInspect, setZipInspect] = useState<ZipInspectResult | null>(null);
  const [zipInspecting, setZipInspecting] = useState(false);
  const [zipOptimizing, setZipOptimizing] = useState(false);
  const [zipOptimized, setZipOptimized] = useState(false);
  const [zipUploading, setZipUploading] = useState(false);
  const zipFileRef = useRef<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [preview, setPreview] = useState<BulkPreviewResult | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [existingPolicy, setExistingPolicy] = useState<"skip" | "replace" | "omit">("skip");
  /** null = elegir tipo de carga; new = productos nuevos; update = actualizar existentes. */
  const [bulkLoadMode, setBulkLoadMode] = useState<"new" | "update" | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [showBulkTemplateModal, setShowBulkTemplateModal] = useState(false);
  const [showNewCategoriesModal, setShowNewCategoriesModal] = useState(false);
  const [applyingNewCategories, setApplyingNewCategories] = useState(false);
  /** Tras «Continuar sin crear» o cerrar el modal, se permite importar filas válidas aunque el preview siga listando novedades. */
  const [newCategoriesModalAcknowledged, setNewCategoriesModalAcknowledged] = useState(false);
  const [showBulkPriceModal, setShowBulkPriceModal] = useState(false);
  const [bulkPriceModalDismissed, setBulkPriceModalDismissed] = useState(false);
  const [applyingBulkPrice, setApplyingBulkPrice] = useState(false);
  const [bulkPriceAppliedCount, setBulkPriceAppliedCount] = useState(0);
  const [bulkPriceApplyTotal, setBulkPriceApplyTotal] = useState(0);
  const [showTaxonomyHintsModal, setShowTaxonomyHintsModal] = useState(false);
  const [showTintTypeModal, setShowTintTypeModal] = useState(false);
  const [tintModalDismissed, setTintModalDismissed] = useState(false);
  const [tintsExplicitlySkipped, setTintsExplicitlySkipped] = useState(false);
  const [resolvingTintType, setResolvingTintType] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showLowMatchModal, setShowLowMatchModal] = useState(false);
  const [pendingAnalyzeResult, setPendingAnalyzeResult] = useState<BulkPreviewResponse | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [editingBulkRowId, setEditingBulkRowId] = useState<string | null>(null);
  const [showAllImageMatches, setShowAllImageMatches] = useState(false);
  /** Grupos que el admin acaba de agrupar en esta sesión (UI grisácea). */
  const [completedGroupKeys, setCompletedGroupKeys] = useState<string[]>([]);
  /** Navegación de filas con error al intentar importar. */
  const [incidentNavOpen, setIncidentNavOpen] = useState(false);
  const [incidentFocusIndex, setIncidentFocusIndex] = useState(0);
  const [omittedIncidentIds, setOmittedIncidentIds] = useState<string[]>([]);
  /** Tras subir imagen manual: ofrecer optimizar esa fila. */
  const [optimizeImageRowIds, setOptimizeImageRowIds] = useState<string[]>([]);
  const [uploadingImageRowId, setUploadingImageRowId] = useState<string | null>(null);
  const rowImageInputRef = useRef<HTMLInputElement | null>(null);
  const [rowImageTargetId, setRowImageTargetId] = useState<string | null>(null);
  const rowImageFilesRef = useRef<Record<string, File>>({});
  const bulkProgress = useBufferedProgress(93);
  const [bulkProgressLabel, setBulkProgressLabel] = useState("");
  /** false = solo grupos con OK/agrupar (+ hermanas); true = también el resto de casos abajo. */
  const [showAllCases, setShowAllCases] = useState(false);
  const [combineModalOpen, setCombineModalOpen] = useState(false);
  const [combineNameMode, setCombineNameMode] = useState<"pick" | "custom">("pick");
  const [combinePickedRowId, setCombinePickedRowId] = useState("");
  const [combineCustomName, setCombineCustomName] = useState("");
  const [combiningRows, setCombiningRows] = useState(false);
  /** Modo combinar: checkboxes visuales independientes; selectedRowIds de importación se conservan. */
  const [combineModeActive, setCombineModeActive] = useState(false);
  const [combinePickIds, setCombinePickIds] = useState<string[]>([]);
  const [aiCombineSuggestions, setAiCombineSuggestions] = useState<NameCombineSuggestionGroup[]>([]);
  const [aiCombineAnalyzing, setAiCombineAnalyzing] = useState(false);
  const zipImageCacheRef = useRef<BulkZipImageUrlCache | null>(null);
  const [zipImageCache, setZipImageCache] = useState<BulkZipImageUrlCache | null>(null);
  const [bulkSuccessModal, setBulkSuccessModal] = useState<{
    imported: number;
    variantsAssigned: number;
    keepWorking: boolean;
  } | null>(null);

  const sortedCats = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  );

  /** Tras un PATCH del preview, conserva la intersección o re-selecciona filas OK si quedó vacío. */
  useEffect(() => {
    if (!preview || !jobId) {
      setSelectedRowIds([]);
      return;
    }
    const sourceRows =
      bulkLoadMode === "update"
        ? preview.rows ?? []
        : preview.csvHasVariantGroupColumn
          ? preview.rows ?? []
          : (preview.matchedRows?.length ? preview.matchedRows : preview.rows) ?? [];
    const available = new Set(sourceRows.map(bulkImportStableRowId));
    setSelectedRowIds((prev) => {
      const kept = prev.filter((id) => available.has(id));
      if (kept.length > 0) return kept;
      // Nada válido seleccionado (match fresco o IDs obsoletos): marcar todos los OK / con cambios.
      return bulkLoadMode === "update"
        ? collectBulkUpdateSelectIds(preview)
        : collectBulkAutoSelectIds(preview, existingPolicy);
    });
  }, [preview, jobId, existingPolicy, bulkLoadMode]);

  const resetSession = () => {
    setJobId(null);
    setPreview(null);
    setExpiresAt(null);
    setCsvFile(null);
    setZipFile(null);
    setZipInspect(null);
    setZipInspecting(false);
    setZipOptimizing(false);
    setZipOptimized(false);
    setZipUploading(false);
    zipFileRef.current = null;
    setSelectedRowIds([]);
    setExistingPolicy(bulkLoadMode === "update" ? "replace" : "skip");
    setShowNewCategoriesModal(false);
    setApplyingNewCategories(false);
    setNewCategoriesModalAcknowledged(false);
    setShowBulkPriceModal(false);
    setBulkPriceModalDismissed(false);
    setApplyingBulkPrice(false);
    setBulkPriceAppliedCount(0);
    setBulkPriceApplyTotal(0);
    setShowTaxonomyHintsModal(false);
    setShowTintTypeModal(false);
    setTintModalDismissed(false);
    setTintsExplicitlySkipped(false);
    setResolvingTintType(false);
    setIsAnalyzing(false);
    setShowLowMatchModal(false);
    setPendingAnalyzeResult(null);
    setEditingBulkRowId(null);
    setShowAllImageMatches(false);
    setCompletedGroupKeys([]);
    setIncidentNavOpen(false);
    setIncidentFocusIndex(0);
    setOmittedIncidentIds([]);
    setOptimizeImageRowIds([]);
    setUploadingImageRowId(null);
    setRowImageTargetId(null);
    setShowAllCases(false);
    setBulkSuccessModal(null);
    setCombineModeActive(false);
    setCombinePickIds([]);
    setCombineModalOpen(false);
    setAiCombineSuggestions([]);
    setAiCombineAnalyzing(false);
    bulkProgress.reset();
    setFileInputKey((k) => k + 1);
  };

  useEffect(() => {
    zipImageCacheRef.current?.revokeAll();
    zipImageCacheRef.current = null;
    setZipImageCache(null);
    if (!zipFile) return;
    const cache = new BulkZipImageUrlCache(zipFile);
    zipImageCacheRef.current = cache;
    setZipImageCache(cache);
    return () => {
      cache.revokeAll();
      if (zipImageCacheRef.current === cache) zipImageCacheRef.current = null;
    };
  }, [zipFile]);

  useEffect(() => {
    if (!zipFile) {
      setZipInspect(null);
      setZipOptimized(false);
      return;
    }

    let cancelled = false;
    setZipInspecting(true);
    void inspectZipFileClient(zipFile)
      .then((result) => {
        if (!cancelled) setZipInspect(result);
      })
      .catch(() => {
        if (!cancelled) setZipInspect(null);
      })
      .finally(() => {
        if (!cancelled) setZipInspecting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [zipFile]);

  const prepareForNewAnalyze = useCallback(
    (previousJobId: string | null) => {
      bulkProgress.reset();
      setIsAnalyzing(false);
      setResolvingTintType(false);
      setShowTintTypeModal(false);
      setTintModalDismissed(false);
      setShowTaxonomyHintsModal(false);
      setShowNewCategoriesModal(false);
      setNewCategoriesModalAcknowledged(false);
      setShowBulkPriceModal(false);
      setBulkPriceModalDismissed(false);
      setApplyingBulkPrice(false);
      setBulkPriceAppliedCount(0);
      setBulkPriceApplyTotal(0);
      setShowLowMatchModal(false);
      setPendingAnalyzeResult(null);
      setEditingBulkRowId(null);
      setShowAllImageMatches(false);
      setCompletedGroupKeys([]);
      setIncidentNavOpen(false);
      setIncidentFocusIndex(0);
      setOmittedIncidentIds([]);
      setOptimizeImageRowIds([]);
      setUploadingImageRowId(null);
      setRowImageTargetId(null);
      setShowAllCases(false);
      setBulkSuccessModal(null);
      setJobId(null);
      setPreview(null);
      setExpiresAt(null);
      setSelectedRowIds([]);
      if (previousJobId) {
        void deleteBulkImportJob(previousJobId).catch(() => {
          /* sesión anterior ya expirada o eliminada */
        });
      }
    },
    [bulkProgress]
  );

  const applyAnalyzeResult = useCallback(
    (res: BulkPreviewResponse) => {
      setJobId(res.jobId);
      setPreview(res.preview);
      setExpiresAt(res.expiresAt);
      setSelectedRowIds(
        bulkLoadMode === "update"
          ? collectBulkUpdateSelectIds(res.preview)
          : collectBulkAutoSelectIds(res.preview, existingPolicy)
      );
      setCompletedGroupKeys([]);
      setShowAllCases(false);
      setBulkSuccessModal(null);
      setIncidentNavOpen(false);
      setIncidentFocusIndex(0);
      setOmittedIncidentIds([]);
      setOptimizeImageRowIds([]);
      const hintN = res.preview.taxonomyRehomeHints?.length ?? 0;
      const newN = res.preview.newCategories?.length ?? 0;
      if (bulkLoadMode !== "update" && hintN > 0) {
        showToast(
          `Hay ${hintN} sugerencia(s) de reubicación de categoría/subcategoría. Revísalas en el modal.`,
          "default",
          "💡"
        );
      } else if (bulkLoadMode !== "update" && newN > 0) {
        showToast(
          newN > 0
            ? "Hay productos nuevos que necesitan categorías en el sistema. Revisa el modal."
            : "Análisis listo. Puedes agrupar variantes de productos ya registrados.",
          "default",
          newN > 0 ? "🆕" : "📦"
        );
      } else {
        showToast("Vista previa lista. Revisa columnas y filas.", "success", "🔍");
      }
    },
    [showToast, existingPolicy, bulkLoadMode]
  );

  const pendingLowMatchBreakdown = useMemo(
    () =>
      pendingAnalyzeResult ? computeBulkCsvZipMatchBreakdown(pendingAnalyzeResult.preview.stats) : null,
    [pendingAnalyzeResult]
  );

  useEffect(() => {
    setNewCategoriesModalAcknowledged(false);
    setBulkPriceModalDismissed(false);
  }, [jobId]);

  const pendingNewCategories = useMemo((): BulkPreviewNewTaxonomyItem[] => {
    const raw = preview?.newCategories ?? [];
    return raw
      .map((it): BulkPreviewNewTaxonomyItem | null => {
        if (it && typeof it === "object" && "kind" in it) {
          if (it.kind === "newCategory" || it.kind === "newSubcategoriesOnly") return it as BulkPreviewNewTaxonomyItem;
        }
        const legacy = it as { categoryName?: string; subcategories?: string[]; rowCount?: number };
        if (legacy?.categoryName) {
          return {
            kind: "newCategory",
            categoryName: legacy.categoryName,
            subcategories: Array.isArray(legacy.subcategories) ? legacy.subcategories : [],
            rowCount: typeof legacy.rowCount === "number" ? legacy.rowCount : 0,
          };
        }
        return null;
      })
      .filter((x): x is BulkPreviewNewTaxonomyItem => x != null);
  }, [preview]);

  const taxonomyRehomeHints = useMemo((): BulkTaxonomyRehomeHint[] => {
    const raw = preview?.taxonomyRehomeHints;
    return Array.isArray(raw) ? raw : [];
  }, [preview]);

  const needsTintSelection = useMemo(() => {
    if (preview?.hasTintesRows !== true || preview.tintSelectionResolved === true) return false;
    return (preview.rows ?? []).some((row) => bulkPreviewRowIsTintes(row) && !row.isExistingProduct);
  }, [preview]);

  const tintTypeOptions = useMemo(() => preview?.csvTintTypeOptions ?? [], [preview]);

  useEffect(() => {
    if (!preview) {
      setShowTintTypeModal(false);
      return;
    }
    if (needsTintSelection && !tintModalDismissed) {
      setShowTintTypeModal(true);
    }
  }, [preview, needsTintSelection, tintModalDismissed]);

  useEffect(() => {
    if (!preview) {
      setShowNewCategoriesModal(false);
      setShowTaxonomyHintsModal(false);
      setShowBulkPriceModal(false);
      return;
    }
    // Esperar a que el modal de Tintes esté resuelto (configurado u omitido) antes de
    // mostrar otros modales, para evitar que queden ocultos detrás del modal de Tintes.
    const tintModalActive = needsTintSelection && !tintModalDismissed && !tintsExplicitlySkipped;
    if (tintModalActive) return;
    if (applyingBulkPrice) return;

    const hints = preview.taxonomyRehomeHints?.length ?? 0;
    if (hints > 0) {
      setShowTaxonomyHintsModal(true);
      setShowNewCategoriesModal(false);
      setShowBulkPriceModal(false);
      return;
    }
    setShowTaxonomyHintsModal(false);

    const hasNewCategories = (preview.newCategories?.length ?? 0) > 0;
    if (hasNewCategories && !newCategoriesModalAcknowledged) {
      setShowNewCategoriesModal(true);
      setShowBulkPriceModal(false);
      return;
    }
    setShowNewCategoriesModal(false);

    const invalidPriceCount = (preview.rows ?? []).filter((r) =>
      r.issues.includes("Precio inválido o vacío")
    ).length;
    if (!bulkPriceModalDismissed && invalidPriceCount > BULK_INVALID_PRICE_BATCH_THRESHOLD) {
      setShowBulkPriceModal(true);
    } else {
      setShowBulkPriceModal(false);
    }
  }, [
    preview,
    needsTintSelection,
    tintModalDismissed,
    tintsExplicitlySkipped,
    newCategoriesModalAcknowledged,
    bulkPriceModalDismissed,
    applyingBulkPrice,
  ]);

  const invalidPriceRows = useMemo(() => {
    if (!preview) return [];
    return (preview.rows ?? []).filter((r) => r.issues.includes("Precio inválido o vacío"));
  }, [preview]);

  const toggleRow = useCallback(
    (previewRowId: string) => {
      if (combineModeActive) {
        setCombinePickIds((prev) => {
          if (prev.includes(previewRowId)) return prev.filter((id) => id !== previewRowId);
          return [...prev, previewRowId];
        });
        return;
      }
      setSelectedRowIds((prev) => {
        if (prev.includes(previewRowId)) return prev.filter((id) => id !== previewRowId);
        return [...prev, previewRowId];
      });
    },
    [combineModeActive]
  );

  const selectAllValid = () => {
    if (!preview) return;
    const sourceRows = preview.csvHasVariantGroupColumn ? preview.rows : preview.matchedRows;
    const next = new Set<string>();
    for (const r of sourceRows) {
      const blocking = bulkRowBlockingIssues(r, existingPolicy);
      if (blocking.length === 0 && r.normalizedCode) next.add(bulkImportStableRowId(r));
    }
    const ids = Array.from(next);
    if (combineModeActive) setCombinePickIds(ids);
    else setSelectedRowIds(ids);
  };

  const selectAllForVariantGroups = () => {
    if (!preview?.csvHasVariantGroupColumn) return;
    const next = (preview.rows ?? [])
      .filter((r) => bulkRowIsReadyForVariantGroupAssign(r, "skip"))
      .map(bulkImportStableRowId);
    if (combineModeActive) setCombinePickIds(next);
    else setSelectedRowIds(next);
  };

  const clearSelection = () => {
    if (combineModeActive) setCombinePickIds([]);
    else setSelectedRowIds([]);
  };

  /** Quita de la selección todas las filas de categoría Tintes. */
  const skipTintRows = useCallback(() => {
    if (!preview) return;
    const tintIds = new Set(
      (preview.rows ?? [])
        .filter((r) => bulkPreviewRowIsTintes(r))
        .map(bulkImportStableRowId)
    );
    setSelectedRowIds((prev) => prev.filter((id) => !tintIds.has(id)));
  }, [preview]);

  const selectedTintRowCount = useMemo(() => {
    if (!preview) return 0;
    const tintIds = new Set(
      (preview.rows ?? []).filter((r) => bulkPreviewRowIsTintes(r)).map(bulkImportStableRowId)
    );
    return selectedRowIds.filter((id) => tintIds.has(id)).length;
  }, [preview, selectedRowIds]);

  const selectedRowIdSet = useMemo(() => new Set(selectedRowIds), [selectedRowIds]);

  const previewTableRows = useMemo(() => {
    const sourceRows =
      bulkLoadMode === "update"
        ? preview?.rows ?? []
        : preview?.csvHasVariantGroupColumn
          ? preview.rows ?? []
          : preview?.matchedRows ?? [];
    const rowsByGroup = new Map<string, typeof sourceRows>();
    for (const r of sourceRows) {
      const gk = r.mapped.variantGroupCode?.trim()
        ? canonicalVariantGroupCode(r.mapped.variantGroupCode)
        : null;
      if (!gk) continue;
      const list = rowsByGroup.get(gk) ?? [];
      list.push(r);
      rowsByGroup.set(gk, list);
    }
    return sourceRows.map((r) => {
        const previewRowId = bulkImportStableRowId(r);
        const variantGroupAssign = bulkRowIsVariantGroupAssign(r, existingPolicy);
        const blockingErrors = bulkRowBlockingIssues(r, existingPolicy);
        const hasExisting = r.isExistingProduct;
        const hasImageMatch = r.imageMatches.some(
          (m) =>
            m.matchedBy === "exact" ||
            m.matchedBy === "numericPrefix" ||
            m.matchedBy === "sixDigitPrefix" ||
            m.matchedBy === "tintLevel" ||
            m.matchedBy === "fuzzy"
        );
        const categoryLabel = r.mapped.categorySlug
          ? categoryDisplayName(r.mapped.categorySlug, categories)
          : null;
        const barcodeRaw = r.mapped.variantGroupCode?.trim() || null;
        const barcodeGroupKey = barcodeRaw ? canonicalVariantGroupCode(barcodeRaw) : null;
        let variantHint: string | null = null;
        if (barcodeGroupKey && barcodeRaw) {
          const dbVars = preview?.dbVariantsByGroup?.[barcodeGroupKey] ?? [];
          const groupRows = rowsByGroup.get(barcodeGroupKey) ?? [];
          const existingSibling = groupRows.find(
            (x) => x.isExistingProduct && bulkImportStableRowId(x) !== previewRowId
          );
          const anchorName =
            dbVars[0]?.name ??
            existingSibling?.existingProductName ??
            existingSibling?.mapped.name ??
            null;
          if (anchorName) {
            variantHint = `Este producto es una variante de «${anchorName}» con código de barras ${barcodeRaw}`;
          } else {
            const newSiblings = groupRows.filter((x) => !x.isExistingProduct);
            if (newSiblings.length > 1) {
              variantHint = `Pertenece al grupo de variantes con barras ${barcodeRaw} (${newSiblings.length} productos nuevos)`;
            } else {
              variantHint = `Código de barras ${barcodeRaw}`;
            }
          }
        }
        const fieldDiffs: BulkFieldDiff[] = hasExisting
          ? computeBulkRowFieldDiffs(r, (slug) => categoryDisplayName(slug, categories))
          : [];
        return {
          previewRowId,
          csvRowIndex: r.rowIndex,
          codeValue: r.codeRaw,
          barcodeRaw,
          barcodeGroupKey,
          variantGroupOrder: r.variantGroupOrder,
          categoryCsv: r.mapped.category,
          subcategoryCsv: r.mapped.subcategory,
          categorySlug: r.mapped.categorySlug,
          categoryLabel,
          subcategoryValue: r.mapped.subcategoryName,
          priceValue: r.mapped.price,
          stockValue: r.mapped.stock,
          nameValue: effectiveProductTitle(r.mapped) ?? r.mapped.name,
          descriptionValue: r.mapped.description,
          tintFamilyValue: effectiveTintFamily(r.mapped),
          tintTypeValue: r.mapped.tintType,
          tintFamilyId: r.tintFamilyId,
          tintTypeId: r.tintTypeId,
          tintLevelValue: r.mapped.tintLevel,
          tintGroupValue: r.mapped.tintGroup,
          isTintesRow: bulkPreviewRowIsTintes(r),
          tagsValue: r.mapped.tags ?? [],
          matchedImages: r.imageMatches,
          hasImageMatch,
          matchStatus: "valid" as const,
          selected: selectedRowIdSet.has(previewRowId),
          errors: blockingErrors,
          warnings: r.issues.filter(
            (x) =>
              x === "Sin imagen en ZIP para este código" ||
              x === "Sin imagen en ZIP para este nivel" ||
              x === "Código de barras distinto al registrado en tienda" ||
              x.startsWith("Aviso:")
          ),
          hasExisting,
          variantGroupAssign,
          readyForVariantGroup: bulkRowIsReadyForVariantGroupAssign(r, existingPolicy),
          alreadyVariantGrouped: bulkRowIsAlreadyVariantGrouped(r),
          existingProductName: r.existingProductName,
          existingVariantGroupCode: r.existingVariantGroupCode,
          variantHint,
          fieldDiffs,
        };
      });
  }, [preview, selectedRowIdSet, categories, existingPolicy, bulkLoadMode]);

  const updateDiffRows = useMemo(
    () => previewTableRows.filter((r) => r.hasExisting && r.fieldDiffs.length > 0),
    [previewTableRows]
  );

  const selectedUpdateRowIds = useMemo(() => {
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const r of updateDiffRows) {
      if (!r.selected) continue;
      const code = (r.codeValue ?? "").trim().toLowerCase();
      if (code) {
        if (seen.has(code)) continue;
        seen.add(code);
      }
      ids.push(r.previewRowId);
    }
    return ids;
  }, [updateDiffRows]);
  const selectedVariantGroupRowIds = useMemo(() => {
    if (!preview) return [];
    const source = preview.csvHasVariantGroupColumn ? preview.rows ?? [] : preview.matchedRows ?? [];
    return source
      .filter(
        (r) =>
          selectedRowIdSet.has(bulkImportStableRowId(r)) &&
          bulkRowIsReadyForVariantGroupAssign(r, "skip")
      )
      .map(bulkImportStableRowId);
  }, [preview, selectedRowIdSet]);

  /** Solo productos nuevos con estado «✓ OK» (importables). */
  const selectedOkNewProductRowIds = useMemo(() => {
    const variantSet = new Set(selectedVariantGroupRowIds);
    return previewTableRows
      .filter((r) => {
        if (!r.selected || variantSet.has(r.previewRowId) || r.alreadyVariantGrouped) return false;
        const status = describeBulkRowStatus(
          {
            errors: r.errors,
            warnings: r.warnings,
            hasExisting: r.hasExisting,
            readyForVariantGroup: r.readyForVariantGroup,
            alreadyVariantGrouped: r.alreadyVariantGrouped,
            hasImageMatch: r.hasImageMatch,
            barcodeRaw: r.barcodeRaw,
            nameValue: r.nameValue,
            categorySlug: r.categorySlug,
            subcategoryValue: r.subcategoryValue,
            priceValue: r.priceValue,
          },
          existingPolicy
        );
        return status.tone === "ok";
      })
      .map((r) => r.previewRowId);
  }, [previewTableRows, selectedVariantGroupRowIds, existingPolicy]);

  const selectedNewProductRowIds = selectedOkNewProductRowIds;

  /** Filas ✓ OK nuevas disponibles para combinar (sin depender del checkbox de importación). */
  const combinableOkRows = useMemo(() => {
    return previewTableRows.filter((r) => {
      if (r.readyForVariantGroup || r.alreadyVariantGrouped || r.hasExisting) return false;
      const status = describeBulkRowStatus(
        {
          errors: r.errors,
          warnings: r.warnings,
          hasExisting: r.hasExisting,
          readyForVariantGroup: r.readyForVariantGroup,
          alreadyVariantGrouped: r.alreadyVariantGrouped,
          hasImageMatch: r.hasImageMatch,
          barcodeRaw: r.barcodeRaw,
          nameValue: r.nameValue,
          categorySlug: r.categorySlug,
          subcategoryValue: r.subcategoryValue,
          priceValue: r.priceValue,
        },
        existingPolicy
      );
      return status.tone === "ok";
    });
  }, [previewTableRows, existingPolicy]);

  const combinePickIdSet = useMemo(() => new Set(combinePickIds), [combinePickIds]);

  const selectedOkRowsForCombine = useMemo(() => {
    return combinableOkRows.filter((r) => combinePickIdSet.has(r.previewRowId));
  }, [combinableOkRows, combinePickIdSet]);

  const enterCombineMode = useCallback(() => {
    if (combinableOkRows.length < 2) {
      showToast("Necesitas al menos 2 productos ✓ OK en la lista para combinar.", "default", "ℹ️");
      return;
    }
    setCombinePickIds([]);
    setAiCombineSuggestions([]);
    setCombineModeActive(true);
    showToast("Marca los productos a unir y pulsa COMBINAR.", "default", "🔗");
  }, [combinableOkRows.length, showToast]);

  const exitCombineMode = useCallback(() => {
    setCombineModeActive(false);
    setCombinePickIds([]);
    setCombineModalOpen(false);
    setAiCombineSuggestions([]);
  }, []);

  const runAiCombineAnalysis = useCallback(async () => {
    if (aiCombineAnalyzing) return;
    const candidates = combinableOkRows
      .map((r) => ({
        id: r.previewRowId,
        name: (r.nameValue ?? r.codeValue ?? "").trim(),
      }))
      .filter((c) => c.name.length >= 4);
    if (candidates.length < 2) {
      showToast("No hay suficientes nombres para analizar.", "default", "ℹ️");
      return;
    }
    setAiCombineAnalyzing(true);
    try {
      const groups = suggestNameCombineGroups(candidates);
      setAiCombineSuggestions(groups);
      const allIds = groups.flatMap((g) => g.members.map((m) => m.id));
      setCombinePickIds(Array.from(new Set(allIds)));
      void postAdminAiSpendRecord({
        kind: "COMBINE_SUGGEST",
        note: `${groups.length} grupo(s) sugerido(s)`,
      }).catch(() => {});
      if (groups.length === 0) {
        showToast("No encontré nombres casi idénticos para combinar.", "default", "ℹ️");
      } else {
        showToast(
          `Encontré ${groups.length} grupo(s) con nombres muy similares. Revisa y acepta o descarta.`,
          "success",
          "🤖"
        );
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudo analizar", "danger", "⚠️");
    } finally {
      setAiCombineAnalyzing(false);
    }
  }, [aiCombineAnalyzing, combinableOkRows, showToast]);

  const dismissAiCombineGroup = useCallback((groupId: string) => {
    setAiCombineSuggestions((prev) => {
      const group = prev.find((g) => g.id === groupId);
      if (group) {
        const drop = new Set(group.members.map((m) => m.id));
        setCombinePickIds((ids) => ids.filter((id) => !drop.has(id)));
      }
      return prev.filter((g) => g.id !== groupId);
    });
  }, []);

  const acceptAiCombineGroup = useCallback(
    (group: NameCombineSuggestionGroup) => {
      if (!preview) return;
      const memberIds = group.members.map((m) => m.id);
      const stillChecked = memberIds.filter((id) => combinePickIdSet.has(id));
      if (stillChecked.length < 2) {
        showToast("Marca al menos 2 productos de este grupo para combinar.", "default", "ℹ️");
        return;
      }
      const rawRows = stillChecked
        .map((id) => preview.rows.find((x) => bulkImportStableRowId(x) === id))
        .filter((r): r is NonNullable<typeof r> => !!r);
      const check = validateBulkRowCombine(rawRows);
      if (!check.ok) {
        showToast(check.reason, "danger", "⚠️");
        return;
      }
      setCombinePickIds(stillChecked);
      setCombinePickedRowId(stillChecked[0]!);
      setCombineCustomName("");
      setCombineNameMode("pick");
      setCombineModalOpen(true);
      setAiCombineSuggestions((prev) => prev.filter((g) => g.id !== group.id));
    },
    [preview, combinePickIdSet, showToast]
  );

  const openCombineModal = useCallback(() => {
    if (!preview) return;
    const rawRows = selectedOkRowsForCombine
      .map((r) => preview.rows.find((x) => bulkImportStableRowId(x) === r.previewRowId))
      .filter((r): r is NonNullable<typeof r> => !!r);
    const check = validateBulkRowCombine(rawRows);
    if (!check.ok) {
      showToast(check.reason, "danger", "⚠️");
      return;
    }
    setCombinePickedRowId(selectedOkRowsForCombine[0]?.previewRowId ?? "");
    setCombineCustomName("");
    setCombineNameMode("pick");
    setCombineModalOpen(true);
  }, [preview, selectedOkRowsForCombine, showToast]);

  const confirmCombineRows = useCallback(() => {
    if (!jobId || !preview) return;
    const picked = selectedOkRowsForCombine.find((r) => r.previewRowId === combinePickedRowId);
    const name =
      combineNameMode === "custom"
        ? combineCustomName.trim()
        : (picked?.nameValue?.trim() || picked?.codeValue || "").trim();
    if (!name) {
      showToast("Elige o escribe un nombre para el producto combinado.", "default", "ℹ️");
      return;
    }
    const ids = selectedOkRowsForCombine.map((r) => r.previewRowId);
    if (ids.length < 2) return;
    const survivorPreviewRowId =
      combineNameMode === "pick" && combinePickedRowId ? combinePickedRowId : ids[0]!;
    const absorbedPreviewRowIds = ids.filter((id) => id !== survivorPreviewRowId);
    if (absorbedPreviewRowIds.length === 0) return;
    void (async () => {
      setCombiningRows(true);
      setMutation("bulk");
      try {
        const { preview: p } = await patchBulkImportJob(jobId, {
          combineRows: { survivorPreviewRowId, absorbedPreviewRowIds, name },
          selectedRowIds: [survivorPreviewRowId],
          rowFieldOverrides: { [survivorPreviewRowId]: { name } },
        });
        setPreview(p);
        const absorbedSet = new Set(absorbedPreviewRowIds);
        setSelectedRowIds((prev) => {
          const next = prev.filter((id) => !absorbedSet.has(id));
          if (!next.includes(survivorPreviewRowId)) next.push(survivorPreviewRowId);
          return next;
        });
        setCombinePickIds([]);
        setCombineModalOpen(false);
        showToast(
          `Combinados ${ids.length} códigos en «${name}» con todas sus fotos.`,
          "success",
          "🔗"
        );
      } catch (e) {
        showToast(e instanceof Error ? e.message : "No se pudo combinar", "danger", "⚠️");
      } finally {
        setCombiningRows(false);
        setMutation(null);
      }
    })();
  }, [
    jobId,
    preview,
    combineNameMode,
    combineCustomName,
    combinePickedRowId,
    selectedOkRowsForCombine,
    showToast,
    setMutation,
  ]);

  const completedGroupKeySet = useMemo(() => new Set(completedGroupKeys), [completedGroupKeys]);

  const isPrimaryMatchRow = useCallback(
    (r: {
      alreadyVariantGrouped: boolean;
      readyForVariantGroup: boolean;
      hasExisting: boolean;
      hasImageMatch: boolean;
      errors: string[];
      warnings: string[];
      barcodeRaw: string | null;
      nameValue: string | null;
      categorySlug: string | null;
      subcategoryValue: string | null;
      priceValue: number | null;
    }) => {
      if (r.alreadyVariantGrouped) return false;
      if (r.hasExisting || r.readyForVariantGroup) return false;
      if (!r.hasImageMatch || r.errors.length > 0) return false;
      const tone = describeBulkRowStatus(
        {
          errors: r.errors,
          warnings: r.warnings,
          hasExisting: r.hasExisting,
          readyForVariantGroup: r.readyForVariantGroup,
          alreadyVariantGrouped: r.alreadyVariantGrouped,
          hasImageMatch: r.hasImageMatch,
          barcodeRaw: r.barcodeRaw,
          nameValue: r.nameValue,
          categorySlug: r.categorySlug,
          subcategoryValue: r.subcategoryValue,
          priceValue: r.priceValue,
        },
        existingPolicy
      ).tone;
      return tone === "ok";
    },
    [existingPolicy]
  );

  const previewRowsByBarcodeGroup = useMemo(() => {
    if (!preview?.csvHasVariantGroupColumn) return null;
    const byKey = new Map<string, typeof previewTableRows>();
    const ungrouped: typeof previewTableRows = [];
    for (const row of previewTableRows) {
      const key = row.barcodeGroupKey;
      if (!key) {
        ungrouped.push(row);
        continue;
      }
      const list = byKey.get(key) ?? [];
      list.push(row);
      byKey.set(key, list);
    }
    const allGroups = (preview.variantGroups ?? [])
      .map((g) => ({
        meta: g,
        rows: (byKey.get(g.groupKey) ?? []).sort(
          (a, b) => (a.variantGroupOrder ?? 9999) - (b.variantGroupOrder ?? 9999) || a.csvRowIndex - b.csvRowIndex
        ),
        dbOnly: (preview.dbVariantsByGroup?.[g.groupKey] ?? []).filter(
          (p) => p.externalRef && !byKey.get(g.groupKey)?.some((r) => r.codeValue === p.externalRef)
        ),
        dbVariants: (preview.dbVariantsByGroup?.[g.groupKey] ?? []) as BulkPreviewDbVariant[],
      }))
      .filter((g) => g.rows.length > 0 || g.dbOnly.length > 0);

    /** Vista principal vs resto de casos (grupos solo con incidencias). */
    const enriched = allGroups.map((g) => {
      const actionableRows = g.rows.filter((r) => !r.alreadyVariantGrouped);
      const primaryRows = actionableRows.filter((r) => isPrimaryMatchRow(r));
      const secondaryRows = actionableRows.filter((r) => !isPrimaryMatchRow(r));
      const isLocallyCompleted = completedGroupKeySet.has(g.meta.groupKey);
      return {
        ...g,
        actionableRows,
        primaryRows,
        secondaryRows,
        isLocallyCompleted,
        joinsExistingGroup: g.dbVariants.length > 0,
      };
    });

    const primaryGroups = enriched
      .filter((g) => g.isLocallyCompleted || g.primaryRows.length > 0)
      .map((g) => ({
        ...g,
        // Solo filas OK nuevas; el resto del grupo se resume en el aviso de variante.
        displayRows: g.isLocallyCompleted ? g.rows : g.primaryRows,
      }));

    const secondaryGroups = enriched
      .filter((g) => !g.isLocallyCompleted && g.primaryRows.length === 0 && g.actionableRows.length > 0)
      .map((g) => ({
        ...g,
        displayRows: g.actionableRows,
      }));

    const actionUngrouped = ungrouped.filter((r) => {
      if (r.alreadyVariantGrouped) return false;
      if (r.hasExisting && !r.readyForVariantGroup) return false;
      return true;
    });
    const primaryUngrouped = actionUngrouped.filter((r) => isPrimaryMatchRow(r));
    const secondaryUngrouped = actionUngrouped.filter((r) => !isPrimaryMatchRow(r));

    return {
      groups: primaryGroups,
      ungrouped: primaryUngrouped,
      secondaryGroups,
      secondaryUngrouped,
      actionUngrouped,
      secondaryCaseCount:
        secondaryGroups.reduce((n, g) => n + g.displayRows.length, 0) + secondaryUngrouped.length,
      allGroups: enriched,
      allUngrouped: ungrouped,
    };
  }, [preview, previewTableRows, completedGroupKeySet, isPrimaryMatchRow]);

  /** Filas sin barras (o sin columna): solo acción pendiente en la tabla principal. */
  const allPendingPreviewRows = useMemo(() => {
    if (preview?.csvHasVariantGroupColumn) return previewTableRows;
    return previewTableRows.filter((r) => {
      if (r.alreadyVariantGrouped) return false;
      if (r.hasExisting && !r.readyForVariantGroup) return false;
      return true;
    });
  }, [preview, previewTableRows]);

  const actionPreviewTableRows = useMemo(() => {
    return allPendingPreviewRows.filter((r) => isPrimaryMatchRow(r));
  }, [allPendingPreviewRows, isPrimaryMatchRow]);

  const secondaryFlatRows = useMemo(() => {
    return allPendingPreviewRows.filter((r) => !isPrimaryMatchRow(r));
  }, [allPendingPreviewRows, isPrimaryMatchRow]);

  const secondaryMatchCount = useMemo(() => {
    if (!preview) return 0;
    if (preview.csvHasVariantGroupColumn && previewRowsByBarcodeGroup) {
      return previewRowsByBarcodeGroup.secondaryCaseCount ?? 0;
    }
    return secondaryFlatRows.length;
  }, [preview, previewRowsByBarcodeGroup, secondaryFlatRows]);

  const hiddenMatchCount = useMemo(() => {
    if (!preview) return 0;
    if (preview.csvHasVariantGroupColumn && previewRowsByBarcodeGroup) {
      const shown = new Set(
        previewRowsByBarcodeGroup.groups.flatMap((g) => g.displayRows.map((r) => r.previewRowId))
      );
      for (const r of previewRowsByBarcodeGroup.ungrouped) shown.add(r.previewRowId);
      return previewTableRows.filter((r) => !shown.has(r.previewRowId)).length;
    }
    return previewTableRows.length - actionPreviewTableRows.length;
  }, [preview, previewTableRows, previewRowsByBarcodeGroup, actionPreviewTableRows]);

  const hasTintesInBatch = useMemo(
    () => previewTableRows.some((r) => r.isTintesRow),
    [previewTableRows]
  );

  type BulkPreviewTableRow = (typeof previewTableRows)[number];

  const omittedIncidentIdSet = useMemo(() => new Set(omittedIncidentIds), [omittedIncidentIds]);

  const incidentRows = useMemo(() => {
    const source = previewRowsByBarcodeGroup
      ? [
          ...previewRowsByBarcodeGroup.groups.flatMap((g) => g.actionableRows),
          ...(previewRowsByBarcodeGroup.actionUngrouped ?? []),
        ]
      : allPendingPreviewRows;
    return source.filter((r) => {
      if (omittedIncidentIdSet.has(r.previewRowId)) return false;
      if (r.alreadyVariantGrouped) return false;
      if (r.readyForVariantGroup) return false;
      const tone = describeBulkRowStatus(
        {
          errors: r.errors,
          warnings: r.warnings,
          hasExisting: r.hasExisting,
          readyForVariantGroup: r.readyForVariantGroup,
          alreadyVariantGrouped: r.alreadyVariantGrouped,
          hasImageMatch: r.hasImageMatch,
          barcodeRaw: r.barcodeRaw,
          nameValue: r.nameValue,
          categorySlug: r.categorySlug,
          subcategoryValue: r.subcategoryValue,
          priceValue: r.priceValue,
        },
        existingPolicy
      ).tone;
      if (tone === "ok") return false;
      if (r.errors.length > 0) return true;
      if (!r.hasExisting && !r.hasImageMatch) return true;
      if (tone === "warn" || tone === "error") return true;
      return false;
    });
  }, [previewRowsByBarcodeGroup, allPendingPreviewRows, omittedIncidentIdSet, existingPolicy]);

  const incidentFocusRow = incidentRows[incidentFocusIndex] ?? incidentRows[0] ?? null;

  const scrollToBulkRow = useCallback((rowId: string) => {
    const el = document.getElementById(`bulk-row-${rowId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const openIncidentNav = useCallback(
    (startId?: string) => {
      const list = incidentRows;
      if (list.length === 0) {
        showToast("No hay filas con error para revisar.", "default", "ℹ️");
        return;
      }
      setShowAllCases(true);
      const idx = startId ? Math.max(0, list.findIndex((r) => r.previewRowId === startId)) : 0;
      const safeIdx = idx >= 0 ? idx : 0;
      setIncidentFocusIndex(safeIdx);
      setIncidentNavOpen(true);
      window.setTimeout(() => {
        const id = list[safeIdx]?.previewRowId;
        if (id) scrollToBulkRow(id);
      }, 80);
      showToast(
        `Hay ${list.length} incidencia(s) que impiden importar. Revísalas o omítelas.`,
        "default",
        "⚠️"
      );
    },
    [incidentRows, scrollToBulkRow, showToast]
  );

  useEffect(() => {
    if (!incidentNavOpen) return;
    if (incidentRows.length === 0) {
      setIncidentNavOpen(false);
      setIncidentFocusIndex(0);
      return;
    }
    if (incidentFocusIndex >= incidentRows.length) {
      setIncidentFocusIndex(incidentRows.length - 1);
      return;
    }
    const id = incidentRows[incidentFocusIndex]?.previewRowId;
    if (id) scrollToBulkRow(id);
  }, [incidentNavOpen, incidentFocusIndex, incidentRows, scrollToBulkRow]);

  const omitIncidentRow = useCallback((rowId: string) => {
    setOmittedIncidentIds((prev) => (prev.includes(rowId) ? prev : [...prev, rowId]));
    setSelectedRowIds((prev) => prev.filter((id) => id !== rowId));
  }, []);

  const omitAllIncidents = useCallback(() => {
    const ids = incidentRows.map((r) => r.previewRowId);
    if (ids.length === 0) return;
    setOmittedIncidentIds((prev) => Array.from(new Set([...prev, ...ids])));
    setSelectedRowIds((prev) => prev.filter((id) => !ids.includes(id)));
    setIncidentNavOpen(false);
    setIncidentFocusIndex(0);
    showToast(`Se omitieron ${ids.length} incidencia(s).`, "default", "⏭️");
  }, [incidentRows, showToast]);

  const matchSummary = useMemo(() => {
    if (!preview) return null;
    const s = preview.stats;
    const toneOf = (r: (typeof previewTableRows)[number]) =>
      describeBulkRowStatus(
        {
          errors: r.errors,
          warnings: r.warnings,
          hasExisting: r.hasExisting,
          readyForVariantGroup: r.readyForVariantGroup,
          alreadyVariantGrouped: r.alreadyVariantGrouped,
          hasImageMatch: r.hasImageMatch,
          barcodeRaw: r.barcodeRaw,
          nameValue: r.nameValue,
          categorySlug: r.categorySlug,
          subcategoryValue: r.subcategoryValue,
          priceValue: r.priceValue,
        },
        existingPolicy
      ).tone;
    const okCount = previewTableRows.filter((r) => toneOf(r) === "ok").length;
    const readyGroup = previewTableRows.filter((r) => r.readyForVariantGroup).length;
    const errorCount = previewTableRows.filter((r) => r.errors.length > 0).length;
    const alreadyGrouped = previewTableRows.filter((r) => r.alreadyVariantGrouped).length;
    const phrases: string[] = [];
    phrases.push(
      `Encontramos ${s.totalRows} fila(s) en el CSV y ${s.zipImageFiles} imagen(es) en el ZIP.`
    );
    phrases.push(
      `${s.matchedRows} fila(s) tienen foto emparejada` +
        (s.unmatchedRows > 0 ? ` y ${s.unmatchedRows} aún sin match de imagen` : "") +
        "."
    );
    if ((s.existingProductRows ?? 0) > 0) {
      phrases.push(
        `${s.existingProductRows} producto(s) ya están en la tienda` +
          (alreadyGrouped > 0 ? ` (${alreadyGrouped} ya agrupados como variantes)` : "") +
          "."
      );
    }
    if (preview.csvHasVariantGroupColumn && (s.variantGroupCount ?? 0) > 0) {
      phrases.push(`Hay ${s.variantGroupCount} grupo(s) de variantes por código de barras.`);
    }
    if (okCount > 0) phrases.push(`${okCount} producto(s) nuevos listos para importar (✓ OK).`);
    if (readyGroup > 0) phrases.push(`${readyGroup} producto(s) listos para agrupar como variantes.`);
    if (errorCount > 0) phrases.push(`${errorCount} fila(s) tienen errores que hay que corregir u omitir.`);
    if (invalidPriceRows.length > BULK_INVALID_PRICE_BATCH_THRESHOLD) {
      phrases.push(`${invalidPriceRows.length} filas tienen precio inválido o vacío.`);
    }

    const tips: string[] = [];
    if (readyGroup > 0) tips.push("Usa «Agrupar» en cada grupo o el botón de abajo para unir variantes ya registradas.");
    if (okCount > 0) tips.push("Importa los productos nuevos con estado ✓ OK, o súbelos uno a uno con ⬆️.");
    if (errorCount > 0) tips.push("Corrige las filas en rojo con «Editar», o omítelas si no las vas a subir ahora.");
    if (invalidPriceRows.length > BULK_INVALID_PRICE_BATCH_THRESHOLD) {
      tips.push("Puedes asignar un mismo precio a todas las filas sin precio con el botón «Precio en lote».");
    }
    if (hiddenMatchCount > 0) {
      tips.push("Las coincidencias ya agrupadas no requieren acción; el foco está en lo que puedes importar o agrupar.");
    }
    if (tips.length === 0) tips.push("Revisa la tabla y usa los botones de abajo cuando todo esté listo.");

    return { phrases, tips: tips.slice(0, 3) };
  }, [preview, previewTableRows, invalidPriceRows.length, hiddenMatchCount, existingPolicy]);

  const editingBulkRow = useMemo(
    () => previewTableRows.find((r) => r.previewRowId === editingBulkRowId) ?? null,
    [previewTableRows, editingBulkRowId]
  );

  const saveBulkRowEdits = useCallback(
    async (payload: {
      name: string;
      description: string;
      price: number | null;
      stock: number | null;
      categorySlug: string;
      subcategoryName: string;
    }) => {
      if (!jobId || !editingBulkRowId) return;
      setMutation("bulk");
      try {
        const { preview: p } = await patchBulkImportJob(jobId, {
          rowTaxonomyOverrides: {
            [editingBulkRowId]: {
              categorySlug: payload.categorySlug,
              subcategoryName: payload.subcategoryName,
            },
          },
          rowFieldOverrides: {
            [editingBulkRowId]: {
              name: payload.name,
              description: payload.description,
              price: payload.price,
              stock: payload.stock,
            },
          },
          selectedRowIds,
        });
        setPreview(p);
        setEditingBulkRowId(null);
        showToast("Producto actualizado en el preview", "success", "✅");
      } catch (err) {
        showToast(err instanceof Error ? err.message : "No se pudo guardar el producto", "danger", "⚠️");
      } finally {
        setMutation(null);
      }
    },
    [jobId, editingBulkRowId, selectedRowIds, setMutation, showToast]
  );

  const bulkPreviewTableColSpan =
    (hasTintesInBatch ? 17 : 14) + (preview?.csvHasVariantGroupColumn ? 1 : 0);

  const rowStatusOf = (r: BulkPreviewTableRow) =>
    describeBulkRowStatus(
      {
        errors: r.errors,
        warnings: r.warnings,
        hasExisting: r.hasExisting,
        readyForVariantGroup: r.readyForVariantGroup,
        alreadyVariantGrouped: r.alreadyVariantGrouped,
        hasImageMatch: r.hasImageMatch,
        barcodeRaw: r.barcodeRaw,
        nameValue: r.nameValue,
        categorySlug: r.categorySlug,
        subcategoryValue: r.subcategoryValue,
        priceValue: r.priceValue,
      },
      existingPolicy
    );

  const applyPartialCommitResult = useCallback(
    (res: Awaited<ReturnType<typeof postBulkImportCommit>>, consumedIds: string[]) => {
      if (res.preview) {
        setPreview(res.preview);
        if (res.expiresAt) setExpiresAt(res.expiresAt);
      }
      setSelectedRowIds((prev) => prev.filter((id) => !consumedIds.includes(id)));
    },
    []
  );

  const openBulkSuccessModal = useCallback(
    (res: {
      imported?: number;
      variantGroupsAssigned?: number;
    }, keepWorking: boolean) => {
      const imported = res.imported ?? 0;
      const variantsAssigned = res.variantGroupsAssigned ?? 0;
      if (imported <= 0 && variantsAssigned <= 0) return false;
      setBulkSuccessModal({ imported, variantsAssigned, keepWorking });
      setIncidentNavOpen(false);
      return true;
    },
    []
  );

  const cancelBulkSession = useCallback(() => {
    const id = jobId;
    resetSession();
    if (id) {
      void deleteBulkImportJob(id).catch(() => {
        /* ignore */
      });
    }
    showToast("Carga masiva cancelada. Puedes subir un nuevo CSV y ZIP.", "default", "🗑️");
  }, [jobId, showToast]);

  const exitBulkSessionQuiet = useCallback(() => {
    const id = jobId;
    resetSession();
    if (id) {
      void deleteBulkImportJob(id).catch(() => {
        /* ignore */
      });
    }
  }, [jobId]);

  const commitGroupAsVariants = useCallback(
    async (groupKey: string, rowIds: string[]) => {
      if (!jobId || rowIds.length === 0) return;
      setMutation("bulk");
      setBulkProgressLabel("Agrupando variantes de este grupo…");
      bulkProgress.start("import");
      try {
        const res = await postBulkImportCommit(jobId, [...rowIds].sort(), "skip", { keepJob: true });
        bulkProgress.finish();
        applyPartialCommitResult(res, rowIds);
        setCompletedGroupKeys((prev) => (prev.includes(groupKey) ? prev : [...prev, groupKey]));
        const grouped = res.variantGroupsAssigned ?? 0;
        if (res.failed > 0) {
          showToast(`${res.failed} error(es) al agrupar.`, "danger", "⚠️");
        }
        await onImported();
        if (!openBulkSuccessModal(res, true) && grouped > 0) {
          showToast(`${grouped} producto(s) agrupados como variantes.`, "success", "📦");
        } else if (grouped === 0) {
          showToast("No se aplicó el grupo. Revisa las filas.", "default", "ℹ️");
        }
      } catch (e) {
        bulkProgress.reset();
        showToast(e instanceof Error ? e.message : "Error al agrupar", "danger", "⚠️");
      } finally {
        setMutation(null);
      }
    },
    [jobId, bulkProgress, applyPartialCommitResult, openBulkSuccessModal, showToast, onImported, setMutation]
  );

  const commitSingleNewProduct = useCallback(
    async (rowId: string) => {
      if (!jobId) return;
      setMutation("bulk");
      setBulkProgressLabel("Subiendo producto nuevo…");
      bulkProgress.start("import");
      try {
        const res = await postBulkImportCommit(jobId, [rowId], existingPolicy, { keepJob: true });
        bulkProgress.finish();
        applyPartialCommitResult(res, [rowId]);
        if (res.failed > 0) {
          showToast(`${res.failed} error(es).`, "danger", "⚠️");
        }
        await onImported();
        if (!openBulkSuccessModal(res, true)) {
          showToast("Sin cambios en este producto.", "default", "ℹ️");
        }
      } catch (e) {
        bulkProgress.reset();
        showToast(e instanceof Error ? e.message : "Error al subir producto", "danger", "⚠️");
      } finally {
        setMutation(null);
      }
    },
    [jobId, existingPolicy, bulkProgress, applyPartialCommitResult, openBulkSuccessModal, showToast, onImported, setMutation]
  );

  const commitSingleAsVariant = useCallback(
    async (rowId: string, groupKey: string | null) => {
      if (!jobId) return;
      setMutation("bulk");
      setBulkProgressLabel("Agrupando producto como variante…");
      bulkProgress.start("import");
      try {
        const res = await postBulkImportCommit(jobId, [rowId], "skip", { keepJob: true });
        bulkProgress.finish();
        applyPartialCommitResult(res, [rowId]);
        if (groupKey) {
          setCompletedGroupKeys((prev) => (prev.includes(groupKey) ? prev : [...prev, groupKey]));
        }
        await onImported();
        if (!openBulkSuccessModal(res, true)) {
          showToast("No se pudo agrupar este producto.", "default", "ℹ️");
        }
      } catch (e) {
        bulkProgress.reset();
        showToast(e instanceof Error ? e.message : "Error al agrupar", "danger", "⚠️");
      } finally {
        setMutation(null);
      }
    },
    [jobId, bulkProgress, applyPartialCommitResult, openBulkSuccessModal, showToast, onImported, setMutation]
  );

  const uploadRowImage = useCallback(
    async (rowId: string, file: File, opts?: { fromOptimize?: boolean }) => {
      if (!jobId) return;
      setUploadingImageRowId(rowId);
      setMutation("bulk");
      try {
        const { preview: p } = await postBulkImportRowImage(jobId, rowId, file);
        setPreview(p);
        setOptimizeImageRowIds((prev) =>
          opts?.fromOptimize
            ? prev.filter((id) => id !== rowId)
            : prev.includes(rowId)
              ? prev
              : [...prev, rowId]
        );
        showToast(
          opts?.fromOptimize
            ? "Imagen optimizada y vinculada a la fila."
            : "Imagen subida. Puedes optimizarla si quieres.",
          "success",
          "🖼️"
        );
      } catch (e) {
        showToast(e instanceof Error ? e.message : "No se pudo subir la imagen", "danger", "⚠️");
      } finally {
        setUploadingImageRowId(null);
        setMutation(null);
      }
    },
    [jobId, setMutation, showToast]
  );

  const onPickRowImage = useCallback(
    async (file: File | null) => {
      const rowId = rowImageTargetId;
      setRowImageTargetId(null);
      if (!file || !rowId) return;
      rowImageFilesRef.current[rowId] = file;
      await uploadRowImage(rowId, file);
    },
    [rowImageTargetId, uploadRowImage]
  );

  const optimizeUploadedRowImage = useCallback(
    async (rowId: string) => {
      const original = rowImageFilesRef.current[rowId];
      if (!original) {
        showToast("Vuelve a subir la imagen para poder optimizarla.", "default", "ℹ️");
        setRowImageTargetId(rowId);
        rowImageInputRef.current?.click();
        return;
      }
      setUploadingImageRowId(rowId);
      try {
        const optimized = await optimizeImageFileClient(original);
        rowImageFilesRef.current[rowId] = optimized;
        await uploadRowImage(rowId, optimized, { fromOptimize: true });
        void postAdminAiSpendRecord({
          kind: "IMAGE_OPTIMIZE",
          note: `Fila ${rowId}`,
        }).catch(() => {});
      } catch (e) {
        setUploadingImageRowId(null);
        showToast(e instanceof Error ? e.message : "No se pudo optimizar", "danger", "⚠️");
      }
    },
    [uploadRowImage, showToast]
  );

  const renderBulkPreviewDataRow = (r: BulkPreviewTableRow, groupColor?: VariantGroupColor) => {
    const status = rowStatusOf(r);
    const hasErrors = r.errors.length > 0;
    const canUploadNew = status.tone === "ok" && !r.hasExisting;
    const needsManualImage =
      !r.hasImageMatch &&
      !r.hasExisting &&
      !r.readyForVariantGroup &&
      !r.alreadyVariantGrouped;
    const canOptimizeUploaded = optimizeImageRowIds.includes(r.previewRowId);
    const canOmitRow =
      !omittedIncidentIdSet.has(r.previewRowId) &&
      !r.readyForVariantGroup &&
      !r.alreadyVariantGrouped &&
      (hasErrors || status.tone !== "ok");
    const isIncident =
      incidentNavOpen &&
      !omittedIncidentIdSet.has(r.previewRowId) &&
      incidentRows.some((i) => i.previewRowId === r.previewRowId);
    const isIncidentFocus = isIncident && incidentFocusRow?.previewRowId === r.previewRowId;
    const statusColor =
      status.tone === "ok"
        ? "green"
        : status.tone === "group"
          ? "#2e7d5a"
          : status.tone === "error"
            ? "var(--danger, #b00020)"
            : status.tone === "existing"
              ? "#6b7280"
              : "#b45309";
    const rowClass = [
      isIncidentFocus ? "admin-bulk-row--incident-focus" : "",
      isIncident && !isIncidentFocus ? "admin-bulk-row--incident" : "",
    ]
      .filter(Boolean)
      .join(" ");
    return (
      <tr
        id={`bulk-row-${r.previewRowId}`}
        key={r.previewRowId}
        className={rowClass || undefined}
        style={{
          opacity: hasErrors && !isIncident ? 0.85 : 1,
          background:
            isIncident
              ? undefined
              : hasErrors
                ? "rgba(255, 84, 84, 0.12)"
                : groupColor
                  ? groupColor.rowBg
                  : undefined,
        }}
        onClick={(e) => {
          const el = e.target as HTMLElement;
          if (el.closest("input, button, a, label, select, textarea")) return;
          toggleRow(r.previewRowId);
        }}
      >
        <td className="admin-bulk-check-cell">
          <input
            type="checkbox"
            checked={combineModeActive ? combinePickIdSet.has(r.previewRowId) : r.selected}
            onChange={() => toggleRow(r.previewRowId)}
            onClick={(e) => e.stopPropagation()}
            aria-label={
              combineModeActive
                ? `Elegir para combinar fila ${r.csvRowIndex + 1}`
                : `Seleccionar fila ${r.csvRowIndex + 1}`
            }
          />
        </td>
        {preview?.csvHasVariantGroupColumn && (
          <td style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>
            {r.variantGroupOrder != null ? r.variantGroupOrder + 1 : "—"}
          </td>
        )}
        <td style={{ fontSize: 12, fontFamily: "monospace" }}>{r.codeValue ?? "—"}</td>
        <td>{r.nameValue ?? "—"}
          {r.variantHint ? <span className="admin-bulk-variant-hint">{r.variantHint}</span> : null}
        </td>
        <td style={{ fontSize: 12, maxWidth: 200 }} title={r.descriptionValue ?? undefined}>
          {r.descriptionValue?.trim() ? r.descriptionValue : "—"}
        </td>
        {hasTintesInBatch && (
          <>
            <td style={{ fontSize: 12 }}>{r.isTintesRow ? (r.tintFamilyValue ?? "—") : "—"}</td>
            <td style={{ fontSize: 12, fontFamily: "monospace" }}>
              {r.isTintesRow ? (r.tintLevelValue ?? "—") : "—"}
            </td>
            <td style={{ fontSize: 12 }}>{r.isTintesRow ? (r.tintGroupValue ?? "—") : "—"}</td>
          </>
        )}
        <td style={{ fontSize: 12 }}>{r.categoryCsv ?? "—"}</td>
        <td style={{ fontSize: 12 }}>{r.subcategoryCsv ?? "—"}</td>
        <td>{r.categorySlug ? categoryDisplayName(r.categorySlug, categories) : "—"}</td>
        <td>{r.subcategoryValue ?? "—"}</td>
        <td>{r.priceValue != null ? formatPrice(r.priceValue) : "—"}</td>
        <td>{r.stockValue ?? "—"}</td>
        <td style={{ fontSize: 11, maxWidth: 160, color: "var(--text-muted)" }} title={(r.tagsValue ?? []).join(", ")}>
          {(r.tagsValue ?? []).length ? (r.tagsValue ?? []).join(", ") : "—"}
        </td>
        <td style={{ fontSize: 12 }}>
          <AdminBulkMatchedImages images={r.matchedImages} cache={zipImageCache} />
        </td>
        <td style={{ fontSize: 12 }}>
          <span
            style={{ color: statusColor, cursor: "help", borderBottom: "1px dotted currentColor" }}
            title={status.hint}
          >
            {status.label}
          </span>
        </td>
        <td style={{ minWidth: 168 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={saving || sortedCats.length === 0}
              onClick={(e) => {
                e.stopPropagation();
                setEditingBulkRowId(r.previewRowId);
              }}
            >
              Editar
            </button>
            {canOmitRow ? (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={saving}
                title="Omitir esta incidencia (no se importará)"
                onClick={(e) => {
                  e.stopPropagation();
                  omitIncidentRow(r.previewRowId);
                }}
              >
                Omitir
              </button>
            ) : null}
            {needsManualImage ? (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={saving || uploadingImageRowId === r.previewRowId}
                title="Subir una imagen para este código"
                onClick={(e) => {
                  e.stopPropagation();
                  setRowImageTargetId(r.previewRowId);
                  window.setTimeout(() => rowImageInputRef.current?.click(), 0);
                }}
              >
                {uploadingImageRowId === r.previewRowId ? "…" : "Subir imagen"}
              </button>
            ) : null}
            {canOptimizeUploaded ? (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={saving || uploadingImageRowId === r.previewRowId}
                title="Optimizar la imagen subida a WebP"
                onClick={(e) => {
                  e.stopPropagation();
                  void optimizeUploadedRowImage(r.previewRowId);
                }}
              >
                Optimizar
              </button>
            ) : null}
            {r.readyForVariantGroup ? (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={saving || taxonomyRehomeHints.length > 0}
                title="Agrupar este producto como variante"
                aria-label="Agrupar"
                onClick={(e) => {
                  e.stopPropagation();
                  void commitSingleAsVariant(r.previewRowId, r.barcodeGroupKey);
                }}
                style={{
                  width: 36,
                  height: 32,
                  padding: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                }}
              >
                📦
              </button>
            ) : null}
            {canUploadNew ? (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={
                  saving ||
                  (needsTintSelection && !tintsExplicitlySkipped) ||
                  (pendingNewCategories.length > 0 && !newCategoriesModalAcknowledged) ||
                  taxonomyRehomeHints.length > 0
                }
                title="Subir este producto nuevo"
                aria-label="Subir nuevo producto"
                onClick={(e) => {
                  e.stopPropagation();
                  void commitSingleNewProduct(r.previewRowId);
                }}
                style={{
                  width: 36,
                  height: 32,
                  padding: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                }}
              >
                ⬆️
              </button>
            ) : null}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="admin-bulk-tab">
      <div className="admin-card">
      <BulkImportProgressOverlay open={bulkProgress.active} percent={bulkProgress.percent} label={bulkProgressLabel} />
      <input
        ref={rowImageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          e.target.value = "";
          void onPickRowImage(file);
        }}
      />
      <div className="admin-card-title" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span>📦 Carga masiva</span>
        {bulkLoadMode === "new" ? (
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Productos nuevos</span>
        ) : bulkLoadMode === "update" ? (
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Actualizar existentes</span>
        ) : null}
        {bulkLoadMode ? (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={saving || isAnalyzing}
            onClick={() => {
              resetSession();
              setBulkLoadMode(null);
            }}
          >
            ← Cambiar tipo
          </button>
        ) : null}
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => setShowBulkTemplateModal(true)}
          style={{ marginLeft: "auto" }}
        >
          📋 Ver plantilla
        </button>
      </div>

      {!bulkLoadMode ? (
        <BulkModePicker
          onPick={(mode) => {
            setBulkLoadMode(mode);
            setExistingPolicy(mode === "update" ? "replace" : "skip");
          }}
        />
      ) : (
        <>
      <div
        style={{
          background: "linear-gradient(135deg, var(--lavender-light) 0%, #fff5f8 100%)",
          border: "1px solid var(--dusty-rose)",
          borderRadius: "var(--radius-md)",
          padding: "14px 16px",
          marginBottom: 18,
          fontSize: 13,
          color: "var(--text)",
          lineHeight: 1.5,
        }}
      >
        {bulkLoadMode === "update" ? (
          <>
            <strong>Actualizar existentes:</strong> CSV con códigos ya en tienda (ZIP opcional). Tras el
            match solo verás campos que cambian: valor anterior en rojo y nuevo en verde.
          </>
        ) : (
          <>
            <strong>Productos nuevos:</strong> CSV + ZIP. Solo se listan filas <strong>✓ OK</strong>{" "}
            (checkbox marcado). Si es variante, un aviso breve — sin filas hermanas ni productos ya
            registrados.
          </>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div
          className="form-group"
          style={{
            margin: 0,
            padding: 14,
            background: "#fff",
            borderRadius: "var(--radius-md)",
            border: "2px dashed var(--dusty-rose)",
          }}
        >
          <label className="form-label">1. Archivo CSV</label>
          <input
            key={`csv-${fileInputKey}`}
            type="file"
            accept=".csv,text/csv"
            className="form-input"
            disabled={saving || isAnalyzing}
            onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
          />
          {csvFile && (
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>✓ {csvFile.name}</div>
          )}
        </div>
        <div
          className="form-group"
          style={{
            margin: 0,
            padding: 14,
            background: "#fff",
            borderRadius: "var(--radius-md)",
            border: "2px dashed var(--dusty-rose)",
          }}
        >
          <label className="form-label">
            2. Archivo ZIP (imágenes){bulkLoadMode === "update" ? " — opcional" : ""}
          </label>
          <input
            key={`zip-${fileInputKey}`}
            type="file"
            accept=".zip,application/zip"
            className="form-input"
            disabled={saving || isAnalyzing || zipOptimizing}
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              zipFileRef.current = f;
              setZipFile(f);
              setZipOptimized(false);
            }}
          />
          {zipFile && (
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>✓ {zipFile.name}</div>
          )}
          {zipFile && (
            <div
              className="admin-bulk-zip-stats"
              style={{
                marginTop: 10,
                padding: 10,
                borderRadius: "var(--radius-md)",
                background: "var(--ivory)",
                border: "1px solid var(--cream)",
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              {zipInspecting ? (
                <span>Analizando imágenes del ZIP…</span>
              ) : zipInspect ? (
                <>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", marginBottom: 8 }}>
                    <span>
                      <strong>ZIP:</strong> {formatZipBytes(zipInspect.zipBytes)}
                    </span>
                    <span>
                      <strong>Imágenes:</strong> {zipInspect.imageCount}
                    </span>
                    <span>
                      <strong>Peso imágenes:</strong> {formatZipBytes(zipInspect.totalImageBytes)}
                    </span>
                    {zipInspect.largest ? (
                      <span>
                        <strong>Mayor:</strong> {zipInspect.largest.fileName} ({formatZipBytes(zipInspect.largest.bytes)})
                      </span>
                    ) : null}
                  </div>
                  {zipOptimized ? (
                    <div style={{ color: "var(--sage-dark, #4a6b4a)", marginBottom: 8 }}>
                      ✓ ZIP optimizado a WebP. Puedes analizar el CSV con este archivo.
                    </div>
                  ) : (
                    <p style={{ margin: "0 0 8px", color: "var(--text-muted)" }}>
                      Convierte las fotos a WebP en tu navegador (máx. 1200px) para subir más rápido. No hace falta
                      el servidor y evita errores 502 con ZIPs grandes.
                    </p>
                  )}
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={zipOptimizing || zipInspecting || saving || isAnalyzing || zipInspect.imageCount === 0}
                    onClick={() => {
                      if (!zipFile || zipOptimizing) return;
                      void (async () => {
                        setZipOptimizing(true);
                        setMutation("bulk");
                        setBulkProgressLabel("Optimizando imágenes a WebP en tu navegador…");
                        bulkProgress.start("optimize");
                        try {
                          // En el navegador: evita 502 del endpoint serverless con ZIPs grandes.
                          const result = await optimizeZipFileClient(zipFile, (done, total) => {
                            if (total > 0) {
                              setBulkProgressLabel(`Optimizando WebP… ${done}/${total}`);
                            }
                          });
                          bulkProgress.finish();
                          zipFileRef.current = result.file;
                          setZipFile(result.file);
                          setZipOptimized(true);
                          void postAdminAiSpendRecord({
                            kind: "IMAGE_OPTIMIZE",
                            note: `${result.stats.imageCount ?? "?"} imagen(es) cliente`,
                          }).catch(() => {});
                          showToast(
                            `Optimizado: ${formatZipBytes(result.stats.beforeBytes)} → ${formatZipBytes(result.stats.afterBytes)} (−${result.stats.savedPercent}%)`,
                            "success",
                            "✨",
                          );
                        } catch (e) {
                          bulkProgress.reset();
                          // Fallback al servidor solo si el cliente falla (p. ej. WebP no soportado).
                          try {
                            setBulkProgressLabel("Reintentando optimización en el servidor…");
                            bulkProgress.start("optimize");
                            const serverResult = await postBulkZipOptimize(zipFile);
                            bulkProgress.finish();
                            zipFileRef.current = serverResult.file;
                            setZipFile(serverResult.file);
                            setZipOptimized(true);
                            showToast(
                              `Optimizado: ${formatZipBytes(serverResult.beforeBytes)} → ${formatZipBytes(serverResult.afterBytes)} (−${serverResult.savedPercent}%)`,
                              "success",
                              "✨",
                            );
                          } catch (serverErr) {
                            bulkProgress.reset();
                            const msg =
                              serverErr instanceof Error
                                ? serverErr.message
                                : e instanceof Error
                                  ? e.message
                                  : "Error al optimizar ZIP";
                            showToast(
                              msg.includes("502") || msg.includes("servidor")
                                ? "No se pudo optimizar el ZIP. Puedes continuar con Analizar sin optimizar."
                                : msg,
                              "danger",
                              "⚠️",
                            );
                          }
                        } finally {
                          setZipOptimizing(false);
                          setMutation(null);
                        }
                      })();
                    }}
                  >
                    {zipOptimizing ? (
                      <>
                        <span className="admin-inline-spinner" aria-hidden />
                        Optimizando…
                      </>
                    ) : (
                      "✨ Optimizar imágenes (WebP)"
                    )}
                  </button>
                </>
              ) : (
                <span>No se detectaron imágenes en el ZIP.</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
        <button
          type="button"
          className="btn btn-rose"
          disabled={
            isAnalyzing ||
            saving ||
            zipInspecting ||
            !csvFile ||
            (bulkLoadMode === "new" && !zipFile) ||
            (bulkLoadMode === "new" && !!zipFile && !zipInspect) ||
            sortedCats.length === 0
          }
          onClick={() => {
            void (async () => {
              if (!csvFile || isAnalyzing) return;
              if (bulkLoadMode === "new" && !zipFile) return;
              const previousJobId = jobId;
              prepareForNewAnalyze(previousJobId);
              setIsAnalyzing(true);
              setMutation("bulk");
              setBulkProgressLabel(
                bulkLoadMode === "update"
                  ? "Analizando CSV y comparando con tienda…"
                  : "Analizando CSV y ZIP en el servidor…"
              );
              bulkProgress.start("analyze");
              try {
                let inspect = zipInspect;
                if (zipFile && !inspect && !zipInspecting) {
                  try {
                    inspect = await inspectZipFileClient(zipFile);
                    setZipInspect(inspect);
                  } catch {
                    inspect = null;
                  }
                }
                const fd = new FormData();
                fd.append("csv", csvFile);
                fd.append("mode", bulkLoadMode === "update" ? "update" : "new");
                if (inspect?.images?.length) {
                  fd.append(
                    "zipManifest",
                    JSON.stringify(
                      inspect.images.map((img) => ({
                        entryName: img.path || img.fileName,
                        fileName: img.fileName,
                      })),
                    ),
                  );
                } else if (bulkLoadMode === "new" && zipFile) {
                  // Fallback: ZIP pequeño inline si el inspect falló.
                  if (zipFile.size <= 8 * 1024 * 1024) fd.append("zip", zipFile);
                }
                const res = await postBulkImportPreview(fd);
                bulkProgress.finish();
                zipFileRef.current = zipFile;
                if (zipFile && bulkLoadMode === "new" && res.zipStored !== true) {
                  const toUpload = zipFile;
                  void (async () => {
                    setZipUploading(true);
                    try {
                      let file = toUpload;
                      if (!zipOptimized && file.size > 12 * 1024 * 1024) {
                        try {
                          const optimized = await optimizeZipFileClient(file);
                          file = optimized.file;
                          zipFileRef.current = file;
                          setZipFile(file);
                          setZipOptimized(true);
                        } catch {
                          /* subir original */
                        }
                      }
                      await postBulkImportZip(res.jobId, file);
                    } catch (uploadErr) {
                      console.warn("[bulk] ZIP en segundo plano falló", uploadErr);
                      showToast(
                        uploadErr instanceof Error
                          ? uploadErr.message
                          : "El análisis listo, pero el ZIP no se subió. Optimízalo e importa de nuevo.",
                        "danger",
                        "⚠️",
                      );
                    } finally {
                      setZipUploading(false);
                    }
                  })();
                }
                // Tintes: el match por «Nivel» solo se activa tras elegir tipo+familia.
                // Un match bajo en el primer analyze es esperado; no bloquear con el modal.
                if (
                  bulkLoadMode !== "update" &&
                  res.preview.hasTintesRows === true &&
                  isBulkCsvZipMatchRateTooLow(res.preview.stats)
                ) {
                  applyAnalyzeResult(res);
                  showToast(
                    "Análisis listo. Elige tipo y familia de Tintes para emparejar las imágenes por nivel.",
                    "default",
                    "🎨"
                  );
                } else if (
                  bulkLoadMode !== "update" &&
                  isBulkCsvZipMatchRateTooLow(res.preview.stats)
                ) {
                  setPendingAnalyzeResult(res);
                  setShowLowMatchModal(true);
                  showToast(
                    "Casi no hubo coincidencias entre el CSV y el ZIP. Confirma que subiste los archivos correctos.",
                    "default",
                    "⚠️"
                  );
                } else {
                  applyAnalyzeResult(res);
                }
              } catch (e) {
                bulkProgress.reset();
                showToast(e instanceof Error ? e.message : "Error al analizar", "danger", "⚠️");
              } finally {
                setIsAnalyzing(false);
                setMutation(null);
              }
            })();
          }}
        >
          {isAnalyzing ? (
            <>
              <span className="admin-inline-spinner" aria-hidden />
              Analizando…
            </>
          ) : bulkLoadMode === "update" ? (
            "🔍 Analizar CSV"
          ) : (
            "🔍 Analizar CSV y ZIP"
          )}
        </button>
        {zipUploading ? (
          <span style={{ fontSize: 12, color: "var(--text-muted)", alignSelf: "center" }}>
            Subiendo imágenes al servidor…
          </span>
        ) : null}
        {jobId && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={saving}
            onClick={() => {
              void (async () => {
                try {
                  await deleteBulkImportJob(jobId);
                } catch {
                  /* ignore */
                }
                resetSession();
                showToast("Sesión de importación cerrada", "default", "🗑️");
              })();
            }}
          >
            Cerrar sesión
          </button>
        )}
      </div>

      {preview && jobId && (
        <>
          {expiresAt && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: -8, marginBottom: 16 }}>
              Esta sesión expira el {new Date(expiresAt).toLocaleString("es-CO")}.
            </p>
          )}

          <div className="admin-bulk-summary-strip">
            {bulkLoadMode === "update" ? (
              <>
                <span>
                  <strong>{updateDiffRows.length}</strong> con cambios
                </span>
                <span>
                  <strong>{preview.stats.existingProductRows ?? 0}</strong> ya en tienda
                </span>
                <span>
                  <strong>{selectedUpdateRowIds.length}</strong> seleccionados
                </span>
              </>
            ) : (
              <>
                <span>
                  <strong>{selectedOkNewProductRowIds.length}</strong> OK listos
                </span>
                <span>
                  <strong>{preview.stats.matchedRows}</strong> con foto
                </span>
                <span>
                  <strong>{preview.stats.existingProductRows ?? 0}</strong> ya registrados (ocultos)
                </span>
                {secondaryMatchCount > 0 ? (
                  <span style={{ color: "#b45309" }}>
                    <strong>{secondaryMatchCount}</strong> con incidencia
                  </span>
                ) : null}
              </>
            )}
          </div>

          {bulkLoadMode === "update" ? (
            <>
              <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.45 }}>
                Rojo = valor en tienda · Verde = valor del CSV. Desmarca lo que no quieras aplicar.
              </p>
              <div className="admin-bulk-scroll" style={{ marginBottom: 14 }}>
                <table className="admin-table admin-bulk-matched-table" style={{ minWidth: 640, margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 44 }} className="admin-bulk-check-cell">
                        Sel.
                      </th>
                      <th>Código</th>
                      <th>Producto</th>
                      <th>Cambios</th>
                    </tr>
                  </thead>
                  <tbody>
                    {updateDiffRows.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", padding: 20, color: "var(--text-muted)" }}>
                          No hay diferencias entre el CSV y los productos de la tienda.
                        </td>
                      </tr>
                    ) : (
                      updateDiffRows.map((r) => (
                        <tr
                          key={r.previewRowId}
                          onClick={(e) => {
                            const el = e.target as HTMLElement;
                            if (el.closest("input, button, a, label")) return;
                            toggleRow(r.previewRowId);
                          }}
                        >
                          <td className="admin-bulk-check-cell">
                            <input
                              type="checkbox"
                              checked={r.selected}
                              onChange={() => toggleRow(r.previewRowId)}
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`Seleccionar actualización ${r.codeValue ?? ""}`}
                            />
                          </td>
                          <td style={{ fontFamily: "monospace", fontSize: 12 }}>{r.codeValue ?? "—"}</td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{r.existingProductName ?? r.nameValue ?? "—"}</div>
                          </td>
                          <td>
                            <BulkDiffCell diffs={r.fieldDiffs} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="admin-bulk-actions-bar" role="toolbar" aria-label="Aplicar actualizaciones">
                <div className="admin-bulk-actions-bar__meta">
                  <strong>{selectedUpdateRowIds.length}</strong> actualización(es)
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={saving || selectedUpdateRowIds.length === 0}
                  onClick={() => {
                    void (async () => {
                      setMutation("bulk");
                      setBulkProgressLabel("Aplicando actualizaciones…");
                      bulkProgress.start("import");
                      try {
                        const res = await postBulkImportCommit(
                          jobId,
                          [...selectedUpdateRowIds].sort(),
                          "replace",
                          { keepJob: true }
                        );
                        bulkProgress.finish();
                        applyPartialCommitResult(res, selectedUpdateRowIds);
                        if (res.failed > 0) {
                          showToast(`${res.failed} error(es) al actualizar.`, "danger", "⚠️");
                        }
                        await onImported();
                        if (!openBulkSuccessModal(res, true)) {
                          showToast(
                            res.imported > 0
                              ? `Se actualizaron ${res.imported} producto(s).`
                              : "No se aplicaron cambios.",
                            res.imported > 0 ? "success" : "default",
                            res.imported > 0 ? "✨" : "ℹ️"
                          );
                        }
                      } catch (e) {
                        bulkProgress.reset();
                        showToast(e instanceof Error ? e.message : "Error al actualizar", "danger", "⚠️");
                      } finally {
                        setMutation(null);
                      }
                    })();
                  }}
                >
                  {saving ? (
                    <>
                      <span className="admin-inline-spinner" aria-hidden />
                      Actualizando…
                    </>
                  ) : selectedUpdateRowIds.length === 0 ? (
                    "Aplicar actualizaciones"
                  ) : (
                    `Aplicar ${selectedUpdateRowIds.length} actualización(es)`
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={saving}
                  onClick={() => {
                    void (async () => {
                      if (jobId) {
                        try {
                          await deleteBulkImportJob(jobId);
                        } catch {
                          /* ignore */
                        }
                      }
                      resetSession();
                    })();
                  }}
                >
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <>
          <div className="form-grid" style={{ marginBottom: 16, alignItems: "end" }}>
            <div className="form-group">
              <label className="form-label">Columna de código (match con nombre de archivo)</label>
              <select
                className="form-select"
                value={preview.codeColumnIndex}
                disabled={saving}
                onChange={(e) => {
                  const idx = Number(e.target.value);
                  void (async () => {
                    setMutation("bulk");
                    try {
                      const { preview: p } = await patchBulkImportJob(jobId, {
                        codeColumnIndex: idx,
                        selectedRowIds,
                      });
                      setPreview(p);
                      showToast("Columna de código actualizada", "default", "✓");
                    } catch (err) {
                      showToast(err instanceof Error ? err.message : "Error al actualizar", "danger", "⚠️");
                    } finally {
                      setMutation(null);
                    }
                  })();
                }}
              >
                {preview.headers.map((h, i) => (
                  <option key={`${h}-${i}`} value={i}>
                    {h || `(vacío ${i})`}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Reanalizar preview</label>
              <button
                type="button"
                className="btn btn-outline"
                disabled={saving}
                onClick={() => {
                  void (async () => {
                    setMutation("bulk");
                    try {
                      const { preview: p } = await patchBulkImportJob(jobId, {
                        selectedRowIds,
                      });
                      setPreview(p);
                      showToast("Vista previa recalculada", "success", "✓");
                    } catch (err) {
                      showToast(err instanceof Error ? err.message : "Error", "danger", "⚠️");
                    } finally {
                      setMutation(null);
                    }
                  })();
                }}
              >
                Reanalizar
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 12 }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={selectAllValid}>
              Seleccionar filas importables
            </button>
            {preview?.csvHasVariantGroupColumn && (
              <button type="button" className="btn btn-outline btn-sm" onClick={selectAllForVariantGroups}>
                Seleccionar productos registrados para agrupar
              </button>
            )}
            <button type="button" className="btn btn-outline btn-sm" onClick={clearSelection}>
              Quitar selección
            </button>
            {invalidPriceRows.length > BULK_INVALID_PRICE_BATCH_THRESHOLD && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={saving || applyingBulkPrice}
                onClick={() => {
                  setBulkPriceModalDismissed(false);
                  setShowBulkPriceModal(true);
                }}
                title="Asigna el mismo precio a todas las filas con precio inválido o vacío"
              >
                💲 Precio en lote ({invalidPriceRows.length})
              </button>
            )}
            {incidentRows.length > 0 && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => openIncidentNav()}
                style={{ borderColor: "rgba(220,38,38,0.35)", color: "#b00020" }}
              >
                Revisar incidencias ({incidentRows.length})
              </button>
            )}
            {hasTintesInBatch && selectedTintRowCount > 0 && (
              <button
                type="button"
                className="btn btn-sm"
                style={{
                  background: "#fff3e0",
                  border: "1px solid #e6a817",
                  color: "#8a5c00",
                  fontWeight: 600,
                }}
                onClick={skipTintRows}
                title="Excluye todos los productos de categoría Tintes de la selección para que no se importen"
              >
                ⊘ Omitir Tintes ({selectedTintRowCount})
              </button>
            )}
            <span style={{ fontSize: 13, color: "var(--text-muted)", alignSelf: "center" }}>
              {combineModeActive ? (
                <>
                  {combinePickIds.length} elegidos para combinar
                  <span style={{ opacity: 0.75 }}>
                    {" "}
                    · {selectedRowIds.length} OK siguen marcados para importar
                  </span>
                </>
              ) : (
                <>
                  {selectedRowIds.length} fila(s) seleccionada(s) de {previewTableRows.length}
                  {preview.csvHasVariantGroupColumn ? " en CSV" : " con match de imagen"}
                </>
              )}
            </span>
          </div>

          {preview?.tintSelectionResolved && preview.activeTintTypeLabel && preview.activeTintFamilyLabel ? (
            <div
              style={{
                marginBottom: 14,
                padding: "12px 16px",
                borderRadius: "var(--radius-md)",
                background: "linear-gradient(135deg, var(--lavender-light) 0%, #fff5f8 100%)",
                border: "1px solid var(--dusty-rose)",
                fontSize: 13,
              }}
            >
              <strong>Tipo:</strong> {preview.activeTintTypeLabel}
              <span style={{ color: "var(--text-muted)", marginLeft: 8 }}>
                · <strong>Familia:</strong> {preview.activeTintFamilyLabel}
              </span>
              <span style={{ color: "var(--text-muted)", marginLeft: 8 }}>
                ({preview.activeTintFamilyRowCount} producto(s))
              </span>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ marginLeft: 12 }}
                disabled={saving}
                onClick={() => {
                  setTintModalDismissed(false);
                  setShowTintTypeModal(true);
                }}
              >
                Cambiar tipo / familia
              </button>
            </div>
          ) : null}

          <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.45 }}>
            Solo productos nuevos listos (✓ OK). Si es variante, verás un aviso bajo el nombre.
          </p>
          {combineModeActive ? (
            <div className="admin-bulk-combine-banner" role="status">
              <div className="admin-bulk-combine-banner__title">Modo combinar activado</div>
              <button
                type="button"
                className="admin-bulk-combine-analyze-btn"
                disabled={saving || combiningRows || aiCombineAnalyzing}
                onClick={() => void runAiCombineAnalysis()}
              >
                {aiCombineAnalyzing ? (
                  <>
                    <span className="admin-inline-spinner" aria-hidden />
                    Analizando…
                  </>
                ) : (
                  <>
                    Analizar posibles
                    <br />
                    productos iguales
                    <br />
                    para combinar
                  </>
                )}
              </button>
              <div className="admin-bulk-combine-banner__actions">
                <span style={{ fontSize: 13, color: "#7a2f5a", fontWeight: 600 }}>
                  {combinePickIds.length} elegidos
                </span>
                <button
                  type="button"
                  className="btn admin-bulk-combine-banner__combine"
                  disabled={saving || combiningRows || combinePickIds.length < 2}
                  onClick={openCombineModal}
                >
                  Combinar
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={combiningRows}
                  onClick={exitCombineMode}
                  style={{ fontWeight: 700 }}
                >
                  Ya terminé
                </button>
              </div>
            </div>
          ) : combinableOkRows.length >= 2 ? (
            <div style={{ marginBottom: 12, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <button
                type="button"
                className="btn btn-outline"
                disabled={saving || combiningRows}
                onClick={enterCombineMode}
                style={{ fontWeight: 700, letterSpacing: "0.02em" }}
              >
                Combinar productos de esta lista
              </button>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Entra al modo combinar, marca los códigos del mismo producto y únelos con todas sus fotos.
              </span>
            </div>
          ) : null}
          {combineModeActive && aiCombineSuggestions.length > 0 ? (
            <div className="admin-bulk-ai-combine-list">
              {aiCombineSuggestions.map((group) => (
                <div key={group.id} className="admin-bulk-ai-combine-card">
                  <div className="admin-bulk-ai-combine-card__head">
                    <strong>Posible mismo producto</strong>
                    <span>
                      similitud {Math.round(group.score * 100)}% · {group.members.length} filas
                    </span>
                  </div>
                  <ul className="admin-bulk-ai-combine-card__members">
                    {group.members.map((m) => {
                      const row = combinableOkRows.find((r) => r.previewRowId === m.id);
                      return (
                        <li key={m.id}>
                          <label>
                            <input
                              type="checkbox"
                              checked={combinePickIdSet.has(m.id)}
                              onChange={() => toggleRow(m.id)}
                            />
                            <span>
                              <strong>{m.name || "Sin nombre"}</strong>
                              <small>{row?.codeValue ?? m.id}</small>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="admin-bulk-ai-combine-card__actions">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={saving || combiningRows}
                      onClick={() => acceptAiCombineGroup(group)}
                    >
                      Aceptar
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={combiningRows}
                      onClick={() => dismissAiCombineGroup(group.id)}
                    >
                      No combinar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          <div className="admin-bulk-scroll" style={{ marginBottom: 12 }}>
            <table className="admin-table admin-bulk-matched-table" style={{ minWidth: 720, margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: 44 }} className="admin-bulk-check-cell">
                    Sel.
                  </th>
                  {preview.csvHasVariantGroupColumn && (
                    <th style={{ width: 36, textAlign: "center" }} title="Orden de variante en el grupo">
                      #
                    </th>
                  )}
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Descripción</th>
                  {hasTintesInBatch && (
                    <>
                      <th>Familia</th>
                      <th>Nivel</th>
                      <th>Grupo</th>
                    </>
                  )}
                  <th>Categoría CSV</th>
                  <th>Subcategoría CSV</th>
                  <th>Categoría</th>
                  <th>Subcategoría</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Etiquetas</th>
                  <th>Imágenes</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {previewRowsByBarcodeGroup
                  ? previewRowsByBarcodeGroup.groups.flatMap((group, groupIndex) => {
                      const {
                        meta,
                        dbOnly,
                        dbVariants,
                        displayRows,
                        actionableRows,
                        isLocallyCompleted,
                        joinsExistingGroup,
                      } = group;
                      const groupColor = isLocallyCompleted
                        ? {
                            name: "gris",
                            headerBg: "#e5e7eb",
                            headerBorder: "#9ca3af",
                            headerText: "#374151",
                            rowBg: "rgba(107, 114, 128, 0.10)",
                          }
                        : variantGroupColorAt(groupIndex);
                      const readyIds = actionableRows
                        .filter((r) => r.readyForVariantGroup)
                        .map((r) => r.previewRowId);
                      const allActionableReadyOrOk =
                        actionableRows.length > 0 &&
                        actionableRows.every((r) => {
                          const st = rowStatusOf(r);
                          return r.readyForVariantGroup || st.tone === "ok";
                        });
                      const canAgruparGroup =
                        !isLocallyCompleted && allActionableReadyOrOk && readyIds.length > 0;

                      return [
                        ...(groupIndex > 0
                          ? [
                              <tr key={`gap-${meta.groupKey}`} aria-hidden>
                                <td
                                  colSpan={bulkPreviewTableColSpan}
                                  style={{
                                    height: 32,
                                    padding: 0,
                                    border: "none",
                                    background: "var(--ivory, #faf7f5)",
                                    boxShadow: "inset 0 1px 0 rgba(0,0,0,0.04), inset 0 -1px 0 rgba(0,0,0,0.04)",
                                  }}
                                />
                              </tr>,
                            ]
                          : []),
                        <tr
                          key={`group-${meta.groupKey}`}
                          style={{
                            background: groupColor.headerBg,
                            opacity: isLocallyCompleted ? 0.72 : 1,
                            filter: isLocallyCompleted ? "grayscale(0.35)" : undefined,
                          }}
                        >
                          <td
                            colSpan={bulkPreviewTableColSpan}
                            style={{
                              padding: "10px 14px",
                              fontSize: 13,
                              fontWeight: 600,
                              color: groupColor.headerText,
                              borderBottom: `2px solid ${groupColor.headerBorder}`,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 10,
                                alignItems: "center",
                                justifyContent: "space-between",
                              }}
                            >
                              <div>
                                <span style={{ fontFamily: "monospace", marginRight: 10 }}>
                                  📦 {meta.groupLabel}
                                </span>
                                <span
                                  style={{
                                    fontWeight: 500,
                                    color: groupColor.headerText,
                                    opacity: 0.85,
                                    fontSize: 12,
                                  }}
                                >
                                  {meta.rowCount} en CSV
                                  {meta.existingInCsvCount > 0 && ` · ${meta.existingInCsvCount} ya en tienda`}
                                  {meta.newInCsvCount > 0 && ` · ${meta.newInCsvCount} nueva(s)`}
                                  {dbOnly.length > 0 &&
                                    ` · ${dbOnly.length} en tienda no incluida(s) en este CSV`}
                                  {isLocallyCompleted && " · ✓ Agrupado"}
                                </span>
                                {joinsExistingGroup && !isLocallyCompleted ? (
                                  <div
                                    style={{
                                      marginTop: 10,
                                      padding: "10px 12px",
                                      borderRadius: 10,
                                      background: "rgba(255,255,255,0.55)",
                                      border: "1px solid rgba(0,0,0,0.06)",
                                      fontSize: 12,
                                      fontWeight: 500,
                                      color: groupColor.headerText,
                                      lineHeight: 1.5,
                                      maxWidth: 720,
                                    }}
                                  >
                                    <div style={{ fontWeight: 700, marginBottom: 4 }}>
                                      ¿Qué está pasando con este grupo?
                                    </div>
                                    <div>
                                      En el CSV hay <strong>{meta.rowCount}</strong> producto(s)
                                      {meta.newInCsvCount > 0
                                        ? ` (${meta.newInCsvCount} nuevo(s)`
                                        : ""}
                                      {meta.existingInCsvCount > 0
                                        ? `${meta.newInCsvCount > 0 ? ", " : " ("}${meta.existingInCsvCount} ya en tienda)`
                                        : meta.newInCsvCount > 0
                                          ? ")"
                                          : ""}
                                      {" "}con el código de barras <strong>{meta.groupLabel}</strong>.
                                    </div>
                                    <div style={{ marginTop: 4 }}>
                                      Ese código de barras <strong>ya existe en la tienda</strong> con{" "}
                                      <strong>{dbVariants.length}</strong> variante(s) (miniaturas abajo).
                                      {dbOnly.length > 0
                                        ? ` ${dbOnly.length} de ellas no vienen en este CSV; se muestran solo como referencia.`
                                        : ""}
                                    </div>
                                    <div style={{ marginTop: 4 }}>
                                      Al importar o agrupar, los productos de este CSV se{" "}
                                      <strong>unirán a ese mismo grupo</strong> (no se crea un grupo aparte).
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                              {false && canAgruparGroup ? (
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  disabled={saving || taxonomyRehomeHints.length > 0}
                                  onClick={() => void commitGroupAsVariants(meta.groupKey, readyIds)}
                                >
                                  📦 Agrupar
                                </button>
                              ) : isLocallyCompleted ? (
                                <span style={{ fontSize: 12, fontWeight: 600, color: "#4b5563" }}>
                                  ✓ Ya agrupado
                                </span>
                              ) : null}
                            </div>
                            {joinsExistingGroup && dbVariants.length > 0 ? (
                              <div style={{ marginTop: 10 }}>
                                <div
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 650,
                                    marginBottom: 6,
                                    color: groupColor.headerText,
                                    opacity: 0.9,
                                  }}
                                >
                                  Variantes que ya están en la tienda (referencia):
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 8,
                                  }}
                                >
                                  {dbVariants.map((v) => (
                                    <div
                                      key={v.id}
                                      title={`${v.name}${v.externalRef ? ` · ${v.externalRef}` : ""}`}
                                      style={{
                                        width: 56,
                                        textAlign: "center",
                                        fontSize: 10,
                                        color: groupColor.headerText,
                                      }}
                                    >
                                      <div
                                        style={{
                                          width: 48,
                                          height: 48,
                                          margin: "0 auto 4px",
                                          borderRadius: 8,
                                          overflow: "hidden",
                                          background: "rgba(255,255,255,0.7)",
                                          border: "1px solid rgba(0,0,0,0.08)",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                        }}
                                      >
                                        {v.imageUrl ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img
                                            src={v.imageUrl}
                                            alt=""
                                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                          />
                                        ) : (
                                          <span style={{ fontSize: 16 }}>🖼️</span>
                                        )}
                                      </div>
                                      <div
                                        style={{
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          whiteSpace: "nowrap",
                                          maxWidth: 56,
                                        }}
                                      >
                                        {v.externalRef ?? v.name}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </td>
                        </tr>,
                        ...displayRows.map((r) => renderBulkPreviewDataRow(r, groupColor)),
                        ...dbOnly.map((p) => (
                          <tr
                            key={`db-only-${p.id}`}
                            style={{
                              background: groupColor.rowBg,
                              opacity: isLocallyCompleted ? 0.55 : 0.75,
                            }}
                          >
                            <td className="admin-bulk-check-cell" />
                            {preview.csvHasVariantGroupColumn && (
                              <td style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>
                                {p.variantGroupOrder != null ? p.variantGroupOrder + 1 : "—"}
                              </td>
                            )}
                            <td style={{ fontSize: 12, fontFamily: "monospace" }}>{p.externalRef ?? "—"}</td>
                            <td colSpan={bulkPreviewTableColSpan - (preview.csvHasVariantGroupColumn ? 3 : 2)}>
                              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                                {p.name} — solo en tienda (no está en este CSV)
                              </span>
                            </td>
                          </tr>
                        )),
                      ];
                    })
                  : actionPreviewTableRows.map((r) => renderBulkPreviewDataRow(r))}
                {previewRowsByBarcodeGroup && previewRowsByBarcodeGroup.ungrouped.length > 0 && (
                  <>
                    <tr style={{ background: "var(--lavender-light)" }}>
                      <td
                        colSpan={bulkPreviewTableColSpan}
                        style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}
                      >
                        Sin código de barras
                      </td>
                    </tr>
                    {previewRowsByBarcodeGroup.ungrouped.map((r) => renderBulkPreviewDataRow(r))}
                  </>
                )}
                {previewTableRows.length > 0 &&
                  (previewRowsByBarcodeGroup
                    ? previewRowsByBarcodeGroup.groups.length === 0 &&
                      previewRowsByBarcodeGroup.ungrouped.length === 0
                    : actionPreviewTableRows.length === 0) && (
                    <tr>
                      <td
                        colSpan={bulkPreviewTableColSpan}
                        style={{ textAlign: "center", padding: 20, color: "var(--text-muted)" }}
                      >
                        Todas las filas listas para importar o agrupar ya están resueltas o no hay ninguna. Usa{" "}
                        <strong>Ver todos los casos</strong> si quedan incidencias.
                      </td>
                    </tr>
                  )}
                {previewTableRows.length === 0 && (
                  <tr>
                    <td colSpan={bulkPreviewTableColSpan} style={{ textAlign: "center", padding: 20, color: "var(--text-muted)" }}>
                      {preview.csvHasVariantGroupColumn
                        ? "No hay filas en el CSV."
                        : "No hay filas con match válido para importar."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {!showAllCases && secondaryMatchCount > 0 ? (
            <div style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowAllCases(true)}
              >
                Ver todos los casos ({secondaryMatchCount})
              </button>
            </div>
          ) : null}

          {showAllCases && secondaryMatchCount > 0 ? (
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  marginBottom: 12,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderRadius: "var(--radius-md)",
                  background: "#fff5f5",
                  border: "1px solid rgba(220, 38, 38, 0.22)",
                  fontSize: 13,
                  color: "var(--text)",
                }}
              >
                <span style={{ lineHeight: 1.45 }}>
                  <strong>Todos los demás casos</strong> — filas con incidencias (sin foto, errores, etc.),
                  agrupadas por código de barras cuando aplica. Decide editar, omitir o subir imagen.
                </span>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setShowAllCases(false)}
                >
                  Ocultar
                </button>
              </div>
              <div className="admin-bulk-scroll" style={{ marginBottom: 12 }}>
                <table className="admin-table admin-bulk-matched-table" style={{ minWidth: 720, margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 44 }} className="admin-bulk-check-cell">
                        Sel.
                      </th>
                      {preview.csvHasVariantGroupColumn && (
                        <th style={{ width: 36, textAlign: "center" }} title="Orden de variante en el grupo">
                          #
                        </th>
                      )}
                      <th>Código</th>
                      <th>Nombre</th>
                      <th>Descripción</th>
                      {hasTintesInBatch && (
                        <>
                          <th>Familia</th>
                          <th>Nivel</th>
                          <th>Grupo</th>
                        </>
                      )}
                      <th>Categoría CSV</th>
                      <th>Subcategoría CSV</th>
                      <th>Categoría</th>
                      <th>Subcategoría</th>
                      <th>Precio</th>
                      <th>Stock</th>
                      <th>Etiquetas</th>
                      <th>Imágenes</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRowsByBarcodeGroup
                      ? [
                          ...previewRowsByBarcodeGroup.secondaryGroups.flatMap((group, groupIndex) => {
                            const {
                              meta,
                              dbOnly,
                              dbVariants,
                              displayRows,
                              actionableRows,
                              isLocallyCompleted,
                              joinsExistingGroup,
                            } = group;
                            const groupColor = variantGroupColorAt(groupIndex + 3);
                            const readyIds = actionableRows
                              .filter((r) => r.readyForVariantGroup)
                              .map((r) => r.previewRowId);
                            const allActionableReadyOrOk =
                              actionableRows.length > 0 &&
                              actionableRows.every((r) => {
                                const st = rowStatusOf(r);
                                return r.readyForVariantGroup || st.tone === "ok";
                              });
                            const canAgruparGroup =
                              !isLocallyCompleted && allActionableReadyOrOk && readyIds.length > 0;
                            return [
                              ...(groupIndex > 0
                                ? [
                                    <tr key={`sec-gap-${meta.groupKey}`} aria-hidden>
                                      <td
                                        colSpan={bulkPreviewTableColSpan}
                                        style={{
                                          height: 32,
                                          padding: 0,
                                          border: "none",
                                          background: "var(--ivory, #faf7f5)",
                                        }}
                                      />
                                    </tr>,
                                  ]
                                : []),
                              <tr
                                key={`sec-group-${meta.groupKey}`}
                                style={{
                                  background: groupColor.headerBg,
                                }}
                              >
                                <td
                                  colSpan={bulkPreviewTableColSpan}
                                  style={{
                                    padding: "10px 14px",
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: groupColor.headerText,
                                    borderBottom: `2px solid ${groupColor.headerBorder}`,
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      flexWrap: "wrap",
                                      gap: 10,
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                    }}
                                  >
                                    <div>
                                      <span style={{ fontFamily: "monospace", marginRight: 10 }}>
                                        📦 {meta.groupLabel}
                                      </span>
                                      <span style={{ fontWeight: 500, fontSize: 12, opacity: 0.85 }}>
                                        {displayRows.length} caso(s) en este grupo
                                        {joinsExistingGroup
                                          ? ` · ${dbVariants.length} variante(s) ya en tienda`
                                          : ""}
                                      </span>
                                    </div>
                                    {canAgruparGroup ? (
                                      <button
                                        type="button"
                                        className="btn btn-primary btn-sm"
                                        disabled={saving || taxonomyRehomeHints.length > 0}
                                        onClick={() => void commitGroupAsVariants(meta.groupKey, readyIds)}
                                      >
                                        📦 Agrupar
                                      </button>
                                    ) : null}
                                  </div>
                                </td>
                              </tr>,
                              ...displayRows.map((r) => renderBulkPreviewDataRow(r, groupColor)),
                              ...dbOnly.map((p) => (
                                <tr
                                  key={`sec-db-${p.id}`}
                                  style={{ background: groupColor.rowBg, opacity: 0.75 }}
                                >
                                  <td className="admin-bulk-check-cell" />
                                  {preview.csvHasVariantGroupColumn && (
                                    <td style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>
                                      {p.variantGroupOrder != null ? p.variantGroupOrder + 1 : "—"}
                                    </td>
                                  )}
                                  <td style={{ fontSize: 12, fontFamily: "monospace" }}>
                                    {p.externalRef ?? "—"}
                                  </td>
                                  <td
                                    colSpan={
                                      bulkPreviewTableColSpan - (preview.csvHasVariantGroupColumn ? 3 : 2)
                                    }
                                  >
                                    <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                                      {p.name} — solo en tienda (no está en este CSV)
                                    </span>
                                  </td>
                                </tr>
                              )),
                            ];
                          }),
                          ...(previewRowsByBarcodeGroup.secondaryUngrouped.length > 0
                            ? [
                                <tr key="sec-ungrouped-h" style={{ background: "var(--lavender-light)" }}>
                                  <td
                                    colSpan={bulkPreviewTableColSpan}
                                    style={{
                                      padding: "10px 14px",
                                      fontSize: 13,
                                      fontWeight: 600,
                                      color: "var(--text-muted)",
                                    }}
                                  >
                                    Sin código de barras / otros casos
                                  </td>
                                </tr>,
                                ...previewRowsByBarcodeGroup.secondaryUngrouped.map((r) =>
                                  renderBulkPreviewDataRow(r)
                                ),
                              ]
                            : []),
                        ]
                      : secondaryFlatRows.map((r) => renderBulkPreviewDataRow(r))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <div
            style={{
              marginBottom: 12,
              padding: "14px 16px",
              borderRadius: "var(--radius-md)",
              background: "linear-gradient(135deg, var(--lavender-light) 0%, #fff8f6 100%)",
              border: "1px solid var(--line, #e7d9d4)",
              fontSize: 13,
              lineHeight: 1.5,
              color: "var(--text)",
            }}
          >
            <strong>Detalle del emparejamiento imagen ↔ CSV</strong>
            <p style={{ margin: "6px 0 0", color: "var(--text-muted)" }}>
              Esta tabla muestra cómo se relacionó cada archivo del ZIP con un código del CSV: el nombre
              de la imagen, el código extraído del archivo, el prefijo numérico, el código CSV con el que
              coincidió y el método de match (exacto, prefijo, similitud, etc.). Sirve para auditar
              emparejamientos dudosos antes de importar.
            </p>
          </div>

          <div
            className="admin-bulk-scroll"
            style={{ marginBottom: 16, border: "1px solid var(--line, #e7d9d4)", borderRadius: "var(--radius-md)" }}
          >
            <table className="admin-table" style={{ minWidth: 900, margin: 0 }}>
              <thead>
                <tr>
                  <th>Imagen</th>
                  <th>rawImageCode</th>
                  <th>numericPrefixCode</th>
                  <th>matchedCsvCode</th>
                  <th>matchedBy</th>
                </tr>
              </thead>
              <tbody>
                {(showAllImageMatches ? preview.imageMatches : preview.imageMatches.slice(0, 5)).map(
                  (m, idx) => (
                    <tr key={`${m.imageFilename}-${idx}`}>
                      <td style={{ fontSize: 12 }}>{m.imageFilename}</td>
                      <td style={{ fontFamily: "monospace", fontSize: 12 }}>{m.rawImageCode}</td>
                      <td style={{ fontFamily: "monospace", fontSize: 12 }}>{m.numericPrefixCode ?? "—"}</td>
                      <td style={{ fontFamily: "monospace", fontSize: 12 }}>{m.matchedCsvCode ?? "—"}</td>
                      <td style={{ fontSize: 12 }}>
                        {m.matchedBy === "exact"
                          ? "exact"
                          : m.matchedBy === "numericPrefix"
                            ? "numericPrefix"
                            : m.matchedBy === "sixDigitPrefix"
                              ? "sixDigitPrefix"
                              : m.matchedBy === "fuzzy"
                                ? `fuzzy${m.fuzzySimilarity != null ? ` (${Math.round(m.fuzzySimilarity * 100)}%)` : ""}`
                                : m.matchedBy === "ambiguous"
                                  ? "ambiguous"
                                  : "none"}
                      </td>
                    </tr>
                  )
                )}
                {preview.imageMatches.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: 20, color: "var(--text-muted)" }}>
                      No se detectaron imágenes en el ZIP.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {preview.imageMatches.length > 5 ? (
            <div style={{ marginTop: -8, marginBottom: 16 }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setShowAllImageMatches((v) => !v)}
              >
                {showAllImageMatches
                  ? "Mostrar solo 5"
                  : `Ver todos (${preview.imageMatches.length})`}
              </button>
            </div>
          ) : null}

          <div className="admin-bulk-actions-spacer" aria-hidden style={incidentNavOpen ? { height: 168 } : undefined} />

          {incidentNavOpen && incidentRows.length > 0 ? (
            <div className="admin-bulk-incident-nav" role="navigation" aria-label="Navegación de incidencias">
              <div className="admin-bulk-incident-nav__meta">
                Incidencia <strong>{Math.min(incidentFocusIndex + 1, incidentRows.length)}</strong> de{" "}
                <strong>{incidentRows.length}</strong>
                {incidentFocusRow ? (
                  <>
                    {" "}
                    · {incidentFocusRow.codeValue ?? "sin código"} · {incidentFocusRow.errors[0] ?? "Error"}
                  </>
                ) : null}
              </div>
              <div className="admin-bulk-incident-nav__arrows">
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  aria-label="Incidencia anterior"
                  disabled={incidentFocusIndex <= 0}
                  onClick={() => setIncidentFocusIndex((i) => Math.max(0, i - 1))}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  aria-label="Siguiente incidencia"
                  disabled={incidentFocusIndex >= incidentRows.length - 1}
                  onClick={() =>
                    setIncidentFocusIndex((i) => Math.min(incidentRows.length - 1, i + 1))
                  }
                >
                  ↓
                </button>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={!incidentFocusRow}
                onClick={() => {
                  if (!incidentFocusRow) return;
                  omitIncidentRow(incidentFocusRow.previewRowId);
                }}
              >
                Omitir esta
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={omitAllIncidents}>
                Omitir todas
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setIncidentNavOpen(false)}
              >
                Cerrar
              </button>
            </div>
          ) : null}

          <div
            className="admin-bulk-actions-bar"
            role="toolbar"
            aria-label="Acciones de importación masiva"
          >
            <div className="admin-bulk-actions-bar__meta">
              {combineModeActive ? (
                <>
                  <strong>{combinePickIds.length}</strong> para combinar
                  <span style={{ color: "var(--text-muted)" }}>
                    {" "}
                    · {selectedRowIds.length} listos para importar (en segundo plano)
                  </span>
                </>
              ) : (
                <>
                  <strong>{selectedRowIds.length}</strong> fila(s) seleccionada(s)
                  {selectedVariantGroupRowIds.length > 0 ? (
                    <>
                      {" "}
                      · <strong>{selectedVariantGroupRowIds.length}</strong> para agrupar
                    </>
                  ) : null}
                  {selectedOkNewProductRowIds.length > 0 ? (
                    <>
                      {" "}
                      · <strong>{selectedOkNewProductRowIds.length}</strong> OK para importar
                    </>
                  ) : null}
                </>
              )}
            </div>
            <button
              type="button"
              className="btn btn-outline"
              disabled={
                saving ||
                zipUploading ||
                combineModeActive ||
                (needsTintSelection && !tintsExplicitlySkipped) ||
                (pendingNewCategories.length > 0 && !newCategoriesModalAcknowledged) ||
                taxonomyRehomeHints.length > 0
              }
              title={
                combineModeActive
                  ? "Sal del modo combinar (Ya terminé) para importar"
                  : selectedOkNewProductRowIds.length > 0
                    ? "Importa los productos nuevos OK (con barras se agrupan al crear)"
                    : "Selecciona productos con estado ✓ OK"
              }
              onClick={() => {
                if (selectedOkNewProductRowIds.length === 0) {
                  if (incidentRows.length > 0) {
                    openIncidentNav();
                    return;
                  }
                  showToast(
                    "No hay productos nuevos con estado «✓ OK» seleccionados.",
                    "default",
                    "ℹ️"
                  );
                  return;
                }
                void (async () => {
                  setMutation("bulk");
                  setBulkProgressLabel("Importando y agrupando productos…");
                  bulkProgress.start("import");
                  try {
                    const combinedIds = [...selectedOkNewProductRowIds].sort();
                    const res = await postBulkImportCommit(jobId, combinedIds, "skip", {
                      keepJob: true,
                    });
                    bulkProgress.finish();
                    setIncidentNavOpen(false);
                    applyPartialCommitResult(res, combinedIds);
                    if (res.failed > 0) {
                      showToast(`${res.failed} error(es). Revisa consola o mensajes.`, "danger", "⚠️");
                    }
                    await onImported();
                    if (!openBulkSuccessModal(res, true)) {
                      showToast("No se aplicaron cambios en esta acción.", "default", "ℹ️");
                    }
                  } catch (e) {
                    bulkProgress.reset();
                    showToast(
                      e instanceof Error ? e.message : "Error al importar y agrupar",
                      "danger",
                      "⚠️"
                    );
                    if (incidentRows.length > 0) openIncidentNav();
                  } finally {
                    setMutation(null);
                  }
                })();
              }}
            >
              {saving ? (
                <>
                  <span className="admin-inline-spinner" aria-hidden />
                  Importando…
                </>
              ) : selectedOkNewProductRowIds.length === 0 ? (
                "✨ Importar y agrupar"
              ) : (
                `✨ Importar y agrupar (${selectedOkNewProductRowIds.length})`
              )}
            </button>

            <button
              type="button"
              className="btn btn-outline"
              disabled={saving}
              onClick={cancelBulkSession}
              style={{ borderColor: "rgba(120,120,120,0.35)", color: "var(--text-muted)" }}
            >
              Cancelar
            </button>
          </div>
          {taxonomyRehomeHints.length > 0 && (
            <p style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
              Hay sugerencias de reubicación de categoría/subcategoría: revísalas en el modal. Si las rechazas, podrás
              crear categorías nuevas como antes.
            </p>
          )}
          {needsTintSelection && !tintsExplicitlySkipped && (
            <p style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
              Este CSV incluye Tintes: elige primero el <strong>tipo</strong> y la <strong>familia</strong> que vas a
              subir en esta carga, o usa <strong>«⊘ Omitir todos los Tintes»</strong> en el modal de configuración para
              importar solo los demás productos.
            </p>
          )}
          {pendingNewCategories.length > 0 && (
            <p style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.45 }}>
              Hay productos <strong>nuevos</strong> cuya categoría o subcategoría del CSV no existe en el sistema. Revisa el
              modal o pulsa «Continuar sin crear» si solo quieres agrupar variantes de productos ya registrados.
            </p>
          )}
            </>
          )}
        </>
      )}
      <AdminBulkRowEditModal
        open={!!editingBulkRow}
        saving={saving}
        zipFile={zipFile}
        categories={categories}
        row={editingBulkRow}
        onClose={() => {
          if (!saving) setEditingBulkRowId(null);
        }}
        onSave={saveBulkRowEdits}
      />

      {combineModalOpen ? (
        <div
          className="admin-modal-overlay open"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !combiningRows) setCombineModalOpen(false);
          }}
        >
          <div
            className="admin-modal"
            style={{ maxWidth: 480, padding: "22px 20px" }}
            role="dialog"
            aria-modal="true"
            aria-label="Combinar productos"
          >
            <h3 style={{ margin: "0 0 8px", fontSize: 18 }}>Combinar en un solo producto</h3>
            <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.45 }}>
              Se unirán {selectedOkRowsForCombine.length} códigos y todas sus fotos en una sola fila. Elige el
              nombre final.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {selectedOkRowsForCombine.map((r) => {
                const label = r.nameValue?.trim() || r.codeValue || "Producto";
                return (
                  <label
                    key={r.previewRowId}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      fontSize: 13,
                      padding: "8px 10px",
                      borderRadius: 8,
                      border:
                        combineNameMode === "pick" && combinePickedRowId === r.previewRowId
                          ? "1px solid var(--dusty-rose)"
                          : "1px solid var(--cream)",
                      background: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="combine-name"
                      checked={combineNameMode === "pick" && combinePickedRowId === r.previewRowId}
                      onChange={() => {
                        setCombineNameMode("pick");
                        setCombinePickedRowId(r.previewRowId);
                      }}
                    />
                    <AdminBulkMatchedImages images={r.matchedImages.slice(0, 1)} cache={zipImageCache} />
                    <span>
                      <strong>{label}</strong>
                      <span style={{ display: "block", fontFamily: "monospace", fontSize: 12, color: "var(--text-muted)" }}>
                        {r.codeValue}
                        {r.matchedImages.length ? ` · ${r.matchedImages.length} foto(s)` : ""}
                      </span>
                    </span>
                  </label>
                );
              })}
              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  fontSize: 13,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: combineNameMode === "custom" ? "1px solid var(--dusty-rose)" : "1px solid var(--cream)",
                }}
              >
                <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="radio"
                    name="combine-name"
                    checked={combineNameMode === "custom"}
                    onChange={() => setCombineNameMode("custom")}
                  />
                  Escribir otro nombre
                </span>
                <input
                  className="form-input"
                  value={combineCustomName}
                  disabled={combineNameMode !== "custom"}
                  placeholder="Nombre del producto combinado"
                  onChange={(e) => setCombineCustomName(e.target.value)}
                  onFocus={() => setCombineNameMode("custom")}
                />
              </label>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn-outline"
                disabled={combiningRows}
                onClick={() => setCombineModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={combiningRows}
                onClick={confirmCombineRows}
              >
                {combiningRows ? (
                  <>
                    <span className="admin-inline-spinner" aria-hidden />
                    Combinando…
                  </>
                ) : (
                  "Combinar y unir fotos"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {bulkSuccessModal ? (
        <div
          className="admin-modal-overlay open"
          style={{ backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", background: "rgba(30, 22, 20, 0.45)" }}
          role="presentation"
        >
          <div
            className="admin-modal"
            style={{ maxWidth: 440, textAlign: "center", padding: "28px 24px 22px" }}
            role="dialog"
            aria-modal="true"
            aria-label="Resultado de la carga"
          >
            <div style={{ fontSize: 42, marginBottom: 10 }} aria-hidden>
              ✨
            </div>
            <h3 style={{ margin: "0 0 10px", fontSize: 22, color: "var(--dark)" }}>Todo salió bien</h3>
            <p style={{ margin: "0 0 22px", fontSize: 15, lineHeight: 1.55, color: "var(--text)" }}>
              {bulkSuccessModal.imported > 0 && bulkSuccessModal.variantsAssigned > 0
                ? `Se importaron ${bulkSuccessModal.imported} producto(s) y se añadieron ${bulkSuccessModal.variantsAssigned} variante(s).`
                : bulkSuccessModal.imported > 0
                  ? `Se importaron ${bulkSuccessModal.imported} producto(s).`
                  : `Se añadieron ${bulkSuccessModal.variantsAssigned} variante(s).`}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setBulkSuccessModal(null);
                  exitBulkSessionQuiet();
                }}
              >
                Ok, salir
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  const keep = bulkSuccessModal.keepWorking;
                  setBulkSuccessModal(null);
                  if (!keep) exitBulkSessionQuiet();
                }}
              >
                Quedarme aquí
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <AdminBulkLowMatchModal
        open={showLowMatchModal && !!pendingAnalyzeResult && !!pendingLowMatchBreakdown}
        breakdown={pendingLowMatchBreakdown}
        headers={pendingAnalyzeResult?.preview.headers ?? []}
        codeColumnIndex={pendingAnalyzeResult?.preview.codeColumnIndex ?? 0}
        codeColumnCandidates={pendingAnalyzeResult?.preview.codeColumnCandidates ?? []}
        reanalyzing={saving}
        onConfirm={() => {
          if (!pendingAnalyzeResult) return;
          applyAnalyzeResult(pendingAnalyzeResult);
          setPendingAnalyzeResult(null);
          setShowLowMatchModal(false);
        }}
        onCancel={() => {
          if (saving) return;
          const pendingJobId = pendingAnalyzeResult?.jobId ?? null;
          setPendingAnalyzeResult(null);
          setShowLowMatchModal(false);
          if (pendingJobId) {
            void deleteBulkImportJob(pendingJobId).catch(() => {
              /* sesión descartada */
            });
          }
          showToast("Revisa el Excel y el ZIP antes de volver a analizar.", "default", "ℹ️");
        }}
        onReanalyzeWithColumn={(columnIndex) => {
          void (async () => {
            if (!pendingAnalyzeResult) return;
            if (columnIndex === pendingAnalyzeResult.preview.codeColumnIndex) {
              showToast("Esa columna ya está seleccionada. Elige otra distinta.", "default", "ℹ️");
              return;
            }
            setMutation("bulk");
            setBulkProgressLabel("Reanalizando match con otra columna…");
            try {
              const { preview: p } = await patchBulkImportJob(pendingAnalyzeResult.jobId, {
                codeColumnIndex: columnIndex,
              });
              const next: BulkPreviewResponse = {
                ...pendingAnalyzeResult,
                preview: p,
              };
              if (isBulkCsvZipMatchRateTooLow(p.stats)) {
                setPendingAnalyzeResult(next);
                showToast(
                  `Reanalizado con «${p.headers[columnIndex] || `columna ${columnIndex}`}». El match sigue bajo; prueba otra columna o confirma.`,
                  "default",
                  "⚠️"
                );
              } else {
                applyAnalyzeResult(next);
                setPendingAnalyzeResult(null);
                setShowLowMatchModal(false);
                showToast(
                  `Match mejorado usando «${p.headers[columnIndex] || `columna ${columnIndex}`}».`,
                  "success",
                  "✅"
                );
              }
            } catch (err) {
              showToast(err instanceof Error ? err.message : "No se pudo reanalizar", "danger", "⚠️");
            } finally {
              setMutation(null);
              setBulkProgressLabel("");
            }
          })();
        }}
      />
      <AdminBulkTaxonomyHintsModal
        open={showTaxonomyHintsModal && taxonomyRehomeHints.length > 0}
        hints={taxonomyRehomeHints}
        saving={saving}
        onClose={() => {
          if (saving) return;
          if (!jobId || taxonomyRehomeHints.length === 0) {
            setShowTaxonomyHintsModal(false);
            return;
          }
          void (async () => {
            setMutation("bulk");
            try {
              const taxonomyRehomeDismissed: Record<string, boolean> = {};
              for (const h of taxonomyRehomeHints) taxonomyRehomeDismissed[h.pairKey] = true;
              const { preview: p } = await patchBulkImportJob(jobId, {
                taxonomyRehomeDismissed,
                selectedRowIds,
              });
              setPreview(p);
              showToast(
                "Sugerencias cerradas: se usará tu texto del CSV para esos pares. Puedes importar o revisar categorías nuevas.",
                "default",
                "ℹ️"
              );
            } catch (err) {
              showToast(err instanceof Error ? err.message : "Error al actualizar", "danger", "⚠️");
            } finally {
              setMutation(null);
              setShowTaxonomyHintsModal(false);
            }
          })();
        }}
        onAccept={(hint) => {
          if (!jobId) return;
          void (async () => {
            setMutation("bulk");
            try {
              const { preview: p } = await patchBulkImportJob(jobId, {
                taxonomyOverrides: {
                  [hint.pairKey]: {
                    categorySlug: hint.suggestedCategorySlug,
                    subcategoryName: hint.suggestedSubcategoryName,
                  },
                },
                selectedRowIds,
              });
              setPreview(p);
              showToast("Sugerencia aplicada al preview", "success", "📂");
            } catch (err) {
              showToast(err instanceof Error ? err.message : "Error al aplicar", "danger", "⚠️");
            } finally {
              setMutation(null);
            }
          })();
        }}
        onReject={(hint) => {
          if (!jobId) return;
          void (async () => {
            setMutation("bulk");
            try {
              const { preview: p } = await patchBulkImportJob(jobId, {
                taxonomyRehomeDismissed: { [hint.pairKey]: true },
                selectedRowIds,
              });
              setPreview(p);
              showToast("Entendido: se usará tu texto del CSV para este par (p. ej. crear categoría nueva).", "default", "ℹ️");
            } catch (err) {
              showToast(err instanceof Error ? err.message : "Error", "danger", "⚠️");
            } finally {
              setMutation(null);
            }
          })();
        }}
      />
      <AdminBulkTintSetupModal
        open={
          showTintTypeModal &&
          (needsTintSelection ||
            !!(preview?.hasTintesRows && (!preview?.activeTintTypeCsvKey || !preview?.activeTintFamilyCsvKey)))
        }
        csvMissingTintType={preview?.csvMissingTintType === true}
        previewRows={preview?.rows ?? []}
        typeOptions={tintTypeOptions}
        existingTypes={preview?.existingTintTypes ?? []}
        existingFamilies={preview?.existingTintFamilies ?? []}
        tintFamilyLinks={preview?.tintFamilyLinks ?? {}}
        pendingTypeKey={preview?.activeTintTypeCsvKey ?? null}
        pendingFamilyKey={preview?.activeTintFamilyCsvKey ?? null}
        saving={resolvingTintType || saving}
        onClose={() => {
          setTintModalDismissed(true);
          setShowTintTypeModal(false);
        }}
        onSkipTints={() => {
          // Quita todos los tintes de la selección y marca que el usuario eligió omitirlos
          setTintsExplicitlySkipped(true);
          setTintModalDismissed(true);
          setShowTintTypeModal(false);
          const tintIds = new Set(
            (preview?.rows ?? []).filter((r) => bulkPreviewRowIsTintes(r)).map(bulkImportStableRowId)
          );
          setSelectedRowIds((prev) => prev.filter((id) => !tintIds.has(id)));
        }}
        onConfirm={async ({
          typeKey,
          typeId,
          familyKey,
          familyId,
          typeLinks,
          familyLinks,
          defaultTintTypeApplied,
          defaultTintFamilyApplied,
          tintTypeOverrides,
          selectAllTintRows,
        }) => {
          if (!jobId) return;
          setResolvingTintType(true);
          setMutation("bulk");
          try {
            const { preview: p } = await patchBulkImportJob(jobId, {
              activeTintTypeCsvKey: typeKey,
              activeTintTypeId: typeId,
              activeTintFamilyCsvKey: familyKey,
              activeTintFamilyId: familyId,
              tintTypeLinks: typeLinks,
              tintFamilyLinks: familyLinks,
              defaultTintTypeApplied,
              defaultTintFamilyApplied,
              tintTypeOverrides,
              selectedRowIds: selectAllTintRows
                ? (preview?.rows ?? [])
                    .filter((r) => bulkPreviewRowIsTintes(r))
                    .map(bulkImportStableRowId)
                : [],
            });
            setPreview(p);
            setSelectedRowIds(
              selectAllTintRows
                ? (p.rows ?? [])
                    .filter((r) => bulkPreviewRowIsTintes(r))
                    .map(bulkImportStableRowId)
                : (p.matchedRows ?? []).map(bulkImportStableRowId)
            );
            setTintModalDismissed(false);
            setShowTintTypeModal(false);
            const matched = p.stats?.matchedRows ?? 0;
            const total = p.stats?.totalRows ?? 0;
            showToast(
              `Tintes listos: ${typeKey} · ${familyKey}. Match: ${matched}/${total} filas con imagen.`,
              "success",
              "✅"
            );
          } catch (err) {
            showToast(err instanceof Error ? err.message : "Error al configurar tintes", "danger", "⚠️");
          } finally {
            setResolvingTintType(false);
            setMutation(null);
          }
        }}
        onCreateCatalog={async () => {
          // Catálogo diferido al commit: no crear aquí.
          return {
            families: preview?.existingTintFamilies ?? [],
            types: preview?.existingTintTypes ?? [],
          };
        }}
      />
      <AdminBulkMissingPriceModal
        open={
          applyingBulkPrice ||
          (showBulkPriceModal && invalidPriceRows.length > BULK_INVALID_PRICE_BATCH_THRESHOLD)
        }
        saving={saving || applyingBulkPrice}
        rowCount={applyingBulkPrice && bulkPriceApplyTotal > 0 ? bulkPriceApplyTotal : invalidPriceRows.length}
        appliedCount={bulkPriceAppliedCount}
        onClose={() => {
          if (saving || applyingBulkPrice) return;
          setShowBulkPriceModal(false);
          setBulkPriceModalDismissed(true);
        }}
        onSkip={() => {
          if (saving || applyingBulkPrice) return;
          setShowBulkPriceModal(false);
          setBulkPriceModalDismissed(true);
          showToast(
            "Continuaste sin asignar precio en lote. Cuando quieras, usa el botón «Precio en lote».",
            "default",
            "ℹ️"
          );
        }}
        onApply={async (price) => {
          if (!jobId) {
            showToast("No hay sesión de importación activa. Vuelve a analizar el CSV y ZIP.", "danger", "⚠️");
            throw new Error("Sin jobId");
          }
          const rows = invalidPriceRows;
          if (rows.length === 0) {
            showToast("No hay productos sin precio para actualizar.", "default", "ℹ️");
            return;
          }

          const total = rows.length;
          setApplyingBulkPrice(true);
          setBulkPriceApplyTotal(total);
          setBulkPriceAppliedCount(0);
          setMutation("bulk");
          setBulkProgressLabel(`Aplicando precio a 0 de ${total} productos…`);
          bulkProgress.start("default");

          const progressIv = window.setInterval(() => {
            setBulkPriceAppliedCount((prev) => {
              const next = Math.min(total - 1, prev + Math.max(1, Math.ceil(total / 45)));
              setBulkProgressLabel(`Aplicando precio a ${next} de ${total} productos…`);
              return next;
            });
          }, 110);

          try {
            const rowFieldOverrides: Record<string, { price: number }> = {};
            for (const r of rows) {
              rowFieldOverrides[bulkImportStableRowId(r)] = { price };
            }
            const { preview: p } = await patchBulkImportJob(jobId, {
              rowFieldOverrides,
              selectedRowIds,
            });
            window.clearInterval(progressIv);
            setBulkPriceAppliedCount(total);
            setBulkProgressLabel(`Aplicando precio a ${total} de ${total} productos…`);
            setPreview(p);
            bulkProgress.finish();
            setShowBulkPriceModal(false);
            setBulkPriceModalDismissed(true);
            const stillInvalid = (p.rows ?? []).filter((r) =>
              r.issues.includes("Precio inválido o vacío")
            ).length;
            if (stillInvalid > 0) {
              showToast(
                `Se envió el precio, pero ${stillInvalid} fila(s) siguen sin precio válido. Revisa el preview.`,
                "danger",
                "⚠️"
              );
            } else {
              showToast(
                `Precio ${formatPrice(price)} aplicado a ${total} producto(s).`,
                "success",
                "✅"
              );
            }
          } catch (err) {
            window.clearInterval(progressIv);
            bulkProgress.reset();
            showToast(err instanceof Error ? err.message : "No se pudo aplicar el precio", "danger", "⚠️");
            throw err;
          } finally {
            setApplyingBulkPrice(false);
            setMutation(null);
            setBulkProgressLabel("");
          }
        }}
      />
      <AdminBulkNewCategoriesModal
        open={showNewCategoriesModal && pendingNewCategories.length > 0}
        items={pendingNewCategories}
        saving={applyingNewCategories || saving}
        onClose={() => {
          if (applyingNewCategories || saving) return;
          setShowNewCategoriesModal(false);
          setNewCategoriesModalAcknowledged(true);
          showToast(
            "Puedes continuar sin crearlas, pero esas filas no serán importables hasta que existan en el sistema.",
            "default",
            "ℹ️"
          );
        }}
        onSkip={() => {
          setShowNewCategoriesModal(false);
          setNewCategoriesModalAcknowledged(true);
          showToast(
            "Puedes continuar sin crearlas, pero esas filas no serán importables hasta que existan en el sistema.",
            "default",
            "ℹ️"
          );
        }}
        onConfirm={() => {
          void (async () => {
            if (!jobId) {
              showToast("No hay sesión de importación activa.", "danger", "⚠️");
              return;
            }
            setApplyingNewCategories(true);
            setMutation("bulk");
            try {
              const { preview: refreshed } = await patchBulkImportJob(jobId, {
                taxonomyCreateDeferred: true,
                selectedRowIds,
              });
              setPreview(refreshed);
              setShowNewCategoriesModal(false);
              setNewCategoriesModalAcknowledged(true);
              showToast(
                "Listo: esas categorías/subcategorías se crearán en el sistema solo al importar los productos.",
                "success",
                "✅"
              );
            } catch (err) {
              showToast(err instanceof Error ? err.message : "Error al confirmar taxonomía", "danger", "⚠️");
            } finally {
              setApplyingNewCategories(false);
              setMutation(null);
            }
          })();
        }}
      />
      <AdminBulkTemplateModal open={showBulkTemplateModal} onClose={() => setShowBulkTemplateModal(false)} />
        </>
      )}
      </div>
    </div>
  );
}

function AdminBulkTaxonomyHintsModal({
  open,
  hints,
  saving,
  onClose,
  onAccept,
  onReject,
}: {
  open: boolean;
  hints: BulkTaxonomyRehomeHint[];
  saving: boolean;
  onClose: () => void;
  onAccept: (hint: BulkTaxonomyRehomeHint) => void;
  onReject: (hint: BulkTaxonomyRehomeHint) => void;
}) {
  return (
    <div
      className={`admin-modal-overlay${open ? " open" : ""}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="presentation"
    >
      <div className="admin-modal" style={{ maxWidth: 720 }}>
        <button type="button" className="modal-close" onClick={onClose}>
          ✕
        </button>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: "var(--dark)", marginBottom: 8 }}>
          Revisar categorías del CSV
        </div>
        <p style={{ marginTop: 0, marginBottom: 14, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
          Detectamos texto en el CSV que coincide mejor con una <strong>categoría y subcategoría que ya tienes</strong> (a veces
          el archivo pone en «categoría» lo que en la tienda es una subcategoría, p. ej. Labios dentro de Maquillaje). Elige si
          quieres usar la ubicación sugerida o mantener tu texto para crear taxonomía nueva.
        </p>
        <div
          style={{
            border: "1px solid var(--line, #e7d9d4)",
            borderRadius: "var(--radius-md)",
            maxHeight: 360,
            overflow: "auto",
            marginBottom: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            padding: 12,
          }}
        >
          {hints.map((h) => (
            <div
              key={h.id}
              style={{
                padding: 12,
                borderRadius: "var(--radius-md)",
                background: "var(--ivory, #fffaf8)",
                border: "1px solid rgba(199, 165, 178, 0.45)",
              }}
            >
              <p style={{ margin: "0 0 10px", fontSize: 13, lineHeight: 1.55 }}>
                ¿No crees que los productos con categoría <strong>«{h.csvCategoryDisplay}»</strong> y subcategoría{" "}
                <strong>«{h.csvSubcategoryDisplay}»</strong> encajan mejor en{" "}
                <strong>
                  {h.suggestedCategoryName} → {h.suggestedSubcategoryName}
                </strong>{" "}
                (ya registrados)?
                <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
                  {h.rowCount} fila(s) con este par ·{" "}
                  {h.kind === "category_column_looks_like_subcategory"
                    ? "La columna categoría parece un nombre de subcategoría existente."
                    : "La subcategoría encaja mejor en otra categoría del sistema."}
                </span>
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingBottom: 6 }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={saving}
                  onClick={() => onAccept(h)}
                >
                  Sí, usar esa ubicación
                </button>
                <button type="button" className="btn btn-outline btn-sm" disabled={saving} onClick={() => onReject(h)}>
                  No, prefiero mi texto del CSV
                </button>
              </div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
          Si respondes <strong>No</strong>, podrás confirmar después la creación de categorías nuevas como hasta ahora.
        </p>
      </div>
    </div>
  );
}

type TintMissingTypeStep = "pickType" | "confirmBulk" | "manualType" | "pickFamily";

const MANUAL_TINT_TYPE_NEW = "__new__";

function AdminBulkTintSetupModal({
  open,
  csvMissingTintType,
  previewRows,
  typeOptions,
  existingTypes,
  existingFamilies,
  tintFamilyLinks,
  pendingTypeKey,
  pendingFamilyKey,
  saving,
  onClose,
  onSkipTints,
  onConfirm,
  onCreateCatalog,
}: {
  open: boolean;
  csvMissingTintType: boolean;
  previewRows: BulkPreviewResult["rows"];
  typeOptions: CsvTintTypeOption[];
  existingTypes: { id: string; name: string }[];
  existingFamilies: { id: string; name: string }[];
  tintFamilyLinks: Record<string, string>;
  pendingTypeKey: string | null;
  pendingFamilyKey: string | null;
  saving: boolean;
  onClose: () => void;
  onSkipTints: () => void;
  onConfirm: (plan: {
    typeKey: string;
    typeId: string | null;
    familyKey: string;
    familyId: string | null;
    typeLinks: Record<string, string>;
    familyLinks: Record<string, string>;
    defaultTintTypeApplied?: boolean;
    defaultTintFamilyApplied?: boolean;
    tintTypeOverrides?: Record<string, string>;
    selectAllTintRows?: boolean;
  }) => void | Promise<void>;
  onCreateCatalog?: (plan: {
    newFamilies: string[];
    newTypes: string[];
  }) => Promise<{ families: { id: string; name: string }[]; types: { id: string; name: string }[] }>;
}) {
  const tintRowCount = useMemo(() => countTintRowsInPreview(previewRows), [previewRows]);
  const tintRows = useMemo(
    () => previewRows.filter((r) => bulkPreviewRowIsTintes(r)),
    [previewRows]
  );

  const [missingTypeStep, setMissingTypeStep] = useState<TintMissingTypeStep>("pickType");
  const [typePickMode, setTypePickMode] = useState<"existing" | "custom">("existing");
  const [existingTypePickId, setExistingTypePickId] = useState("");
  const [customTypeName, setCustomTypeName] = useState("");
  const [manualSearch, setManualSearch] = useState("");
  const [manualTypeOverrides, setManualTypeOverrides] = useState<Record<string, string>>({});
  const [manualCustomTypeNames, setManualCustomTypeNames] = useState<Record<string, string>>({});
  const [bulkTypeConfirmed, setBulkTypeConfirmed] = useState(false);
  const [manualFamilyMode, setManualFamilyMode] = useState<"existing" | "custom">("existing");
  const [existingFamilyPickId, setExistingFamilyPickId] = useState("");
  const [customFamilyName, setCustomFamilyName] = useState("");

  const [selectedTypeKey, setSelectedTypeKey] = useState<string | null>(pendingTypeKey);
  const [selectedFamilyKey, setSelectedFamilyKey] = useState<string | null>(pendingFamilyKey);
  const [resolvedTypeId, setResolvedTypeId] = useState<string | null>(null);
  const [resolvedFamilyId, setResolvedFamilyId] = useState<string | null>(null);
  const [typeLinkId, setTypeLinkId] = useState("");
  const [familyLinkId, setFamilyLinkId] = useState("");
  const [typeLinks, setTypeLinks] = useState<Record<string, string>>({});
  const [familyLinks, setFamilyLinks] = useState<Record<string, string>>({});
  const [catalogBusy, setCatalogBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMissingTypeStep("pickType");
    setTypePickMode("existing");
    setExistingTypePickId("");
    setCustomTypeName("");
    setManualSearch("");
    setManualTypeOverrides({});
    setManualCustomTypeNames({});
    setBulkTypeConfirmed(false);
    setManualFamilyMode("existing");
    setExistingFamilyPickId("");
    setCustomFamilyName("");
    setSelectedTypeKey(pendingTypeKey);
    setSelectedFamilyKey(pendingFamilyKey);
    setResolvedTypeId(null);
    setResolvedFamilyId(null);
    setTypeLinkId("");
    setFamilyLinkId("");
    setTypeLinks({});
    setFamilyLinks({});
  }, [open, pendingTypeKey, pendingFamilyKey]);

  const selectedType = selectedTypeKey
    ? typeOptions.find((o) => o.name === selectedTypeKey) ?? null
    : null;

  const familyOptions = useMemo(() => {
    if (!selectedTypeKey) return [];
    return buildCsvTintFamilyOptions(previewRows, selectedTypeKey, existingFamilies, {
      ...tintFamilyLinks,
      ...familyLinks,
    }, { defaultTintTypeApplied: csvMissingTintType });
  }, [previewRows, selectedTypeKey, existingFamilies, tintFamilyLinks, familyLinks, csvMissingTintType]);

  const selectedFamily = selectedFamilyKey
    ? familyOptions.find((o) => o.name === selectedFamilyKey) ?? null
    : null;

  const effectiveTypeId =
    resolvedTypeId ?? selectedType?.catalogId ?? (selectedTypeKey ? typeLinks[selectedTypeKey] : null) ?? null;
  const effectiveFamilyId =
    resolvedFamilyId ??
    selectedFamily?.catalogId ??
    (selectedFamilyKey ? familyLinks[selectedFamilyKey] : null) ??
    null;

  const typeNeedsCatalog = selectedType != null && !effectiveTypeId;
  const familyNeedsCatalog = selectedFamily != null && !effectiveFamilyId;
  // Se puede confirmar con nombres pendientes: tip/familia se crean al importar.
  const canConfirm = !!selectedTypeKey && !!selectedFamilyKey && !catalogBusy;

  const typeSelectOptions = useMemo(() => {
    const byId = new Map(existingTypes.map((t) => [t.id, t]));
    if (effectiveTypeId && selectedTypeKey && !byId.has(effectiveTypeId)) {
      byId.set(effectiveTypeId, { id: effectiveTypeId, name: selectedTypeKey });
    }
    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [existingTypes, effectiveTypeId, selectedTypeKey]);

  const filteredManualRows = useMemo(() => {
    const q = manualSearch.trim().toLowerCase();
    if (!q) return tintRows;
    return tintRows.filter((r) => {
      const title = effectiveProductTitle(r.mapped)?.toLowerCase() ?? "";
      const code = (r.codeRaw ?? r.normalizedCode ?? "").toLowerCase();
      const level = (r.mapped.tintLevel ?? "").toLowerCase();
      return title.includes(q) || code.includes(q) || level.includes(q);
    });
  }, [tintRows, manualSearch]);

  const applyPickedType = (name: string, id: string | null) => {
    const key = normalizeTintCatalogName(name);
    setSelectedTypeKey(key);
    setResolvedTypeId(id);
    setSelectedFamilyKey(null);
    setResolvedFamilyId(null);
    setFamilyLinkId("");
  };

  const handleCreateType = async (name: string) => {
    const key = normalizeTintCatalogName(name);
    // Diferido: no se crea en DB hasta el commit de importación.
    setSelectedTypeKey(key);
    setResolvedTypeId(null);
  };

  const handleLinkType = (name: string, linkId: string) => {
    const key = normalizeTintCatalogName(name);
    setTypeLinks((prev) => ({ ...prev, [key]: linkId }));
    setSelectedTypeKey(key);
    setResolvedTypeId(linkId);
  };

  const handleCreateFamily = async () => {
    if (!selectedFamilyKey) return;
    // Diferido: se materializa en el commit.
    setResolvedFamilyId(null);
  };

  const handleLinkFamily = () => {
    if (!selectedFamilyKey || !familyLinkId) return;
    const key = normalizeTintCatalogName(selectedFamilyKey);
    setFamilyLinks((prev) => ({ ...prev, [key]: familyLinkId }));
    setResolvedFamilyId(familyLinkId);
  };

  const continueFromPickType = async () => {
    if (typePickMode === "existing") {
      const picked = existingTypes.find((t) => t.id === existingTypePickId);
      if (!picked) return;
      applyPickedType(picked.name, picked.id);
      setMissingTypeStep("confirmBulk");
      return;
    }
    const raw = customTypeName.trim();
    if (!raw) return;
    const key = normalizeTintCatalogName(raw);
    const existingId = existingTypes.find((t) => normalizeTintCatalogName(t.name) === key)?.id ?? null;
    if (existingId) {
      applyPickedType(raw, existingId);
      setMissingTypeStep("confirmBulk");
      return;
    }
    await handleCreateType(raw);
    setMissingTypeStep("confirmBulk");
  };

  const applyManualFamilyPick = () => {
    if (manualFamilyMode === "existing") {
      const picked = existingFamilies.find((f) => f.id === existingFamilyPickId);
      if (!picked) return false;
      const key = normalizeTintCatalogName(picked.name);
      setSelectedFamilyKey(key);
      setResolvedFamilyId(picked.id);
      return true;
    }
    const raw = customFamilyName.trim();
    if (!raw) return false;
    const key = normalizeTintCatalogName(raw);
    const existingId = existingFamilies.find((f) => normalizeTintCatalogName(f.name) === key)?.id ?? null;
    setSelectedFamilyKey(key);
    setResolvedFamilyId(existingId);
    return true;
  };

  const resolveManualTypeOverrides = async (): Promise<Record<string, string>> => {
    const resolved: Record<string, string> = {};

    for (const [rowId, typeId] of Object.entries(manualTypeOverrides)) {
      if (typeId === MANUAL_TINT_TYPE_NEW) {
        const raw = manualCustomTypeNames[rowId]?.trim();
        if (!raw) continue;
        const key = normalizeTintCatalogName(raw);
        const hit = existingTypes.find((t) => normalizeTintCatalogName(t.name) === key);
        if (hit) {
          if (hit.id !== effectiveTypeId) resolved[rowId] = hit.id;
        } else {
          resolved[rowId] = `__pending__:${key}`;
        }
      } else if (typeId !== effectiveTypeId) {
        resolved[rowId] = typeId;
      }
    }

    return resolved;
  };

  const finishConfirm = (resolvedOverrides?: Record<string, string>) => {
    if (!selectedTypeKey || !selectedFamilyKey) return;
    const overrides: Record<string, string> = resolvedOverrides ?? {};
    if (!resolvedOverrides) {
      for (const [rowId, typeId] of Object.entries(manualTypeOverrides)) {
        if (typeId && typeId !== MANUAL_TINT_TYPE_NEW && typeId !== effectiveTypeId) {
          overrides[rowId] = typeId;
        }
      }
    }
    void onConfirm({
      typeKey: selectedTypeKey,
      typeId: effectiveTypeId,
      familyKey: selectedFamilyKey,
      familyId: effectiveFamilyId,
      typeLinks,
      familyLinks,
      defaultTintTypeApplied: csvMissingTintType,
      defaultTintFamilyApplied: csvMissingTintType && familyOptions.length === 0,
      tintTypeOverrides: overrides,
      selectAllTintRows: csvMissingTintType && bulkTypeConfirmed,
    });
  };

  const manualTypeContinueBlocked = Object.entries(manualTypeOverrides).some(
    ([rowId, typeId]) => typeId === MANUAL_TINT_TYPE_NEW && !manualCustomTypeNames[rowId]?.trim()
  );

  const showStandardTypePicker = !csvMissingTintType || missingTypeStep === "pickFamily";
  const showStandardFamilyPicker = !csvMissingTintType || missingTypeStep === "pickFamily";

  return (
    <div
      className={`admin-modal-overlay${open ? " open" : ""}`}
      onClick={(e) => e.target === e.currentTarget && !saving && !catalogBusy && onClose()}
      role="presentation"
    >
      <div className="admin-modal" style={{ maxWidth: 720 }}>
        <button type="button" className="modal-close" onClick={onClose} disabled={saving || catalogBusy}>
          ✕
        </button>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: "var(--dark)", marginBottom: 8 }}>
          Importar Tintes — tipo y familia
        </div>

        {csvMissingTintType && missingTypeStep === "pickType" && (
          <>
            <p style={{ marginTop: 0, marginBottom: 14, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55 }}>
              Parece que ninguno de los productos tiene un <strong>Tipo</strong> en el Excel. Para registrar tintes,
              deben tener un tipo asociado (por ejemplo familia <em>Royal</em> con tipo <em>Igora Royal</em>).
            </p>
            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13 }}>Elige el tipo para esta carga</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                className={`btn btn-sm ${typePickMode === "existing" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setTypePickMode("existing")}
              >
                Tipo registrado
              </button>
              <button
                type="button"
                className={`btn btn-sm ${typePickMode === "custom" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setTypePickMode("custom")}
              >
                Escribir nuevo
              </button>
            </div>
            {typePickMode === "existing" ? (
              <select
                className="form-select"
                style={{ width: "100%", minHeight: 40, marginBottom: 16 }}
                value={existingTypePickId}
                onChange={(e) => setExistingTypePickId(e.target.value)}
                disabled={saving || catalogBusy || existingTypes.length === 0}
              >
                <option value="">— Selecciona un tipo —</option>
                {existingTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="form-input"
                style={{ width: "100%", marginBottom: 16 }}
                placeholder="Ej. IGORA ROYAL"
                value={customTypeName}
                onChange={(e) => setCustomTypeName(e.target.value)}
                disabled={saving || catalogBusy}
              />
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap", alignItems: "center" }}>
              <button
                type="button"
                className="btn btn-sm"
                style={{ marginRight: "auto", background: "#fff3e0", border: "1px solid #e6a817", color: "#8a5c00", fontWeight: 600 }}
                disabled={saving || catalogBusy}
                onClick={onSkipTints}
                title="Excluye todos los productos Tintes de la importación y continúa con los demás"
              >
                ⊘ Omitir todos los Tintes
              </button>
              <button type="button" className="btn btn-outline" disabled={saving || catalogBusy} onClick={onClose}>
                Cerrar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={
                  saving ||
                  catalogBusy ||
                  (typePickMode === "existing" ? !existingTypePickId : !customTypeName.trim())
                }
                onClick={() => void continueFromPickType()}
              >
                Continuar
              </button>
            </div>
          </>
        )}

        {csvMissingTintType && missingTypeStep === "confirmBulk" && selectedTypeKey && (
          <>
            <p style={{ marginTop: 0, marginBottom: 14, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55 }}>
              ¿Confirmas ponerle el tipo <strong>{selectedTypeKey}</strong> a todos los tintes que intentas subir (
              {tintRowCount} producto{tintRowCount === 1 ? "" : "s"})? O deseas editar alguno manualmente.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setBulkTypeConfirmed(false);
                  setMissingTypeStep("manualType");
                }}
              >
                Editar manualmente
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setBulkTypeConfirmed(true);
                  setMissingTypeStep("pickFamily");
                }}
              >
                Confirmar para todos
              </button>
            </div>
          </>
        )}

        {csvMissingTintType && missingTypeStep === "manualType" && selectedTypeKey && effectiveTypeId && (
          <>
            <p style={{ marginTop: 0, marginBottom: 10, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
              Tipo por defecto: <strong>{selectedTypeKey}</strong>. Cambia solo los productos que necesiten otro tipo.
              Puedes elegir un tipo registrado o escribir uno nuevo.
            </p>
            <input
              className="form-input"
              style={{ width: "100%", marginBottom: 12 }}
              placeholder="Buscar por nombre, código o nivel…"
              value={manualSearch}
              onChange={(e) => setManualSearch(e.target.value)}
            />
            <div
              style={{
                border: "1px solid var(--line, #e7d9d4)",
                borderRadius: "var(--radius-md)",
                maxHeight: 280,
                overflow: "auto",
                marginBottom: 16,
              }}
            >
              <table className="admin-table" style={{ minWidth: 560, margin: 0 }}>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Código</th>
                    <th>Nivel</th>
                    <th>Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredManualRows.map((r) => {
                    const rowId = r.previewRowId;
                    const isCustomRow = manualTypeOverrides[rowId] === MANUAL_TINT_TYPE_NEW;
                    const currentTypeId = isCustomRow
                      ? MANUAL_TINT_TYPE_NEW
                      : (manualTypeOverrides[rowId] ?? effectiveTypeId);
                    return (
                      <tr key={rowId}>
                        <td style={{ fontSize: 12 }}>{effectiveProductTitle(r.mapped) ?? "—"}</td>
                        <td style={{ fontFamily: "monospace", fontSize: 11 }}>{r.codeRaw ?? "—"}</td>
                        <td style={{ fontSize: 12 }}>{r.mapped.tintLevel ?? "—"}</td>
                        <td>
                          <select
                            className="form-select"
                            style={{ minWidth: 160, minHeight: 32, fontSize: 12 }}
                            value={currentTypeId}
                            disabled={saving || catalogBusy}
                            onChange={(e) => {
                              const next = e.target.value;
                              if (next === MANUAL_TINT_TYPE_NEW) {
                                setManualTypeOverrides((prev) => ({ ...prev, [rowId]: MANUAL_TINT_TYPE_NEW }));
                                return;
                              }
                              setManualCustomTypeNames((prev) => {
                                const copy = { ...prev };
                                delete copy[rowId];
                                return copy;
                              });
                              setManualTypeOverrides((prev) => {
                                if (next === effectiveTypeId) {
                                  const copy = { ...prev };
                                  delete copy[rowId];
                                  return copy;
                                }
                                return { ...prev, [rowId]: next };
                              });
                            }}
                          >
                            <option value={effectiveTypeId}>
                              {selectedTypeKey} (por defecto)
                            </option>
                            {typeSelectOptions
                              .filter((t) => t.id !== effectiveTypeId)
                              .map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name}
                                </option>
                              ))}
                            <option value={MANUAL_TINT_TYPE_NEW}>✏️ Escribir nuevo…</option>
                          </select>
                          {isCustomRow && (
                            <input
                              className="form-input"
                              style={{ marginTop: 6, minWidth: 160, fontSize: 12 }}
                              placeholder="Ej. IGORA VIBRANCE"
                              value={manualCustomTypeNames[rowId] ?? ""}
                              disabled={saving || catalogBusy}
                              onChange={(e) =>
                                setManualCustomTypeNames((prev) => ({ ...prev, [rowId]: e.target.value }))
                              }
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button type="button" className="btn btn-outline" onClick={() => setMissingTypeStep("confirmBulk")}>
                Volver
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={saving || catalogBusy || manualTypeContinueBlocked}
                onClick={() => {
                  if (manualTypeContinueBlocked) return;
                  void (async () => {
                    const resolved = await resolveManualTypeOverrides();
                    setManualTypeOverrides(resolved);
                    setManualCustomTypeNames({});
                    setMissingTypeStep("pickFamily");
                  })();
                }}
              >
                Continuar con familia
              </button>
            </div>
          </>
        )}

        {(!csvMissingTintType || missingTypeStep === "pickFamily") && (
          <>
            {!csvMissingTintType && (
              <p style={{ marginTop: 0, marginBottom: 16, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                Este archivo incluye tintes. Antes de emparejar imágenes, indica <strong>qué tipo y qué familia</strong>{" "}
                vas a subir en esta carga (por ejemplo ABSOLUTES + IR). Los niveles como 4-22 se repiten entre familias;
                por eso hay que acotar primero.
              </p>
            )}

            {csvMissingTintType && selectedTypeKey && (
              <p style={{ marginTop: 0, marginBottom: 14, fontSize: 13, color: "var(--text-muted)" }}>
                Tipo asignado: <strong>{selectedTypeKey}</strong>. Ahora elige la familia de esta carga.
              </p>
            )}

            {showStandardTypePicker && !csvMissingTintType && (
              <>
                <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13 }}>1. Tipo de tinte</div>
                {typeOptions.length === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>No se detectaron tipos en el CSV.</p>
                ) : (
                  <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
                    {typeOptions.map((opt) => (
                      <button
                        key={opt.name}
                        type="button"
                        className={`btn ${selectedTypeKey === opt.name ? "btn-primary" : "btn-outline"}`}
                        style={{ justifyContent: "space-between", display: "flex", textAlign: "left" }}
                        disabled={saving || catalogBusy}
                        onClick={() => {
                          setSelectedTypeKey(opt.name);
                          setSelectedFamilyKey(null);
                          setResolvedTypeId(opt.catalogId);
                          setResolvedFamilyId(null);
                          setTypeLinkId("");
                          setFamilyLinkId("");
                        }}
                      >
                        <span>
                          <strong>{opt.name}</strong>
                          <span style={{ fontWeight: 400, marginLeft: 8, opacity: 0.85 }}>
                            ({opt.rowCount} fila{opt.rowCount === 1 ? "" : "s"})
                          </span>
                        </span>
                        <span style={{ fontSize: 11 }}>{opt.existsInCatalog ? "✓ En catálogo" : "Nuevo"}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {selectedType && typeNeedsCatalog && !csvMissingTintType && (
              <div
                style={{
                  border: "1px solid var(--dusty-rose)",
                  borderRadius: "var(--radius-md)",
                  padding: "12px 14px",
                  marginBottom: 16,
                  background: "#fff",
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Tipo «{selectedType.name}» no está en catálogo</div>
                <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--text-muted)" }}>
                  Se creará automáticamente al importar los productos.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={saving || catalogBusy}
                    onClick={() => void handleCreateType(selectedType.name)}
                  >
                    Usar este tipo (crear al importar)
                  </button>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>o vincular a:</span>
                  <select
                    className="form-select"
                    style={{ minWidth: 180, minHeight: 36 }}
                    disabled={saving || catalogBusy || existingTypes.length === 0}
                    value={typeLinkId}
                    onChange={(e) => setTypeLinkId(e.target.value)}
                  >
                    <option value="">— Existente —</option>
                    {existingTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={saving || catalogBusy || !typeLinkId}
                    onClick={() => handleLinkType(selectedType.name, typeLinkId)}
                  >
                    Vincular
                  </button>
                </div>
              </div>
            )}

            {selectedTypeKey && showStandardFamilyPicker && (
              <>
                <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13 }}>
                  {csvMissingTintType ? "Familia de esta carga" : `2. Familia (dentro de ${selectedTypeKey})`}
                </div>
                {familyOptions.length === 0 ? (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 10 }}>
                      No hay familias en el CSV. Elige una familia registrada o escribe una nueva.
                    </p>
                    <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className={`btn btn-sm ${manualFamilyMode === "existing" ? "btn-primary" : "btn-outline"}`}
                        onClick={() => setManualFamilyMode("existing")}
                      >
                        Familia registrada
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${manualFamilyMode === "custom" ? "btn-primary" : "btn-outline"}`}
                        onClick={() => setManualFamilyMode("custom")}
                      >
                        Escribir nueva
                      </button>
                    </div>
                    {manualFamilyMode === "existing" ? (
                      <select
                        className="form-select"
                        style={{ width: "100%", minHeight: 40 }}
                        value={existingFamilyPickId}
                        onChange={(e) => {
                          setExistingFamilyPickId(e.target.value);
                          const picked = existingFamilies.find((f) => f.id === e.target.value);
                          if (picked) {
                            setSelectedFamilyKey(normalizeTintCatalogName(picked.name));
                            setResolvedFamilyId(picked.id);
                          }
                        }}
                        disabled={saving || catalogBusy}
                      >
                        <option value="">— Selecciona una familia —</option>
                        {existingFamilies.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="form-input"
                        style={{ width: "100%" }}
                        placeholder="Ej. ROYAL"
                        value={customFamilyName}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setCustomFamilyName(raw);
                          if (raw.trim()) {
                            const key = normalizeTintCatalogName(raw);
                            setSelectedFamilyKey(key);
                            const existingId =
                              existingFamilies.find((f) => normalizeTintCatalogName(f.name) === key)?.id ?? null;
                            setResolvedFamilyId(existingId);
                          }
                        }}
                        disabled={saving || catalogBusy}
                      />
                    )}
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
                    {familyOptions.map((opt) => (
                      <button
                        key={opt.name}
                        type="button"
                        className={`btn ${selectedFamilyKey === opt.name ? "btn-primary" : "btn-outline"}`}
                        style={{ justifyContent: "space-between", display: "flex", textAlign: "left" }}
                        disabled={saving || catalogBusy}
                        onClick={() => {
                          setSelectedFamilyKey(opt.name);
                          setResolvedFamilyId(opt.catalogId);
                          setFamilyLinkId("");
                        }}
                      >
                        <span>
                          <strong>{opt.name}</strong>
                          <span style={{ fontWeight: 400, marginLeft: 8, opacity: 0.85 }}>
                            ({opt.rowCount} producto{opt.rowCount === 1 ? "" : "s"})
                          </span>
                        </span>
                        <span style={{ fontSize: 11 }}>{opt.existsInCatalog ? "✓ En catálogo" : "Nuevo"}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {(selectedFamily && familyNeedsCatalog) ||
            (familyOptions.length === 0 && selectedFamilyKey && !effectiveFamilyId) ? (
              <div
                style={{
                  border: "1px solid var(--dusty-rose)",
                  borderRadius: "var(--radius-md)",
                  padding: "12px 14px",
                  marginBottom: 16,
                  background: "#fff",
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 8 }}>
                  Familia «{selectedFamily?.name ?? selectedFamilyKey}» no está en catálogo
                </div>
                <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--text-muted)" }}>
                  Se creará automáticamente al importar los productos.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={saving || catalogBusy}
                    onClick={() => void handleCreateFamily()}
                  >
                    Usar esta familia (crear al importar)
                  </button>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>o vincular a:</span>
                  <select
                    className="form-select"
                    style={{ minWidth: 180, minHeight: 36 }}
                    disabled={saving || catalogBusy || existingFamilies.length === 0}
                    value={familyLinkId}
                    onChange={(e) => setFamilyLinkId(e.target.value)}
                  >
                    <option value="">— Existente —</option>
                    {existingFamilies.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={saving || catalogBusy || !familyLinkId}
                    onClick={handleLinkFamily}
                  >
                    Vincular
                  </button>
                </div>
              </div>
            ) : null}

            {(!csvMissingTintType || missingTypeStep === "pickFamily") && (
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap", alignItems: "center" }}>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ marginRight: "auto", background: "#fff3e0", border: "1px solid #e6a817", color: "#8a5c00", fontWeight: 600 }}
                  disabled={saving || catalogBusy}
                  onClick={onSkipTints}
                  title="Excluye todos los productos Tintes de la importación y continúa con los demás"
                >
                  ⊘ Omitir todos los Tintes
                </button>
                <button type="button" className="btn btn-outline" disabled={saving || catalogBusy} onClick={onClose}>
                  Cerrar
                </button>
                <button
                  type="button"
                  className={`btn btn-primary${saving || catalogBusy ? " admin-btn--loading-pulse" : ""}`}
                  disabled={saving || catalogBusy || !canConfirm}
                  onClick={() => {
                    if (familyOptions.length === 0 && !applyManualFamilyPick()) return;
                    finishConfirm();
                  }}
                >
                  {saving || catalogBusy ? (
                    <>
                      <span className="admin-inline-spinner" aria-hidden />
                      Aplicando…
                    </>
                  ) : (
                    "Continuar con este tipo y familia"
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function AdminBulkLowMatchModal({
  open,
  breakdown,
  headers,
  codeColumnIndex,
  codeColumnCandidates,
  reanalyzing,
  onConfirm,
  onCancel,
  onReanalyzeWithColumn,
}: {
  open: boolean;
  breakdown: ReturnType<typeof computeBulkCsvZipMatchBreakdown> | null;
  headers: string[];
  codeColumnIndex: number;
  codeColumnCandidates: { index: number; header: string; score: number }[];
  reanalyzing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onReanalyzeWithColumn: (columnIndex: number) => void;
}) {
  const [selectedColumnIndex, setSelectedColumnIndex] = useState(codeColumnIndex);

  useEffect(() => {
    if (open) setSelectedColumnIndex(codeColumnIndex);
  }, [open, codeColumnIndex]);

  if (!breakdown) return null;

  const currentHeader = headers[codeColumnIndex]?.trim() || `Columna ${codeColumnIndex + 1}`;
  const otherCandidates = codeColumnCandidates.filter((c) => c.index !== codeColumnIndex).slice(0, 4);

  return (
    <div
      className={`admin-modal-overlay${open ? " open" : ""}`}
      onClick={(e) => e.target === e.currentTarget && !reanalyzing && onCancel()}
      role="presentation"
    >
      <div className="admin-modal" style={{ maxWidth: 600 }}>
        <button type="button" className="modal-close" onClick={onCancel} disabled={reanalyzing}>
          ✕
        </button>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: "var(--dark)", marginBottom: 8 }}>
          ¿Archivos correctos?
        </div>
        <p style={{ marginTop: 0, marginBottom: 14, fontSize: 14, color: "var(--text-muted)", lineHeight: 1.55 }}>
          ¿Estás seguro de que son las imágenes correctas y el Excel correcto? Parece que casi no hubo coincidencias
          entre los dos. A veces el match no usa el código de producto, sino otra columna (por ejemplo{" "}
          <strong>id de la imagen</strong>).
        </p>
        <div
          style={{
            display: "grid",
            gap: 10,
            marginBottom: 16,
            padding: "12px 14px",
            borderRadius: "var(--radius-md)",
            background: "var(--lavender-light)",
            border: "1px solid rgba(199, 165, 178, 0.45)",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          <div>
            <strong>Columna usada ahora:</strong> {currentHeader}
          </div>
          <div>
            <strong>Coincidencia general:</strong> {formatBulkMatchPercent(breakdown.overallMatchRate)} (mínimo
            recomendado: 3%)
          </div>
          <div>
            Filas CSV con imagen: {breakdown.matchedCsvRows} de {breakdown.totalCsvRows} (
            {formatBulkMatchPercent(breakdown.csvMatchRate)})
          </div>
          <div>
            Imágenes del ZIP emparejadas: {breakdown.matchedZipImages} de {breakdown.totalZipImages} (
            {formatBulkMatchPercent(breakdown.zipMatchRate)})
          </div>
        </div>

        <div
          style={{
            marginBottom: 18,
            padding: "14px 16px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--line, #e7d9d4)",
            background: "#fff",
          }}
        >
          <label className="form-label" style={{ marginBottom: 6, display: "block" }}>
            Columna del CSV para hacer match con el nombre del archivo
          </label>
          <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.45 }}>
            Por defecto se usa el código de producto. Si tus fotos coinciden con otra columna (p. ej. id de
            imagen), elígela y vuelve a analizar sin subir de nuevo el CSV/ZIP.
          </p>
          <select
            className="form-select"
            value={selectedColumnIndex}
            disabled={reanalyzing || headers.length === 0}
            onChange={(e) => setSelectedColumnIndex(Number(e.target.value))}
            style={{ width: "100%", marginBottom: otherCandidates.length ? 10 : 12 }}
          >
            {headers.map((h, i) => (
              <option key={`${h}-${i}`} value={i}>
                {h?.trim() || `(vacío ${i + 1})`}
                {i === codeColumnIndex ? " — actual" : ""}
              </option>
            ))}
          </select>
          {otherCandidates.length > 0 ? (
            <div style={{ margin: "0 0 12px", fontSize: 12, color: "var(--text-muted)" }}>
              <span style={{ marginRight: 6 }}>Sugeridas:</span>
              {otherCandidates.map((c) => (
                <button
                  key={c.index}
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={reanalyzing}
                  style={{ marginRight: 6, marginBottom: 4 }}
                  onClick={() => setSelectedColumnIndex(c.index)}
                >
                  {c.header?.trim() || `Col ${c.index + 1}`}
                </button>
              ))}
            </div>
          ) : null}
          <button
            type="button"
            className="btn btn-rose"
            disabled={reanalyzing || headers.length === 0}
            onClick={() => onReanalyzeWithColumn(selectedColumnIndex)}
            style={{ width: "100%" }}
          >
            {reanalyzing ? (
              <>
                <span className="admin-inline-spinner" aria-hidden />
                Reanalizando…
              </>
            ) : (
              "Reanalizar con esta columna"
            )}
          </button>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button type="button" className="btn btn-outline" onClick={onCancel} disabled={reanalyzing}>
            Cancelar, volveré a verificarlo
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirm} disabled={reanalyzing}>
            Confirmar con esta coincidencia
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminBulkNewCategoriesModal({
  open,
  items,
  saving,
  onClose,
  onSkip,
  onConfirm,
}: {
  open: boolean;
  items: BulkPreviewNewTaxonomyItem[];
  saving: boolean;
  onClose: () => void;
  onSkip: () => void;
  onConfirm: () => void;
}) {
  const totalNewRows = items.reduce((sum, it) => sum + it.rowCount, 0);

  return (
    <div
      className={`admin-modal-overlay${open ? " open" : ""}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="presentation"
    >
      <div className="admin-modal" style={{ maxWidth: 820 }}>
        <button type="button" className="modal-close" onClick={onClose}>
          ✕
        </button>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: "var(--dark)", marginBottom: 8 }}>
          Categorías faltantes — solo productos nuevos
        </div>
        <div
          style={{
            marginBottom: 14,
            padding: "12px 14px",
            borderRadius: "var(--radius-md)",
            background: "#f8f5f2",
            border: "1px solid var(--line, #e7d9d4)",
            fontSize: 13,
            lineHeight: 1.55,
            color: "var(--text-muted)",
          }}
        >
          <p style={{ margin: "0 0 8px", color: "var(--dark)" }}>
            <strong>¿Qué significa esto?</strong> El CSV trae nombres de categoría o subcategoría que el sistema aún no
            tiene registrados, pero <strong>solo para productos que todavía no existen en tienda</strong>.
          </p>
          <p style={{ margin: 0 }}>
            Los productos cuyo <strong>código ya está registrado no se vuelven a crear</strong> ni necesitan que recrees su
            categoría. Si tu objetivo es solo <strong>agrupar variantes</strong> (columna Barras), elige «Continuar sin
            crear», selecciona las filas existentes y usa la política «Omitir existentes…».
          </p>
        </div>
        <p style={{ marginTop: 0, marginBottom: 14, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
          Si aceptas, se registrarán para <strong>{totalNewRows} producto(s) nuevo(s)</strong> y se{" "}
          <strong>crearán en el sistema solo al importar</strong> (al terminar el match y confirmar la subida). Los ya
          registrados no se tocan.
        </p>
        <div
          style={{
            border: "1px solid var(--line, #e7d9d4)",
            borderRadius: "var(--radius-md)",
            maxHeight: 320,
            overflow: "auto",
            marginBottom: 16,
          }}
        >
          <table className="admin-table" style={{ minWidth: 620, margin: 0 }}>
            <thead>
              <tr>
                <th>Qué falta</th>
                <th>Nombre en el CSV</th>
                <th>Subcategorías a crear</th>
                <th>Productos nuevos</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr
                  key={
                    it.kind === "newCategory"
                      ? `new-cat-${it.categoryName}`
                      : `new-sub-${it.parentCategorySlug}`
                  }
                >
                  <td style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                    {it.kind === "newCategory" ? (
                      <span style={{ color: "var(--dusty-rose)", fontWeight: 600 }}>Categoría completa</span>
                    ) : (
                      <span style={{ color: "#5a7ab8", fontWeight: 600 }}>Subcategorías en categoría existente</span>
                    )}
                  </td>
                  <td style={{ fontWeight: 700 }}>
                    {it.kind === "newCategory" ? (
                      it.categoryName
                    ) : (
                      <>
                        {it.parentCategoryName}
                        <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-muted)", display: "block" }}>
                          La categoría «{it.parentCategoryName}» ya existe; faltan subcategorías del CSV.
                        </span>
                      </>
                    )}
                  </td>
                  <td style={{ fontSize: 12 }}>{it.subcategories.length ? it.subcategories.join(", ") : "—"}</td>
                  <td style={{ fontWeight: 700 }}>{it.rowCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button type="button" className="btn btn-outline" disabled={saving} onClick={onSkip}>
            Continuar sin crear
          </button>
          <button type="button" className="btn btn-primary" disabled={saving} onClick={onConfirm}>
            {saving ? "Guardando…" : "✅ Aceptar (crear al importar)"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminSalesTab({
  sales,
  products,
  onReloadOnline,
}: {
  sales: AdminSale[];
  products: AdminProduct[];
  onReloadOnline?: () => void;
}) {
  const total = sales.reduce((s, v) => s + Number(v.total), 0);
  return (
    <>
      <div className="admin-sales-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div className="admin-sales-stats" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div className="admin-card" style={{ padding: "16px 24px", minWidth: 160, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Total ventas</div>
            <div className="stat-num" style={{ fontSize: 28 }}>{formatPrice(total)}</div>
          </div>
          <div className="admin-card" style={{ padding: "16px 24px", minWidth: 130, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}># Registros</div>
            <div className="stat-num" style={{ fontSize: 28 }}>{sales.length}</div>
          </div>
        </div>
        {onReloadOnline ? (
          <button type="button" className="btn btn-outline btn-sm" onClick={onReloadOnline}>
            🔄 Actualizar pedidos web
          </button>
        ) : null}
      </div>
      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "-12px 0 20px" }}>
        Se listan las compras aprobadas del checkout (base de datos) y las ventas que registres manualmente en esta sesión.
      </p>
      <div className="admin-card admin-table-wrap" style={{ padding: 0 }}>
        <table className="admin-table admin-table--sticky-product">
          <thead>
            <tr>
              <th style={{ padding: 16 }}>Producto</th>
              <th>Cliente</th>
              <th>Canal</th>
              <th>Cantidad</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                  Sin ventas aún. Si acabas de cobrar en la tienda, pulsa «Actualizar pedidos web» o recarga el panel.
                </td>
              </tr>
            ) : (
              sales.map((s) => {
                const p = products.find((x) => x.id === s.productId);
                return (
                  <tr key={String(s.id)}>
                    <td>
                      <div className="table-product-cell">
                        <AdminProductThumb imageUrl={p?.imageUrl ?? null} emoji={p?.emoji ?? "📦"} />
                        <div className="table-product-name">{s.productName}</div>
                      </div>
                    </td>
                    <td>{s.client}</td>
                    <td>{s.channel}</td>
                    <td>{s.qty}</td>
                    <td style={{ fontWeight: 600, color: "var(--dark)" }}>{formatPrice(s.total)}</td>
                    <td>
                      <span className={`status-chip ${s.status === "Completada" ? "status-active" : "status-low"}`}>{s.status}</span>
                    </td>
                    <td>{s.date}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function AdminStockTab({
  products,
  catalogStats,
  categoryTree,
  onPersistStock,
  stockSavingId,
}: {
  products: AdminProduct[];
  catalogStats: AdminCatalogStats;
  categoryTree: AdminCategoryTree[];
  onPersistStock: (id: string, stock: number) => Promise<void>;
  stockSavingId: string | null;
}) {
  const [stockSearch, setStockSearch] = useState("");
  const { stockNormal: ok, stockLow: low, stockOut: out } = catalogStats;

  const filteredStockProducts = useMemo(() => {
    const q = stockSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      const name = p.name.toLowerCase();
      const brand = (p.brand ?? "").toLowerCase();
      return name.includes(q) || brand.includes(q);
    });
  }, [products, stockSearch]);

  return (
    <>
      <div className="admin-stock-stats" style={{ marginBottom: 24, display: "flex", gap: 16 }}>
        <div className="admin-card admin-stock-stat-card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24 }}>✅</span>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--dark)" }}>{ok}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Stock normal</div>
          </div>
        </div>
        <div className="admin-card admin-stock-stat-card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--gold)" }}>{low}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Stock bajo (&lt;5)</div>
          </div>
        </div>
        <div className="admin-card admin-stock-stat-card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24 }}>❌</span>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--dusty-rose)" }}>{out}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Sin stock</div>
          </div>
        </div>
      </div>
      <div className="admin-card" style={{ padding: 14, marginBottom: 14 }}>
        <label className="form-label" htmlFor="admin-stock-search" style={{ marginBottom: 6 }}>
          Buscar producto
        </label>
        <input
          id="admin-stock-search"
          type="search"
          className="form-input"
          value={stockSearch}
          onChange={(e) => setStockSearch(e.target.value)}
          placeholder="Escribe el nombre o la marca…"
          autoComplete="off"
        />
        {stockSearch.trim() ? (
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
            {filteredStockProducts.length} coincidencia{filteredStockProducts.length === 1 ? "" : "s"}
          </p>
        ) : null}
      </div>
      <div className="admin-card admin-table-wrap" style={{ padding: 0 }}>
        <table className="admin-table admin-table--sticky-product">
          <thead>
            <tr>
              <th style={{ padding: 16 }}>Producto</th>
              <th>Categoría</th>
              <th>Stock actual</th>
              <th>Estado</th>
              <th>Actualizar</th>
            </tr>
          </thead>
          <tbody>
            {filteredStockProducts.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>
                  No hay productos que coincidan con «{stockSearch.trim()}».
                </td>
              </tr>
            ) : (
              filteredStockProducts.map((p) => {
              let cls = "status-active", lbl = "Normal";
              if (p.stock === 0) { cls = "status-out"; lbl = "Sin stock"; }
              else if (p.stock < 5) { cls = "status-low"; lbl = "Stock bajo"; }
              return (
                <tr key={p.id}>
                  <td>
                    <div className="table-product-cell">
                      <AdminProductThumb imageUrl={p.imageUrl} emoji={p.emoji} />
                      <div>
                        <div className="table-product-name">{p.name}</div>
                        <div className="table-product-cat">{p.brand}</div>
                      </div>
                    </div>
                  </td>
                  <td>{categoryDisplayName(p.category, categoryTree)}</td>
                  <td style={{ fontWeight: 600, color: p.stock === 0 ? "var(--dusty-rose)" : p.stock < 5 ? "var(--gold)" : "var(--sage-dark)", fontSize: 18 }}>{p.stock}</td>
                  <td><span className={`status-chip ${cls}`}>{lbl}</span></td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button
                        type="button"
                        className="btn-table"
                        disabled={stockSavingId === p.id}
                        onClick={() => void onPersistStock(p.id, Math.max(0, p.stock - 1))}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        key={`${p.id}-${p.stock}`}
                        defaultValue={p.stock}
                        min={0}
                        style={{ width: 60, textAlign: "center", border: "1px solid var(--cream)", borderRadius: "var(--radius-sm)", padding: 5, fontSize: 13, fontFamily: "var(--font-body)" }}
                        disabled={stockSavingId === p.id}
                        onBlur={(e) => {
                          const v = Math.max(0, Number(e.target.value) || 0);
                          if (v !== p.stock) void onPersistStock(p.id, v);
                        }}
                      />
                      <button
                        type="button"
                        className="btn-table"
                        disabled={stockSavingId === p.id}
                        onClick={() => void onPersistStock(p.id, p.stock + 1)}
                      >
                        +
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function AdminReportsTab({ sales, showToast }: { sales: AdminSale[]; showToast: (m: string, t?: string, i?: string) => void }) {
  const [showTop, setShowTop] = useState(false);
  const sorted = useMemo(() => {
    const counts: Record<string, number> = {};
    sales.forEach((s) => { counts[s.productName] = (counts[s.productName] || 0) + s.qty; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [sales]);
  const max = sorted[0]?.[1] ?? 1;
  return (
    <>
      <div className="stats-grid admin-reports-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="admin-card" style={{ textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, color: "var(--dark)", marginBottom: 8 }}>Reporte Mensual</div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>Análisis completo de ventas e inventario del mes actual.</p>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => showToast("Generando reporte...", "info", "📊")}>Generar PDF</button>
        </div>
        <div className="admin-card" style={{ textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📉</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, color: "var(--dark)", marginBottom: 8 }}>Productos más vendidos</div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>Top 10 productos con mayor volumen de ventas.</p>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowTop(true)}>Ver reporte</button>
        </div>
        <div className="admin-card" style={{ textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💸</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, color: "var(--dark)", marginBottom: 8 }}>Ganancias netas</div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>Cálculo de utilidad por período seleccionado.</p>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => showToast("Próximamente disponible", "info", "💸")}>Ver ganancias</button>
        </div>
      </div>
      {showTop && (
        <div className="admin-card admin-reports-top" style={{ marginTop: 0 }}>
          <div className="admin-card-title">🏆 Productos más vendidos</div>
          {sorted.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 14, textAlign: "center", padding: 24 }}>Sin datos de ventas aún</p>
          ) : (
            sorted.map(([name, count], idx) => (
              <div key={name} className="admin-reports-top-row" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--cream)" }}>
                <span style={{ fontSize: 16, width: 24, fontWeight: 700, color: "var(--text-muted)" }}>{idx + 1}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--dark)", marginBottom: 4 }}>{name}</div>
                  <div style={{ height: 6, background: "var(--cream)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(count / max) * 100}%`, background: "linear-gradient(90deg,var(--rose),var(--blush))", borderRadius: 3 }} />
                  </div>
                </div>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--dusty-rose)" }}>{count} uds</span>
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
}

function AdminCategoriesTab({
  tree,
  products,
  loading,
  error,
  onReload,
  showToast,
}: {
  tree: AdminCategoryTree[];
  products: AdminProduct[];
  loading: boolean;
  error: string | null;
  onReload: () => void;
  showToast: (msg: string, type?: string, icon?: string) => void;
}) {
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newIcon, setNewIcon] = useState("");
  const [busy, setBusy] = useState(false);

  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatSlug, setEditCatSlug] = useState("");
  const [editCatIcon, setEditCatIcon] = useState("");

  const [subDraft, setSubDraft] = useState<Record<string, string>>({});
  /** Texto manual del grupo menú (si no hay presets o modo "Otra…"). */
  const [subMenuTagDraft, setSubMenuTagDraft] = useState<Record<string, string>>({});
  /** Valor del `<select>` por categoría al crear subcategoría: "" | etiqueta del menú | __custom__ */
  const [subMenuTagSelectDraft, setSubMenuTagSelectDraft] = useState<Record<string, string>>({});
  const [editSubId, setEditSubId] = useState<string | null>(null);
  const [editSubName, setEditSubName] = useState("");
  const [editSubMenuTagSelect, setEditSubMenuTagSelect] = useState("");
  const [editSubMenuTagCustom, setEditSubMenuTagCustom] = useState("");
  const [subcategoryTagPreview, setSubcategoryTagPreview] = useState<{ title: string; tags: string[] } | null>(null);

  const sorted = useMemo(() => [...tree].sort((a, b) => a.sortOrder - b.sortOrder), [tree]);

  const tagsByCategorySub = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const p of products) {
      const key = `${(p.category ?? "").trim().toLowerCase()}::${(p.subcategory ?? "").trim().toLowerCase()}`;
      if (!key || key === "::") continue;
      const existing = map.get(key) ?? [];
      const seen = new Set(existing.map((t) => t.toLowerCase()));
      for (const tag of p.tags ?? []) {
        const v = tag.trim();
        if (!v) continue;
        const k = v.toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        existing.push(v);
      }
      map.set(key, existing);
    }
    return map;
  }, [products]);

  function startEditCat(c: AdminCategoryTree) {
    setEditCatId(c.id);
    setEditCatName(c.name);
    setEditCatSlug(c.slug);
    setEditCatIcon(c.icon ?? "");
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", maxWidth: 520, lineHeight: 1.5 }}>
          Los nombres en <strong>MAYÚSCULAS</strong> se guardan con solo mayúscula inicial (ej. «Cuidado facial»).
        </p>
        <button
          type="button"
          className="btn btn-outline"
          disabled={busy || loading}
          onClick={() => {
            if (
              !confirm(
                "¿Normalizar textos en MAYÚSCULAS de todas las categorías y subcategorías? También actualizará la subcategoría en los productos afectados."
              )
            ) {
              return;
            }
            void (async () => {
              setBusy(true);
              try {
                const res = await normalizeAdminCategoryTexts();
                const total = res.categoriesUpdated + res.subcategoriesUpdated;
                if (total === 0) {
                  showToast("No había textos en mayúsculas sostenidas por corregir.", "default", "ℹ️");
                } else {
                  showToast(
                    `Normalizado: ${res.categoriesUpdated} categoría(s), ${res.subcategoriesUpdated} subcategoría(s)${res.productsUpdated > 0 ? `, ${res.productsUpdated} producto(s)` : ""}.`,
                    "success",
                    "✅"
                  );
                }
                onReload();
              } catch (e) {
                showToast(e instanceof Error ? e.message : "Error al normalizar", "danger", "⚠️");
              } finally {
                setBusy(false);
              }
            })();
          }}
        >
          {busy ? (
            <>
              <span className="admin-inline-spinner" aria-hidden />
              Normalizando…
            </>
          ) : (
            "Normalizar textos"
          )}
        </button>
      </div>

      {error && (
        <div className="admin-card" style={{ marginBottom: 16, padding: 14, background: "var(--lavender-light)", border: "1px solid var(--dusty-rose)", fontSize: 13 }}>
          <strong>Error:</strong> {error}{" "}
          <button type="button" className="btn btn-outline btn-sm" style={{ marginLeft: 8 }} onClick={onReload}>
            Reintentar
          </button>
        </div>
      )}

      <div className="admin-card" style={{ marginBottom: 20 }}>
        <div className="admin-card-title">Nueva categoría</div>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Nombre *</label>
            <input type="text" className="form-input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ej: Maquillaje" />
          </div>
          <div className="form-group">
            <label className="form-label">Slug (opcional)</label>
            <input type="text" className="form-input" value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="Auto desde el nombre" />
          </div>
          <div className="form-group">
            <label className="form-label">Emoji</label>
            <input type="text" className="form-input" value={newIcon} onChange={(e) => setNewIcon(e.target.value)} maxLength={4} placeholder="💄" />
          </div>
          <div className="form-group" style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || !newName.trim()}
              onClick={() => {
                void (async () => {
                  setBusy(true);
                  try {
                    await createAdminCategory({
                      name: newName.trim(),
                      ...(newSlug.trim() ? { slug: newSlug.trim() } : {}),
                      ...(newIcon.trim() ? { icon: newIcon.trim() } : {}),
                    });
                    showToast("Categoría creada", "success", "✅");
                    setNewName("");
                    setNewSlug("");
                    setNewIcon("");
                    onReload();
                  } catch (e) {
                    showToast(e instanceof Error ? e.message : "Error", "danger", "⚠️");
                  } finally {
                    setBusy(false);
                  }
                })();
              }}
            >
              {busy ? (
                <>
                  <span className="admin-inline-spinner" aria-hidden />
                  Creando...
                </>
              ) : (
                "➕ Crear categoría"
              )}
            </button>
          </div>
        </div>
      </div>

      {loading && tree.length === 0 && (
        <p style={{ color: "var(--text-muted)" }}>Cargando categorías…</p>
      )}

      {sorted.map((cat) => (
        <div key={cat.id} className="admin-card" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div className="admin-card-title" style={{ marginBottom: 4 }}>
                {cat.icon ? `${cat.icon} ` : ""}{cat.name}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Slug: <code>{cat.slug}</code> · Orden: {cat.sortOrder}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => startEditCat(cat)}>
                ✏️ Editar
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ color: "var(--dusty-rose)", borderColor: "var(--dusty-rose)" }}
                onClick={() => {
                  if (!confirm(`¿Eliminar categoría "${cat.name}" y todas sus subcategorías?`)) return;
                  void (async () => {
                    try {
                      await deleteAdminCategory(cat.id);
                      showToast("Categoría eliminada", "default", "🗑️");
                      onReload();
                    } catch (e) {
                      showToast(e instanceof Error ? e.message : "No se pudo eliminar", "danger", "⚠️");
                    }
                  })();
                }}
              >
                🗑️ Eliminar
              </button>
            </div>
          </div>

          {editCatId === cat.id && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--cream)" }}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Nombre</label>
                  <input type="text" className="form-input" value={editCatName} onChange={(e) => setEditCatName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Slug</label>
                  <input type="text" className="form-input" value={editCatSlug} onChange={(e) => setEditCatSlug(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Emoji</label>
                  <input type="text" className="form-input" value={editCatIcon} onChange={(e) => setEditCatIcon(e.target.value)} maxLength={4} />
                </div>
                <div className="form-group" style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      void (async () => {
                        try {
                          await updateAdminCategory(cat.id, {
                            name: editCatName.trim(),
                            slug: editCatSlug.trim(),
                            icon: editCatIcon.trim() || null,
                          });
                          showToast("Categoría actualizada", "success", "✅");
                          setEditCatId(null);
                          onReload();
                        } catch (e) {
                          showToast(e instanceof Error ? e.message : "Error", "danger", "⚠️");
                        }
                      })();
                    }}
                  >
                    Guardar
                  </button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditCatId(null)}>
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--dark)", marginBottom: 8 }}>Subcategorías</div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 10px", maxWidth: 720 }}>
              <strong>Etiqueta de menú (dorada):</strong> agrupa la subcategoría en el mega menú. Las opciones provienen de las etiquetas ya usadas en esta categoría (misma fuente que Gestión del Menú).
            </p>
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ padding: 12 }}>Nombre</th>
                  <th>Slug</th>
                  <th>Etiqueta menú</th>
                  <th>Etiquetas prod.</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {[...cat.subcategories].sort((a, b) => a.sortOrder - b.sortOrder).length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 16, color: "var(--text-muted)", fontSize: 13 }}>
                      Sin subcategorías. Añade una abajo.
                    </td>
                  </tr>
                ) : (
                  [...cat.subcategories].sort((a, b) => a.sortOrder - b.sortOrder).map((s) => {
                    const menuGroupPresets = menuTagOptionsFromTree(tree, cat.slug, "");
                    return (
                    <tr key={s.id}>
                      <td style={{ padding: 12 }}>
                        {editSubId === s.id ? (
                          <input type="text" className="form-input" value={editSubName} onChange={(e) => setEditSubName(e.target.value)} style={{ maxWidth: 220 }} />
                        ) : (
                          s.name
                        )}
                      </td>
                      <td><code style={{ fontSize: 12 }}>{s.slug}</code></td>
                      <td>
                        {editSubId === s.id ? (
                          menuGroupPresets.length === 0 ? (
                            <input
                              type="text"
                              className="form-input"
                              value={editSubMenuTagCustom}
                              onChange={(e) => setEditSubMenuTagCustom(e.target.value)}
                              placeholder="Grupo menú (manual)"
                              style={{ maxWidth: 200 }}
                            />
                          ) : (
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                              <select
                                className="form-select"
                                style={{ minWidth: 160, maxWidth: 200 }}
                                value={editSubMenuTagSelect}
                                onChange={(e) => setEditSubMenuTagSelect(e.target.value)}
                                aria-label="Etiqueta de menú para la subcategoría"
                              >
                                <option value="">Sin etiqueta</option>
                                {menuGroupPresets.map((o) => (
                                  <option key={o} value={o}>
                                    {o}
                                  </option>
                                ))}
                                <option value={MENU_TAG_CUSTOM_VALUE}>Otra (manual)…</option>
                              </select>
                              {editSubMenuTagSelect === MENU_TAG_CUSTOM_VALUE && (
                                <input
                                  type="text"
                                  className="form-input"
                                  value={editSubMenuTagCustom}
                                  onChange={(e) => setEditSubMenuTagCustom(e.target.value)}
                                  placeholder="Nombre del grupo"
                                  style={{ maxWidth: 160 }}
                                />
                              )}
                            </div>
                          )
                        ) : (
                          s.menuTag ?? "—"
                        )}
                      </td>
                      <td>
                        {(() => {
                          const key = `${cat.slug.trim().toLowerCase()}::${s.name.trim().toLowerCase()}`;
                          const tags = tagsByCategorySub.get(key) ?? [];
                          if (tags.length === 0) return "—";
                          if (tags.length === 1) return tags[0];
                          return (
                            <button
                              type="button"
                              className="btn-table"
                              onClick={() => setSubcategoryTagPreview({ title: `${cat.name} / ${s.name}`, tags })}
                            >
                              {tags.length} Etiquetas
                            </button>
                          );
                        })()}
                      </td>
                      <td>
                        {editSubId === s.id ? (
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              type="button"
                              className="btn-table"
                              onClick={() => {
                                void (async () => {
                                  try {
                                    const mt = resolveMenuTagFromEditor(
                                      menuGroupPresets,
                                      editSubMenuTagSelect,
                                      editSubMenuTagCustom
                                    );
                                    await updateAdminSubcategory(s.id, {
                                      name: editSubName.trim(),
                                      menuTag: mt.length ? mt : null,
                                    });
                                    showToast("Subcategoría actualizada", "success", "✅");
                                    setEditSubId(null);
                                    setEditSubMenuTagSelect("");
                                    setEditSubMenuTagCustom("");
                                    onReload();
                                  } catch (e) {
                                    showToast(e instanceof Error ? e.message : "Error", "danger", "⚠️");
                                  }
                                })();
                              }}
                            >
                              OK
                            </button>
                            <button
                              type="button"
                              className="btn-table"
                              onClick={() => {
                                setEditSubId(null);
                                setEditSubMenuTagSelect("");
                                setEditSubMenuTagCustom("");
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              type="button"
                              className="btn-table"
                              onClick={() => {
                                const cur = s.menuTag ?? "";
                                setEditSubId(s.id);
                                setEditSubName(s.name);
                                if (menuGroupPresets.length === 0) {
                                  setEditSubMenuTagSelect("");
                                  setEditSubMenuTagCustom(cur);
                                } else if (cur && !menuGroupPresets.includes(cur)) {
                                  setEditSubMenuTagSelect(MENU_TAG_CUSTOM_VALUE);
                                  setEditSubMenuTagCustom(cur);
                                } else {
                                  setEditSubMenuTagSelect(cur);
                                  setEditSubMenuTagCustom("");
                                }
                              }}
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              className="btn-table danger"
                              onClick={() => {
                                if (!confirm(`¿Eliminar subcategoría "${s.name}"?`)) return;
                                void (async () => {
                                  try {
                                    await deleteAdminSubcategory(s.id);
                                    showToast("Eliminada", "default", "🗑️");
                                    onReload();
                                  } catch (e) {
                                    showToast(e instanceof Error ? e.message : "Error", "danger", "⚠️");
                                  }
                                })();
                              }}
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                  })
                )}
              </tbody>
            </table>
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
              <input
                type="text"
                className="form-input"
                style={{ maxWidth: 200 }}
                placeholder="Nueva subcategoría"
                value={subDraft[cat.id] ?? ""}
                onChange={(e) => setSubDraft((d) => ({ ...d, [cat.id]: e.target.value }))}
              />
              {(() => {
                const presets = menuTagOptionsFromTree(tree, cat.slug, "");
                const sel = subMenuTagSelectDraft[cat.id] ?? "";
                const custom = subMenuTagDraft[cat.id] ?? "";
                if (presets.length === 0) {
                  return (
                    <input
                      type="text"
                      className="form-input"
                      style={{ maxWidth: 200 }}
                      placeholder="Etiqueta de menú (manual)"
                      value={custom}
                      onChange={(e) => setSubMenuTagDraft((d) => ({ ...d, [cat.id]: e.target.value }))}
                    />
                  );
                }
                return (
                  <>
                    <select
                      className="form-select"
                      style={{ minWidth: 160, maxWidth: 200 }}
                      value={sel}
                      onChange={(e) =>
                        setSubMenuTagSelectDraft((d) => ({ ...d, [cat.id]: e.target.value }))
                      }
                      aria-label="Etiqueta de menú al crear subcategoría"
                    >
                      <option value="">Sin etiqueta</option>
                      {presets.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                      <option value={MENU_TAG_CUSTOM_VALUE}>Otra (manual)…</option>
                    </select>
                    {sel === MENU_TAG_CUSTOM_VALUE && (
                      <input
                        type="text"
                        className="form-input"
                        style={{ maxWidth: 160 }}
                        placeholder="Nombre del grupo"
                        value={custom}
                        onChange={(e) => setSubMenuTagDraft((d) => ({ ...d, [cat.id]: e.target.value }))}
                      />
                    )}
                  </>
                );
              })()}
              <button
                type="button"
                className="btn btn-rose btn-sm"
                disabled={busy || !(subDraft[cat.id] ?? "").trim()}
                onClick={() => {
                  const nm = (subDraft[cat.id] ?? "").trim();
                  if (!nm) return;
                  const presets = menuTagOptionsFromTree(tree, cat.slug, "");
                  const sel = subMenuTagSelectDraft[cat.id] ?? "";
                  const custom = (subMenuTagDraft[cat.id] ?? "").trim();
                  const mt = resolveMenuTagFromEditor(presets, sel, custom);
                  void (async () => {
                    setBusy(true);
                    try {
                      await createAdminSubcategory(cat.id, {
                        name: nm,
                        ...(mt ? { menuTag: mt } : {}),
                      });
                      showToast("Subcategoría creada", "success", "✅");
                      setSubDraft((d) => ({ ...d, [cat.id]: "" }));
                      setSubMenuTagDraft((d) => ({ ...d, [cat.id]: "" }));
                      setSubMenuTagSelectDraft((d) => ({ ...d, [cat.id]: "" }));
                      onReload();
                    } catch (e) {
                      showToast(e instanceof Error ? e.message : "Error", "danger", "⚠️");
                    } finally {
                      setBusy(false);
                    }
                  })();
                }}
              >
                {busy ? (
                  <>
                    <span className="admin-inline-spinner" aria-hidden />
                    Creando...
                  </>
                ) : (
                  "+ Añadir subcategoría"
                )}
              </button>
            </div>
          </div>
        </div>
      ))}

      {!loading && sorted.length === 0 && (
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>No hay categorías. Crea la primera arriba o ejecuta el seed.</p>
      )}

      <div
        className={`admin-modal-overlay${subcategoryTagPreview ? " open" : ""}`}
        onClick={(e) => e.target === e.currentTarget && setSubcategoryTagPreview(null)}
        role="presentation"
      >
        <div className="admin-modal" style={{ maxWidth: 420 }}>
          <button type="button" className="modal-close" onClick={() => setSubcategoryTagPreview(null)}>✕</button>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: "var(--dark)", marginBottom: 6 }}>
            Etiquetas
          </div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 0 }}>
            {subcategoryTagPreview?.title}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {(subcategoryTagPreview?.tags ?? []).map((t) => (
              <span
                key={t}
                style={{
                  fontSize: 12,
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid var(--line)",
                  background: "var(--ivory)",
                  color: "var(--text)",
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function AdminAddSaleModal({
  open,
  onClose,
  products,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  products: AdminProduct[];
  onSave: (s: AdminSale) => void;
}) {
  const [productId, setProductId] = useState("");
  const [client, setClient] = useState("");
  const [qty, setQty] = useState("1");
  const [channel, setChannel] = useState("Tienda física");
  const [status, setStatus] = useState("Completada");
  const [total, setTotal] = useState("");
  const [notes, setNotes] = useState("");

  const prod = products.find((p) => String(p.id) === productId);

  return (
    <div className={`admin-modal-overlay${open ? " open" : ""}`} onClick={(e) => e.target === e.currentTarget && onClose()} role="presentation">
      <div className="admin-modal">
        <button type="button" className="modal-close" onClick={onClose}>✕</button>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: "var(--dark)", marginBottom: 20 }}>Registrar venta manual</div>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Producto *</label>
            <select className="form-select" value={productId} onChange={(e) => {
              setProductId(e.target.value);
              const p = products.find((x) => String(x.id) === e.target.value);
              const q = Number(qty) || 1;
              if (p) setTotal(String(p.price * q));
            }}>
              <option value="">Seleccionar producto...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.emoji} {p.name} — {formatPrice(p.price)}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Nombre del cliente</label>
            <input type="text" className="form-input" value={client} onChange={(e) => setClient(e.target.value)} placeholder="Nombre del cliente" />
          </div>
          <div className="form-group">
            <label className="form-label">Cantidad *</label>
            <input type="number" className="form-input" value={qty} min={1} onChange={(e) => {
              setQty(e.target.value);
              const p = products.find((x) => String(x.id) === productId);
              if (p) setTotal(String(p.price * (Number(e.target.value) || 1)));
            }} />
          </div>
          <div className="form-group">
            <label className="form-label">Canal de venta</label>
            <select className="form-select" value={channel} onChange={(e) => setChannel(e.target.value)}>
              <option value="Tienda física">Tienda física</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Web">Web</option>
              <option value="Instagram">Instagram</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Estado</label>
            <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="Completada">Completada</option>
              <option value="Pendiente">Pendiente</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Total (COP)</label>
            <input type="number" className="form-input" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="Se auto-calcula" />
          </div>
          <div className="form-group full-width">
            <label className="form-label">Notas</label>
            <input type="text" className="form-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones opcionales" />
          </div>
        </div>
        <button type="button" className="btn btn-rose" style={{ width: "100%", justifyContent: "center" }} onClick={() => {
          const q = Number(qty) || 1;
          const t = Number(total) || (prod ? prod.price * q : 0);
          onSave({
            id: Date.now(),
            productId: prod ? prod.id : null,
            productName: prod ? prod.name : "Producto manual",
            client: client || "Anónimo",
            channel,
            qty: q,
            total: t,
            status,
            notes,
            date: new Date().toLocaleDateString("es-CO"),
          });
          onClose();
        }}>✅ Registrar venta</button>
      </div>
    </div>
  );
}

function AdminProductDetailModal({
  open,
  product,
  saving,
  categoryTree,
  brandOptions,
  tagOptions,
  onReloadCategories,
  onReloadFamilies,
  onClose,
  onSave,
  onDelete,
  onProductRefresh,
  showToast,
}: {
  open: boolean;
  product: AdminProduct | null;
  saving: boolean;
  categoryTree: AdminCategoryTree[];
  brandOptions: string[];
  tagOptions: string[];
  onReloadCategories: () => Promise<void>;
  onReloadFamilies: () => Promise<void>;
  onClose: () => void;
  onSave: (patch: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  onProductRefresh?: (p: AdminProduct) => void;
  showToast: (msg: string, type?: string, icon?: string) => void;
}) {
  const [editingMode, setEditingMode] = useState(false);
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const [editName, setEditName] = useState("");
  const [editBrand, setEditBrand] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editSubcategory, setEditSubcategory] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editPrice, setEditPrice] = useState("");
  const [editOriginalPrice, setEditOriginalPrice] = useState("");
  const [editStock, setEditStock] = useState("");
  const [editEmoji, setEditEmoji] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editBadge, setEditBadge] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editFeatured, setEditFeatured] = useState(false);
  const [descriptionGenerating, setDescriptionGenerating] = useState(false);

  const applyProductToForm = useCallback((p: AdminProduct) => {
    setEditName(p.name);
    setEditBrand(p.brand || "");
    setEditCategory(p.category);
    setEditSubcategory(p.subcategory || "");
    setEditTags(productOwnTags(p));
    setEditPrice(String(p.price));
    setEditOriginalPrice(p.originalPrice != null ? String(p.originalPrice) : "");
    setEditStock(String(p.stock));
    setEditEmoji(p.emoji || "");
    setEditDescription(p.description || "");
    setEditBadge(p.badge || "");
    setEditActive(p.active);
    setEditFeatured(p.featuredInHome === true);
  }, []);

  useEffect(() => {
    if (!open || !product) return;
    setEditingMode(false);
    setDescriptionGenerating(false);
    applyProductToForm(product);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset al cambiar de producto
  }, [open, product?.id]);

  useEffect(() => {
    if (!open || !product || editingMode) return;
    applyProductToForm(product);
  }, [open, product, editingMode, applyProductToForm]);

  const sortedCats = useMemo(
    () => [...categoryTree].sort((a, b) => a.sortOrder - b.sortOrder),
    [categoryTree]
  );

  const brandSelectOptions = useMemo(
    () => brandOptions.map((b) => ({ value: b, label: b })),
    [brandOptions]
  );

  const categorySelectOptions = useMemo(
    () =>
      sortedCats.map((c) => ({
        value: c.slug,
        label: `${c.icon ? `${c.icon} ` : ""}${c.name}`,
      })),
    [sortedCats]
  );

  const subRowsForEdit = useMemo(() => {
    if (!editCategory) return [];
    const c = categoryTree.find((x) => x.slug === editCategory);
    return c ? [...c.subcategories].sort((a, b) => a.sortOrder - b.sortOrder) : [];
  }, [editCategory, categoryTree]);

  const subcategorySelectOptions = useMemo(() => {
    const out = subRowsForEdit.map((s) => ({ value: s.name, label: s.name }));
    if (editSubcategory && !subRowsForEdit.some((s) => s.name === editSubcategory)) {
      out.unshift({ value: editSubcategory, label: editSubcategory });
    }
    return out;
  }, [subRowsForEdit, editSubcategory]);

  const tagCatalogOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const t of [...tagOptions, ...editTags]) {
      const trimmed = t.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(trimmed);
    }
    out.sort((a, b) => a.localeCompare(b, "es"));
    return out;
  }, [tagOptions, editTags]);

  const editMenuTagPreview = useMemo(() => {
    if (!product || !editCategory || !editSubcategory) return null;
    return menuTagForProduct(
      { category: editCategory, subcategory: editSubcategory },
      categoryTree,
    );
  }, [product, editCategory, editSubcategory, categoryTree]);

  const runDescriptionAi = useCallback(() => {
    if (!product) return;
    setDescriptionGenerating(true);
    void (async () => {
      try {
        const hasText = Boolean(
          (editingMode ? editDescription : product.description)?.trim()
        );
        const result = await postAdminProductsAiCompleteOne(product.id, {
          fields: ["description"],
          forceRegenerate: hasText,
          rewriteDescriptions: hasText,
        });
        if (result.product) {
          onProductRefresh?.(result.product);
          setEditDescription(result.product.description || "");
          if (!editingMode) applyProductToForm(result.product);
        }
        if (result.ok && result.filled.includes("description")) {
          showToast(
            hasText ? "Descripción reescrita con IA" : "Descripción generada con IA",
            "success",
            "📝",
          );
        } else {
          showToast(result.error ?? "No se pudo generar la descripción", "danger", "⚠️");
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Error de IA", "danger", "⚠️");
      } finally {
        setDescriptionGenerating(false);
      }
    })();
  }, [
    product,
    editingMode,
    editDescription,
    onProductRefresh,
    applyProductToForm,
    showToast,
  ]);

  if (!open || !product) return null;

  const ownTags = productOwnTags(product);
  const productMenuTag = menuTagForProduct(product, categoryTree);

  const canMutateImages = editingMode && !saving;
  const canToggleFeatured = editingMode && !saving;
  const editBusy = saving || descriptionGenerating;

  return (
    <div className={`admin-modal-overlay${open ? " open" : ""}`} onClick={(e) => e.target === e.currentTarget && onClose()} role="presentation">
      <div className="admin-modal admin-product-detail-modal" style={{ maxWidth: 980 }}>
        <button type="button" className="modal-close" onClick={onClose}>
          ✕
        </button>
        <div className="admin-product-detail-title" style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: "var(--dark)", marginBottom: 18 }}>
          Detalle del producto
        </div>
        <div className="admin-product-detail-grid" style={{ display: "grid", gridTemplateColumns: "minmax(300px, 1fr) minmax(380px, 1.2fr)", gap: 20 }}>
          <div className="admin-product-detail-media">
            <div className="admin-product-detail-image" style={{ border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden", background: "var(--ivory)", aspectRatio: "1 / 1" }}>
              {isHttpImageUrl(product.imageUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.imageUrl!} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", fontSize: 64 }}>{product.emoji || "📦"}</div>
              )}
            </div>
            {editingMode && (
              <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <label className="btn btn-outline btn-sm" style={{ cursor: uploadingMain || saving ? "wait" : "pointer" }}>
                  {uploadingMain ? "Subiendo…" : "📤 Cambiar principal"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    style={{ display: "none" }}
                    disabled={!canMutateImages || uploadingMain}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (!f) return;
                      setUploadingMain(true);
                      void (async () => {
                        try {
                          const url = await uploadAdminProductImage(f);
                          const updated = await updateAdminProduct(product.id, { imageUrl: url });
                          onProductRefresh?.(updated);
                          showToast("Imagen principal actualizada", "success", "🖼️");
                        } catch (err) {
                          showToast(err instanceof Error ? err.message : "Error al subir", "danger", "⚠️");
                        } finally {
                          setUploadingMain(false);
                        }
                      })();
                    }}
                  />
                </label>
              </div>
            )}
          </div>

          <div className="admin-product-detail-body">
            {!editingMode ? (
              <>
                <div className="admin-product-detail-meta" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                  <div className="admin-card" style={{ padding: 12 }}>
                    <strong>Marca:</strong> {product.brand || "—"}
                  </div>
                  <div className="admin-card" style={{ padding: 12 }}>
                    <strong>Categoría:</strong> {categoryDisplayName(product.category, categoryTree)}
                  </div>
                  <div className="admin-card" style={{ padding: 12 }}>
                    <strong>Subcategoría:</strong> {product.subcategory || "—"}
                  </div>
                  <div className="admin-card" style={{ padding: 12 }}>
                    <strong>Badge:</strong> {product.badge || "—"}
                  </div>
                  <div className="admin-card" style={{ padding: 12 }}>
                    <strong>Etiqueta menú:</strong> {productMenuTag ?? "—"}
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                      Columna dorada del mega menú (subcategoría). No es la etiqueta del producto.
                    </div>
                  </div>
                  <div className="admin-card" style={{ padding: 12, gridColumn: "1 / -1" }}>
                    <strong style={{ display: "block", marginBottom: 8 }}>Etiquetas del producto</strong>
                    {ownTags.length === 0 ? (
                      <span style={{ color: "var(--text-muted)" }}>—</span>
                    ) : (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {ownTags.map((t) => (
                          <span
                            key={t}
                            style={{
                              fontSize: 12,
                              border: "1px solid rgba(201, 145, 139, 0.45)",
                              padding: "6px 10px",
                              borderRadius: 999,
                              background: "rgba(255,255,255,0.9)",
                            }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="admin-card" style={{ padding: 12 }}>
                    <strong>Precio:</strong> {formatPrice(product.price)}
                  </div>
                  <div className="admin-card" style={{ padding: 12 }}>
                    <strong>Stock:</strong> {product.stock}
                  </div>
                  <div className="admin-card" style={{ padding: 12 }}>
                    <strong>Estado:</strong> {product.active ? "Activo" : "Inactivo"}
                  </div>
                </div>

                <div className="admin-card" style={{ padding: 12, marginBottom: 14 }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      cursor: "not-allowed",
                      fontSize: 13,
                      lineHeight: 1.45,
                      opacity: 0.85,
                    }}
                  >
                    <input type="checkbox" checked={product.featuredInHome === true} disabled style={{ marginTop: 3 }} />
                    <span>
                      <strong>Prioridad en el home</strong>
                      <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>
                        Activa <strong>Editar</strong> abajo para cambiar esta u otras opciones.
                      </div>
                    </span>
                  </label>
                </div>

                <div className="admin-card" style={{ padding: 12, marginBottom: 14, gridColumn: "1 / -1" }}>
                  <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 10, color: "var(--dark)" }}>{product.name}</div>
                </div>

                <AdminProductDescriptionBlock
                  product={product}
                  generating={descriptionGenerating}
                  onGenerate={runDescriptionAi}
                />

                <AdminProductAiDetailPanel product={product} />

                <div className="admin-card" style={{ padding: 12 }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>Imágenes extra</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                    {(product.images ?? []).map((im) => (
                      <span key={im.id} style={{ position: "relative", display: "inline-block" }}>
                        <AdminRetryImage
                          src={im.url}
                          alt=""
                          style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6, border: "1px solid var(--line)" }}
                        />
                      </span>
                    ))}
                    {(product.images ?? []).length === 0 && (
                      <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Sin imágenes adicionales</span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="form-grid" style={{ marginBottom: 12 }}>
                <AdminCreatableSelect
                  label="Familia / marca"
                  value={editBrand}
                  options={brandSelectOptions}
                  onChange={setEditBrand}
                  createOptionLabel="➕ Crear familia / marca…"
                  newPlaceholder="Nombre de la familia o marca…"
                  disabled={editBusy}
                  allowEmpty
                  emptyLabel="Seleccionar…"
                  hint="Elige una existente o crea una nueva. Confirma el nombre con el botón; no se guarda letra a letra."
                  onCreate={async (name) => {
                    const created = await createAdminFamily(name);
                    await onReloadFamilies();
                    showToast(`Familia «${created.name}» creada`, "success", "✅");
                    return created.name;
                  }}
                />
                <AdminCreatableSelect
                  label="Categoría"
                  value={editCategory}
                  options={categorySelectOptions}
                  onChange={(slug) => {
                    setEditCategory(slug);
                    setEditSubcategory("");
                  }}
                  createOptionLabel="➕ Crear categoría…"
                  newPlaceholder="Nombre de la categoría…"
                  disabled={editBusy}
                  emptyLabel="Seleccionar…"
                  onCreate={async (name) => {
                    const created = await createAdminCategory({ name });
                    await onReloadCategories();
                    showToast(`Categoría «${created.name}» creada`, "success", "✅");
                    return created.slug;
                  }}
                />
                <AdminCreatableSelect
                  label="Subcategoría"
                  value={editSubcategory}
                  options={subcategorySelectOptions}
                  onChange={setEditSubcategory}
                  createOptionLabel="➕ Crear subcategoría…"
                  newPlaceholder="Nombre de la subcategoría…"
                  disabled={editBusy || !editCategory}
                  emptyLabel={editCategory ? "Seleccionar…" : "Elige categoría primero"}
                  onCreate={async (name) => {
                    const cat = categoryTree.find((c) => c.slug === editCategory);
                    if (!cat) throw new Error("Elige una categoría válida primero");
                    const created = await createAdminSubcategory(cat.id, { name });
                    await onReloadCategories();
                    showToast(`Subcategoría «${created.name}» creada`, "success", "✅");
                    return created.name;
                  }}
                />
                <div className="form-group full-width">
                  <label className="form-label">Etiqueta menú (solo lectura)</label>
                  <input
                    type="text"
                    className="form-input"
                    readOnly
                    value={editMenuTagPreview ?? "—"}
                    style={{ opacity: 0.85, background: "var(--ivory)" }}
                  />
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
                    Se edita en Configuración → Categorías. Agrupa la subcategoría en el mega menú.
                  </p>
                </div>
                <AdminTagsCreatableField
                  label="Etiquetas del producto"
                  value={editTags}
                  catalogOptions={tagCatalogOptions}
                  onChange={setEditTags}
                  disabled={editBusy}
                  hint="Palabras de búsqueda propias del producto. No uses la etiqueta dorada del menú."
                />
                <div className="form-group">
                  <label className="form-label">Nombre</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editName}
                    disabled={editBusy}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Precio</label>
                  <input
                    type="number"
                    className="form-input"
                    value={editPrice}
                    disabled={editBusy}
                    onChange={(e) => setEditPrice(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Precio original</label>
                  <input
                    type="number"
                    className="form-input"
                    value={editOriginalPrice}
                    disabled={editBusy}
                    onChange={(e) => setEditOriginalPrice(e.target.value)}
                    placeholder="Opcional"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Stock</label>
                  <input
                    type="number"
                    className="form-input"
                    value={editStock}
                    disabled={editBusy}
                    onChange={(e) => setEditStock(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Emoji</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editEmoji}
                    disabled={editBusy}
                    onChange={(e) => setEditEmoji(e.target.value)}
                    maxLength={8}
                  />
                </div>
                <div className="form-group full-width">
                  <label className="form-label">Badge</label>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {[
                      ["new", "Nuevo"],
                      ["hot", "🔥 Hot"],
                      ["sale", "Oferta"],
                      ["best", "⭐ Top"],
                      ["", "Sin badge"],
                    ].map(([v, l]) => (
                      <label key={v || "none"} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
                        <input
                          type="radio"
                          name={`detail-badge-${product.id}`}
                          checked={editBadge === v}
                          disabled={editBusy}
                          onChange={() => setEditBadge(v)}
                        />
                        {l}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-group full-width">
                  <label className="form-label">Descripción</label>
                  <textarea
                    className="form-textarea"
                    value={editDescription}
                    disabled={editBusy}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={4}
                  />
                  <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={editBusy}
                      onClick={runDescriptionAi}
                    >
                      {descriptionGenerating
                        ? "Generando descripción…"
                        : editDescription.trim()
                          ? "✨ Reescribir descripción comercial (IA)"
                          : "✦ Generar descripción con IA"}
                    </button>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      La IA guarda la descripción en el producto al instante; puedes seguir editándola antes de Guardar.
                    </span>
                  </div>
                </div>
                <div className="form-group">
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={editActive}
                      disabled={editBusy}
                      onChange={(e) => setEditActive(e.target.checked)}
                    />
                    Producto activo en tienda
                  </label>
                </div>
                <div className="admin-card" style={{ padding: 12, gridColumn: "1 / -1" }}>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: canToggleFeatured ? "pointer" : "wait", fontSize: 13, lineHeight: 1.45 }}>
                    <input
                      type="checkbox"
                      checked={editFeatured}
                      disabled={!canToggleFeatured}
                      style={{ marginTop: 3 }}
                      onChange={(e) => setEditFeatured(e.target.checked)}
                    />
                    <span>
                      <strong>Prioridad en el home</strong>
                      <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>
                        Aparece entre los primeros en «Productos Destacados». Se guarda al pulsar «Guardar cambios».
                      </div>
                    </span>
                  </label>
                </div>
              </div>
            )}

            {editingMode && (
              <div className="admin-card" style={{ padding: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Imágenes extra</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                  <label className="btn btn-outline btn-sm" style={{ cursor: uploadingGallery || saving ? "wait" : "pointer" }}>
                    {uploadingGallery ? "Subiendo…" : "➕ Añadir imagen"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      style={{ display: "none" }}
                      disabled={!canMutateImages || uploadingGallery || (product.images?.length ?? 0) >= 24}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (!f) return;
                        setUploadingGallery(true);
                        void (async () => {
                          try {
                            const url = await uploadAdminProductImage(f);
                            const updated = await addProductGalleryImage(product.id, url);
                            onProductRefresh?.(updated);
                            showToast("Imagen añadida", "success", "🖼️");
                          } catch (err) {
                            showToast(err instanceof Error ? err.message : "Error al subir", "danger", "⚠️");
                          } finally {
                            setUploadingGallery(false);
                          }
                        })();
                      }}
                    />
                  </label>
                  {(product.images ?? []).map((im) => (
                    <span key={im.id} style={{ position: "relative", display: "inline-block" }}>
                      <AdminRetryImage
                        src={im.url}
                        alt=""
                        style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6, border: "1px solid var(--line)" }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          void (async () => {
                            try {
                              const updated = await removeProductGalleryImage(product.id, im.id);
                              onProductRefresh?.(updated);
                              showToast("Imagen eliminada", "default", "🗑️");
                            } catch (err) {
                              showToast(err instanceof Error ? err.message : "Error", "danger", "⚠️");
                            }
                          })();
                        }}
                        style={{
                          position: "absolute",
                          top: -6,
                          right: -6,
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          border: "none",
                          background: "var(--dusty-rose)",
                          color: "#fff",
                          fontSize: 12,
                          cursor: "pointer",
                          lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="admin-product-detail-actions" style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            marginTop: 20,
            paddingTop: 16,
            borderTop: "1px solid var(--line)",
          }}>
          <div>
            {!editingMode ? (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  applyProductToForm(product);
                  setEditingMode(true);
                }}
              >
                ✏️ Editar
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setEditingMode(false);
                  applyProductToForm(product);
                }}
                disabled={saving}
              >
                Cancelar edición
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {editingMode && (
              <button
                type="button"
                className="btn btn-primary"
                disabled={saving || !editCategory.trim() || !editSubcategory.trim()}
                onClick={() => {
                  void (async () => {
                    const priceNum = Number(String(editPrice).replace(",", ".").trim());
                    const stockNum = Number(String(editStock).replace(",", ".").trim());
                    const originalRaw = editOriginalPrice.trim();
                    const originalNum = originalRaw
                      ? Number(originalRaw.replace(",", "."))
                      : null;

                    if (!editName.trim()) {
                      showToast("Escribe un nombre para el producto.", "danger", "⚠️");
                      return;
                    }
                    if (!editCategory.trim() || !editSubcategory.trim()) {
                      showToast("Elige categoría y subcategoría antes de guardar.", "danger", "⚠️");
                      return;
                    }
                    if (!Number.isFinite(priceNum) || priceNum < 0 || !Number.isInteger(priceNum)) {
                      showToast(
                        "El precio debe ser un número entero en pesos (0 o más), sin decimales.",
                        "danger",
                        "⚠️",
                      );
                      return;
                    }
                    if (originalNum != null && (!Number.isFinite(originalNum) || originalNum < 0 || !Number.isInteger(originalNum))) {
                      showToast(
                        "El precio original debe ser un número entero en pesos, o déjalo vacío.",
                        "danger",
                        "⚠️",
                      );
                      return;
                    }
                    if (!Number.isFinite(stockNum) || stockNum < 0 || !Number.isInteger(stockNum)) {
                      showToast("El stock debe ser un número entero (0 o más).", "danger", "⚠️");
                      return;
                    }

                    try {
                      await onSave({
                        name: editName.trim(),
                        brand: editBrand.trim() || "GinnaBeauty",
                        category: editCategory.trim(),
                        subcategory: editSubcategory.trim(),
                        tags: editTags,
                        price: priceNum,
                        originalPrice: originalNum,
                        stock: stockNum,
                        emoji: editEmoji.trim() || null,
                        description: editDescription.trim(),
                        badge: editBadge || null,
                        active: editActive,
                        featuredInHome: editFeatured,
                      });
                      setEditingMode(false);
                    } catch {
                      /* toast en el padre */
                    }
                  })();
                }}
              >
                {saving ? "Guardando…" : "💾 Guardar cambios"}
              </button>
            )}
            <button type="button" className="btn btn-rose" onClick={() => void onDelete(product.id)}>
              🗑️ Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
