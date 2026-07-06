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
import { signIn, signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { toCategorySlug } from "@/lib/menu-config";
import type { MenuConfig } from "@/lib/types/admin";
import type { CartLine, StoreProduct } from "@/lib/types/product";
import { getCategoryLabel } from "@/lib/category-labels";
import { formatPrice } from "@/lib/format";
import { computeShippingCop, loadCart, saveCart } from "@/lib/cart-storage";
import { loadFavorites, saveFavorites } from "@/lib/favorites-storage";
import { STOREFRONT_TOPBAR_MESSAGES } from "@/lib/store-topbar-messages";
import { isHttpImageUrl } from "@/lib/util/image-url";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { StoreFloatingActions } from "@/components/store/StoreFloatingActions";

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
  return "GB";
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
}: {
  children: ReactNode;
  catalogProducts: StoreProduct[];
  initialMenuConfig: MenuConfig;
  categorySlugByName: Record<string, string>;
}) {
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
  const customerId = session?.user?.id;
  const customerLabel = (session?.user?.name?.trim() || session?.user?.email?.split("@")[0] || "Cliente") as string;
  const customerInitials = useMemo(
    () => getCustomerInitials(session?.user?.name, session?.user?.email),
    [session?.user?.name, session?.user?.email]
  );
  const [customerProfileOpen, setCustomerProfileOpen] = useState(false);
  const customerProfileWrapRef = useRef<HTMLDivElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileExpandedCat, setMobileExpandedCat] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const router = useRouter();
  const { navigateTo } = useStoreNavigation();
  const [topbarIndex, setTopbarIndex] = useState(0);
  const [authMode, setAuthMode] = useState<"login" | "fav-warning">("login");
  const [customerAuthTab, setCustomerAuthTab] = useState<"login" | "register">("login");
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
  const [modalImgIdx, setModalImgIdx] = useState(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  /** Loader global (correo o redirección Google). */
  const [authBusyLabel, setAuthBusyLabel] = useState<string | null>(null);

  useEffect(() => {
    setCart(loadCart());
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTopbarIndex((i) => (i + 1) % STOREFRONT_TOPBAR_MESSAGES.length);
    }, 7500);
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

  const startGoogleSignIn = useCallback(async () => {
    setAuthBusyLabel("Redirigiendo a Google…");
    try {
      await signIn("google", {
        callbackUrl: typeof window !== "undefined" ? window.location.href : "/",
      });
    } catch {
      setAuthBusyLabel(null);
      showToast("No se pudo conectar con Google. Intenta de nuevo.", "error", "⚠️");
    }
  }, [showToast]);

  useEffect(() => {
    const onScroll = () => {
      const scrolled = window.scrollY > 40;
      document.querySelector(".header")?.classList.toggle("scrolled", scrolled);
      document.querySelector(".store-nav-sticky")?.classList.toggle("scrolled", scrolled);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 900) {
        setMobileMenuOpen(false);
        setMobileExpandedCat(null);
      }
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

  const addToCart = useCallback(
    (productId: string) => {
      const product = products.find((p) => p.id === productId);
      if (!product) return;
      const existing = cart.find((i) => i.id === productId);
      if (existing) {
        persistCart(cart.map((i) => (i.id === productId ? { ...i, qty: i.qty + 1 } : i)));
      } else {
        persistCart([...cart, { ...product, qty: 1 }]);
      }
      showToast(`${product.name} agregado al carrito`, "success", "🛒");
    },
    [cart, persistCart, products, showToast],
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

    return [...starts, ...contains];
  }, [products, searchQuery]);
  const normalizedSearchQuery = useMemo(() => normalizeSearchText(searchQuery), [searchQuery]);
  const hasSearchQuery = normalizedSearchQuery.length >= 1;

  const openProductModal = (id: string) => {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    setSelectedProduct(p);
    setModalImgIdx(0);
    document.body.style.overflow = "hidden";
  };

  const closeProductModal = () => {
    setSelectedProduct(null);
    setModalImgIdx(0);
    document.body.style.overflow = "";
  };

  const openSearch = () => {
    void ensureFullCatalog();
    setSearchQuery("");
    setSearchOpen(true);
    document.body.style.overflow = "hidden";
    setTimeout(() => document.getElementById("search-input-big")?.focus(), 100);
  };

  const openSearchWithQuery = useCallback((query: string) => {
    void ensureFullCatalog();
    setSearchQuery(query.trim());
    setSearchOpen(true);
    document.body.style.overflow = "hidden";
    setTimeout(() => document.getElementById("search-input-big")?.focus(), 100);
  }, [ensureFullCatalog]);

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
    document.body.style.overflow = "";
  };

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
    setMobileExpandedCat(null);
  }, []);

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

  const openCart = () => {
    setCartOpen(true);
    document.body.style.overflow = "hidden";
  };

  const closeCart = () => {
    setCartOpen(false);
    document.body.style.overflow = "";
  };

  const subtotal = getCartTotal();
  const shipping = computeShippingCop(subtotal);

  return (
    <StorefrontUiContext.Provider
      value={{
        menuConfig,
        categoryPath,
        catalogProducts: products,
        mergeCatalogProducts,
        ensureFullCatalog,
        showToast,
        openProductModal,
        closeProductModal,
        openSearch,
        openSearchWithQuery,
        addToCart,
        toggleFavorite,
        favorites,
      }}
    >
      <div className="gb-store-shell">
      <>
      <div className="store-nav-sticky" id="store-nav-sticky">
      <div className="topbar" aria-live="polite">
        <MotionSpan
          key={topbarIndex}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: "inline-block" }}
        >
          {STOREFRONT_TOPBAR_MESSAGES[topbarIndex]}
        </MotionSpan>
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

          <nav className="main-nav" aria-label="Categorías">
            <ul className="nav-list">
              {Object.entries(menuConfig).map(([cat, data]) => {
                const subKeys = Object.keys(data.subs);
                const allLinks = Object.entries(data.subs).map(([group, items]) => (
                  <div key={group} className="mega-subcol">
                    <div className="mega-subcol-title">{group}</div>
                    {items.map((i) => (
                      <StoreNavLink
                        key={i}
                        href={`/categoria/${categoryPath(cat)}?grupo=${encodeURIComponent(group)}&sub=${encodeURIComponent(i)}`}
                        className="mega-link"
                      >
                        <span className="dot" />
                        {i}
                      </StoreNavLink>
                    ))}
                  </div>
                ));
                return (
                  <li key={cat} className="nav-item">
                    <StoreNavLink href={`/categoria/${categoryPath(cat)}`} className="nav-link" prefetch>
                      {data.icon} {cat}
                      <svg width="10" height="10" viewBox="0 0 10 10">
                        <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                      </svg>
                    </StoreNavLink>
                    <div className="mega-menu">
                      <div className="mega-header">{cat}</div>
                      <div className={`mega-grid ${subKeys.length <= 2 ? "cols-2" : subKeys.length >= 4 ? "cols-4" : ""}`}>{allLinks}</div>
                      <div className="mega-visual">
                        <div className="mega-promo-text">
                          <strong>{cat} Premium</strong>
                          Los mejores productos para ti
                        </div>
                        <StoreNavLink href={`/categoria/${categoryPath(cat)}`} className="mega-promo-btn">
                          Ver todo
                        </StoreNavLink>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="header-top-spacer" aria-hidden="true" />

          <div className="header-row-toolbar">
            <div className="header-toolbar-inner">
              <div className="search-bar header-toolbar-search">
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input type="text" placeholder="Buscar productos..." readOnly onClick={openSearch} />
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
                          ¡Qué gusto verte, <em>{customerLabel}</em>!
                        </p>
                        <p className="gb-customer-popover__text">
                          Ya eres parte de la familia <strong>GinnaBeauty</strong>. Busca lo que necesitas con nosotros: te
                          ofrecemos la mejor calidad.
                        </p>
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
                    onClick={() => {
                      setAuthMode("login");
                      setCustomerAuthTab("login");
                      setAuthOpen(true);
                      document.body.style.overflow = "hidden";
                    }}
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
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                  <span className="badge cart-badge" style={{ display: cartCount > 0 ? "flex" : "none" }}>
                    {cartCount}
                  </span>
                </button>
                <button
                  type="button"
                  className="icon-btn icon-btn--admin"
                  title="Panel Admin"
                  onClick={() => {
                    window.location.href = "/admin";
                  }}
                >
                  ⚙️
                </button>
              </div>
            </div>
          </div>

          <div className={`mobile-mega-menu${mobileMenuOpen ? " open" : ""}`}>
            <div className="mobile-mega-menu-inner">
              {Object.entries(menuConfig).map(([cat, data]) => {
                const isOpen = mobileExpandedCat === cat;
                return (
                  <div key={cat} className="mobile-mega-group">
                    <button
                      type="button"
                      className={`mobile-mega-cat${isOpen ? " open" : ""}`}
                      onClick={() => setMobileExpandedCat((prev) => (prev === cat ? null : cat))}
                    >
                      <span>
                        {data.icon} {cat}
                      </span>
                      <span className="mobile-mega-cat-arrow">▾</span>
                    </button>
                    <div className={`mobile-mega-subwrap${isOpen ? " open" : ""}`}>
                      {Object.entries(data.subs).map(([group, items]) => (
                        <div key={group} className="mobile-mega-subgroup">
                          <div className="mobile-mega-subtitle">{group}</div>
                          <div className="mobile-mega-links">
                            {items.map((i) => (
                              <button
                                key={i}
                                type="button"
                                className="mobile-mega-link"
                                onClick={() => {
                                  navigateTo(
                                    `/categoria/${categoryPath(cat)}?grupo=${encodeURIComponent(group)}&sub=${encodeURIComponent(i)}`,
                                  );
                                  closeMobileMenu();
                                }}
                              >
                                {i}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="mobile-mega-see-all"
                        onClick={() => {
                          navigateTo(`/categoria/${categoryPath(cat)}`);
                          closeMobileMenu();
                        }}
                      >
                        Ver todo {cat}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </header>
      </div>

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
                  {isHttpImageUrl(item.img) ? (
                    <Image src={item.img} alt="" fill sizes="72px" loading="lazy" style={{ objectFit: "cover" }} />
                  ) : (
                    item.emoji
                  )}
                </div>
                <div className="cart-item-info" style={{ flex: 1 }}>
                  <div className="cart-item-name">{item.name}</div>
                  <div className="cart-item-variant">{item.brand}</div>
                  <div className="cart-item-price">{formatPrice(item.price)}</div>
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
        <div className="cart-footer">
          <div className="cart-summary">
            <div className="cart-summary-row">
              <span>Subtotal</span>
              <span id="cart-subtotal">{formatPrice(subtotal)}</span>
            </div>
            <div className="cart-summary-row">
              <span>Envío</span>
              <span id="cart-shipping">{shipping === 0 ? "Gratis 🎉" : formatPrice(shipping)}</span>
            </div>
            <div className="cart-summary-row total">
              <span>Total</span>
              <span id="cart-total">{formatPrice(subtotal + shipping)}</span>
            </div>
          </div>
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
                <div className="modal-gallery modal-gallery--tech">
                  <div className="modal-gallery-tech-overlay" aria-hidden />
                  {(() => {
                    const urls = [selectedProduct.img, ...selectedProduct.gallery].filter(isHttpImageUrl);
                    const src = urls[modalImgIdx] ?? null;
                    return (
                      <>
                        <div className="modal-gallery-placeholder">
                          {src ? (
                            <Image
                              src={src}
                              alt=""
                              fill
                              sizes="(max-width: 900px) 100vw, 45vw"
                              loading="lazy"
                              style={{ objectFit: "cover" }}
                            />
                          ) : (
                            selectedProduct.emoji
                          )}
                        </div>
                        {urls.length > 1 && (
                          <div className="modal-gallery-thumbs">
                            {urls.map((u, i) => (
                              <button
                                key={`${u}-${i}`}
                                type="button"
                                className={`modal-gallery-thumb${modalImgIdx === i ? " active" : ""}`}
                                onClick={() => setModalImgIdx(i)}
                              >
                                <Image src={u} alt="" width={52} height={52} loading="lazy" style={{ objectFit: "cover", display: "block" }} />
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
                <div className="modal-details modal-details--tech">
                  <span className="gb-tech-chip modal-product-badge">Detalle premium · HD</span>
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
                        href={`/categoria/${selectedProduct.category}?sub=${encodeURIComponent(selectedProduct.subcategory)}`}
                        prefetch
                      >
                        {selectedProduct.subcategory}
                      </Link>
                      <i>›</i>
                      <span>{selectedProduct.name}</span>
                    </div>
                    <div className="product-brand">{selectedProduct.brand}</div>
                    <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 600, color: "var(--dark)", marginBottom: 12, lineHeight: 1.2 }}>
                      {selectedProduct.name}
                    </h2>
                    <div className="product-stars" style={{ marginBottom: 16 }}>
                      <span className="stars">
                        {"★".repeat(Math.floor(selectedProduct.rating))}
                        {"☆".repeat(5 - Math.floor(selectedProduct.rating))}
                      </span>
                      <span className="reviews-count">
                        {selectedProduct.rating} · {selectedProduct.reviews} reseñas
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                      <span className="price-current" style={{ fontSize: 32 }}>
                        {formatPrice(selectedProduct.price)}
                      </span>
                      {selectedProduct.originalPrice != null && (
                        <span className="price-original" style={{ fontSize: 18 }}>
                          {formatPrice(selectedProduct.originalPrice)}
                        </span>
                      )}
                      {selectedProduct.originalPrice != null && (
                        <span className="price-discount" style={{ fontSize: 13 }}>
                          -{Math.round((1 - selectedProduct.price / selectedProduct.originalPrice) * 100)}%
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 14, color: "var(--text-light)", lineHeight: 1.75, marginBottom: 24 }}>{selectedProduct.description}</p>
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-glow"
                      style={{ flex: 1, justifyContent: "center" }}
                      onClick={() => {
                        addToCart(selectedProduct.id);
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
                  <div className="modal-trust-strip">
                    <span>🚚 Envío nacional</span>
                    <span>🔄 7 días devolución</span>
                    <span>✅ Pago seguro</span>
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
                            {isHttpImageUrl(p.img) ? (
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
                            <button type="button" onClick={() => addToCart(p.id)}>
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
                      <strong>Registrarme en GinnaBeauty</strong>
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
                    <MotionButton
                      type="button"
                      className="gb-wish-guest-card"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      disabled={!!authBusyLabel}
                      onClick={() => void startGoogleSignIn()}
                    >
                      <strong>Iniciar sesión con Google</strong>
                      <span>Accede rápido con tu cuenta de Google.</span>
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
          <BrandLogo variant="auth" />
          <div id="fav-warning-msg" className="fav-warning" style={{ display: authMode === "fav-warning" ? "block" : "none" }}>
            <p>
              💝 ¡Guarda tus productos favoritos! <strong>Inicia sesión</strong> para que tu lista se conserve incluso si cierras la página.
            </p>
          </div>
          <div className="auth-title">Bienvenido/a</div>
          <p className="auth-sub">Inicia sesión para una experiencia de compra personalizada</p>
          <div className="auth-social-btns">
            <button
              type="button"
              className="auth-social-btn"
              disabled={!!authBusyLabel}
              onClick={() => void startGoogleSignIn()}
            >
              <span style={{ fontSize: 18 }}>🔴</span> Continuar con Google
            </button>
          </div>
          <div className="auth-divider">o con correo electrónico</div>
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

      <div className={`search-overlay${searchOpen ? " open" : ""}`} id="search-overlay">
        <button
          type="button"
          className="modal-close"
          style={{ position: "fixed", top: 20, right: 24, zIndex: 10, width: 42, height: 42, background: "var(--cream)" }}
          onClick={closeSearch}
        >
          ✕
        </button>
        <div className="search-big">
          <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            id="search-input-big"
            placeholder="¿Qué estás buscando?"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value.replace(/[\u200B-\u200D\uFEFF]/g, ""))}
          />
          <button type="button" onClick={() => {}}>
            →
          </button>
        </div>
        <div className="search-results-scroll">
          <div className="search-results-grid" id="search-results-grid" key={normalizedSearchQuery}>
            {hasSearchQuery &&
              (searchResults.length === 0 ? (
                <p style={{ gridColumn: "1/-1", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>Sin resultados para &quot;{searchQuery}&quot;</p>
              ) : (
                searchResults.map((p, i) => (
                  <StoreProductCard
                    key={p.id}
                    product={p}
                    isFav={favorites.includes(p.id)}
                    onOpen={(id) => {
                      openProductModal(id);
                      closeSearch();
                    }}
                    onToggleFav={toggleFavorite}
                    onAddCart={addToCart}
                    imagePriority={i === 0}
                  />
                ))
              ))}
          </div>
        </div>
        <div id="search-suggestions" style={{ maxWidth: 680, width: "100%", marginTop: 0 }}>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12, letterSpacing: "0.1em", textTransform: "uppercase" }}>Búsquedas populares</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {["sérum", "labial", "sombras", "mascarilla", "shampoo"].map((w) => (
              <button key={w} type="button" className="chip" onClick={() => setSearchQuery(w)}>
                {w.charAt(0).toUpperCase() + w.slice(1)}
              </button>
            ))}
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

      <StoreFloatingActions />

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
