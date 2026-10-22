"use client";

import { MotionButton, MotionDiv, MotionSpan } from "@/components/store/store-framer-motion";
import { CustomerEmailAuthForm } from "@/components/store/customer-email-auth-form";
import { StoreProductCard } from "@/components/store/store-product-card";
import { StorefrontUiContext } from "@/components/store/storefront-ui-context";
import Image from "next/image";
import Link from "next/link";
import { StoreNavLink } from "@/components/store/StoreNavLink";
import { useStoreNavigation } from "@/components/store/StoreNavigationProvider";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { toCategorySlug } from "@/lib/menu-config";
import type { MenuConfig } from "@/lib/types/admin";
import type { CartLine, StoreProduct } from "@/lib/types/product";
import type { StoreCombo } from "@/lib/types/store-combo";
import { cartComboLineId } from "@/lib/types/store-combo";
import { getCategoryLabel } from "@/lib/category-labels";
import { formatPrice } from "@/lib/format";
import { preloadStorefrontProductImages } from "@/lib/preload-storefront-image";
import { computeShippingCop, loadCart, saveCart, syncCartPricesFromCatalog } from "@/lib/cart-storage";
import { WHOLESALE_THRESHOLD_COP } from "@/lib/admin/customer-crm";
import { applyWholesalePricing, withWholesalePrices } from "@/lib/wholesale-pricing";
import { loadWholesaleCheckoutMode, saveWholesaleCheckoutMode, type WholesaleCheckoutMode } from "@/lib/wholesale-checkout-mode";
import { wholesaleMinimumReminder } from "@/lib/wholesale-rules";
import { StoreDiscountBadge, StoreProductPrice } from "@/components/store/StoreProductPrice";
import { formatDiscountBadge, resolveProductPrice } from "@/lib/product-discount";
import { loadFavorites, saveFavorites } from "@/lib/favorites-storage";
import { STOREFRONT_TOPBAR_MESSAGES } from "@/lib/store-topbar-messages";
import { findBombaCapilarParts, isBombaCapilarProduct } from "@/lib/bomba-capilar";
import { isDisplayableImageUrl } from "@/lib/util/image-url";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { StoreFloatingActions } from "@/components/store/StoreFloatingActions";
import { WelcomeCouponModal } from "@/components/store/WelcomeCouponModal";
import { ProductModalGallery } from "@/components/store/ProductModalGallery";
import {
  ProductColorSwatchField,
  productHasColorSwatch,
  variantsHaveColorSwatches,
} from "@/components/store/ProductColorSwatchField";
import {
  enrichStorefrontDisplayProducts,
  listStorefrontVariantsInGroup,
  resolveStorefrontDisplayAfterFilter,
} from "@/lib/store/variant-groups";
import {
  formatProductVariantLabel,
  productNeedsVariantSelection,
} from "@/lib/store/variant-cart";
import { normalizeColorHex } from "@/lib/product-color";
import { resolveStoreCategoryHref } from "@/lib/store/menu-item-href";
import type { MegaPromoByCategory } from "@/lib/site-settings";

type ToastItem = { id: number; msg: string; type: string; icon: string };

function getCustomerInitials(name: string | null | undefined, email: string | null | undefined): string {
  const n = name?.trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0]!.charAt(0) + parts[1]!.charAt(0)).toUpperCase();
    }
    if (parts.length === 1 && parts[0]!.length >= 2) {
      return parts[0]!.slice(0, 2).toUpperCase();
    }
    if (parts.length === 1) {
      return parts[0]!.charAt(0).toUpperCase();
    }
  }
  const e = email?.trim();
  if (e?.includes("@")) {
    const local = e.split("@")[0] ?? "";
    if (local.length >= 2) return local.slice(0, 2).toUpperCase();
    if (local.length === 1) return local.charAt(0).toUpperCase();
  }
  return "FS";
}

function formatTopbarName(label: string): string {
  const parts = label.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const last = parts[1] ?? "";
    return `${parts[0]} ${last.charAt(0).toUpperCase()}.`;
  }
  return parts[0] ?? label;
}

function normalizeSearchText(value: string): string {
  return value
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function StorefrontShell({
  children,
  catalogProducts,
  initialMenuConfig,
  categorySlugByName,
  menuProductSlugs: _menuProductSlugs = {},
  megaPromo: _megaPromo,
  hideNavChrome = false,
}: {
  children: ReactNode;
  catalogProducts: StoreProduct[];
  initialMenuConfig: MenuConfig;
  categorySlugByName: Record<string, string>;
  /** Nombre normalizado → slug de ficha `/producto/[slug]`. */
  menuProductSlugs?: Record<string, string>;
  megaPromo?: MegaPromoByCategory;
  /** Oculta topbar + header de tienda (modales y carrito siguen activos). Útil para labs A/B. */
  hideNavChrome?: boolean;
}) {
  void _menuProductSlugs;
  void _megaPromo;
  const [products, setProducts] = useState<StoreProduct[]>(catalogProducts);
  const [menuConfig] = useState<MenuConfig>(initialMenuConfig);
  const fullCatalogLoaded = useRef(false);
  const fullCatalogLoading = useRef(false);

  const mergeCatalogProducts = useCallback((extra: StoreProduct[]) => {
    if (extra.length === 0) return;
    setProducts((prev) => {
      const map = new Map(prev.map((p) => [p.id, p]));
      for (const p of extra) map.set(p.id, p);
      return Array.from(map.values());
    });
  }, []);

  const markFullCatalogLoaded = useCallback(() => {
    fullCatalogLoaded.current = true;
  }, []);

  const ensureFullCatalog = useCallback(async () => {
    if (fullCatalogLoaded.current || fullCatalogLoading.current) return;
    fullCatalogLoading.current = true;
    try {
      const res = await fetch("/api/store/catalog", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { products?: StoreProduct[] };
      if (Array.isArray(data.products) && data.products.length > 0) {
        mergeCatalogProducts(data.products);
        fullCatalogLoaded.current = true;
      }
    } catch {
      /* búsqueda global opcional */
    } finally {
      fullCatalogLoading.current = false;
    }
  }, [mergeCatalogProducts]);

  const categoryPath = useCallback(
    (categoryDisplayName: string) =>
      categorySlugByName[categoryDisplayName] ?? toCategorySlug(categoryDisplayName),
    [categorySlugByName]
  );

  const [cart, setCart] = useState<CartLine[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoritesHydrated, setFavoritesHydrated] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const { data: session, status } = useSession();
  const isStoreCustomer = status === "authenticated" && session?.user?.role === "CUSTOMER";
  const isWholesaleCustomer = isStoreCustomer && Boolean(session?.user?.isWholesale);
  const [wholesaleMin, setWholesaleMin] = useState(WHOLESALE_THRESHOLD_COP);
  const [wholesaleMode, setWholesaleMode] = useState<WholesaleCheckoutMode>("wholesale");
  const [wholesaleModeReady, setWholesaleModeReady] = useState(false);
  const customerId = session?.user?.id;
  const customerLabel = (session?.user?.name?.trim() || session?.user?.email?.split("@")[0] || "Cliente") as string;
  const customerTopbarName = formatTopbarName(customerLabel);
  const customerInitials = useMemo(
    () => getCustomerInitials(session?.user?.name, session?.user?.email),
    [session?.user?.name, session?.user?.email]
  );
  const [customerProfileOpen, setCustomerProfileOpen] = useState(false);
  const customerProfileWrapRef = useRef<HTMLDivElement>(null);
  const liveSearchRef = useRef<HTMLDivElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const router = useRouter();
  const { navigateTo, isNavigating } = useStoreNavigation();
  const [topbarIndex, setTopbarIndex] = useState(0);
  const [authMode, setAuthMode] = useState<"login" | "fav-warning">("login");
  const [customerAuthTab, setCustomerAuthTab] = useState<"login" | "register">("login");
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
  /** El cliente hizo clic en un color/variante en el modal (obligatorio antes del carrito). */
  const [variantColorChosen, setVariantColorChosen] = useState(false);
  const [modalImgIdx, setModalImgIdx] = useState(0);
  const [pulseVariantColors, setPulseVariantColors] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  /** Loader global (correo o redirección Google). */
  const [authBusyLabel, setAuthBusyLabel] = useState<string | null>(null);

  useEffect(() => {
    setCart(loadCart());
    setWholesaleMode(loadWholesaleCheckoutMode());
    setWholesaleModeReady(true);
  }, []);

  useEffect(() => {
    if (!isWholesaleCustomer) return;
    void (async () => {
      try {
        const res = await fetch("/api/wholesale/me", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { minimumOrder?: number };
        if (typeof data.minimumOrder === "number" && data.minimumOrder > 0) {
          setWholesaleMin(data.minimumOrder);
        }
      } catch {
        /* ignore */
      }
    })();
  }, [isWholesaleCustomer]);

  const buyingAsWholesale = isWholesaleCustomer && wholesaleMode === "wholesale";
  const catalogForCart = useMemo(
    () => (buyingAsWholesale ? withWholesalePrices(products) : products),
    [buyingAsWholesale, products],
  );

  const chooseWholesaleMode = useCallback((mode: WholesaleCheckoutMode) => {
    setWholesaleMode(mode);
    saveWholesaleCheckoutMode(mode);
  }, []);

  useEffect(() => {
    if (!wholesaleModeReady || catalogForCart.length === 0) return;
    setCart((prev) => {
      const next = syncCartPricesFromCatalog(prev, catalogForCart);
      if (next === prev) return prev;
      saveCart(next);
      return next;
    });
  }, [catalogForCart, wholesaleModeReady]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTopbarIndex((i) => (i + 1) % STOREFRONT_TOPBAR_MESSAGES.length);
    }, 4000);
    return () => window.clearInterval(id);
  }, []);

  const persistCart = useCallback((next: CartLine[]) => {
    setCart(next);
    saveCart(next);
  }, []);

  const showToast = useCallback((msg: string, type = "default", icon = "🛍️") => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg, type, icon }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  useEffect(() => {
    const syncNavHeight = () => {
      const nav = document.getElementById("store-nav-sticky");
      if (!nav) return;
      document.documentElement.style.setProperty("--fs-nav-h", `${Math.round(nav.offsetHeight)}px`);
    };
    const onScroll = () => {
      const scrolled = window.scrollY > 40;
      document.querySelector(".header")?.classList.toggle("scrolled", scrolled);
      document.querySelector(".store-nav-sticky")?.classList.toggle("scrolled", scrolled);
    };
    const nav = document.getElementById("store-nav-sticky");
    const ro = nav && "ResizeObserver" in window ? new ResizeObserver(syncNavHeight) : null;
    if (nav && ro) ro.observe(nav);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", syncNavHeight);
    syncNavHeight();
    onScroll();
    return () => {
      ro?.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", syncNavHeight);
    };
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 900) setMobileMenuOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!customerProfileOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (customerProfileWrapRef.current && !customerProfileWrapRef.current.contains(e.target as Node)) {
        setCustomerProfileOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCustomerProfileOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [customerProfileOpen]);

  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart]);

  const productsRef = useRef(products);
  productsRef.current = products;

  const openProductDetail = useCallback((id: string, opts?: { pulseVariantColors?: boolean }) => {
    const p = productsRef.current.find((x) => x.id === id);
    if (!p) return;
    preloadStorefrontProductImages(p);
    setSelectedProduct(p);
    setModalImgIdx(0);
    const needsColor = productNeedsVariantSelection(p, productsRef.current);
    setVariantColorChosen(false);
    setPulseVariantColors(Boolean(opts?.pulseVariantColors) || needsColor);
    document.body.style.overflow = "hidden";
  }, []);

  const addToCart = useCallback(
    (productId: string, productSnapshot?: StoreProduct, opts?: { variantChosen?: boolean }) => {
      if (isBombaCapilarProduct(productId) || (productSnapshot && isBombaCapilarProduct(productSnapshot.id))) {
        const { dulce, primaveral } = findBombaCapilarParts(productsRef.current);
        const kit = [dulce, primaveral].filter((p): p is StoreProduct => Boolean(p));
        if (kit.length === 0) {
          showToast("Aún no podemos armar la Bomba Capilar. Abre Dulce Renacer y Sensación Primaveral.", "danger", "⚠️");
          return;
        }
        setCart((prev) => {
          let next = prev;
          for (const item of kit) {
            const priced = buyingAsWholesale ? applyWholesalePricing(item) : { ...item, isWholesalePrice: false };
            const existing = next.find((i) => i.id === item.id);
            next = existing
              ? next.map((i) => (i.id === item.id ? { ...i, qty: i.qty + 1, ...priced } : i))
              : [...next, { ...priced, qty: 1, comboId: undefined, comboItems: undefined }];
          }
          saveCart(next);
          return next;
        });
        showToast("Bomba Capilar: Dulce Renacer + Sensación Primaveral al carrito", "success", "🛒");
        setCartOpen(true);
        return;
      }
      const product =
        productsRef.current.find((p) => p.id === productId) ?? productSnapshot ?? null;
      if (!product) {
        showToast("No se pudo agregar al carrito. Abre el producto e inténtalo de nuevo.", "danger", "⚠️");
        return;
      }
      if (productNeedsVariantSelection(product, productsRef.current) && !opts?.variantChosen) {
        showToast("Elige el color o variante antes de agregar al carrito", "info", "🎨");
        void ensureFullCatalog().finally(() => {
          // Espera a que el catálogo se fusione en estado antes de abrir el modal con swatches.
          window.setTimeout(() => {
            openProductDetail(product.id, { pulseVariantColors: true });
          }, 80);
        });
        return;
      }
      const priced = buyingAsWholesale ? applyWholesalePricing(product) : { ...product, isWholesalePrice: false };
      if (productSnapshot) {
        mergeCatalogProducts([product]);
      }
      setCart((prev) => {
        const existing = prev.find((i) => i.id === productId);
        const next = existing
          ? prev.map((i) => (i.id === productId ? { ...i, qty: i.qty + 1, ...priced } : i))
          : [...prev, { ...priced, qty: 1, comboId: undefined, comboItems: undefined }];
        saveCart(next);
        return next;
      });
      const variant = formatProductVariantLabel(product);
      showToast(
        variant ? `${product.name} (${variant}) agregado al carrito` : `${product.name} agregado al carrito`,
        "success",
        "🛒",
      );
      setCartOpen(true);
    },
    [buyingAsWholesale, ensureFullCatalog, mergeCatalogProducts, openProductDetail, showToast],
  );

  const addComboToCart = useCallback(
    (combo: StoreCombo) => {
      const lineId = cartComboLineId(combo.id);
      const cover = combo.items.find((i) => isDisplayableImageUrl(i.product.imageUrl))?.product;
      const line: CartLine = {
        id: lineId,
        name: combo.name,
        brand: "Combo Four Sensations",
        category: "combos",
        subcategory: "",
        tags: ["combo"],
        price: combo.comboPrice,
        originalPrice: combo.retailTotal > combo.comboPrice ? combo.retailTotal : null,
        rating: 5,
        reviews: 0,
        badge: "sale",
        description: combo.items.map((i) => `${i.quantity}× ${i.product.name}`).join(" · "),
        img: cover?.imageUrl && isDisplayableImageUrl(cover.imageUrl) ? cover.imageUrl : "",
        emoji: cover?.emoji || "🎁",
        isNew: true,
        featuredInHome: false,
        gallery: [],
        qty: 1,
        comboId: combo.id,
        comboItems: combo.items.map((i) => ({
          name: i.product.name,
          quantity: i.quantity,
          img: i.product.imageUrl ?? undefined,
          emoji: i.product.emoji ?? undefined,
        })),
      };
      setCart((prev) => {
        const existing = prev.find((i) => i.id === lineId);
        const next = existing
          ? prev.map((i) => (i.id === lineId ? { ...i, qty: i.qty + 1 } : i))
          : [...prev, line];
        saveCart(next);
        return next;
      });
      showToast(`Combo «${combo.name}» agregado al carrito`, "success", "🎁");
      setCartOpen(true);
    },
    [showToast],
  );

  const removeFromCart = useCallback(
    (productId: string) => {
      persistCart(cart.filter((i) => i.id !== productId));
    },
    [cart, persistCart],
  );

  const changeQty = useCallback(
    (productId: string, delta: number) => {
      const item = cart.find((i) => i.id === productId);
      if (!item) return;
      const nextQty = item.qty + delta;
      if (nextQty <= 0) persistCart(cart.filter((i) => i.id !== productId));
      else persistCart(cart.map((i) => (i.id === productId ? { ...i, qty: nextQty } : i)));
    },
    [cart, persistCart],
  );

  const getCartTotal = useCallback(() => cart.reduce((s, i) => s + i.price * i.qty, 0), [cart]);

  const toggleFavorite = useCallback(
    (productId: string) => {
      if (!isStoreCustomer) {
        setAuthMode("fav-warning");
        setCustomerAuthTab("login");
        setAuthOpen(true);
        document.body.style.overflow = "hidden";
        return;
      }
      setFavorites((f) => {
        const idx = f.indexOf(productId);
        if (idx === -1) {
          showToast("Agregado a favoritos", "success", "♥");
          return [...f, productId];
        }
        showToast("Eliminado de favoritos", "default", "♡");
        return f.filter((x) => x !== productId);
      });
    },
    [showToast, isStoreCustomer],
  );

  useEffect(() => {
    if (!isStoreCustomer || !customerId) {
      setFavorites([]);
      setFavoritesHydrated(false);
      return;
    }
    setFavorites(loadFavorites(customerId));
    setFavoritesHydrated(true);
  }, [isStoreCustomer, customerId]);

  useEffect(() => {
    if (!favoritesHydrated || !isStoreCustomer || !customerId) return;
    saveFavorites(customerId, favorites);
  }, [favoritesHydrated, isStoreCustomer, customerId, favorites]);

  const wishlistProducts = useMemo(() => {
    const map = new Map(products.map((p) => [p.id, p]));
    return favorites.map((id) => map.get(id)).filter((p): p is StoreProduct => p != null);
  }, [products, favorites]);

  const searchResults = useMemo(() => {
    const q = normalizeSearchText(searchQuery);
    if (q.length < 1) return [];

    const starts: StoreProduct[] = [];
    const contains: StoreProduct[] = [];

    for (const p of products) {
      const fields = [
        normalizeSearchText(p.name),
        normalizeSearchText(p.brand),
        normalizeSearchText(p.subcategory),
        normalizeSearchText(getCategoryLabel(p.category)),
        normalizeSearchText(p.description),
        ...p.tags.map((t) => normalizeSearchText(t)),
      ];
      const tokens = fields.flatMap((f) => f.split(/\s+/).filter(Boolean));

      if (fields.some((f) => f.startsWith(q)) || tokens.some((t) => t.startsWith(q))) {
        starts.push(p);
        continue;
      }
      if (fields.some((f) => f.includes(q))) {
        contains.push(p);
      }
    }

    return enrichStorefrontDisplayProducts(
      resolveStorefrontDisplayAfterFilter([...starts, ...contains], products),
      products
    );
  }, [products, searchQuery]);
  const normalizedSearchQuery = useMemo(() => normalizeSearchText(searchQuery), [searchQuery]);
  const hasSearchQuery = normalizedSearchQuery.length >= 1;

  const openProductModal = useCallback((id: string, opts?: { pulseVariantColors?: boolean }) => {
    openProductDetail(id, opts);
  }, [openProductDetail]);

  const closeProductModal = () => {
    setSelectedProduct(null);
    setModalImgIdx(0);
    setPulseVariantColors(false);
    setVariantColorChosen(false);
    document.body.style.overflow = "";
  };

  const selectedProductVariants = useMemo(() => {
    if (!selectedProduct?.variantGroupCode?.trim()) return [];
    return listStorefrontVariantsInGroup(products, selectedProduct.variantGroupCode);
  }, [products, selectedProduct]);

  const showSelectedProductColorPicker =
    selectedProductVariants.length >= 2 && variantsHaveColorSwatches(selectedProductVariants);

  const openSearch = () => {
    void ensureFullCatalog();
    document.getElementById("fs-live-search-input")?.focus();
  };

  const openSearchWithQuery = useCallback((query: string) => {
    void ensureFullCatalog();
    const next = query.trim();
    setSearchQuery(next);
    setSearchOpen(next.length > 0);
    window.setTimeout(() => document.getElementById("fs-live-search-input")?.focus(), 40);
  }, [ensureFullCatalog]);

  useEffect(() => {
    if (!searchOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (!liveSearchRef.current?.contains(event.target as Node)) setSearchOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [searchOpen]);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  useEffect(() => {
    if (isNavigating) closeMobileMenu();
  }, [isNavigating, closeMobileMenu]);

  const closeWishlist = useCallback(() => {
    setWishlistOpen(false);
    document.body.style.overflow = "";
  }, []);

  const openWishlist = useCallback(() => {
    closeMobileMenu();
    setWishlistOpen(true);
    document.body.style.overflow = "hidden";
  }, [closeMobileMenu]);

  const openCustomerAuthFromWishlist = useCallback((tab: "login" | "register") => {
    setWishlistOpen(false);
    setAuthMode("login");
    setCustomerAuthTab(tab);
    setAuthOpen(true);
    document.body.style.overflow = "hidden";
  }, []);

  const openCart = useCallback(() => {
    setCartOpen(true);
    document.body.style.overflow = "hidden";
  }, []);

  const closeCart = () => {
    setCartOpen(false);
    document.body.style.overflow = "";
  };

  const openAccount = useCallback(() => {
    setAuthMode("login");
    setCustomerAuthTab("login");
    setAuthOpen(true);
    document.body.style.overflow = "hidden";
  }, []);

  const subtotal = getCartTotal();
  const shipping = buyingAsWholesale ? 0 : computeShippingCop(subtotal);
  const cartTotal = buyingAsWholesale ? subtotal : subtotal + shipping;

  return (
    <StorefrontUiContext.Provider
      value={{
        menuConfig,
        categoryPath,
        catalogProducts: products,
        mergeCatalogProducts,
        markFullCatalogLoaded,
        ensureFullCatalog,
        showToast,
        openProductModal,
        closeProductModal,
        openSearch,
        openSearchWithQuery,
        openCart,
        openWishlist,
        openAccount,
        cartCount,
        addToCart,
        addComboToCart,
        toggleFavorite,
        favorites,
      }}
    >
      <div className={`gb-store-shell${hideNavChrome ? " gb-store-shell--lab-chrome" : ""}`}>
      <>
      {!hideNavChrome ? (
      <>
      <div className="store-nav-sticky" id="store-nav-sticky">
      <div className="topbar" aria-live="polite">
        <div className="topbar-inner">
          <MotionSpan
            key={topbarIndex}
            className="topbar-msg topbar-msg--rotate"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            {STOREFRONT_TOPBAR_MESSAGES[topbarIndex]}
          </MotionSpan>
          {isStoreCustomer ? (
            <div className="topbar-user-slot">
              <Link href="/cuenta/perfil" className="topbar-user" title={`Hola, ${customerLabel}`}>
                <span className="topbar-user__glow" aria-hidden />
                <span className="topbar-user__name">{customerTopbarName}</span>
              </Link>
            </div>
          ) : (
            <div className="topbar-user-slot" aria-hidden />
          )}
        </div>
      </div>

      <header className="header" id="main-header">
        <div className="header-inner">
          <BrandLogo variant="store" priority />

          <button
            type="button"
            className={`mobile-menu-toggle${mobileMenuOpen ? " open" : ""}`}
            aria-label="Abrir menú"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>

          <nav className="main-nav header-nav-rail" aria-label="Categorías">
            <ul className="nav-list">
              {Object.entries(menuConfig).map(([cat, data]) => {
                const isMayorista = /mayorista/i.test(cat);
                return (
                  <li
                    key={cat}
                    className={`nav-item${isMayorista ? " nav-item--mayorista" : ""}`}
                  >
                    <StoreNavLink
                      href={resolveStoreCategoryHref(categoryPath(cat))}
                      className="nav-link"
                      prefetch
                    >
                      <span className="nav-link-icon" aria-hidden>
                        {data.icon}
                      </span>
                      <span className="nav-link-label">{cat}</span>
                    </StoreNavLink>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="header-actions">
            <div className="header-toolbar-inner">
              <div className="fs-live-search" ref={liveSearchRef}>
                <div className="search-bar header-toolbar-search">
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  <input
                    id="fs-live-search-input"
                    type="search"
                    placeholder="Buscar en Four Sensations…"
                    value={searchQuery}
                    autoComplete="off"
                    onChange={(e) => {
                      const next = e.target.value.replace(/[\u200B-\u200D\uFEFF]/g, "");
                      setSearchQuery(next);
                      setSearchOpen(next.trim().length > 0);
                      void ensureFullCatalog();
                    }}
                    onFocus={() => {
                      void ensureFullCatalog();
                      if (searchQuery.trim()) setSearchOpen(true);
                    }}
                  />
                </div>
                {searchOpen && hasSearchQuery ? (
                  <div className="fs-live-search__panel" role="region" aria-label="Resultados de búsqueda">
                    <p className="fs-live-search__label">Resultados para “{searchQuery.trim()}”</p>
                    {searchResults.length === 0 ? (
                      <p className="fs-live-search__empty">No encontramos productos con esa búsqueda.</p>
                    ) : (
                      <div className="fs-live-search__grid">
                        {searchResults.slice(0, 8).map((p, i) => (
                          <StoreProductCard
                            key={p.id}
                            product={p}
                            isFav={favorites.includes(p.id)}
                            onOpen={(id) => {
                              openProductModal(id);
                              setSearchOpen(false);
                            }}
                            onToggleFav={toggleFavorite}
                            onAddCart={addToCart}
                            imagePriority={i < 2}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
              <div className="header-icon-group">
                {isStoreCustomer ? (
                  <div className="gb-customer-bubble-wrap" ref={customerProfileWrapRef}>
                    <div className="gb-customer-cluster">
                      <button
                        type="button"
                        className={`gb-customer-avatar-btn${customerProfileOpen ? " is-open" : ""}`}
                        aria-expanded={customerProfileOpen}
                        aria-haspopup="dialog"
                        title={`Hola, ${customerLabel}`}
                        onClick={() => setCustomerProfileOpen((v) => !v)}
                      >
                        <span className="gb-customer-avatar-ring" aria-hidden />
                        <span className="gb-customer-avatar-initials">{customerInitials}</span>
                      </button>
                      <button
                        type="button"
                        className="gb-customer-logout-mini"
                        title="Cerrar sesión"
                        aria-label="Cerrar sesión"
                        onClick={() => {
                          setCustomerProfileOpen(false);
                          void signOut({ redirect: false }).then(() => {
                            setFavorites([]);
                            showToast("Sesión cerrada", "info", "👋");
                            router.refresh();
                          });
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                      </button>
                    </div>
                    {customerProfileOpen ? (
                      <MotionDiv
                        className="gb-customer-popover"
                        role="dialog"
                        aria-labelledby="gb-customer-welcome-title"
                        initial={{ opacity: 0, y: -8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <div className="gb-customer-popover__shine" aria-hidden />
                        <div className="gb-customer-popover__petals" aria-hidden>
                          <span>✿</span>
                          <span>✦</span>
                          <span>✿</span>
                        </div>
                        <p id="gb-customer-welcome-title" className="gb-customer-popover__title">
                          ¡Amamos verte, <em>{customerLabel}</em>!
                        </p>
                        <p className="gb-customer-popover__text">
                          Ponte cómoda, explora a tu ritmo y déjate sorprender
                        </p>
                        <p className="gb-customer-popover__text">
                          Spoiler: Te va a encantar estar en el Club de los Cabellos Perfectos
                        </p>
                        <nav className="gb-customer-popover__nav" aria-label="Tu cuenta">
                          <Link
                            href="/cuenta/perfil"
                            className="gb-customer-popover__link"
                            onClick={() => setCustomerProfileOpen(false)}
                          >
                            Mi Perfil <span aria-hidden>→</span>
                          </Link>
                          <Link
                            href="/cuenta/pedidos"
                            className="gb-customer-popover__link"
                            onClick={() => setCustomerProfileOpen(false)}
                          >
                            Mis pedidos <span aria-hidden>→</span>
                          </Link>
                          <Link
                            href="/cuenta/cupones"
                            className="gb-customer-popover__link"
                            onClick={() => setCustomerProfileOpen(false)}
                          >
                            Mis cupones <span aria-hidden>→</span>
                          </Link>
                        </nav>
                        <div className="gb-customer-popover__footer" aria-hidden>
                          <span className="gb-customer-popover__heart">♥</span>
                        </div>
                      </MotionDiv>
                    ) : null}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="icon-btn icon-btn--account"
                    title="Mi cuenta"
                    onClick={openAccount}
                  >
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                    </svg>
                  </button>
                )}
                <button type="button" className="icon-btn icon-btn--search" title="Buscar" onClick={openSearch}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </button>
                <button type="button" className="icon-btn icon-btn--fav" style={{ position: "relative" }} title="Lista de deseos" onClick={openWishlist}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  <span className="badge fav-badge" style={{ display: favorites.length > 0 ? "flex" : "none" }}>
                    {favorites.length}
                  </span>
                </button>
                <button type="button" className="icon-btn icon-btn--cart" style={{ position: "relative" }} title="Carrito" onClick={openCart}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <circle cx="9" cy="20" r="1.4" fill="currentColor" stroke="none" />
                    <circle cx="17" cy="20" r="1.4" fill="currentColor" stroke="none" />
                    <path d="M3 3h2l.8 3.2L7.5 14h10.2l1.8-7H6.2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M7.5 14h10" strokeLinecap="round" />
                  </svg>
                  <span className="badge cart-badge" style={{ display: cartCount > 0 ? "flex" : "none" }}>
                    {cartCount}
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className={`mobile-mega-menu${mobileMenuOpen ? " open" : ""}`} id="mobile-categories-menu">
            <div className="mobile-mega-menu-inner mobile-cat-panel">
              <p className="mobile-cat-panel__title">Categorías</p>
              <nav className="mobile-cat-panel__list" aria-label="Categorías">
                {Object.entries(menuConfig).map(([cat, data]) => {
                  const isMayorista = /mayorista/i.test(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      className={`mobile-cat-panel__item${isMayorista ? " mobile-cat-panel__item--mayorista" : ""}`}
                      onClick={() => {
                        navigateTo(resolveStoreCategoryHref(categoryPath(cat)));
                        closeMobileMenu();
                      }}
                    >
                      <span className="mobile-cat-panel__icon" aria-hidden>
                        {data.icon}
                      </span>
                      <span className="mobile-cat-panel__label">{cat}</span>
                      <span className="mobile-cat-panel__arrow" aria-hidden>
                        →
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      </header>
      </div>
      <div className="store-nav-offset" aria-hidden />
      </>
      ) : null}

      {children}

      <div className={`cart-overlay${cartOpen ? " open" : ""}`} id="cart-overlay-bg" onClick={closeCart} role="presentation" />

      <aside className={`cart-sidebar${cartOpen ? " open" : ""}`} id="cart-sidebar">
        <div className="cart-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="cart-title">Mi Carrito</span>
            <span className="cart-count-badge" id="cart-sidebar-count">
              {cartCount}
            </span>
          </div>
          <button type="button" className="modal-close" onClick={closeCart}>
            ✕
          </button>
        </div>
        <div className="cart-items" id="cart-items">
          {cart.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🛍️</div>
              <p style={{ fontSize: 14 }}>Tu carrito está vacío</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="cart-item">
                <div className="cart-item-img" style={{ background: "var(--cream)" }}>
                  {isDisplayableImageUrl(item.img) ? (
                    <Image src={item.img} alt="" fill sizes="72px" loading="lazy" style={{ objectFit: "cover" }} />
                  ) : (
                    item.emoji
                  )}
                </div>
                <div className="cart-item-info" style={{ flex: 1 }}>
                  <div className="cart-item-name">{item.name}</div>
                  <div className="cart-item-variant">
                    {item.comboId
                      ? "Combo promocional"
                      : formatProductVariantLabel(item)
                        ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            {normalizeColorHex(item.colorHex) ? (
                              <span
                                aria-hidden
                                style={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: "50%",
                                  background: normalizeColorHex(item.colorHex)!,
                                  border: "1px solid var(--line)",
                                }}
                              />
                            ) : null}
                            Color: {formatProductVariantLabel(item)}
                          </span>
                          )
                        : item.brand}
                  </div>
                  {item.comboItems && item.comboItems.length > 0 ? (
                    <ul style={{ margin: "6px 0 0", padding: "0 0 0 14px", fontSize: 11, color: "var(--text-muted)", lineHeight: 1.35 }}>
                      {item.comboItems.map((ci, idx) => (
                        <li key={`${item.id}-ci-${idx}`}>
                          {ci.quantity > 1 ? `${ci.quantity}× ` : ""}
                          {ci.name}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="cart-item-price">
                    {(() => {
                      const resolved = resolveProductPrice(item);
                      return (
                        <>
                          {formatPrice(resolved.price)}
                          {resolved.discountPercent != null ? (
                            <span className="price-discount" style={{ marginLeft: 6, whiteSpace: "nowrap" }}>
                              {formatDiscountBadge(resolved.discountPercent)}
                            </span>
                          ) : null}
                          {resolved.originalPrice != null ? (
                            <span className="price-original" style={{ marginLeft: 6, fontSize: 12 }}>
                              {formatPrice(resolved.originalPrice)}
                            </span>
                          ) : null}
                        </>
                      );
                    })()}
                  </div>
                  <div className="qty-control">
                    <button type="button" className="qty-btn" onClick={() => changeQty(item.id, -1)}>
                      −
                    </button>
                    <span className="qty-num">{item.qty}</span>
                    <button type="button" className="qty-btn" onClick={() => changeQty(item.id, 1)}>
                      +
                    </button>
                  </div>
                </div>
                <button type="button" className="remove-item" title="Eliminar" onClick={() => removeFromCart(item.id)}>
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
        <div className={`cart-footer${buyingAsWholesale ? " cart-footer--wholesale" : ""}`}>
          {isWholesaleCustomer ? (
            <div className="cart-channel-switch" role="group" aria-label="Tipo de compra">
              <button
                type="button"
                className={wholesaleMode === "wholesale" ? "is-active" : ""}
                aria-pressed={wholesaleMode === "wholesale"}
                onClick={() => chooseWholesaleMode("wholesale")}
              >
                Comprar como mayorista
              </button>
              <button
                type="button"
                className={wholesaleMode === "retail" ? "is-active" : ""}
                aria-pressed={wholesaleMode === "retail"}
                onClick={() => chooseWholesaleMode("retail")}
              >
                Comprar al detal
              </button>
            </div>
          ) : null}
          <div className="cart-summary">
            <div className="cart-summary-row">
              <span>Subtotal</span>
              <span id="cart-subtotal">{formatPrice(subtotal)}</span>
            </div>
            {buyingAsWholesale ? null : (
              <div className="cart-summary-row">
                <span>Envío</span>
                <span id="cart-shipping">{shipping === 0 ? "Gratis 🎉" : formatPrice(shipping)}</span>
              </div>
            )}
            <div className="cart-summary-row total">
              <span>Total</span>
              <span id="cart-total">{formatPrice(cartTotal)}</span>
            </div>
          </div>
          {buyingAsWholesale ? (
            <div className="cart-wholesale-block">
              <p className="cart-wholesale-kicker">Acumulado de este pedido</p>
              <strong className="cart-wholesale-total">{formatPrice(subtotal)}</strong>
              <p className="cart-wholesale-hint">{wholesaleMinimumReminder(wholesaleMin, subtotal)}</p>
              <p className="cart-wholesale-pay">Pago contraentrega · sin cargo de envío en el resumen</p>
            </div>
          ) : null}
          {buyingAsWholesale && subtotal < wholesaleMin ? (
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() => showToast(wholesaleMinimumReminder(wholesaleMin, subtotal), "danger", "💗")}
            >
              Ir a pagar
            </button>
          ) : (
          <Link
            href="/checkout"
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center" }}
            onClick={() => {
              closeCart();
            }}
          >
            💳 Proceder al pago
          </Link>
          )}
          <button type="button" className="btn btn-outline" style={{ width: "100%", justifyContent: "center", marginTop: 8 }} onClick={closeCart}>
            Seguir comprando
          </button>
        </div>
      </aside>

      <div
        className={`modal-overlay modal-overlay--product-tech${selectedProduct ? " open" : ""}`}
        id="product-overlay"
        onClick={(e) => e.target === e.currentTarget && closeProductModal()}
        role="presentation"
      >
        <MotionDiv
          className="modal modal--product-tech"
          style={{ position: "relative" }}
          initial={false}
          animate={
            selectedProduct
              ? { opacity: 1, scale: 1, y: 0 }
              : { opacity: 0, scale: 0.96, y: 16 }
          }
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="modal-tech-border" aria-hidden />
          {selectedProduct && (
            <>
              <button type="button" className="modal-close modal-close--tech" onClick={closeProductModal}>
                ✕
              </button>
              <div className="product-modal-layout">
                <ProductModalGallery product={selectedProduct} />
                <div className="modal-details modal-details--tech">
                  <div>
                    <div className="breadcrumbs">
                      <Link href="/" prefetch>
                        Inicio
                      </Link>
                      <i>›</i>
                      <Link href={`/categoria/${selectedProduct.category}`} prefetch>
                        {getCategoryLabel(selectedProduct.category)}
                      </Link>
                      <i>›</i>
                      <Link
                        href={`/categoria/${selectedProduct.category}?grupo=${encodeURIComponent(selectedProduct.subcategory)}`}
                        prefetch
                      >
                        {selectedProduct.subcategory}
                      </Link>
                      <i>›</i>
                      <span>{selectedProduct.name}</span>
                    </div>
                    <div className="product-brand">{selectedProduct.brand}</div>
                    <h2 className="product-modal-title" style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 600, color: "var(--dark)", marginBottom: 12, lineHeight: 1.2 }}>
                      {selectedProduct.name}
                    </h2>
                    {selectedProduct.slug ? (
                      <Link
                        href={`/producto/${selectedProduct.slug}`}
                        prefetch
                        onClick={closeProductModal}
                        className="product-ficha-cta"
                      >
                        <span className="product-ficha-cta__glow" aria-hidden />
                        <span className="product-ficha-cta__label">Abrir ficha completa</span>
                        <span className="product-ficha-cta__arrow" aria-hidden>
                          →
                        </span>
                      </Link>
                    ) : null}
                    <div className="product-stars" style={{ marginBottom: 16 }}>
                      <span className="stars">
                        {"★".repeat(Math.floor(selectedProduct.rating))}
                        {"☆".repeat(5 - Math.floor(selectedProduct.rating))}
                      </span>
                      <span className="reviews-count">
                        {selectedProduct.rating} · {selectedProduct.reviews} reseñas
                      </span>
                    </div>
                    <div className="product-modal-price-row" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
                      <StoreProductPrice product={selectedProduct} currentStyle={{ fontSize: 32 }} />
                    </div>
                    {showSelectedProductColorPicker ? (
                      <div
                        className={`product-modal-color-picker${!variantColorChosen ? " product-modal-color-picker--pulse" : ""}`}
                        style={{ marginBottom: 20 }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--dark)", marginBottom: 10 }}>
                          Colores disponibles
                        </div>
                        {!variantColorChosen ? (
                          <p className="product-modal-color-picker__hint">
                            Selecciona el color que deseas antes de agregar al carrito
                          </p>
                        ) : null}
                        <ProductColorSwatchField
                          items={selectedProductVariants}
                          selectedId={variantColorChosen ? selectedProduct.id : null}
                          onSelect={(id) => {
                            const next = products.find((p) => p.id === id);
                            if (next) {
                              setSelectedProduct(next);
                              setModalImgIdx(0);
                              setVariantColorChosen(true);
                              setPulseVariantColors(false);
                            }
                          }}
                          size="sm"
                        />
                      </div>
                    ) : productHasColorSwatch(selectedProduct) && selectedProductVariants.length < 2 ? (
                      <div className="product-modal-color-single" style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--dark)", marginBottom: 10 }}>
                          Color
                        </div>
                        <ProductColorSwatchField
                          items={[selectedProduct]}
                          selectedId={selectedProduct.id}
                          onSelect={() => {}}
                          size="sm"
                        />
                      </div>
                    ) : selectedProductVariants.length >= 2 ? (
                      <div
                        className={`product-modal-color-picker${!variantColorChosen ? " product-modal-color-picker--pulse" : ""}`}
                        style={{ marginBottom: 20 }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--dark)", marginBottom: 10 }}>
                          Variantes disponibles
                        </div>
                        {!variantColorChosen ? (
                          <p className="product-modal-color-picker__hint">
                            Selecciona la variante que deseas antes de agregar al carrito
                          </p>
                        ) : null}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {selectedProductVariants.map((v) => (
                            <button
                              key={v.id}
                              type="button"
                              className={`btn btn-sm ${variantColorChosen && v.id === selectedProduct.id ? "btn-primary" : "btn-outline"}`}
                              onClick={() => {
                                setSelectedProduct(v);
                                setModalImgIdx(0);
                                setVariantColorChosen(true);
                                setPulseVariantColors(false);
                              }}
                            >
                              {formatProductVariantLabel(v) || v.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <p className="product-modal-desc" style={{ fontSize: 14, color: "var(--text-light)", lineHeight: 1.75, marginBottom: 24 }}>{selectedProduct.description}</p>
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-glow"
                      style={{ flex: 1, justifyContent: "center" }}
                      onClick={() => {
                        if (
                          productNeedsVariantSelection(selectedProduct, products) &&
                          !variantColorChosen
                        ) {
                          setPulseVariantColors(true);
                          showToast("Selecciona el color o variante que deseas", "info", "🎨");
                          return;
                        }
                        addToCart(selectedProduct.id, selectedProduct, { variantChosen: true });
                        closeProductModal();
                      }}
                    >
                      🛒 Agregar al carrito
                    </button>
                    <button
                      type="button"
                      className={`btn btn-outline btn-icon ${favorites.includes(selectedProduct.id) ? "fav-active" : ""}`}
                      title="Favorito"
                      onClick={() => toggleFavorite(selectedProduct.id)}
                    >
                      {favorites.includes(selectedProduct.id) ? "♥" : "♡"}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </MotionDiv>
      </div>

      <div
        className={`modal-overlay gb-wish-modal-overlay${wishlistOpen ? " open" : ""}`}
        id="wishlist-overlay"
        onClick={(e) => e.target === e.currentTarget && closeWishlist()}
        role="presentation"
      >
        <div className="modal gb-wish-modal" role="dialog" aria-modal="true" aria-labelledby="wishlist-title" onClick={(e) => e.stopPropagation()}>
          <div className="gb-wish-energy-shell">
            <div className="gb-wish-energy-spin" aria-hidden />
            <div className="gb-wish-particles" aria-hidden>
              {Array.from({ length: 20 }, (_, i) => (
                <span
                  key={i}
                  className="gb-wish-particle-dot"
                  style={
                    {
                      "--gb-a": `${i * 18}deg`,
                      "--gb-d": `${i * 0.1}s`,
                    } as CSSProperties
                  }
                />
              ))}
            </div>
            <div className="gb-wish-modal-panel">
              <button type="button" className="modal-close" onClick={closeWishlist} aria-label="Cerrar lista de deseos">
                ✕
              </button>
              <h2 id="wishlist-title" className="gb-wish-title">
                Lista de deseos
              </h2>
              {isStoreCustomer ? (
                <>
                  <p className="gb-wish-sub">Tus productos favoritos guardados en esta cuenta.</p>
                  {wishlistProducts.length === 0 ? (
                    <div className="gb-wish-empty">
                      Aún no tienes favoritos. Explora la tienda y pulsa el corazón en un producto para guardarlo aquí.
                    </div>
                  ) : (
                    <ul className="gb-wish-list">
                      {wishlistProducts.map((p) => (
                        <li key={p.id} className="gb-wish-row">
                          <button type="button" className="gb-wish-thumb" onClick={() => { closeWishlist(); openProductModal(p.id); }} title="Ver producto">
                            {isDisplayableImageUrl(p.img) ? (
                              <Image src={p.img} alt="" fill sizes="56px" loading="lazy" style={{ objectFit: "cover" }} />
                            ) : (
                              p.emoji
                            )}
                          </button>
                          <div className="gb-wish-row-info">
                            <button type="button" className="gb-wish-row-name" onClick={() => { closeWishlist(); openProductModal(p.id); }}>
                              {p.name}
                            </button>
                            <p className="gb-wish-row-meta">
                              {p.brand} · {formatPrice(p.price)}
                            </p>
                          </div>
                          <div className="gb-wish-row-actions">
                            <button type="button" onClick={() => addToCart(p.id, p)}>
                              Al carrito
                            </button>
                            <button type="button" className="gb-wish-remove" onClick={() => toggleFavorite(p.id)}>
                              Quitar ♥
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <>
                  <p className="gb-wish-sub">Inicia sesión o crea una cuenta para guardar y ver tu lista en cualquier momento.</p>
                  <div className="gb-wish-guest-grid">
                    <MotionButton
                      type="button"
                      className="gb-wish-guest-card"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => openCustomerAuthFromWishlist("register")}
                    >
                      <strong>Registrarme en Four Sensations</strong>
                      <span>Crea tu cuenta gratis con correo y contraseña.</span>
                    </MotionButton>
                    <MotionButton
                      type="button"
                      className="gb-wish-guest-card"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => openCustomerAuthFromWishlist("login")}
                    >
                      <strong>Iniciar sesión</strong>
                      <span>Entra con el correo con el que te registraste.</span>
                    </MotionButton>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        className={`modal-overlay${authOpen ? " open" : ""}`}
        id="auth-overlay"
        onClick={(e) => {
          if (authBusyLabel) return;
          if (e.target === e.currentTarget) {
            setAuthOpen(false);
            document.body.style.overflow = "";
          }
        }}
        role="presentation"
      >
        <div className="modal auth-modal">
          <button
            type="button"
            className="modal-close"
            onClick={() => {
              setAuthBusyLabel(null);
              setAuthOpen(false);
              document.body.style.overflow = "";
            }}
          >
            ✕
          </button>
          <div className="auth-modal__scroll">
          <BrandLogo variant="auth" />
          <div id="fav-warning-msg" className="fav-warning" style={{ display: authMode === "fav-warning" ? "block" : "none" }}>
            <p>
              💝 ¡Guarda tus productos favoritos! <strong>Inicia sesión</strong> para que tu lista se conserve incluso si cierras la página.
            </p>
          </div>
          <div className="auth-title">Bienvenido/a</div>
          <p className="auth-sub">Inicia sesión para una experiencia de compra personalizada</p>
          <CustomerEmailAuthForm
            tab={customerAuthTab}
            showToast={showToast}
            onBusyChange={setAuthBusyLabel}
            disabled={!!authBusyLabel}
            closeAuthModal={() => {
              setAuthBusyLabel(null);
              setAuthOpen(false);
              document.body.style.overflow = "";
            }}
          />
          <p className="auth-switch">
            {customerAuthTab === "login" ? (
              <>
                ¿No tienes cuenta?{" "}
                <a
                  role="button"
                  tabIndex={authBusyLabel ? -1 : 0}
                  onClick={() => !authBusyLabel && setCustomerAuthTab("register")}
                  onKeyDown={(e) => e.key === "Enter" && !authBusyLabel && setCustomerAuthTab("register")}
                  style={{ cursor: authBusyLabel ? "default" : "pointer", opacity: authBusyLabel ? 0.45 : 1 }}
                >
                  Crear cuenta gratis
                </a>
              </>
            ) : (
              <>
                ¿Ya tienes cuenta?{" "}
                <a
                  role="button"
                  tabIndex={authBusyLabel ? -1 : 0}
                  onClick={() => !authBusyLabel && setCustomerAuthTab("login")}
                  onKeyDown={(e) => e.key === "Enter" && !authBusyLabel && setCustomerAuthTab("login")}
                  style={{ cursor: authBusyLabel ? "default" : "pointer", opacity: authBusyLabel ? 0.45 : 1 }}
                >
                  Iniciar sesión
                </a>
              </>
            )}
          </p>
          </div>
        </div>
      </div>

      {authBusyLabel ? (
        <div className="gb-auth-global-loader" role="status" aria-live="polite" aria-busy="true" aria-label={authBusyLabel}>
          <div className="gb-auth-global-loader__card">
            <div className="gb-auth-global-loader__spinner" />
            <p className="gb-auth-global-loader__text">{authBusyLabel}</p>
          </div>
        </div>
      ) : null}

      {!hideNavChrome ? <WelcomeCouponModal /> : null}

      <StoreFloatingActions cartCount={cartCount} onOpenCart={openCart} />

      <div className="toast-container" id="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span className="toast-icon">{t.icon}</span>
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </>
    </div>
    </StorefrontUiContext.Provider>
  );
}
