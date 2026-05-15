/* ============================================
   GINNABEAUTY — MAIN JAVASCRIPT
   ============================================ */

// ── STATE ──────────────────────────────────
const GB = {
  cart: JSON.parse(localStorage.getItem('gb_cart') || '[]'),
  favorites: JSON.parse(localStorage.getItem('gb_favorites') || '[]'),
  user: JSON.parse(localStorage.getItem('gb_user') || 'null'),
  products: [],
  menuData: {},
  activeCategory: 'all',
};

// ── PRODUCTS DATA ───────────────────────────
const PRODUCTS_DB = [
  // Maquillaje - Labios
  { id: 1, name: 'Labial Velvet Nude', brand: 'GinnaBeauty', category: 'maquillaje', subcategory: 'Labios', price: 28900, originalPrice: 39000, rating: 4.8, reviews: 124, badge: 'best', description: 'Labial de larga duración con acabado velvet. Fórmula hidratante con aceite de argán. Disponible en 12 tonos.', img: 'producto1.jpg', emoji: '💄', isNew: false },
  { id: 2, name: 'Gloss Crystal Pink', brand: 'GinnaBeauty', category: 'maquillaje', subcategory: 'Labios', price: 22000, originalPrice: null, rating: 4.6, reviews: 87, badge: 'new', description: 'Gloss transparente con brillo espejo. Efecto voluminizador con ácido hialurónico. Deja los labios suaves y jugosos.', img: 'producto2.jpg', emoji: '🍬', isNew: true },
  { id: 3, name: 'Delineador Precision Ink', brand: 'GinnaBeauty', category: 'maquillaje', subcategory: 'Ojos', price: 19500, originalPrice: 25000, rating: 4.9, reviews: 203, badge: 'hot', description: 'Delineador de punta fina con tinta resistente al agua. Precisión máxima para un trazo perfecto que dura todo el día.', img: 'producto3.jpg', emoji: '👁️', isNew: false },
  { id: 4, name: 'Sombras Bloom Palette', brand: 'GinnaBeauty', category: 'maquillaje', subcategory: 'Ojos', price: 65000, originalPrice: 85000, rating: 4.7, reviews: 156, badge: 'sale', description: 'Paleta de 12 sombras en tonos rosados y mauve. Texturas: matte, shimmer y glitter. Fórmula suave y fácil de difuminar.', img: 'producto4.jpg', emoji: '🎨', isNew: false },
  { id: 5, name: 'Lápiz de Cejas Microblade', brand: 'GinnaBeauty', category: 'maquillaje', subcategory: 'Cejas', price: 32000, originalPrice: null, rating: 4.5, reviews: 91, badge: null, description: 'Lápiz con punta ultrafina que imita la técnica de microblading. Tono a prueba de agua, rellena y define.', img: 'producto5.jpg', emoji: '✏️', isNew: false },
  { id: 6, name: 'Base Serum Luminosa', brand: 'GinnaBeauty', category: 'cuidado-piel', subcategory: 'Hidratación', price: 78000, originalPrice: 95000, rating: 4.8, reviews: 178, badge: 'best', description: 'Base-serum con vitamina C y niacinamida. Cobertura media-alta con efecto luminoso. SPF 30. Piel perfeccionada todo el día.', img: 'producto6.jpg', emoji: '✨', isNew: false },
  { id: 7, name: 'Mascarilla Rosa Detox', brand: 'GinnaBeauty', category: 'cuidado-piel', subcategory: 'Tratamiento', price: 45000, originalPrice: null, rating: 4.4, reviews: 67, badge: 'new', description: 'Mascarilla de arcilla rosa con pétalos de rosa y ácido salicílico. Limpia poros, unifica el tono y aporta brillo natural.', img: 'producto7.jpg', emoji: '🌸', isNew: true },
  { id: 8, name: 'Sérum Vitamina C Glow', brand: 'GinnaBeauty', category: 'cuidado-piel', subcategory: 'Hidratación', price: 92000, originalPrice: 115000, rating: 4.9, reviews: 234, badge: 'best', description: 'Sérum concentrado 15% vitamina C estabilizada. Ilumina, unifica manchas y protege contra radicales libres. Textura gel-agua.', img: 'producto8.jpg', emoji: '🍊', isNew: false },
  { id: 9, name: 'Shampoo Reparación Intensiva', brand: 'GinnaBeauty', category: 'cuidado-capilar', subcategory: 'Reparación', price: 38500, originalPrice: null, rating: 4.6, reviews: 142, badge: null, description: 'Shampoo con keratina vegetal y proteínas de seda. Repara fibras dañadas, controla el frizz y aporta brillo espejo.', img: 'producto9.jpg', emoji: '🌿', isNew: false },
  { id: 10, name: 'Mascarilla Nutritiva Capilar', brand: 'GinnaBeauty', category: 'cuidado-capilar', subcategory: 'Hidratación', price: 42000, originalPrice: 55000, rating: 4.7, reviews: 98, badge: 'sale', description: 'Mascarilla de aceite de argán y manteca de karité. Nutrición profunda en 3 minutos. Para cabello seco y con puntas abiertas.', img: 'producto10.jpg', emoji: '💆', isNew: false },
  { id: 11, name: 'Top Coat Efecto Gel', brand: 'GinnaBeauty', category: 'unas', subcategory: 'Esmaltes', price: 18000, originalPrice: null, rating: 4.5, reviews: 73, badge: 'new', description: 'Top coat ultra brillante efecto gel sin necesidad de lámpara UV. Sella el color, acelera el secado y protege por 14 días.', img: 'producto11.jpg', emoji: '💅', isNew: true },
  { id: 12, name: 'Kit Hombre Cuidado Piel', brand: 'GinnaBeauty', category: 'hombres', subcategory: 'Cuidado piel', price: 85000, originalPrice: 110000, rating: 4.6, reviews: 44, badge: 'hot', description: 'Kit completo: limpiador facial, hidratante con SPF y contorno de ojos. Formulado para pieles masculinas. Sin brillos.', img: 'producto12.jpg', emoji: '🧴', isNew: false },
];

/** Franja superior: frases que rotan (misma lógica que `web/lib/store-topbar-messages.ts` en Next). */
const TOPBAR_MESSAGES = [
  '✨ ENVÍO GRATIS en compras superiores a $150.000 · Envíos a todo Colombia 🇨🇴',
  '💄 Maquillaje y skincare premium — descubre tu ritual ideal',
  '🌿 Productos cruelty-free y marcas seleccionadas con amor',
  '🛍️ Compra segura: pagos con pasarela encriptada',
  '♥ GinnaBeauty — cosmética que te hace brillar',
];

const MENU_CONFIG = {
  'Accesorios': {
    icon: '👜',
    subs: { 'Capilar': ['Diademas', 'Ligas', 'Pinzas', 'Peinillas'], 'Uñas': ['Limas', 'Separadores', 'Espatulas', 'Brochas'], 'Otros': ['Bolsos', 'Estuches', 'Espejo de mano'] }
  },
  'Mayorista': {
    icon: '📦',
    subs: { 'Paquetes': ['Kit Maquillaje', 'Kit Capilar', 'Kit Cuidado Piel'], 'Volumen': ['Pedidos mínimos 6 uds', 'Pedidos mínimos 12 uds'], 'Exclusivo': ['Registrarme como mayorista'] }
  },
  'Cuidado capilar': {
    icon: '💇',
    subs: { 'Tratamiento': ['Reparación', 'Hidratación', 'Crecimiento'], 'Estilo': ['Finalizadores', 'Voluminizadores', 'Disciplinadores'], 'Especiales': ['Cura', 'Sin sal', 'Para teñido'] }
  },
  'Cuidado piel': {
    icon: '🌿',
    subs: { 'Rutina': ['Limpiador', 'Tónico', 'Sérum', 'Hidratante'], 'Tratamiento': ['Manchas', 'Acné', 'Antienvejecimiento'], 'Especiales': ['Contorno ojos', 'Exfoliante', 'Mascarillas'] }
  },
  'Maquillaje': {
    icon: '💄',
    subs: { 'Rostro': ['Base', 'Corrector', 'Rubor', 'Bronzer'], 'Ojos': ['Sombras', 'Delineador', 'Máscara', 'Cejas'], 'Labios': ['Labial', 'Gloss', 'Contorno labios'] }
  },
  'Hombres': {
    icon: '🧔',
    subs: { 'Piel': ['Limpiador facial', 'Hidratante', 'Contorno ojos'], 'Barba': ['Aceite de barba', 'Bálsamo', 'Afeitado'], 'Kits': ['Kit básico', 'Kit premium'] }
  },
  'Uñas': {
    icon: '💅',
    subs: { 'Color': ['Esmaltes', 'Gel UV', 'Semipermanente'], 'Cuidado': ['Fortalecedor', 'Cuticulas', 'Aceites'], 'Herramientas': ['Limas', 'Pulidores', 'Kits completos'] }
  }
};

// ── UTILITIES ────────────────────────────────
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function formatPrice(n) {
  return '$' + n.toLocaleString('es-CO');
}

function showToast(msg, type = 'default', icon = '🛍️') {
  const container = $('#toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3800);
}

function saveCart() {
  localStorage.setItem('gb_cart', JSON.stringify(GB.cart));
  updateCartUI();
}

function saveFavorites() {
  localStorage.setItem('gb_favorites', JSON.stringify(GB.favorites));
  updateFavUI();
}

// ── CART ─────────────────────────────────────
function addToCart(productId) {
  const product = PRODUCTS_DB.find(p => p.id === productId);
  if (!product) return;
  const existing = GB.cart.find(i => i.id === productId);
  if (existing) {
    existing.qty++;
  } else {
    GB.cart.push({ ...product, qty: 1 });
  }
  saveCart();
  showToast(`${product.name} agregado al carrito`, 'success', '🛒');
}

function removeFromCart(productId) {
  GB.cart = GB.cart.filter(i => i.id !== productId);
  saveCart();
  renderCartItems();
}

function changeQty(productId, delta) {
  const item = GB.cart.find(i => i.id === productId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    GB.cart = GB.cart.filter(i => i.id !== productId);
  }
  saveCart();
  renderCartItems();
}

function getCartTotal() {
  return GB.cart.reduce((s, i) => s + i.price * i.qty, 0);
}

function updateCartUI() {
  const count = GB.cart.reduce((s, i) => s + i.qty, 0);
  $$('.cart-badge').forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? 'flex' : 'none';
  });
  renderCartItems();
}

function renderCartItems() {
  const container = $('#cart-items');
  if (!container) return;
  if (GB.cart.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:48px 20px;color:var(--text-muted)">
      <div style="font-size:48px;margin-bottom:16px">🛍️</div>
      <p style="font-size:14px">Tu carrito está vacío</p>
    </div>`;
  } else {
    container.innerHTML = GB.cart.map(item => `
      <div class="cart-item">
        <div class="cart-item-img" style="background:var(--cream)">${item.emoji}</div>
        <div class="cart-item-info" style="flex:1">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-variant">${item.brand}</div>
          <div class="cart-item-price">${formatPrice(item.price)}</div>
          <div class="qty-control">
            <button class="qty-btn" onclick="changeQty(${item.id}, -1)">−</button>
            <span class="qty-num">${item.qty}</span>
            <button class="qty-btn" onclick="changeQty(${item.id}, 1)">+</button>
          </div>
        </div>
        <button class="remove-item" onclick="removeFromCart(${item.id})" title="Eliminar">✕</button>
      </div>
    `).join('');
  }
  // Update summary
  const subtotal = getCartTotal();
  const shipping = subtotal >= 150000 ? 0 : 9000;
  $('#cart-subtotal').textContent = formatPrice(subtotal);
  $('#cart-shipping').textContent = shipping === 0 ? 'Gratis 🎉' : formatPrice(shipping);
  $('#cart-total').textContent = formatPrice(subtotal + shipping);
}

// ── FAVORITES ────────────────────────────────
function toggleFavorite(productId) {
  if (!GB.user) {
    // Show warning then auth
    openAuthModal('fav-warning');
    return;
  }
  const idx = GB.favorites.indexOf(productId);
  if (idx === -1) {
    GB.favorites.push(productId);
    showToast('Agregado a favoritos', 'success', '♥');
  } else {
    GB.favorites.splice(idx, 1);
    showToast('Eliminado de favoritos', 'default', '♡');
  }
  saveFavorites();
  updateFavUI();
}

function updateFavUI() {
  $$('[data-fav]').forEach(btn => {
    const id = parseInt(btn.dataset.fav);
    btn.classList.toggle('fav-active', GB.favorites.includes(id));
  });
  const count = GB.favorites.length;
  $$('.fav-badge').forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? 'flex' : 'none';
  });
}

// ── AUTH ─────────────────────────────────────
function openAuthModal(mode = 'login') {
  const overlay = $('#auth-overlay');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  if (mode === 'fav-warning') {
    $('#fav-warning-msg').style.display = 'block';
  } else {
    $('#fav-warning-msg').style.display = 'none';
  }
}

function closeAuthModal() {
  const overlay = $('#auth-overlay');
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

function loginWithProvider(provider) {
  GB.user = { name: 'Usuario', email: 'usuario@demo.com', provider };
  localStorage.setItem('gb_user', JSON.stringify(GB.user));
  closeAuthModal();
  updateUserUI();
  showToast(`Sesión iniciada con ${provider}`, 'success', '✅');
}

function loginWithEmail() {
  const email = $('#login-email').value;
  const pass = $('#login-pass').value;
  if (!email || !pass) return;
  GB.user = { name: email.split('@')[0], email, provider: 'email' };
  localStorage.setItem('gb_user', JSON.stringify(GB.user));
  closeAuthModal();
  updateUserUI();
  showToast('Sesión iniciada correctamente', 'success', '✅');
}

function logout() {
  GB.user = null;
  localStorage.removeItem('gb_user');
  GB.favorites = [];
  saveFavorites();
  updateUserUI();
  showToast('Sesión cerrada', 'info', '👋');
}

function updateUserUI() {
  const userBtn = $('#user-btn');
  if (!userBtn) return;
  if (GB.user) {
    userBtn.title = `Hola, ${GB.user.name} — Cerrar sesión`;
    userBtn.style.color = 'var(--dusty-rose)';
    userBtn.onclick = logout;
  } else {
    userBtn.title = 'Iniciar sesión';
    userBtn.style.color = '';
    userBtn.onclick = () => openAuthModal('login');
  }
}

// ── MODALS ───────────────────────────────────
function openProductModal(productId) {
  const product = PRODUCTS_DB.find(p => p.id === productId);
  if (!product) return;
  const overlay = $('#product-overlay');
  const modal = overlay.querySelector('.modal');

  const discountPct = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : null;

  modal.innerHTML = `
    <button class="modal-close" onclick="closeProductModal()">✕</button>
    <div class="product-modal-layout">
      <div class="modal-gallery">
        <div class="modal-gallery-placeholder">${product.emoji}</div>
      </div>
      <div class="modal-details">
        <div>
          <div class="breadcrumbs">
            <a href="#">Inicio</a>
            <i>›</i>
            <a href="#">${getCategoryLabel(product.category)}</a>
            <i>›</i>
            <a href="#">${product.subcategory}</a>
            <i>›</i>
            <span>${product.name}</span>
          </div>
          <div class="product-brand">${product.brand}</div>
          <h2 style="font-family:var(--font-display);font-size:28px;font-weight:600;color:var(--dark);margin-bottom:12px;line-height:1.2">${product.name}</h2>
          <div class="product-stars" style="margin-bottom:16px">
            <span class="stars">${'★'.repeat(Math.floor(product.rating))}${'☆'.repeat(5 - Math.floor(product.rating))}</span>
            <span class="reviews-count">${product.rating} · ${product.reviews} reseñas</span>
          </div>
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
            <span class="price-current" style="font-size:32px">${formatPrice(product.price)}</span>
            ${product.originalPrice ? `<span class="price-original" style="font-size:18px">${formatPrice(product.originalPrice)}</span>` : ''}
            ${discountPct ? `<span class="price-discount" style="font-size:13px">-${discountPct}%</span>` : ''}
          </div>
          <p style="font-size:14px;color:var(--text-light);line-height:1.75;margin-bottom:24px">${product.description}</p>
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <button class="btn btn-primary" style="flex:1;justify-content:center" onclick="addToCart(${product.id});closeProductModal()">
            🛒 Agregar al carrito
          </button>
          <button class="btn btn-outline btn-icon" data-fav="${product.id}" onclick="toggleFavorite(${product.id})" title="Favorito">
            ${GB.favorites.includes(product.id) ? '♥' : '♡'}
          </button>
        </div>
        <div style="background:var(--ivory);border-radius:var(--radius-md);padding:14px;margin-top:16px;font-size:13px;color:var(--text-light)">
          🚚 Envío a todo el país · 🔄 Devoluciones 7 días · ✅ Pago seguro
        </div>
      </div>
    </div>
  `;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  updateFavUI();
}

function closeProductModal() {
  $('#product-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

function getCategoryLabel(cat) {
  const map = {
    'maquillaje': 'Maquillaje',
    'cuidado-piel': 'Cuidado Piel',
    'cuidado-capilar': 'Cuidado Capilar',
    'unas': 'Uñas',
    'hombres': 'Hombres',
    'accesorios': 'Accesorios',
    'mayorista': 'Mayorista'
  };
  return map[cat] || cat;
}

// ── CART SIDEBAR ─────────────────────────────
function openCart() {
  $('#cart-sidebar').classList.add('open');
  $('#cart-overlay-bg').classList.add('open');
  document.body.style.overflow = 'hidden';
  renderCartItems();
}

function closeCart() {
  $('#cart-sidebar').classList.remove('open');
  $('#cart-overlay-bg').classList.remove('open');
  document.body.style.overflow = '';
}

// ── CHECKOUT ─────────────────────────────────
function openCheckout() {
  closeCart();
  const overlay = $('#checkout-overlay');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  renderCheckoutSummary();
}

function closeCheckout() {
  $('#checkout-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

function renderCheckoutSummary() {
  const items = $('#checkout-order-items');
  if (!items) return;
  const subtotal = getCartTotal();
  const shipping = subtotal >= 150000 ? 0 : 9000;
  items.innerHTML = GB.cart.map(item => `
    <div class="co-item">
      <div class="co-item-img">${item.emoji}</div>
      <div>
        <div class="co-item-name">${item.name}</div>
        <div style="font-size:12px;color:var(--text-muted)">×${item.qty}</div>
      </div>
      <div class="co-item-price">${formatPrice(item.price * item.qty)}</div>
    </div>
  `).join('');
  $('#co-subtotal').textContent = formatPrice(subtotal);
  $('#co-shipping').textContent = shipping === 0 ? 'Gratis' : formatPrice(shipping);
  $('#co-total').textContent = formatPrice(subtotal + shipping);
}

// ── SEARCH ───────────────────────────────────
function openSearch() {
  $('#search-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => $('#search-input-big').focus(), 100);
}

function closeSearch() {
  $('#search-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

function performSearch(query) {
  if (!query || query.length < 2) {
    $('#search-results-grid').innerHTML = '';
    return;
  }
  const results = PRODUCTS_DB.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    p.subcategory.toLowerCase().includes(query.toLowerCase()) ||
    getCategoryLabel(p.category).toLowerCase().includes(query.toLowerCase())
  );
  const grid = $('#search-results-grid');
  if (results.length === 0) {
    grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--text-muted);font-size:14px">Sin resultados para "${query}"</p>`;
  } else {
    grid.innerHTML = results.map(p => renderProductCard(p)).join('');
  }
}

// ── PRODUCTS RENDERING ───────────────────────
function renderProductCard(product) {
  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : null;
  const badgeMap = { new: 'badge-new', sale: 'badge-sale', hot: 'badge-hot', best: 'badge-best' };
  const badgeLbl = { new: 'Nuevo', sale: 'Oferta', hot: '🔥 Hot', best: '⭐ Top' };
  const isFav = GB.favorites.includes(product.id);

  return `
    <div class="product-card" onclick="openProductModal(${product.id})">
      <div class="product-img-wrap">
        <div class="product-img-placeholder">${product.emoji}</div>
        ${product.badge ? `<div class="product-badges"><span class="badge-tag ${badgeMap[product.badge]}">${badgeLbl[product.badge]}</span></div>` : ''}
        <div class="product-actions">
          <button class="prod-action-btn ${isFav ? 'fav-active' : ''}" data-fav="${product.id}" onclick="event.stopPropagation();toggleFavorite(${product.id})" title="${isFav ? 'Quitar favorito' : 'Agregar favorito'}">${isFav ? '♥' : '♡'}</button>
          <button class="prod-action-btn" onclick="event.stopPropagation();openProductModal(${product.id})" title="Ver detalle">👁</button>
        </div>
      </div>
      <div class="product-info">
        <div class="product-brand">${product.brand}</div>
        <div class="product-name">${product.name}</div>
        <div class="product-variant">${product.subcategory}</div>
        <div class="product-stars">
          <span class="stars">${'★'.repeat(Math.floor(product.rating))}${'☆'.repeat(5 - Math.floor(product.rating))}</span>
          <span class="reviews-count">(${product.reviews})</span>
        </div>
        <div class="product-price-row">
          <div>
            <span class="price-current">${formatPrice(product.price)}</span>
            ${product.originalPrice ? `<span class="price-original">${formatPrice(product.originalPrice)}</span>` : ''}
            ${discount ? `<span class="price-discount">-${discount}%</span>` : ''}
          </div>
          <button class="add-to-cart-mini" onclick="event.stopPropagation();addToCart(${product.id})" title="Agregar al carrito">+</button>
        </div>
      </div>
    </div>
  `;
}

function renderProducts(filter = 'all') {
  const grid = $('#products-grid-main');
  if (!grid) return;
  let products = filter === 'all' ? PRODUCTS_DB : PRODUCTS_DB.filter(p => p.category === filter);
  grid.innerHTML = products.map(p => renderProductCard(p)).join('');
}

// ── MENU BUILDER ────────────────────────────
function buildMegaMenu() {
  const stored = JSON.parse(localStorage.getItem('gb_menu') || 'null') || MENU_CONFIG;
  const navList = $('#mega-nav');
  if (!navList) return;
  navList.innerHTML = '';
  Object.entries(stored).forEach(([cat, data]) => {
    const li = document.createElement('li');
    li.className = 'nav-item';
    const subKeys = Object.keys(data.subs);
    const allLinks = Object.entries(data.subs).map(([group, items]) =>
      `<div class="mega-subcol">
        <div class="mega-subcol-title">${group}</div>
        ${items.map(i => `<a href="#" class="mega-link" onclick="filterBySubcategory('${i}');return false"><span class="dot"></span>${i}</a>`).join('')}
      </div>`
    ).join('');
    li.innerHTML = `
      <a href="#" class="nav-link" onclick="filterByCat('${cat}');return false">
        ${data.icon} ${cat}
        <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 4l3 3 3-3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
      </a>
      <div class="mega-menu">
        <div class="mega-header">${cat}</div>
        <div class="mega-grid ${subKeys.length <= 2 ? 'cols-2' : subKeys.length >= 4 ? 'cols-4' : ''}">${allLinks}</div>
        <div class="mega-visual">
          <div class="mega-promo-text">
            <strong>${cat} Premium</strong>
            Los mejores productos para ti
          </div>
          <a href="#" class="mega-promo-btn" onclick="filterByCat('${cat}');return false">Ver todo</a>
        </div>
      </div>
    `;
    navList.appendChild(li);
  });
}

function filterByCat(cat) {
  // Scroll to products
  document.querySelector('#featured')?.scrollIntoView({ behavior: 'smooth' });
  const key = cat.toLowerCase().replace(/ /g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  GB.activeCategory = key;
  $$('.chip').forEach(c => c.classList.remove('active'));
  const matchChip = $$('.chip').find(c => c.dataset.cat === key);
  if (matchChip) matchChip.classList.add('active');
  renderProducts(key);
}

function filterBySubcategory(sub) {
  document.querySelector('#featured')?.scrollIntoView({ behavior: 'smooth' });
  const products = PRODUCTS_DB.filter(p => p.subcategory === sub);
  const grid = $('#products-grid-main');
  if (grid) grid.innerHTML = products.map(p => renderProductCard(p)).join('');
}

// ── HEADER SCROLL ────────────────────────────
window.addEventListener('scroll', () => {
  const header = document.querySelector('.header');
  if (header) header.classList.toggle('scrolled', window.scrollY > 40);
});

// ── INIT ─────────────────────────────────────
function startTopbarRotation() {
  const el = $('#gb-topbar-text');
  if (!el) return;
  let i = 0;
  setInterval(() => {
    i = (i + 1) % TOPBAR_MESSAGES.length;
    el.style.opacity = '0';
    setTimeout(() => {
      el.textContent = TOPBAR_MESSAGES[i];
      el.style.opacity = '1';
    }, 220);
  }, 7500);
}

document.addEventListener('DOMContentLoaded', () => {
  startTopbarRotation();
  buildMegaMenu();
  renderProducts('all');
  updateCartUI();
  updateFavUI();
  updateUserUI();

  // Filter chips
  $$('.chip[data-cat]').forEach(chip => {
    chip.addEventListener('click', () => {
      $$('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderProducts(chip.dataset.cat === 'all' ? 'all' : chip.dataset.cat);
    });
  });

  // Search
  const searchInputBig = $('#search-input-big');
  if (searchInputBig) {
    searchInputBig.addEventListener('input', e => performSearch(e.target.value));
  }

  // Close overlays on background click
  $$('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) {
        overlay.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  });

  // Sort
  const sortSelect = $('#sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', e => {
      const val = e.target.value;
      let sorted = [...PRODUCTS_DB];
      if (val === 'price-asc') sorted.sort((a, b) => a.price - b.price);
      if (val === 'price-desc') sorted.sort((a, b) => b.price - a.price);
      if (val === 'rating') sorted.sort((a, b) => b.rating - a.rating);
      if (val === 'new') sorted = sorted.filter(p => p.isNew).concat(sorted.filter(p => !p.isNew));
      const grid = $('#products-grid-main');
      if (grid) grid.innerHTML = sorted.map(p => renderProductCard(p)).join('');
    });
  }
});
