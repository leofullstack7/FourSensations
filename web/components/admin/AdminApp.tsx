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
  BULK_DELETE_ALL_CONFIRM_PHRASE,
  createAdminProduct,
  deleteAdminProduct,
  fetchAdminProducts,
  postAdminProductsAiCompleteOne,
  postAdminProductsBulkDelete,
  postAdminProductsAiClear,
  updateAdminProduct,
} from "@/lib/api/admin-products";
import { runAdminProductsAiCompleteParallel } from "@/lib/api/admin-products-ai-runner";
import { productNeedsAiComplete, productNeedsDescription, type AiCompleteFieldOptions } from "@/lib/product-ai-fields";
import { normalizeColorHex } from "@/lib/product-color";
import {
  buildPrimaryVariantByGroup,
  buildVariantCountByGroup,
  collapseProductsForAdminList,
  groupListThumbnail,
  listVariantsInGroup,
  resolveAdminListRowsAfterFilter,
} from "@/lib/admin/variant-groups";
import { AdminCategoryStorefrontPanel } from "@/components/admin/AdminCategoryStorefrontPanel";
import {
  AdminAiBulkProgressModal,
  type AiBulkProgressItem,
} from "@/components/admin/AdminAiBulkProgressModal";
import { AdminProductVariantsModal } from "@/components/admin/AdminProductVariantsModal";
import { AdminProductColorModal } from "@/components/admin/AdminProductColorModal";
import { AdminBulkTemplateModal } from "@/components/admin/AdminBulkTemplateModal";
import { AdminProductAiDetailPanel, AdminProductDescriptionBlock } from "@/components/admin/AdminProductAiUi";
import { menuTagForProduct, productOwnTags, tagsToInputValue } from "@/lib/product-tags";
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
  postBulkZipOptimize,
  postTintResolveCatalog,
  type BulkPreviewResponse,
} from "@/lib/api/admin-bulk-import";
import { bulkImportStableRowId } from "@/lib/bulk-import/bulk-import-row-id";
import {
  bulkRowBlockingIssues,
  bulkRowIsReadyForVariantGroupAssign,
  bulkRowIsVariantGroupAssign,
} from "@/lib/bulk-import/variant-group-assign";
import {
  formatZipBytes,
  inspectZipFileClient,
  type ZipInspectResult,
} from "@/lib/bulk-import/zip-client-inspect";
import { normalizeKey } from "@/lib/bulk-import/normalize";
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

type AdminPageId = "dashboard" | "products" | "category-products" | "combos" | "sales" | "stock" | "categories" | "menu" | "reports";

type GoPageOptions = {
  productTab?: "list" | "add" | "bulk";
};

const ADMIN_PAGE_TITLES: Record<AdminPageId, string> = {
  dashboard: "Dashboard",
  products: "Gestión de Productos",
  "category-products": "Gestión de PRODUCTOS en Categorías",
  combos: "Crear Combos",
  sales: "Ventas",
  stock: "Inventario",
  categories: "Categorías y subcategorías",
  menu: "Gestión del Menú",
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
  { id: "sales", icon: "💰", label: "Ventas" },
  { id: "stock", icon: "📋", label: "Inventario" },
  { id: "categories", icon: "🏷️", label: "Categorías", section: "config" },
  { id: "menu", icon: "🗂️", label: "Gestión de Menú", section: "config" },
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
  const [productMutation, setProductMutation] = useState<"add" | "bulk" | "edit" | null>(null);
  const [stockSavingId, setStockSavingId] = useState<string | null>(null);
  const [onlineSales, setOnlineSales] = useState<AdminSale[]>([]);
  const [manualSales, setManualSales] = useState<AdminSale[]>([]);
  const [productTab, setProductTab] = useState<"list" | "add" | "bulk">("list");
  const [productSearch, setProductSearch] = useState("");
  const [productFilterBrand, setProductFilterBrand] = useState("");
  const [productFilterCategorySlug, setProductFilterCategorySlug] = useState("");
  const [productFilterSubcategory, setProductFilterSubcategory] = useState("");
  const [productFilterTag, setProductFilterTag] = useState("");
  const [productListSelectedIds, setProductListSelectedIds] = useState<Set<string>>(() => new Set());
  const [productBulkMenuOpen, setProductBulkMenuOpen] = useState(false);
  const [productBulkDeleting, setProductBulkDeleting] = useState(false);
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
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: string; icon: string }[]>([]);

  const showToast = useCallback((msg: string, type = "default", icon = "✅") => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg, type, icon }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
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
      else if (p === "categories" || p === "menu") void loadCategories();
      else if (p === "sales") void loadPaidOrders();
    },
    [page, loadProducts, loadCategories, loadPaidOrders]
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
    for (const p of products) {
      const b = (p.brand ?? "").trim();
      if (!b) continue;
      if (seen.has(b)) continue;
      seen.add(b);
      out.push(b);
    }
    out.sort((a, b) => a.localeCompare(b, "es"));
    return out;
  }, [products]);

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

  const catalogListProducts = useMemo(() => collapseProductsForAdminList(products), [products]);

  const filteredProducts = useMemo(() => {
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
    return resolveAdminListRowsAfterFilter(list, products);
  }, [
    products,
    productSearch,
    productFilterBrand,
    productFilterCategorySlug,
    productFilterSubcategory,
    productFilterTag,
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
    if (
      !confirm(
        `¿Quitar los valores generados por IA en ${ids.length} producto(s)? Los campos quedarán vacíos o por defecto.`,
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
  }, [productListSelectedIds, showToast, loadProducts, clearProductListSelection]);

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
    const totalRevenue = sales.reduce((s, sale) => s + (Number(sale.total) || 0), 0);
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun"];
    const values = [320000, 480000, 390000, 520000, 610000, 580000];
    const max = Math.max(...values);
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
            <span className="admin-dashboard-pill">◈ {products.length} SKUs</span>
            <span className="admin-dashboard-pill">⬡ {sales.length} ventas</span>
            <span className="admin-dashboard-pill">✦ IA catálogo activa</span>
          </div>
        </div>
        <div className="stats-grid">
          <div className="stat-card stat-card--tech">
            <div className="stat-icon">💰</div>
            <div className="stat-num">{formatPrice(totalRevenue)}</div>
            <div className="stat-label">Ingresos este mes</div>
            <div className="stat-trend up">↑ 12% vs mes anterior</div>
          </div>
          <div className="stat-card stat-card--tech">
            <div className="stat-icon">🛒</div>
            <div className="stat-num">{sales.length}</div>
            <div className="stat-label">Ventas registradas</div>
            <div className="stat-trend up">↑ 8 nuevas hoy</div>
          </div>
          <div className="stat-card stat-card--tech">
            <div className="stat-icon">📦</div>
            <div className="stat-num">{products.filter((p) => p.active).length}</div>
            <div className="stat-label">Productos activos</div>
            <div className="stat-trend down">↓ 3 con stock bajo</div>
          </div>
          <div className="stat-card stat-card--tech">
            <div className="stat-icon">⭐</div>
            <div className="stat-num">4.8</div>
            <div className="stat-label">Calificación promedio</div>
            <div className="stat-trend up">↑ Excelente</div>
          </div>
        </div>
        <div className="charts-row">
          <div className="admin-card admin-card--tech">
            <div className="admin-card-title">Ventas últimos 6 meses</div>
            <div className="bar-chart" id="bar-chart">
              {months.map((m, i) => {
                const h = Math.round((values[i] / max) * 140);
                return (
                  <div key={m} className="bar-group">
                    <span className="bar-value">{Math.round(values[i] / 1000)}K</span>
                    <div className="bar" style={{ height: h, background: "linear-gradient(180deg,var(--rose),var(--blush))" }} title={formatPrice(values[i])} />
                    <span className="bar-label">{m}</span>
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
                    disabled={productBulkDeleting || productAiBusy}
                    title="Más acciones (eliminación en lote)"
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
                        minWidth: 260,
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
                        className="btn btn-primary btn-sm"
                        disabled={productAiBusy || productListSelectedIds.size === 0}
                        style={{ width: "100%", justifyContent: "flex-start", textAlign: "left" }}
                        onClick={() => void handleBulkAiComplete()}
                      >
                        ✦ Completar datos con IA ({productListSelectedIds.size})
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="btn btn-outline btn-sm"
                        disabled={productAiBusy || productListSelectedIds.size === 0}
                        style={{ width: "100%", justifyContent: "flex-start", textAlign: "left" }}
                        onClick={() => void handleBulkAiDescriptions()}
                      >
                        📝 Generar descripciones (solo vacías) ({productListSelectedIds.size})
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="btn btn-outline btn-sm"
                        disabled={productAiBusy || productListSelectedIds.size === 0}
                        style={{ width: "100%", justifyContent: "flex-start", textAlign: "left" }}
                        onClick={() => void handleBulkAiRewriteDescriptions()}
                      >
                        ✨ Reescribir descripciones comerciales (IA) ({productListSelectedIds.size})
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
                        disabled={productAiBusy || productListSelectedIds.size === 0}
                        style={{
                          width: "100%",
                          justifyContent: "flex-start",
                          textAlign: "left",
                          borderColor: "var(--sage-dark)",
                          color: "var(--sage-dark)",
                        }}
                        onClick={() => void handleBulkAiClear()}
                      >
                        Quitar datos generados por IA ({productListSelectedIds.size})
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
              {productTab === "list" && (
                <AdminProductListTab
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
                  allProducts={products}
                  totalProductCount={catalogListProducts.length}
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

            <div className={`admin-page ${page === "sales" ? "active" : ""}`} style={{ display: page === "sales" ? "block" : "none" }}>
              <AdminSalesTab sales={sales} products={products} onReloadOnline={() => void loadPaidOrders()} />
            </div>

            <div className={`admin-page ${page === "stock" ? "active" : ""}`} style={{ display: page === "stock" ? "block" : "none" }}>
              <AdminStockTab
                products={products}
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
            await loadProducts();
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

      <AdminAiBulkProgressModal
        open={aiBulkModalOpen}
        phase={aiBulkPhase}
        mode={aiBulkMode}
        items={aiBulkItems}
        onStart={() => void runAiBulkComplete()}
        onClose={closeAiBulkModal}
      />

      <div className="admin-toast-container" id="admin-toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span>{t.icon}</span>
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminProductListTab({
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
  allProducts,
  totalProductCount,
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
  allProducts: AdminProduct[];
  totalProductCount: number;
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
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          gap: 12,
          marginBottom: 20,
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
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: -12, marginBottom: 16 }}>
          Mostrando {filteredProducts.length} de {totalProductCount} producto(s)
          {hasActiveFilters ? " (filtros activos)" : ""}
        </p>
      )}
      <div className="admin-card admin-table-wrap" style={{ padding: 0 }}>
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
                    : "Ningún producto coincide con la búsqueda o los filtros seleccionados."}
                </td>
              </tr>
            ) : (
              filteredProducts.map((p) => {
                const stockStatus = p.stock === 0 ? "status-out" : p.stock < 5 ? "status-low" : "status-active";
                const stockLabel = p.stock === 0 ? "Sin stock" : p.stock < 5 ? "Stock bajo" : "Disponible";
                const groupCode = p.variantGroupCode?.trim() ?? "";
                const variantCount = groupCode ? (variantCountByGroup.get(groupCode) ?? 0) : 0;
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
                      <span className={`status-chip ${stockStatus}`}>{stockLabel}</span>
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
      </div>
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
  const [jobId, setJobId] = useState<string | null>(null);
  const [preview, setPreview] = useState<BulkPreviewResult | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [existingPolicy, setExistingPolicy] = useState<"skip" | "replace">("skip");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [showBulkTemplateModal, setShowBulkTemplateModal] = useState(false);
  const [showNewCategoriesModal, setShowNewCategoriesModal] = useState(false);
  const [applyingNewCategories, setApplyingNewCategories] = useState(false);
  /** Tras «Continuar sin crear» o cerrar el modal, se permite importar filas válidas aunque el preview siga listando novedades. */
  const [newCategoriesModalAcknowledged, setNewCategoriesModalAcknowledged] = useState(false);
  const [showTaxonomyHintsModal, setShowTaxonomyHintsModal] = useState(false);
  const [showTintTypeModal, setShowTintTypeModal] = useState(false);
  const [tintModalDismissed, setTintModalDismissed] = useState(false);
  const [tintsExplicitlySkipped, setTintsExplicitlySkipped] = useState(false);
  const [resolvingTintType, setResolvingTintType] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showLowMatchModal, setShowLowMatchModal] = useState(false);
  const [pendingAnalyzeResult, setPendingAnalyzeResult] = useState<BulkPreviewResponse | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [editingTaxonomyRowId, setEditingTaxonomyRowId] = useState<string | null>(null);
  const [manualCategorySlug, setManualCategorySlug] = useState("");
  const [manualSubcategoryName, setManualSubcategoryName] = useState("");
  const [manualSubcategoryMode, setManualSubcategoryMode] = useState<"existing" | "new">("existing");
  const [manualSubcategoryCustom, setManualSubcategoryCustom] = useState("");
  const bulkProgress = useBufferedProgress(93);
  const [bulkProgressLabel, setBulkProgressLabel] = useState("");

  const sortedCats = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  );

  /** Tras un PATCH del preview, conserva la intersección o re-selecciona si los IDs cambiaron (p. ej. columna de código). */
  useEffect(() => {
    if (!preview || !jobId) {
      setSelectedRowIds([]);
      return;
    }
    const allIds = (preview.matchedRows ?? []).map(bulkImportStableRowId);
    const available = new Set(allIds);
    setSelectedRowIds((prev) => {
      const kept = prev.filter((id) => available.has(id));
      if (kept.length > 0) return kept;
      if (prev.length > 0) return allIds;
      return prev;
    });
  }, [preview, jobId]);

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
    setSelectedRowIds([]);
    setExistingPolicy("skip");
    setShowNewCategoriesModal(false);
    setApplyingNewCategories(false);
    setNewCategoriesModalAcknowledged(false);
    setShowTaxonomyHintsModal(false);
    setShowTintTypeModal(false);
    setTintModalDismissed(false);
    setTintsExplicitlySkipped(false);
    setResolvingTintType(false);
    setIsAnalyzing(false);
    setShowLowMatchModal(false);
    setPendingAnalyzeResult(null);
    bulkProgress.reset();
    setFileInputKey((k) => k + 1);
  };

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
      setShowLowMatchModal(false);
      setPendingAnalyzeResult(null);
      setEditingTaxonomyRowId(null);
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
        res.preview.csvHasVariantGroupColumn
          ? (() => {
              const rows = res.preview.rows ?? [];
              const groupable = rows.filter((r) =>
                bulkRowIsReadyForVariantGroupAssign(r, "skip")
              );
              if (groupable.length > 0) {
                return groupable.map(bulkImportStableRowId);
              }
              return rows
                .filter((r) => r.mapped.variantGroupCode?.trim() && r.normalizedCode)
                .map(bulkImportStableRowId);
            })()
          : (res.preview.matchedRows ?? [])
              .filter((r) => !r.isExistingProduct)
              .map(bulkImportStableRowId)
      );
      const hintN = res.preview.taxonomyRehomeHints?.length ?? 0;
      const newN = res.preview.newCategories?.length ?? 0;
      if (hintN > 0) {
        showToast(
          `Hay ${hintN} sugerencia(s) de reubicación de categoría/subcategoría. Revísalas en el modal.`,
          "default",
          "💡"
        );
      } else if (newN > 0) {
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
    [showToast]
  );

  const pendingLowMatchBreakdown = useMemo(
    () =>
      pendingAnalyzeResult ? computeBulkCsvZipMatchBreakdown(pendingAnalyzeResult.preview.stats) : null,
    [pendingAnalyzeResult]
  );

  useEffect(() => {
    setNewCategoriesModalAcknowledged(false);
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
      return;
    }
    // Esperar a que el modal de Tintes esté resuelto (configurado u omitido) antes de
    // mostrar otros modales, para evitar que queden ocultos detrás del modal de Tintes.
    const tintModalActive = needsTintSelection && !tintModalDismissed && !tintsExplicitlySkipped;
    if (tintModalActive) return;

    const hints = preview.taxonomyRehomeHints?.length ?? 0;
    if (hints > 0) {
      setShowTaxonomyHintsModal(true);
      setShowNewCategoriesModal(false);
      return;
    }
    setShowTaxonomyHintsModal(false);
    setShowNewCategoriesModal((preview.newCategories?.length ?? 0) > 0);
  }, [preview, needsTintSelection, tintModalDismissed, tintsExplicitlySkipped]);

  const toggleRow = useCallback((previewRowId: string) => {
    setSelectedRowIds((prev) => {
      if (prev.includes(previewRowId)) return prev.filter((id) => id !== previewRowId);
      return [...prev, previewRowId];
    });
  }, []);

  const selectAllValid = () => {
    if (!preview) return;
    const sourceRows = preview.csvHasVariantGroupColumn ? preview.rows : preview.matchedRows;
    const next = new Set<string>();
    for (const r of sourceRows) {
      const blocking = bulkRowBlockingIssues(r, existingPolicy);
      if (blocking.length === 0 && r.normalizedCode) next.add(bulkImportStableRowId(r));
    }
    setSelectedRowIds(Array.from(next));
  };

  const selectAllForVariantGroups = () => {
    if (!preview?.csvHasVariantGroupColumn) return;
    const next = (preview.rows ?? [])
      .filter((r) => bulkRowIsReadyForVariantGroupAssign(r, "skip"))
      .map(bulkImportStableRowId);
    setSelectedRowIds(next);
  };

  const clearSelection = () => setSelectedRowIds([]);

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
  const manualSubcategoryOptions = useMemo(() => {
    const cat = sortedCats.find((c) => c.slug === manualCategorySlug);
    return cat ? [...cat.subcategories].sort((a, b) => a.sortOrder - b.sortOrder) : [];
  }, [sortedCats, manualCategorySlug]);

  const previewTableRows = useMemo(() => {
    const sourceRows = preview?.csvHasVariantGroupColumn
      ? preview.rows ?? []
      : preview?.matchedRows ?? [];
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
        return {
          previewRowId,
          csvRowIndex: r.rowIndex,
          codeValue: r.codeRaw,
          barcodeRaw,
          barcodeGroupKey: barcodeRaw ? normalizeKey(barcodeRaw) : null,
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
          existingProductName: r.existingProductName,
          existingVariantGroupCode: r.existingVariantGroupCode,
        };
      });
  }, [preview, selectedRowIdSet, categories, existingPolicy]);

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

  const selectedNewProductRowIds = useMemo(
    () => selectedRowIds.filter((id) => !selectedVariantGroupRowIds.includes(id)),
    [selectedRowIds, selectedVariantGroupRowIds]
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
    const groups = (preview.variantGroups ?? [])
      .map((g) => ({
        meta: g,
        rows: (byKey.get(g.groupKey) ?? []).sort(
          (a, b) => (a.variantGroupOrder ?? 9999) - (b.variantGroupOrder ?? 9999) || a.csvRowIndex - b.csvRowIndex
        ),
        dbOnly: (preview.dbVariantsByGroup?.[g.groupKey] ?? []).filter(
          (p) => p.externalRef && !byKey.get(g.groupKey)?.some((r) => r.codeValue === p.externalRef)
        ),
      }))
      .filter((g) => g.rows.length > 0 || g.dbOnly.length > 0);
    return { groups, ungrouped };
  }, [preview, previewTableRows]);

  const hasTintesInBatch = useMemo(
    () => previewTableRows.some((r) => r.isTintesRow),
    [previewTableRows]
  );

  const openManualTaxonomyEditor = useCallback(
    (r: {
      previewRowId: string;
      categorySlug: string | null;
      subcategoryValue: string | null;
      categoryCsv: string | null;
      subcategoryCsv: string | null;
    }) => {
      const fallbackCategory = r.categorySlug ?? sortedCats[0]?.slug ?? "";
      setEditingTaxonomyRowId(r.previewRowId);
      setManualCategorySlug(fallbackCategory);
      setManualSubcategoryMode("existing");
      setManualSubcategoryCustom("");
      if (r.subcategoryValue?.trim()) {
        setManualSubcategoryName(r.subcategoryValue);
        return;
      }
      const cat = sortedCats.find((c) => c.slug === fallbackCategory);
      setManualSubcategoryName(cat?.subcategories?.[0]?.name ?? "");
    },
    [sortedCats]
  );

  /** Formatea a título: primera letra de cada palabra en mayúscula. */
  const toTitleCase = (str: string) =>
    str.toLowerCase().replace(/(^|[\s\-/])(\S)/g, (_m, sep, ch) => sep + (ch as string).toUpperCase());

  /** Nombre final de subcategoría según el modo activo (existente o nueva). */
  const effectiveSubcategoryName =
    manualSubcategoryMode === "new" ? toTitleCase(manualSubcategoryCustom) : manualSubcategoryName;

  const applyManualTaxonomyOverride = useCallback(
    async (r: { previewRowId: string }) => {
      if (!jobId || !manualCategorySlug || !effectiveSubcategoryName) return;
      setMutation("bulk");
      try {
        const { preview: p } = await patchBulkImportJob(jobId, {
          rowTaxonomyOverrides: {
            [r.previewRowId]: {
              categorySlug: manualCategorySlug,
              subcategoryName: effectiveSubcategoryName,
            },
          },
          selectedRowIds,
        });
        setPreview(p);
        setEditingTaxonomyRowId(null);
        showToast("Categoría/subcategoría ajustada solo para esta fila", "success", "✅");
      } catch (err) {
        showToast(err instanceof Error ? err.message : "No se pudo aplicar el ajuste", "danger", "⚠️");
      } finally {
        setMutation(null);
      }
    },
    [jobId, manualCategorySlug, effectiveSubcategoryName, selectedRowIds, setMutation, showToast]
  );

  type BulkPreviewTableRow = (typeof previewTableRows)[number];

  const bulkPreviewTableColSpan =
    (hasTintesInBatch ? 17 : 14) + (preview?.csvHasVariantGroupColumn ? 1 : 0);

  const renderBulkPreviewDataRow = (r: BulkPreviewTableRow) => {
    const warnOnly = r.warnings.length > 0;
    const ok = r.errors.length === 0;
    return (
      <tr
        key={r.previewRowId}
        style={{
          opacity: ok ? 1 : 0.75,
          background: r.hasExisting ? "rgba(255, 84, 84, 0.10)" : undefined,
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
            checked={r.selected}
            onChange={() => toggleRow(r.previewRowId)}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Seleccionar fila ${r.csvRowIndex + 1}`}
          />
        </td>
        {preview?.csvHasVariantGroupColumn && (
          <td style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>
            {r.variantGroupOrder != null ? r.variantGroupOrder + 1 : "—"}
          </td>
        )}
        <td style={{ fontSize: 12, fontFamily: "monospace" }}>{r.codeValue ?? "—"}</td>
        <td>{r.nameValue ?? "—"}</td>
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
          {r.matchedImages.length
            ? r.matchedImages
                .map((m) => {
                  const how =
                    m.matchedBy === "tintLevel"
                      ? "nivel"
                      : m.matchedBy === "numericPrefix"
                        ? "prefijo"
                        : m.matchedBy === "sixDigitPrefix"
                          ? "6 dígitos"
                          : m.matchedBy === "fuzzy"
                            ? `similitud ${m.fuzzySimilarity != null ? `${Math.round(m.fuzzySimilarity * 100)}%` : "≥85%"}`
                            : "exacto";
                  return `${m.imageFilename} (${how})`;
                })
                .join(", ")
            : "—"}
        </td>
        <td style={{ fontSize: 12 }}>
          {ok ? (
            <span style={{ color: r.readyForVariantGroup ? "#2e7d5a" : r.hasExisting ? "#b00020" : "green" }}>
              {r.readyForVariantGroup
                ? "📦 Listo para agrupar"
                : r.hasExisting
                  ? existingPolicy === "replace"
                    ? "↺ Reemplazar"
                    : r.barcodeRaw
                      ? "⚠ Revisar fila"
                      : "⛔ Sin código de barras"
                  : !r.hasImageMatch
                    ? "⚠ Sin foto"
                    : warnOnly
                      ? "⚠ Aviso"
                      : "✓ OK"}
            </span>
          ) : (
            <span style={{ color: "var(--danger, #b00020)" }} title={r.errors.join(" · ")}>
              ✗ {r.errors[0] ?? "Error"}
            </span>
          )}
        </td>
        <td style={{ minWidth: 220 }}>
          {r.errors.length > 0 ? (
            editingTaxonomyRowId === r.previewRowId ? (
              <div style={{ display: "grid", gap: 6 }}>
                <select
                  className="form-select"
                  value={manualCategorySlug}
                  onChange={(e) => {
                    const slug = e.target.value;
                    setManualCategorySlug(slug);
                    const cat = sortedCats.find((c) => c.slug === slug);
                    setManualSubcategoryName(cat?.subcategories?.[0]?.name ?? "");
                  }}
                  disabled={saving}
                >
                  {sortedCats.map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.icon ? `${c.icon} ` : ""}
                      {c.name}
                    </option>
                  ))}
                </select>
                {/* Toggle: subcategoría existente vs. nueva */}
                <div style={{ display: "flex", gap: 6, fontSize: 11.5 }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${manualSubcategoryMode === "existing" ? "btn-primary" : "btn-outline"}`}
                    onClick={() => setManualSubcategoryMode("existing")}
                    disabled={saving}
                  >
                    Existente
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${manualSubcategoryMode === "new" ? "btn-primary" : "btn-outline"}`}
                    onClick={() => {
                      setManualSubcategoryMode("new");
                      setManualSubcategoryCustom("");
                    }}
                    disabled={saving}
                  >
                    + Nueva
                  </button>
                </div>

                {manualSubcategoryMode === "existing" ? (
                  <select
                    className="form-select"
                    value={manualSubcategoryName}
                    onChange={(e) => setManualSubcategoryName(e.target.value)}
                    disabled={saving || manualSubcategoryOptions.length === 0}
                  >
                    {manualSubcategoryOptions.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div>
                    <input
                      className="form-input"
                      style={{ width: "100%" }}
                      placeholder="Ej: Cuero Cabelludo"
                      value={manualSubcategoryCustom}
                      disabled={saving}
                      onChange={(e) => setManualSubcategoryCustom(e.target.value)}
                      onBlur={(e) => {
                        // Aplicar title case al perder el foco
                        const formatted = e.target.value
                          .toLowerCase()
                          .replace(/(^|[\s\-/])(\S)/g, (_m, sep, ch) => sep + (ch as string).toUpperCase());
                        setManualSubcategoryCustom(formatted);
                      }}
                    />
                    {manualSubcategoryCustom.trim() && (
                      <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--text-muted)" }}>
                        Se guardará como:{" "}
                        <strong>
                          {manualSubcategoryCustom
                            .toLowerCase()
                            .replace(/(^|[\s\-/])(\S)/g, (_m, sep, ch) => sep + (ch as string).toUpperCase())}
                        </strong>
                      </p>
                    )}
                  </div>
                )}

                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={
                      saving ||
                      !manualCategorySlug ||
                      (manualSubcategoryMode === "existing" ? !manualSubcategoryName : !manualSubcategoryCustom.trim())
                    }
                    onClick={() => {
                      void applyManualTaxonomyOverride(r);
                    }}
                  >
                    Aplicar
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={saving}
                    onClick={() => setEditingTaxonomyRowId(null)}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={saving || sortedCats.length === 0}
                onClick={() => openManualTaxonomyEditor(r)}
              >
                Editar categoría/subcategoría
              </button>
            )
          ) : (
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>—</span>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="admin-bulk-tab">
      <div className="admin-card">
      <BulkImportProgressOverlay open={bulkProgress.active} percent={bulkProgress.percent} label={bulkProgressLabel} />
      <div className="admin-card-title" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span>📦 Carga masiva CSV + ZIP</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            color: "var(--dusty-rose)",
            border: "1px solid var(--dusty-rose)",
            borderRadius: 999,
            padding: "4px 10px",
          }}
        >
          Fase 2 — Preview en servidor
        </span>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => setShowBulkTemplateModal(true)}
          style={{ marginLeft: "auto" }}
        >
          📋 Ver plantilla
        </button>
      </div>

      <div
        style={{
          background: "linear-gradient(135deg, var(--lavender-light) 0%, #fff5f8 100%)",
          border: "1px solid var(--dusty-rose)",
          borderRadius: "var(--radius-md)",
          padding: "16px 18px",
          marginBottom: 22,
          fontSize: 13,
          color: "var(--text)",
          lineHeight: 1.5,
        }}
      >
        <strong>Flujo:</strong> sube un <strong>CSV</strong> (encabezados en la primera fila) y un <strong>ZIP</strong> con fotos cuyo{" "}
        <strong>nombre de archivo</strong> (sin extensión) coincide con la <strong>columna de código</strong> del CSV. Si incluyes una columna de{" "}
        <strong>código de barras</strong> (p. ej. «Barras», «Código de barras»), las filas con el mismo valor se agrupan como{" "}
        <strong>variantes del mismo producto</strong>. Si los productos <strong>ya están registrados</strong>, usa{" "}
        <strong>«Agrupar productos como variantes»</strong> (no hace falta volver a importarlos). Pulsa <strong>Analizar</strong> para ver el
        resumen; <strong>Importar productos nuevos</strong> solo crea filas que aún no existen en tienda. Máx. 500 filas y 2&nbsp;MB CSV / 50&nbsp;MB ZIP.
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
          <label className="form-label">2. Archivo ZIP (imágenes)</label>
          <input
            key={`zip-${fileInputKey}`}
            type="file"
            accept=".zip,application/zip"
            className="form-input"
            disabled={saving || isAnalyzing || zipOptimizing}
            onChange={(e) => {
              setZipFile(e.target.files?.[0] ?? null);
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
                      Convierte las fotos a WebP (máx. 1200px, calidad 82) para subir más rápido y ahorrar espacio.
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
                        setBulkProgressLabel("Optimizando imágenes a WebP…");
                        bulkProgress.start("optimize");
                        try {
                          const result = await postBulkZipOptimize(zipFile);
                          bulkProgress.finish();
                          setZipFile(result.file);
                          setZipOptimized(true);
                          showToast(
                            `Optimizado: ${formatZipBytes(result.beforeBytes)} → ${formatZipBytes(result.afterBytes)} (−${result.savedPercent}%)`,
                            "success",
                            "✨",
                          );
                        } catch (e) {
                          bulkProgress.reset();
                          showToast(e instanceof Error ? e.message : "Error al optimizar ZIP", "danger", "⚠️");
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
          disabled={isAnalyzing || saving || !csvFile || !zipFile || sortedCats.length === 0}
          onClick={() => {
            void (async () => {
              if (!csvFile || !zipFile || isAnalyzing) return;
              const previousJobId = jobId;
              prepareForNewAnalyze(previousJobId);
              setIsAnalyzing(true);
              setMutation("bulk");
              setBulkProgressLabel("Analizando CSV y ZIP en el servidor…");
              bulkProgress.start("analyze");
              try {
                const fd = new FormData();
                fd.append("csv", csvFile);
                fd.append("zip", zipFile);
                const res = await postBulkImportPreview(fd);
                bulkProgress.finish();
                if (isBulkCsvZipMatchRateTooLow(res.preview.stats)) {
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
          ) : (
            "🔍 Analizar CSV y ZIP"
          )}
        </button>
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

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
            {(
              [
                ["Filas CSV", preview.stats.totalRows],
                ["Imágenes en ZIP", preview.stats.zipImageFiles],
                ["Filas con match", preview.stats.matchedRows],
                ["Filas sin match", preview.stats.unmatchedRows],
                ["Filas ambiguas", preview.stats.ambiguousRows],
                ["Imágenes sin fila", preview.stats.unmatchedImages],
                ["Con errores", preview.stats.rowsWithErrors],
                ["Ya en tienda (código)", preview.stats.existingProductRows ?? 0],
                ...(preview.csvHasVariantGroupColumn
                  ? ([
                      ["Grupos de barras", preview.stats.variantGroupCount ?? 0],
                      ["Variantes ya en tienda", preview.stats.existingInVariantGroups ?? 0],
                    ] as const)
                  : []),
              ] as const
            ).map(([label, n]) => (
              <div
                key={label}
                style={{
                  minWidth: 120,
                  padding: "12px 16px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--lavender-light)",
                  border: "1px solid rgba(199, 165, 178, 0.45)",
                }}
              >
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "var(--dark)" }}>{n}</div>
              </div>
            ))}
          </div>

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
              {selectedRowIds.length} fila(s) seleccionada(s) de {previewTableRows.length}
              {preview.csvHasVariantGroupColumn ? " en CSV" : " con match de imagen"}
            </span>
          </div>

          {!preview.csvHasVariantGroupColumn && (preview.stats.existingProductRows ?? 0) > 0 && (
            <div
              style={{
                marginBottom: 14,
                padding: "12px 16px",
                borderRadius: "var(--radius-md)",
                background: "#fff8e6",
                border: "1px solid #e6c84a",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              <strong>Productos ya registrados detectados</strong>
              <p style={{ margin: "6px 0 0" }}>
                {preview.stats.existingProductRows} fila(s) coinciden con códigos que ya están en tienda. Para agruparlos
                como variantes, añade una columna <strong>Barras</strong> (o «Código de barras») en el CSV con el mismo
                valor en las filas que deben unirse, vuelve a analizar y usa{" "}
                <strong>«Agrupar productos como variantes»</strong>.
              </p>
            </div>
          )}

          {preview.csvHasVariantGroupColumn && (preview.variantGroups?.length ?? 0) > 0 && (
            <div
              style={{
                marginBottom: 14,
                padding: "12px 16px",
                borderRadius: "var(--radius-md)",
                background: "linear-gradient(135deg, #f0f4ff 0%, #fff5f8 100%)",
                border: "1px solid var(--dusty-rose)",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              <strong>Agrupación por variantes (columna Barras)</strong>
              <p style={{ margin: "6px 0 0" }}>
                {preview.stats.existingProductRows ?? 0} producto(s) del CSV <strong>ya están en tienda</strong> por su
                código. Usa <strong>«Agrupar productos como variantes»</strong>: no se vuelven a crear, solo se asigna el
                código de barras para unirlos en la tienda.
              </p>
              <p style={{ margin: "6px 0 0", color: "var(--text-muted)" }}>
                {preview.stats.variantGroupCount ?? 0} grupo(s) detectado(s) ·{" "}
                {preview.stats.existingInVariantGroups ?? 0} variante(s) ya registrada(s) en esos grupos.
              </p>
              {(preview.variantGroups ?? []).filter((g) => g.rowCount < 2).length > 0 && (
                <p style={{ margin: "8px 0 0", color: "var(--dusty-rose)" }}>
                  <strong>Atención:</strong>{" "}
                  {(preview.variantGroups ?? []).filter((g) => g.rowCount < 2).length} fila(s) tienen un código
                  Barras <strong>único</strong> en el CSV. Esas filas no se unirán con otras: varias filas deben
                  compartir exactamente el mismo valor en la columna Barras.
                </p>
              )}
              {previewTableRows.some((r) => r.warnings.some((w) => w.includes("Código de barras distinto"))) && (
                <span style={{ display: "block", marginTop: 6, color: "var(--dusty-rose)" }}>
                  Algunas filas tienen un código de barras distinto al guardado; con «Reemplazar» se actualizará al del CSV.
                </span>
              )}
            </div>
          )}

          <div className="admin-bulk-policy-row">
            <label className="form-label" style={{ marginBottom: 6, display: "block" }}>
              Productos ya registrados en tienda
            </label>
            <select
              className="form-select"
              style={{ width: "100%", maxWidth: 420, minHeight: 40 }}
              value={existingPolicy}
              onChange={(e) => setExistingPolicy(e.target.value as "skip" | "replace")}
            >
              <option value="skip">Solo agrupar como variantes (no modificar datos del producto)</option>
              <option value="replace">Reemplazar datos del producto ya registrado</option>
            </select>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "10px 0 0", lineHeight: 1.45 }}>
              Para productos que <strong>ya existen</strong>, usa el botón <strong>«Agrupar productos como variantes»</strong>.
              No se vuelven a crear ni se suben imágenes de nuevo: solo se asigna el código de barras del CSV para unirlos
              en la tienda. «Reemplazar» actualiza nombre, precio e imágenes desde el CSV.
            </p>
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

          <div
            className="admin-bulk-scroll"
            style={{ marginBottom: 16, border: "1px solid var(--dusty-rose)", borderRadius: "var(--radius-md)" }}
          >
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
                  <th>Ajuste</th>
                </tr>
              </thead>
              <tbody>
                {previewRowsByBarcodeGroup
                  ? previewRowsByBarcodeGroup.groups.flatMap(({ meta, rows, dbOnly }) => [
                      <tr key={`group-${meta.groupKey}`} style={{ background: "var(--lavender-light)" }}>
                        <td
                          colSpan={bulkPreviewTableColSpan}
                          style={{
                            padding: "10px 14px",
                            fontSize: 13,
                            fontWeight: 600,
                            color: "var(--dark)",
                            borderBottom: "2px solid var(--dusty-rose)",
                          }}
                        >
                          <span style={{ fontFamily: "monospace", marginRight: 10 }}>📦 {meta.groupLabel}</span>
                          <span style={{ fontWeight: 500, color: "var(--text-muted)", fontSize: 12 }}>
                            {meta.rowCount} en CSV
                            {meta.existingInCsvCount > 0 && ` · ${meta.existingInCsvCount} ya en tienda`}
                            {meta.newInCsvCount > 0 && ` · ${meta.newInCsvCount} nueva(s)`}
                            {dbOnly.length > 0 &&
                              ` · ${dbOnly.length} en tienda no incluida(s) en este CSV`}
                          </span>
                        </td>
                      </tr>,
                      ...rows.map((r) => renderBulkPreviewDataRow(r)),
                      ...dbOnly.map((p) => (
                        <tr key={`db-only-${p.id}`} style={{ background: "rgba(120, 120, 120, 0.06)" }}>
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
                    ])
                  : previewTableRows.map((r) => renderBulkPreviewDataRow(r))}
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
                {preview.imageMatches.map((m, idx) => (
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
                ))}
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

          <div className="admin-bulk-actions-spacer" aria-hidden />

          <div
            className="admin-bulk-actions-bar"
            role="toolbar"
            aria-label="Acciones de importación masiva"
          >
            <div className="admin-bulk-actions-bar__meta">
              <strong>{selectedRowIds.length}</strong> fila(s) seleccionada(s)
              {selectedVariantGroupRowIds.length > 0 ? (
                <>
                  {" "}
                  · <strong>{selectedVariantGroupRowIds.length}</strong> para agrupar
                </>
              ) : null}
              {selectedNewProductRowIds.length > 0 ? (
                <>
                  {" "}
                  · <strong>{selectedNewProductRowIds.length}</strong> nuevas
                </>
              ) : null}
            </div>
            <button
              type="button"
              className="btn btn-primary"
              disabled={
                saving ||
                selectedVariantGroupRowIds.length === 0 ||
                taxonomyRehomeHints.length > 0
              }
              onClick={() => {
                void (async () => {
                  setMutation("bulk");
                  setBulkProgressLabel("Agrupando productos como variantes…");
                  bulkProgress.start("import");
                  try {
                    const res = await postBulkImportCommit(
                      jobId,
                      [...selectedVariantGroupRowIds].sort(),
                      "skip"
                    );
                    bulkProgress.finish();
                    const grouped = res.variantGroupsAssigned ?? 0;
                    const merged = res.variantGroupsWithMultipleMembers ?? 0;
                    if (grouped > 0 && merged > 0) {
                      showToast(
                        `${grouped} producto(s) agrupados en ${merged} grupo(s) con variantes. Revisa la columna «Variantes» en la lista.`,
                        "success",
                        "📦"
                      );
                    } else if (grouped > 0) {
                      showToast(
                        `Se asignó código Barras a ${grouped} producto(s), pero ninguno quedó unido con otro (cada uno tiene un código Barras distinto en el CSV). Repite el mismo valor en «Barras» para las filas que deben ser variantes del mismo producto.`,
                        "default",
                        "ℹ️"
                      );
                    } else {
                      showToast(
                        "No se aplicó ningún grupo. Verifica que las filas tengan columna Barras y código registrado.",
                        "default",
                        "ℹ️"
                      );
                    }
                    if (res.failed > 0) {
                      showToast(`${res.failed} error(es). Revisa consola o mensajes.`, "danger", "⚠️");
                    }
                    await onImported();
                    resetSession();
                  } catch (e) {
                    bulkProgress.reset();
                    showToast(e instanceof Error ? e.message : "Error al agrupar variantes", "danger", "⚠️");
                  } finally {
                    setMutation(null);
                  }
                })();
              }}
            >
              {saving ? (
                <>
                  <span className="admin-inline-spinner" aria-hidden />
                  Agrupando...
                </>
              ) : selectedVariantGroupRowIds.length === 0 ? (
                "📦 Agrupar productos como variantes"
              ) : selectedVariantGroupRowIds.length === 1 ? (
                "📦 Agrupar 1 producto como variante"
              ) : (
                `📦 Agrupar ${selectedVariantGroupRowIds.length} productos como variantes`
              )}
            </button>

            <button
              type="button"
              className="btn btn-outline"
              disabled={
                saving ||
                selectedNewProductRowIds.length === 0 ||
                (needsTintSelection && !tintsExplicitlySkipped) ||
                (pendingNewCategories.length > 0 && !newCategoriesModalAcknowledged) ||
                taxonomyRehomeHints.length > 0
              }
              onClick={() => {
                void (async () => {
                  setMutation("bulk");
                  setBulkProgressLabel("Importando productos nuevos y subiendo imágenes…");
                  bulkProgress.start("import");
                  try {
                    const res = await postBulkImportCommit(
                      jobId,
                      [...selectedNewProductRowIds].sort(),
                      existingPolicy
                    );
                    bulkProgress.finish();
                    const grouped = res.variantGroupsAssigned ?? 0;
                    if (grouped > 0) {
                      showToast(
                        `Grupos de variantes aplicados a ${grouped} producto(s).`,
                        "success",
                        "📦"
                      );
                    }
                    const created = res.imported - grouped;
                    if (created > 0) {
                      showToast(`Importados ${created} producto(s) nuevo(s)`, "success", "🎉");
                    }
                    const skipped = res.skippedExistingDuplicates ?? 0;
                    if (skipped > 0) {
                      showToast(
                        `${skipped} fila(s) omitida(s): ya registradas y sin código de barras en el CSV.`,
                        "default",
                        "⏭️"
                      );
                    }
                    if (res.imported === 0 && grouped === 0 && skipped === 0 && res.failed === 0) {
                      showToast(
                        "No se aplicaron cambios. Selecciona filas nuevas con match de imagen.",
                        "default",
                        "ℹ️"
                      );
                    }
                    if (res.failed > 0) {
                      showToast(`${res.failed} error(es). Revisa consola o mensajes.`, "danger", "⚠️");
                    }
                    await onImported();
                    resetSession();
                  } catch (e) {
                    bulkProgress.reset();
                    showToast(e instanceof Error ? e.message : "Error al importar", "danger", "⚠️");
                  } finally {
                    setMutation(null);
                  }
                })();
              }}
            >
              {saving ? (
                <>
                  <span className="admin-inline-spinner" aria-hidden />
                  Importando...
                </>
              ) : selectedNewProductRowIds.length === 0 ? (
                "⬆️ Importar productos nuevos"
              ) : selectedNewProductRowIds.length === 1 ? (
                "⬆️ Importar 1 producto nuevo"
              ) : (
                `⬆️ Importar ${selectedNewProductRowIds.length} productos nuevos`
              )}
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
      <AdminBulkLowMatchModal
        open={showLowMatchModal && !!pendingAnalyzeResult && !!pendingLowMatchBreakdown}
        breakdown={pendingLowMatchBreakdown}
        onConfirm={() => {
          if (!pendingAnalyzeResult) return;
          applyAnalyzeResult(pendingAnalyzeResult);
          setPendingAnalyzeResult(null);
          setShowLowMatchModal(false);
        }}
        onCancel={() => {
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
            !!(preview?.hasTintesRows && (!preview?.activeTintTypeId || !preview?.activeTintFamilyId)))
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
            showToast(`Listo: ${typeKey} · ${familyKey}`, "success", "✅");
          } catch (err) {
            showToast(err instanceof Error ? err.message : "Error al configurar tintes", "danger", "⚠️");
          } finally {
            setResolvingTintType(false);
            setMutation(null);
          }
        }}
        onCreateCatalog={async ({ newFamilies, newTypes }) => {
          const res = await postTintResolveCatalog({ newFamilies, newTypes });
          return res;
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
            setApplyingNewCategories(true);
            try {
              const norm = (v: string) =>
                v
                  .trim()
                  .toLowerCase()
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .replace(/[_-]/g, " ")
                  .replace(/\s+/g, " ")
                  .trim();
              for (const item of pendingNewCategories) {
                let tree = await fetchAdminCategories();
                if (item.kind === "newCategory") {
                  let parent =
                    tree.find(
                      (c) => norm(c.name) === norm(item.categoryName) || norm(c.slug) === norm(item.categoryName)
                    ) ?? null;
                  if (!parent) {
                    const created = await createAdminCategory({
                      name: normalizeTaxonomyNameForDb(item.categoryName),
                    });
                    tree = await fetchAdminCategories();
                    parent =
                      tree.find((c) => c.id === created.id) ??
                      tree.find(
                        (c) => norm(c.name) === norm(item.categoryName) || norm(c.slug) === norm(item.categoryName)
                      ) ??
                      null;
                    if (!parent) throw new Error(`No se pudo localizar la categoría recién creada "${item.categoryName}".`);
                  }
                  for (const subName of item.subcategories) {
                    tree = await fetchAdminCategories();
                    const p = tree.find((c) => c.id === parent!.id);
                    if (!p) throw new Error(`Categoría padre perdida al crear subcategoría "${subName}".`);
                    const subDbName = normalizeTaxonomyNameForDb(subName);
                    const existsSub = p.subcategories.some(
                      (s) =>
                        normalizeTaxonomyNameForDb(s.name) === subDbName ||
                        norm(s.slug) === norm(subName)
                    );
                    if (!existsSub) await createAdminSubcategory(p.id, { name: subDbName });
                  }
                } else {
                  const parent =
                    tree.find((c) => c.slug === item.parentCategorySlug) ??
                    tree.find(
                      (c) =>
                        norm(c.slug) === norm(item.parentCategorySlug) ||
                        norm(c.name) === norm(item.parentCategoryName)
                    );
                  if (!parent) {
                    throw new Error(`No se encontró la categoría "${item.parentCategoryName}" para crear subcategorías.`);
                  }
                  for (const subName of item.subcategories) {
                    const treeFresh = await fetchAdminCategories();
                    const p = treeFresh.find((c) => c.id === parent.id);
                    if (!p) throw new Error(`Categoría padre perdida al crear subcategoría "${subName}".`);
                    const subDbName = normalizeTaxonomyNameForDb(subName);
                    const existsSub = p.subcategories.some(
                      (s) =>
                        normalizeTaxonomyNameForDb(s.name) === subDbName ||
                        norm(s.slug) === norm(subName)
                    );
                    if (!existsSub) await createAdminSubcategory(p.id, { name: subDbName });
                  }
                }
              }
              await onCategoriesUpdated();
              if (jobId) {
                const { preview: refreshed } = await patchBulkImportJob(jobId, {
                  selectedRowIds,
                });
                setPreview(refreshed);
              }
              setShowNewCategoriesModal(false);
              showToast("Taxonomía actualizada y preview recalculada.", "success", "✅");
            } catch (err) {
              showToast(err instanceof Error ? err.message : "Error creando categorías nuevas", "danger", "⚠️");
            } finally {
              setApplyingNewCategories(false);
            }
          })();
        }}
      />
      <AdminBulkTemplateModal open={showBulkTemplateModal} onClose={() => setShowBulkTemplateModal(false)} />
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
    typeId: string;
    familyKey: string;
    familyId: string;
    typeLinks: Record<string, string>;
    familyLinks: Record<string, string>;
    defaultTintTypeApplied?: boolean;
    defaultTintFamilyApplied?: boolean;
    tintTypeOverrides?: Record<string, string>;
    selectAllTintRows?: boolean;
  }) => void | Promise<void>;
  onCreateCatalog: (plan: {
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
  const canConfirm =
    !!selectedTypeKey && !!selectedFamilyKey && !!effectiveTypeId && !!effectiveFamilyId && !catalogBusy;

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
    setCatalogBusy(true);
    try {
      const res = await onCreateCatalog({ newFamilies: [], newTypes: [key] });
      const created = res.types.find((t) => normalizeTintCatalogName(t.name) === key);
      if (!created) throw new Error("No se pudo crear el tipo");
      setSelectedTypeKey(key);
      setResolvedTypeId(created.id);
    } finally {
      setCatalogBusy(false);
    }
  };

  const handleLinkType = (name: string, linkId: string) => {
    const key = normalizeTintCatalogName(name);
    setTypeLinks((prev) => ({ ...prev, [key]: linkId }));
    setSelectedTypeKey(key);
    setResolvedTypeId(linkId);
  };

  const handleCreateFamily = async () => {
    if (!selectedFamilyKey) return;
    setCatalogBusy(true);
    try {
      const res = await onCreateCatalog({ newFamilies: [selectedFamilyKey], newTypes: [] });
      const created = res.families.find(
        (f) => normalizeTintCatalogName(f.name) === normalizeTintCatalogName(selectedFamilyKey)
      );
      if (!created) throw new Error("No se pudo crear la familia");
      setResolvedFamilyId(created.id);
    } finally {
      setCatalogBusy(false);
    }
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
    const newNames = new Set<string>();

    for (const [rowId, typeId] of Object.entries(manualTypeOverrides)) {
      if (typeId === MANUAL_TINT_TYPE_NEW) {
        const raw = manualCustomTypeNames[rowId]?.trim();
        if (raw) newNames.add(normalizeTintCatalogName(raw));
      } else if (typeId !== effectiveTypeId) {
        resolved[rowId] = typeId;
      }
    }

    const nameToId = new Map<string, string>();
    for (const name of newNames) {
      const hit = existingTypes.find((t) => normalizeTintCatalogName(t.name) === name);
      if (hit) nameToId.set(name, hit.id);
    }

    const toCreate = [...newNames].filter((n) => !nameToId.has(n));
    if (toCreate.length > 0) {
      setCatalogBusy(true);
      try {
        const res = await onCreateCatalog({ newFamilies: [], newTypes: toCreate });
        for (const t of res.types) {
          nameToId.set(normalizeTintCatalogName(t.name), t.id);
        }
      } finally {
        setCatalogBusy(false);
      }
    }

    for (const [rowId, typeId] of Object.entries(manualTypeOverrides)) {
      if (typeId === MANUAL_TINT_TYPE_NEW) {
        const key = normalizeTintCatalogName(manualCustomTypeNames[rowId]?.trim() ?? "");
        const id = key ? nameToId.get(key) : null;
        if (id && id !== effectiveTypeId) resolved[rowId] = id;
      }
    }

    return resolved;
  };

  const finishConfirm = (resolvedOverrides?: Record<string, string>) => {
    if (!selectedTypeKey || !selectedFamilyKey || !effectiveTypeId || !effectiveFamilyId) return;
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
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={saving || catalogBusy}
                    onClick={() => void handleCreateType(selectedType.name)}
                  >
                    Crear tipo
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
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={saving || catalogBusy}
                    onClick={() => void handleCreateFamily()}
                  >
                    Crear familia
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
  onConfirm,
  onCancel,
}: {
  open: boolean;
  breakdown: ReturnType<typeof computeBulkCsvZipMatchBreakdown> | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!breakdown) return null;

  return (
    <div
      className={`admin-modal-overlay${open ? " open" : ""}`}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
      role="presentation"
    >
      <div className="admin-modal" style={{ maxWidth: 560 }}>
        <button type="button" className="modal-close" onClick={onCancel}>
          ✕
        </button>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: "var(--dark)", marginBottom: 8 }}>
          ¿Archivos correctos?
        </div>
        <p style={{ marginTop: 0, marginBottom: 14, fontSize: 14, color: "var(--text-muted)", lineHeight: 1.55 }}>
          ¿Estás seguro de que son las imágenes correctas y el Excel correcto? Parece que casi no hubo coincidencias
          entre los dos.
        </p>
        <div
          style={{
            display: "grid",
            gap: 10,
            marginBottom: 18,
            padding: "12px 14px",
            borderRadius: "var(--radius-md)",
            background: "var(--lavender-light)",
            border: "1px solid rgba(199, 165, 178, 0.45)",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
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
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button type="button" className="btn btn-outline" onClick={onCancel}>
            Cancelar, volveré a verificarlo
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirm}>
            Confirmar
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
          Si confirmas «Crear en el sistema», se añadirán estas entradas al menú para poder importar{" "}
          <strong>{totalNewRows} producto(s) nuevo(s)</strong>. Los ya registrados no se tocan.
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
            {saving ? "Creando…" : "✅ Crear en el sistema"}
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
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
      <div className="admin-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="admin-table">
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
  categoryTree,
  onPersistStock,
  stockSavingId,
}: {
  products: AdminProduct[];
  categoryTree: AdminCategoryTree[];
  onPersistStock: (id: string, stock: number) => Promise<void>;
  stockSavingId: string | null;
}) {
  let ok = 0, low = 0, out = 0;
  products.forEach((p) => {
    if (p.stock === 0) out++;
    else if (p.stock < 5) low++;
    else ok++;
  });
  return (
    <>
      <div style={{ marginBottom: 24, display: "flex", gap: 16 }}>
        <div className="admin-card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24 }}>✅</span>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--dark)" }}>{ok}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Stock normal</div>
          </div>
        </div>
        <div className="admin-card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--gold)" }}>{low}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Stock bajo (&lt;5)</div>
          </div>
        </div>
        <div className="admin-card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24 }}>❌</span>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--dusty-rose)" }}>{out}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Sin stock</div>
          </div>
        </div>
      </div>
      <div className="admin-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="admin-table">
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
            {products.map((p) => {
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
            })}
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
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
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
        <div className="admin-card" style={{ marginTop: 0 }}>
          <div className="admin-card-title">🏆 Productos más vendidos</div>
          {sorted.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 14, textAlign: "center", padding: 24 }}>Sin datos de ventas aún</p>
          ) : (
            sorted.map(([name, count], idx) => (
              <div key={name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--cream)" }}>
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
  const [editTagsText, setEditTagsText] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editOriginalPrice, setEditOriginalPrice] = useState("");
  const [editStock, setEditStock] = useState("");
  const [editEmoji, setEditEmoji] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editBadge, setEditBadge] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editFeatured, setEditFeatured] = useState(false);
  const [descriptionGenerating, setDescriptionGenerating] = useState(false);

  const applyProductToForm = useCallback(
    (p: AdminProduct) => {
    setEditName(p.name);
    setEditBrand(p.brand || "");
    setEditCategory(p.category);
    setEditSubcategory(p.subcategory || "");
    setEditTagsText(tagsToInputValue(productOwnTags(p)));
    setEditPrice(String(p.price));
    setEditOriginalPrice(p.originalPrice != null ? String(p.originalPrice) : "");
    setEditStock(String(p.stock));
    setEditEmoji(p.emoji || "");
    setEditDescription(p.description || "");
    setEditBadge(p.badge || "");
    setEditActive(p.active);
    setEditFeatured(p.featuredInHome === true);
    },
    [categoryTree]
  );

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

  const subRowsForEdit = useMemo(() => {
    if (!editCategory) return [];
    const c = categoryTree.find((x) => x.slug === editCategory);
    return c ? [...c.subcategories].sort((a, b) => a.sortOrder - b.sortOrder) : [];
  }, [editCategory, categoryTree]);

  const editMenuTagPreview = useMemo(() => {
    if (!product || !editCategory || !editSubcategory) return null;
    return menuTagForProduct(
      { category: editCategory, subcategory: editSubcategory },
      categoryTree,
    );
  }, [product, editCategory, editSubcategory, categoryTree]);

  if (!open || !product) return null;

  const ownTags = productOwnTags(product);
  const productMenuTag = menuTagForProduct(product, categoryTree);

  const canMutateImages = editingMode && !saving;
  const canToggleFeatured = editingMode && !saving;

  return (
    <div className={`admin-modal-overlay${open ? " open" : ""}`} onClick={(e) => e.target === e.currentTarget && onClose()} role="presentation">
      <div className="admin-modal" style={{ maxWidth: 980 }}>
        <button type="button" className="modal-close" onClick={onClose}>
          ✕
        </button>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: "var(--dark)", marginBottom: 18 }}>
          Detalle del producto
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 1fr) minmax(380px, 1.2fr)", gap: 20 }}>
          <div>
            <div style={{ border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden", background: "var(--ivory)", aspectRatio: "1 / 1" }}>
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

          <div>
            {!editingMode ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
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
                  onGenerate={() => {
                    setDescriptionGenerating(true);
                    void (async () => {
                      try {
                        const hasText = Boolean(product.description?.trim());
                        const result = await postAdminProductsAiCompleteOne(product.id, {
                          fields: ["description"],
                          forceRegenerate: hasText,
                          rewriteDescriptions: hasText,
                        });
                        if (result.product) {
                          onProductRefresh?.(result.product);
                          applyProductToForm(result.product);
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
                  }}
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
                <div className="form-group full-width">
                  <label className="form-label">Categoría</label>
                  <select
                    className="form-select"
                    value={editCategory}
                    onChange={(e) => {
                      const slug = e.target.value;
                      setEditCategory(slug);
                      setEditSubcategory("");
                    }}
                  >
                    <option value="">Seleccionar…</option>
                    {sortedCats.map((c) => (
                      <option key={c.id} value={c.slug}>
                        {c.icon ? `${c.icon} ` : ""}
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group full-width">
                  <label className="form-label">Subcategoría</label>
                  <select
                    className="form-select"
                    value={editSubcategory}
                    onChange={(e) => setEditSubcategory(e.target.value)}
                    disabled={!editCategory}
                  >
                    <option value="">{editCategory ? "Seleccionar…" : "Elige categoría primero"}</option>
                    {subRowsForEdit.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                    {editSubcategory && !subRowsForEdit.some((s) => s.name === editSubcategory) && (
                      <option value={editSubcategory}>{editSubcategory}</option>
                    )}
                  </select>
                </div>
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
                <div className="form-group full-width">
                  <label className="form-label">Etiquetas del producto (separadas por coma)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editTagsText}
                    onChange={(e) => setEditTagsText(e.target.value)}
                    placeholder="hidratante, serum, piel seca"
                  />
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
                    Palabras de búsqueda propias del producto. No uses la etiqueta dorada del menú.
                  </p>
                </div>
                <div className="form-group">
                  <label className="form-label">Nombre</label>
                  <input type="text" className="form-input" value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Marca</label>
                  <input type="text" className="form-input" value={editBrand} onChange={(e) => setEditBrand(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Precio</label>
                  <input type="number" className="form-input" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Precio original</label>
                  <input type="number" className="form-input" value={editOriginalPrice} onChange={(e) => setEditOriginalPrice(e.target.value)} placeholder="Opcional" />
                </div>
                <div className="form-group">
                  <label className="form-label">Stock</label>
                  <input type="number" className="form-input" value={editStock} onChange={(e) => setEditStock(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Emoji</label>
                  <input type="text" className="form-input" value={editEmoji} onChange={(e) => setEditEmoji(e.target.value)} maxLength={8} />
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
                        <input type="radio" name={`detail-badge-${product.id}`} checked={editBadge === v} onChange={() => setEditBadge(v)} />
                        {l}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-group full-width">
                  <label className="form-label">Descripción</label>
                  <textarea className="form-textarea" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={4} />
                </div>
                <div className="form-group">
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                    <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            marginTop: 20,
            paddingTop: 16,
            borderTop: "1px solid var(--line)",
          }}
        >
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
                    try {
                      await onSave({
                        name: editName.trim(),
                        brand: editBrand.trim() || "GinnaBeauty",
                        category: editCategory.trim(),
                        subcategory: editSubcategory.trim(),
                        tags: parseTagsInput(editTagsText),
                        price: Number(editPrice),
                        originalPrice: editOriginalPrice.trim() ? Number(editOriginalPrice) : null,
                        stock: Number(editStock),
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
