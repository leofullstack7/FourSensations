"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReveal } from "@/hooks/useReveal";
import { toCategorySlug } from "@/lib/menu-config";
import type { MenuConfig } from "@/lib/types/admin";
import type { CartLine, StoreProduct } from "@/lib/types/product";
import { catKeyFromDisplayName, getCategoryLabel } from "@/lib/category-labels";
import { formatPrice } from "@/lib/format";
import { computeShippingCop, loadCart, saveCart } from "@/lib/cart-storage";
import { STOREFRONT_TOPBAR_MESSAGES } from "@/lib/store-topbar-messages";
import { isHttpImageUrl } from "@/lib/util/image-url";

type ToastItem = { id: number; msg: string; type: string; icon: string };

function normalizeSearchText(value: string): string {
  return value
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function ProductCard({
  product,
  isFav,
  onOpen,
  onToggleFav,
  onAddCart,
}: {
  product: StoreProduct;
  isFav: boolean;
  onOpen: (id: string) => void;
  onToggleFav: (id: string) => void;
  onAddCart: (id: string) => void;
}) {
  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : null;
  const badgeMap = { new: "badge-new", sale: "badge-sale", hot: "badge-hot", best: "badge-best" } as const;
  const badgeLbl = { new: "Nuevo", sale: "Oferta", hot: "🔥 Hot", best: "⭐ Top" } as const;

  return (
    <div className="product-card" role="button" tabIndex={0} onClick={() => onOpen(product.id)} onKeyDown={(e) => e.key === "Enter" && onOpen(product.id)}>
      <div className="product-img-wrap">
        <div className="product-img-placeholder">
          {isHttpImageUrl(product.img) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          ) : (
            product.emoji
          )}
        </div>
        {product.badge && (
          <div className="product-badges">
            <span className={`badge-tag ${badgeMap[product.badge]}`}>{badgeLbl[product.badge]}</span>
          </div>
        )}
        <div className="product-actions">
          <button
            type="button"
            className={`prod-action-btn ${isFav ? "fav-active" : ""}`}
            data-fav={product.id}
            title={isFav ? "Quitar favorito" : "Agregar favorito"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFav(product.id);
            }}
          >
            {isFav ? "♥" : "♡"}
          </button>
          <button type="button" className="prod-action-btn" title="Ver detalle" onClick={(e) => { e.stopPropagation(); onOpen(product.id); }}>👁</button>
        </div>
      </div>
      <div className="product-info">
        <div className="product-brand">{product.brand}</div>
        <div className="product-name">{product.name}</div>
        <div className="product-variant">{product.subcategory}</div>
        <div className="product-stars">
          <span className="stars">
            {"★".repeat(Math.floor(product.rating))}
            {"☆".repeat(5 - Math.floor(product.rating))}
          </span>
          <span className="reviews-count">({product.reviews})</span>
        </div>
        <div className="product-price-row">
          <div>
            <span className="price-current">{formatPrice(product.price)}</span>
            {product.originalPrice != null && <span className="price-original">{formatPrice(product.originalPrice)}</span>}
            {discount != null && <span className="price-discount">-{discount}%</span>}
          </div>
          <button
            type="button"
            className="add-to-cart-mini"
            title="Agregar al carrito"
            onClick={(e) => {
              e.stopPropagation();
              onAddCart(product.id);
            }}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

export function StoreHomeClient({
  initialProducts,
  initialMenuConfig,
  categorySlugByName,
}: {
  initialProducts: StoreProduct[];
  initialMenuConfig: MenuConfig;
  categorySlugByName: Record<string, string>;
}) {
  const [products] = useState<StoreProduct[]>(initialProducts);
  const [menuConfig] = useState<MenuConfig>(initialMenuConfig);

  const categoryPath = useCallback(
    (categoryDisplayName: string) =>
      categorySlugByName[categoryDisplayName] ?? toCategorySlug(categoryDisplayName),
    [categorySlugByName]
  );
  const [cart, setCart] = useState<CartLine[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [user, setUser] = useState<{ name: string; email: string; provider: string } | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [manualSub, setManualSub] = useState<string | null>(null);
  const [sortValue, setSortValue] = useState<string>("default");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileExpandedCat, setMobileExpandedCat] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [adminOpening, setAdminOpening] = useState(false);
  const adminNavTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const [topbarIndex, setTopbarIndex] = useState(0);
  const [authMode, setAuthMode] = useState<"login" | "fav-warning">("login");
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
  const [modalImgIdx, setModalImgIdx] = useState(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useReveal();

  useEffect(() => {
    setCart(loadCart());
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTopbarIndex((i) => (i + 1) % STOREFRONT_TOPBAR_MESSAGES.length);
    }, 7500);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    return () => {
      if (adminNavTimerRef.current) clearTimeout(adminNavTimerRef.current);
    };
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
    const onScroll = () => {
      const header = document.querySelector(".header");
      if (header) header.classList.toggle("scrolled", window.scrollY > 40);
    };
    window.addEventListener("scroll", onScroll);
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
      if (!user) {
        setAuthMode("fav-warning");
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
    [showToast, user],
  );

  const filteredProducts = useMemo(() => {
    let list: StoreProduct[];
    if (activeCategory === "__sub__" && manualSub != null) {
      list = products.filter((p) => p.subcategory === manualSub);
    } else if (activeCategory === "all") {
      list = [...products];
    } else {
      list = products.filter((p) => p.category === activeCategory);
    }

    const sortWithin = (arr: StoreProduct[]) => {
      const copy = [...arr];
      if (sortValue === "price-asc") copy.sort((a, b) => a.price - b.price);
      else if (sortValue === "price-desc") copy.sort((a, b) => b.price - a.price);
      else if (sortValue === "rating") copy.sort((a, b) => b.rating - a.rating);
      else if (sortValue === "new") copy.sort((a, b) => Number(b.isNew) - Number(a.isNew));
      return copy;
    };

    const featured = list.filter((p) => p.featuredInHome);
    const rest = list.filter((p) => !p.featuredInHome);
    return [...sortWithin(featured), ...sortWithin(rest)];
  }, [products, activeCategory, manualSub, sortValue]);

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

  const filterByCat = (cat: string) => {
    document.querySelector("#featured")?.scrollIntoView({ behavior: "smooth" });
    const key = catKeyFromDisplayName(cat);
    setActiveCategory(key);
    setManualSub(null);
  };

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
    setSearchQuery("");
    setSearchOpen(true);
    document.body.style.overflow = "hidden";
    setTimeout(() => document.getElementById("search-input-big")?.focus(), 100);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
    document.body.style.overflow = "";
  };

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
    setMobileExpandedCat(null);
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
    <>
      <div className="topbar" aria-live="polite">
        <motion.span
          key={topbarIndex}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: "inline-block" }}
        >
          {STOREFRONT_TOPBAR_MESSAGES[topbarIndex]}
        </motion.span>
      </div>

      <header className="header" id="main-header">
        <div className="header-inner">
          <Link href="/" className="logo">
            <div className="logo-icon">🌸</div>
            <div className="logo-text">
              <span className="logo-brand">
                Ginna<em>Beauty</em>
              </span>
              <span className="logo-tagline">Cosmética Premium</span>
            </div>
          </Link>

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
                      <Link
                        key={i}
                        href={`/categoria/${categoryPath(cat)}?grupo=${encodeURIComponent(group)}&sub=${encodeURIComponent(i)}`}
                        className="mega-link"
                      >
                        <span className="dot" />
                        {i}
                      </Link>
                    ))}
                  </div>
                ));
                return (
                  <li key={cat} className="nav-item">
                    <Link href={`/categoria/${categoryPath(cat)}`} className="nav-link">
                      {data.icon} {cat}
                      <svg width="10" height="10" viewBox="0 0 10 10">
                        <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                      </svg>
                    </Link>
                    <div className="mega-menu">
                      <div className="mega-header">{cat}</div>
                      <div className={`mega-grid ${subKeys.length <= 2 ? "cols-2" : subKeys.length >= 4 ? "cols-4" : ""}`}>{allLinks}</div>
                      <div className="mega-visual">
                        <div className="mega-promo-text">
                          <strong>{cat} Premium</strong>
                          Los mejores productos para ti
                        </div>
                        <Link href={`/categoria/${categoryPath(cat)}`} className="mega-promo-btn">
                          Ver todo
                        </Link>
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
                <button
                  type="button"
                  className="icon-btn icon-btn--account"
                  title={user ? `Hola, ${user.name} — Cerrar sesión` : "Mi cuenta"}
                  style={user ? { color: "var(--dusty-rose)" } : undefined}
                  onClick={() => {
                    if (user) {
                      setUser(null);
                      setFavorites([]);
                      showToast("Sesión cerrada", "info", "👋");
                    } else {
                      setAuthMode("login");
                      setAuthOpen(true);
                      document.body.style.overflow = "hidden";
                    }
                  }}
                >
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                </button>
                <button type="button" className="icon-btn icon-btn--search" title="Buscar" onClick={openSearch}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </button>
                <button type="button" className="icon-btn icon-btn--fav" style={{ position: "relative" }} title="Favoritos">
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
                  disabled={adminOpening}
                  aria-busy={adminOpening}
                  onClick={() => {
                    if (adminOpening) return;
                    setAdminOpening(true);
                    adminNavTimerRef.current = setTimeout(() => {
                      adminNavTimerRef.current = null;
                      router.push("/admin");
                    }, 2000);
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
                                  window.location.href = `/categoria/${categoryPath(cat)}?grupo=${encodeURIComponent(group)}&sub=${encodeURIComponent(i)}`;
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
                          window.location.href = `/categoria/${categoryPath(cat)}`;
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

      <section className="hero-section">
        <div className="banner-placeholder-wrapper" id="hero-banner">
          <div className="banner-note">📌 Espacio para banner personalizado</div>
          <div className="hero-center-content">
            <div className="hero-eyebrow-tag">✨ Colección 2025 — Ya disponible</div>
            <h1 className="hero-main-title">
              Tu belleza,
              <br />
              <em>sin límites</em>
            </h1>
            <p className="hero-subtitle">
              Descubre cosméticos premium, cuidado de piel y capilar curados con amor para realzar tu brillo natural.
            </p>
            <div className="hero-cta-group">
              <button type="button" className="btn btn-primary btn-lg" onClick={() => document.getElementById("featured")?.scrollIntoView({ behavior: "smooth" })}>
                🛍️ Explorar Colección
              </button>
              <button type="button" className="btn btn-outline btn-lg" onClick={openSearch}>
                ✨ Buscar mi producto
              </button>
            </div>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-num">+2K</div>
              <div className="hero-stat-label">Clientas felices</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-num">150+</div>
              <div className="hero-stat-label">Productos</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-num">5★</div>
              <div className="hero-stat-label">Calificación</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-num">🚚</div>
              <div className="hero-stat-label">Envío a Colombia</div>
            </div>
          </div>
        </div>
      </section>

      <div className="marquee-strip">
        <div className="marquee-track" id="marquee-track">
          <span className="marquee-item">✨ Maquillaje de larga duración</span>
          <span className="marquee-item">💆 Cuidado capilar premium</span>
          <span className="marquee-item">
            <span>NUEVO</span> Sérum Vitamina C
          </span>
          <span className="marquee-item">🌿 Skincare natural</span>
          <span className="marquee-item">💅 Uñas que enamoran</span>
          <span className="marquee-item">📦 Mayorista disponible</span>
          <span className="marquee-item">🚚 Envío gratis +$100K</span>
          <span className="marquee-item">✨ Maquillaje de larga duración</span>
          <span className="marquee-item">💆 Cuidado capilar premium</span>
          <span className="marquee-item">
            <span>NUEVO</span> Sérum Vitamina C
          </span>
          <span className="marquee-item">🌿 Skincare natural</span>
          <span className="marquee-item">💅 Uñas que enamoran</span>
          <span className="marquee-item">📦 Mayorista disponible</span>
          <span className="marquee-item">🚚 Envío gratis +$100K</span>
        </div>
      </div>

      <section className="categories-strip">
        <div className="container">
          <div className="cat-grid">
            {[
              ["Accesorios", "👜", "linear-gradient(135deg,#F5E6E0,#E8C8C2)"],
              ["Mayorista", "📦", "linear-gradient(135deg,#E2DCF0,#C5BBDA)"],
              ["Cuidado capilar", "💇", "linear-gradient(135deg,#C8DAD7,#A8BFBB)"],
              ["Cuidado piel", "🌿", "linear-gradient(135deg,#F5E6E0,#EDCBB5)"],
              ["Maquillaje", "💄", "linear-gradient(135deg,#E8C8C2,#C9918B)"],
              ["Hombres", "🧔", "linear-gradient(135deg,#D4E8E4,#A8BFBB)"],
              ["Uñas", "💅", "linear-gradient(135deg,#E2DCF0,#C5BBDA)"],
            ].map(([label, icon, bg]) => (
              <a
                key={label}
                href="#"
                className="cat-card"
                onClick={(e) => {
                  e.preventDefault();
                  filterByCat(label as string);
                }}
              >
                <div className="cat-icon" style={{ background: bg as string }}>
                  {icon}
                </div>
                <span className="cat-label">{label === "Cuidado capilar" ? "Capilar" : label === "Cuidado piel" ? "Cuidado Piel" : label}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="trust-section">
        <div className="container">
          <div className="trust-grid">
            <div className="trust-item">
              <div className="trust-icon">🚚</div>
              <div>
                <div className="trust-title">Envío a toda Colombia</div>
                <div className="trust-desc">Gratis en compras superiores a $130.000</div>
              </div>
            </div>
            <div className="trust-item">
              <div className="trust-icon">🔄</div>
              <div>
                <div className="trust-title">Devoluciones 7 días</div>
                <div className="trust-desc">Satisfacción o te devolvemos</div>
              </div>
            </div>
            <div className="trust-item">
              <div className="trust-icon">✅</div>
              <div>
                <div className="trust-title">Productos originales</div>
                <div className="trust-desc">100% auténticos y certificados</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-pad" style={{ background: "var(--ivory)" }}>
        <div className="container reveal">
          <div className="promo-grid">
            <div className="promo-card">
              <div>
                <div className="promo-label">🌸 Categoría destacada</div>
                <div className="promo-title">
                  Skincare
                  <br />
                  <em>Natural</em>
                </div>
              </div>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => filterByCat("Cuidado piel")}>
                Ver colección →
              </button>
              <div className="promo-deco">🌿</div>
            </div>
            <div className="promo-card">
              <div>
                <div className="promo-label">💄 Tendencia 2025</div>
                <div className="promo-title">
                  Maquillaje
                  <br />
                  <em>Luminoso</em>
                </div>
              </div>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => filterByCat("Maquillaje")}>
                Explorar →
              </button>
              <div className="promo-deco">✨</div>
            </div>
            <div className="promo-card wide" style={{ background: "linear-gradient(135deg, var(--dark) 0%, var(--dark-mid) 100%)", color: "white" }}>
              <div>
                <div className="promo-label" style={{ color: "rgba(255,255,255,0.6)" }}>
                  📦 Programa exclusivo
                </div>
                <div className="promo-title" style={{ color: "white" }}>
                  Compra <em style={{ color: "var(--blush)" }}>mayorista</em> y ahorra hasta un 30%
                </div>
              </div>
              <button type="button" className="btn btn-outline btn-sm" style={{ color: "white", borderColor: "white" }} onClick={() => filterByCat("Mayorista")}>
                Registrarme →
              </button>
              <div className="promo-deco" style={{ color: "white" }}>
                🎁
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="products-section section-pad" id="featured">
        <div className="container">
          <div className="section-header reveal">
            <div className="section-eyebrow">Nuestra Colección</div>
            <h2 className="section-title">
              Productos <em>Destacados</em>
            </h2>
            <p className="section-sub">Curados con amor para potenciar tu belleza natural. Calidad premium, resultados reales.</p>
          </div>

          <div className="filter-row reveal">
            <div className="filter-chips">
              {[
                ["all", "Todos"],
                ["maquillaje", "Maquillaje"],
                ["cuidado-piel", "Cuidado Piel"],
                ["cuidado-capilar", "Capilar"],
                ["unas", "Uñas"],
                ["hombres", "Hombres"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`chip ${activeCategory === key ? "active" : ""}`}
                  data-cat={key}
                  onClick={() => {
                    setActiveCategory(key as string);
                    setManualSub(null);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <select className="sort-select" id="sort-select" value={sortValue} onChange={(e) => setSortValue(e.target.value)}>
              <option value="default">Ordenar por</option>
              <option value="price-asc">Precio: menor a mayor</option>
              <option value="price-desc">Precio: mayor a menor</option>
              <option value="rating">Mejor calificados</option>
              <option value="new">Más nuevos</option>
            </select>
          </div>

          <div className="products-grid" id="products-grid-main">
            {filteredProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                isFav={favorites.includes(p.id)}
                onOpen={openProductModal}
                onToggleFav={toggleFavorite}
                onAddCart={addToCart}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="lifestyle-section section-pad">
        <div className="container reveal">
          <div className="section-header" style={{ marginBottom: 36 }}>
            <div className="section-eyebrow">Inspiración</div>
            <h2 className="section-title">
              Belleza para <em>cada momento</em>
            </h2>
          </div>
          <div className="lifestyle-grid">
            {[
              { image: "/glam.webp", cat: "Tendencia", name: "Look Natural Glam" },
              { image: "/skin.webp", cat: "Skincare", name: "Rutina de noche" },
              { image: "/cabello.webp", cat: "Capilar", name: "Cabello Sedoso" },
              { image: "/manicure.webp", cat: "Uñas", name: "Manicure Perfecta" },
              { image: "/glow.webp", cat: "Esencial", name: "Glow desde adentro" },
            ].map(({ image, cat, name }) => (
              <div key={name as string} className="lifestyle-card">
                <div
                  className="lifestyle-card-bg"
                  style={{
                    backgroundImage: `url(${image})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }}
                />
                <div className="lifestyle-card-overlay">
                  <div className="lifestyle-card-cat">{cat}</div>
                  <div className="lifestyle-card-name">{name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="testimonials-section section-pad">
        <div className="container">
          <div className="section-header reveal">
            <div className="section-eyebrow">Lo que dicen</div>
            <h2 className="section-title">
              Clientas que nos <em>aman</em>
            </h2>
          </div>
          <div className="testimonials-grid reveal">
            {[
              ["María Fernanda G.", "Medellín · Cuidado Piel", "M", "El sérum de vitamina C transformó mi piel en 2 semanas..."],
              ["Valentina P.", "Bogotá · Maquillaje", "V", "La paleta de sombras Bloom es increíble..."],
              ["Camila R.", "Cali · Cuidado Capilar", "C", "La mascarilla capilar hizo un milagro..."],
            ].map(([name, detail, av, text]) => (
              <div key={name as string} className="testimonial-card">
                <div className="t-stars">★★★★★</div>
                <p className="t-text">&quot;{text}&quot;</p>
                <div className="t-user">
                  <div className="t-avatar">{av}</div>
                  <div>
                    <div className="t-name">{name}</div>
                    <div className="t-detail">{detail}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="newsletter-section">
        <div className="container newsletter-content">
          <div className="section-eyebrow" style={{ color: "var(--blush)" }}>
            Únete a nuestra comunidad
          </div>
          <div className="newsletter-title">
            Suscríbete y recibe <em>20% off</em>
          </div>
          <p className="newsletter-sub">En tu primera compra. Más tips de belleza, nuevos lanzamientos y ofertas exclusivas.</p>
          <form className="newsletter-form" onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="tu@correo.com" />
            <button type="button" onClick={() => showToast("¡Gracias! Revisa tu correo", "success", "💌")}>
              Suscribirme
            </button>
          </form>
        </div>
      </section>

      <footer>
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <Link href="/" className="logo">
                <div className="logo-icon">🌸</div>
                <div className="logo-text">
                  <span className="logo-brand">
                    Ginna<em>Beauty</em>
                  </span>
                  <span className="logo-tagline">Cosmética Premium</span>
                </div>
              </Link>
              <p className="footer-desc">Tu aliada de belleza. Cosméticos de alta calidad, cuidado de piel y capilar con envío a toda Colombia.</p>
              <div className="social-links">
                <a href="#" className="social-link">📘</a>
                <a href="#" className="social-link">📸</a>
                <a href="#" className="social-link">🐦</a>
                <a href="#" className="social-link">▶️</a>
              </div>
            </div>
            <div className="footer-col">
              <h4>Productos</h4>
              <div className="footer-links">
                <a href="#">Maquillaje</a>
                <a href="#">Cuidado Piel</a>
                <a href="#">Cuidado Capilar</a>
                <a href="#">Uñas</a>
                <a href="#">Hombres</a>
                <a href="#">Mayorista</a>
              </div>
            </div>
            <div className="footer-col">
              <h4>Empresa</h4>
              <div className="footer-links">
                <a href="#">Sobre nosotros</a>
                <a href="#">Blog de belleza</a>
                <a href="#">Programa mayorista</a>
                <a href="#">Trabaja con nosotros</a>
              </div>
            </div>
            <div className="footer-col">
              <h4>Ayuda</h4>
              <div className="footer-links">
                <a href="#">Centro de ayuda</a>
                <a href="#">Rastrear pedido</a>
                <a href="#">Devoluciones</a>
                <a href="#">Política de privacidad</a>
                <a href="#">Términos y condiciones</a>
              </div>
            </div>
          </div>
        </div>
        <div className="container">
          <div className="footer-bottom">
            <span>© 2025 GinnaBeauty. Todos los derechos reservados.</span>
            <div className="footer-payments">
              <span className="payment-chip">ePayco</span>
              <span className="payment-chip">Bold</span>
              <span className="payment-chip">PSE</span>
              <span className="payment-chip">Visa</span>
              <span className="payment-chip">Mastercard</span>
            </div>
          </div>
        </div>
      </footer>

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
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
        className={`modal-overlay${selectedProduct ? " open" : ""}`}
        id="product-overlay"
        onClick={(e) => e.target === e.currentTarget && closeProductModal()}
        role="presentation"
      >
        <div className="modal" style={{ position: "relative" }}>
          {selectedProduct && (
            <>
              <button type="button" className="modal-close" onClick={closeProductModal}>
                ✕
              </button>
              <div className="product-modal-layout">
                <div className="modal-gallery">
                  {(() => {
                    const urls = [selectedProduct.img, ...selectedProduct.gallery].filter(isHttpImageUrl);
                    const src = urls[modalImgIdx] ?? null;
                    return (
                      <>
                        <div className="modal-gallery-placeholder">
                          {src ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                          ) : (
                            selectedProduct.emoji
                          )}
                        </div>
                        {urls.length > 1 && (
                          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                            {urls.map((u, i) => (
                              <button
                                key={`${u}-${i}`}
                                type="button"
                                onClick={() => setModalImgIdx(i)}
                                style={{
                                  padding: 0,
                                  border: modalImgIdx === i ? "2px solid var(--rose)" : "1px solid var(--line)",
                                  borderRadius: 8,
                                  overflow: "hidden",
                                  width: 52,
                                  height: 52,
                                  cursor: "pointer",
                                  background: "transparent",
                                }}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={u} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
                <div className="modal-details">
                  <div>
                    <div className="breadcrumbs">
                      <a href="#">Inicio</a>
                      <i>›</i>
                      <a href="#">{getCategoryLabel(selectedProduct.category)}</a>
                      <i>›</i>
                      <a href="#">{selectedProduct.subcategory}</a>
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
                      className="btn btn-primary"
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
                  <div style={{ background: "var(--ivory)", borderRadius: "var(--radius-md)", padding: 14, marginTop: 16, fontSize: 13, color: "var(--text-light)" }}>
                    🚚 Envío a todo el país · 🔄 Devoluciones 7 días · ✅ Pago seguro
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div
        className={`modal-overlay${authOpen ? " open" : ""}`}
        id="auth-overlay"
        onClick={(e) => e.target === e.currentTarget && (setAuthOpen(false), (document.body.style.overflow = ""))}
        role="presentation"
      >
        <div className="modal auth-modal">
          <button
            type="button"
            className="modal-close"
            onClick={() => {
              setAuthOpen(false);
              document.body.style.overflow = "";
            }}
          >
            ✕
          </button>
          <div className="auth-logo">
            <div style={{ fontSize: 36 }}>🌸</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, marginTop: 6 }}>GinnaBeauty</div>
          </div>
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
              onClick={() => {
                setUser({ name: "Usuario", email: "usuario@demo.com", provider: "Google" });
                setAuthOpen(false);
                document.body.style.overflow = "";
                showToast("Sesión iniciada con Google", "success", "✅");
              }}
            >
              <span style={{ fontSize: 18 }}>🔴</span> Continuar con Google
            </button>
            <button
              type="button"
              className="auth-social-btn"
              onClick={() => {
                setUser({ name: "Usuario", email: "usuario@demo.com", provider: "Microsoft" });
                setAuthOpen(false);
                document.body.style.overflow = "";
                showToast("Sesión iniciada con Microsoft", "success", "✅");
              }}
            >
              <span style={{ fontSize: 18 }}>🔷</span> Continuar con Microsoft
            </button>
          </div>
          <div className="auth-divider">o con correo electrónico</div>
          <AuthEmailForm
            onSuccess={(email) => {
              setUser({ name: email.split("@")[0], email, provider: "email" });
              setAuthOpen(false);
              document.body.style.overflow = "";
              showToast("Sesión iniciada correctamente", "success", "✅");
            }}
          />
          <p className="auth-switch">
            ¿No tienes cuenta?{" "}
            <a onClick={() => showToast("Registro próximamente", "info", "📝")} style={{ cursor: "pointer" }}>
              Crear cuenta gratis
            </a>
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
                searchResults.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    isFav={favorites.includes(p.id)}
                    onOpen={(id) => {
                      openProductModal(id);
                      closeSearch();
                    }}
                    onToggleFav={toggleFavorite}
                    onAddCart={addToCart}
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

      {adminOpening && (
        <div
          role="status"
          aria-live="polite"
          aria-label="Cargando panel de administración"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(45,31,26,0.45)",
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            style={{
              textAlign: "center",
              padding: "28px 36px",
              borderRadius: "var(--radius-lg)",
              background: "var(--white)",
              boxShadow: "var(--shadow-lg)",
              minWidth: 220,
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.85, ease: "linear" }}
              style={{
                width: 44,
                height: 44,
                margin: "0 auto 14px",
                border: "3px solid var(--cream)",
                borderTopColor: "var(--dusty-rose)",
                borderRadius: "50%",
                boxSizing: "border-box",
              }}
            />
            <div style={{ fontWeight: 600, color: "var(--dark)", fontSize: 15 }}>Abriendo panel…</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>Redirigiendo al admin</div>
          </div>
        </div>
      )}

      <div className="toast-container" id="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span className="toast-icon">{t.icon}</span>
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function AuthEmailForm({ onSuccess }: { onSuccess: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  return (
    <>
      <div className="form-group">
        <label className="form-label">Correo electrónico</label>
        <input type="email" className="form-input" placeholder="tu@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Contraseña</label>
        <input type="password" className="form-input" placeholder="••••••••" value={pass} onChange={(e) => setPass(e.target.value)} />
      </div>
      <button
        type="button"
        className="btn btn-primary"
        style={{ width: "100%", justifyContent: "center", marginTop: 4 }}
        onClick={() => {
          if (!email || !pass) return;
          onSuccess(email);
        }}
      >
        Iniciar sesión
      </button>
    </>
  );
}
