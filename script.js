/* ============================================================
   ONWAGLOW Enterprises - Full-Stack Frontend Controller
   Brand Colors: Radiant Glow Orange (#FF6B00) & Royal Navy Blue (#0B192C)
============================================================ */

// API Base URL
const API_BASE = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
  ? '' 
  : '';

// App State
let state = {
  products: [],
  filteredProducts: [],
  cart: JSON.parse(localStorage.getItem('onwaglow_cart')) || [],
  wishlist: JSON.parse(localStorage.getItem('onwaglow_wishlist')) || [],
  currentUser: JSON.parse(localStorage.getItem('onwaglow_user')) || null,
  authToken: localStorage.getItem('onwaglow_token') || null,
  activeCategory: 'all',
  searchQuery: '',
  sortBy: 'featured',
  discountPercent: 0,
  promoCode: '',
  solarLoad: {
    bulbs: 6,
    fans: 3,
    tvs: 2,
    laptops: 2,
    fridges: 1,
    acs: 0,
    backupHours: 8
  }
};

// Appliance Wattage reference
const APPLIANCE_WATTS = {
  bulbs: 15,
  fans: 75,
  tvs: 120,
  laptops: 80,
  fridges: 250,
  acs: 1200
};

// DOM References
const DOM = {
  productsGrid: document.getElementById('products-grid'),
  emptyProducts: document.getElementById('empty-products'),
  cartDrawer: document.getElementById('cart-drawer'),
  cartDrawerBody: document.getElementById('cart-drawer-body'),
  cartDrawerCount: document.getElementById('cart-drawer-count'),
  cartCount: document.getElementById('cart-count'),
  headerCartTotal: document.getElementById('header-cart-total'),
  cartSubtotal: document.getElementById('cart-subtotal'),
  cartDiscount: document.getElementById('cart-discount'),
  discountLine: document.getElementById('discount-line'),
  cartGrandTotal: document.getElementById('cart-grand-total'),
  wishlistDrawer: document.getElementById('wishlist-drawer'),
  wishlistDrawerBody: document.getElementById('wishlist-drawer-body'),
  wishlistCount: document.getElementById('wishlist-count'),
  wishlistDrawerCount: document.getElementById('wishlist-drawer-count'),
  authModal: document.getElementById('auth-modal'),
  userDropdownWrap: document.getElementById('user-dropdown-wrap'),
  userDropdownMenu: document.getElementById('user-dropdown-menu'),
  userGreeting: document.getElementById('user-greeting'),
  userAccountLabel: document.getElementById('user-account-label'),
  dropdownUserInfo: document.getElementById('dropdown-user-info'),
  dropdownUserName: document.getElementById('dropdown-user-name'),
  dropdownUserEmail: document.getElementById('dropdown-user-email'),
  dropdownUserRole: document.getElementById('dropdown-user-role'),
  openAdminBtn: document.getElementById('open-admin-btn'),
  userOrdersModal: document.getElementById('user-orders-modal'),
  userOrdersList: document.getElementById('user-orders-list'),
  adminModal: document.getElementById('admin-modal'),
  quickViewModal: document.getElementById('quick-view-modal'),
  quickViewContent: document.getElementById('quick-view-content'),
  checkoutModal: document.getElementById('checkout-modal'),
  orderSuccessModal: document.getElementById('order-success-modal'),
  orderReceiptContent: document.getElementById('order-receipt-content'),
  rfqModal: document.getElementById('rfq-modal'),
  globalSearchInput: document.getElementById('global-search-input'),
  searchCategorySelect: document.getElementById('search-category-select'),
  mobileNavDrawer: document.getElementById('mobile-nav-drawer'),
  drawerOverlay: document.getElementById('drawer-overlay'),
  toastContainer: document.getElementById('toast-container')
};

/* ============================================================
   INITIALIZATION
============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initHeroSlider();
  initFaqAccordion();
  initEventListeners();
  loadProducts();
  updateAuthUI();
  renderCart();
  renderWishlist();
  calculateSolarLoad();
});

/* ============================================================
   HERO SLIDER
============================================================ */
let currentSlide = 0;
let slideInterval;

function initHeroSlider() {
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.slider-dots .dot');
  if (!slides.length) return;

  function showSlide(index) {
    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === index);
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
    currentSlide = index;
  }

  document.getElementById('slider-prev-btn')?.addEventListener('click', () => {
    const nextIndex = (currentSlide - 1 + slides.length) % slides.length;
    showSlide(nextIndex);
    resetSlideTimer();
  });

  document.getElementById('slider-next-btn')?.addEventListener('click', () => {
    const nextIndex = (currentSlide + 1) % slides.length;
    showSlide(nextIndex);
    resetSlideTimer();
  });

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      showSlide(i);
      resetSlideTimer();
    });
  });

  function startSlideTimer() {
    slideInterval = setInterval(() => {
      const nextIndex = (currentSlide + 1) % slides.length;
      showSlide(nextIndex);
    }, 6000);
  }

  function resetSlideTimer() {
    clearInterval(slideInterval);
    startSlideTimer();
  }

  startSlideTimer();
}

/* ============================================================
   FAQ ACCORDION
============================================================ */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const btn = item.querySelector('.faq-question');
    btn?.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      faqItems.forEach(i => i.classList.remove('active'));
      if (!isActive) item.classList.add('active');
    });
  });
}

/* ============================================================
   EVENT LISTENERS
============================================================ */
function initEventListeners() {
  // Global Search
  DOM.globalSearchInput?.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim();
    filterAndRenderProducts();
  });

  DOM.globalSearchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      triggerGlobalSearch();
    }
  });

  document.getElementById('search-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    triggerGlobalSearch();
  });

  DOM.searchCategorySelect?.addEventListener('change', (e) => {
    state.activeCategory = e.target.value;
    updateCategoryTabUI(e.target.value);
    filterAndRenderProducts();
    const productsSection = document.getElementById('products-section');
    if (productsSection) {
      productsSection.scrollIntoView({ behavior: 'smooth' });
    }
  });

  // Mobile Menu Drawer
  document.getElementById('mobile-menu-toggle')?.addEventListener('click', openMobileDrawer);
  document.getElementById('close-mobile-drawer-btn')?.addEventListener('click', closeMobileDrawer);
  DOM.drawerOverlay?.addEventListener('click', () => {
    closeMobileDrawer();
    closeCartDrawer();
    closeWishlistDrawer();
  });

  // Mobile Category Items
  document.querySelectorAll('.mobile-cat-item').forEach(item => {
    item.addEventListener('click', () => {
      const cat = item.dataset.category;
      filterByCategory(cat);
      closeMobileDrawer();
      const target = document.getElementById('products-section');
      target?.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // Cart & Wishlist Trigger Buttons
  document.getElementById('open-cart-btn')?.addEventListener('click', openCartDrawer);
  document.getElementById('open-wishlist-btn')?.addEventListener('click', openWishlistDrawer);

  // Auth Button
  document.getElementById('auth-modal-btn')?.addEventListener('click', () => {
    if (state.currentUser) {
      DOM.userDropdownMenu.classList.toggle('active');
    } else {
      openAuthModal('login');
    }
  });

  // Close dropdown on click outside
  document.addEventListener('click', (e) => {
    if (!DOM.userDropdownWrap?.contains(e.target)) {
      DOM.userDropdownMenu?.classList.remove('active');
    }
  });

  // User Dropdown Actions
  document.getElementById('open-my-orders-btn')?.addEventListener('click', () => {
    DOM.userDropdownMenu?.classList.remove('active');
    openUserOrdersModal();
  });

  document.getElementById('open-profile-btn')?.addEventListener('click', () => {
    DOM.userDropdownMenu?.classList.remove('active');
    showToast(`Logged in as: ${state.currentUser.name} (${state.currentUser.email})`);
  });

  document.getElementById('open-admin-btn')?.addEventListener('click', () => {
    DOM.userDropdownMenu?.classList.remove('active');
    openAdminModal();
  });

  document.getElementById('logout-btn')?.addEventListener('click', handleLogout);

  // RFQ Bulk Quote Nav button
  document.getElementById('open-rfq-btn')?.addEventListener('click', openRFQModal);
}

/* ============================================================
   LOAD PRODUCTS FROM API
============================================================ */
async function loadProducts() {
  try {
    const res = await fetch(`${API_BASE}/api/products`);
    if (res.ok) {
      const data = await res.json();
      state.products = data.products;
    } else {
      console.warn('API error, attempting fallback');
      state.products = getFallbackProducts();
    }
  } catch (err) {
    console.warn('Backend server offline or unreachable, using client cache', err);
    state.products = getFallbackProducts();
  }

  filterAndRenderProducts();
}

/* ============================================================
   FILTER & RENDER PRODUCTS
============================================================ */
function triggerGlobalSearch() {
  const query = DOM.globalSearchInput?.value.trim() || '';
  state.searchQuery = query;
  filterAndRenderProducts();
  const productsSection = document.getElementById('products-section');
  if (productsSection) {
    productsSection.scrollIntoView({ behavior: 'smooth' });
  }
}

function filterByCategory(category) {
  state.activeCategory = category;
  if (DOM.searchCategorySelect) DOM.searchCategorySelect.value = category;
  updateCategoryTabUI(category);
  filterAndRenderProducts();

  const productsSection = document.getElementById('products-section');
  if (productsSection) {
    productsSection.scrollIntoView({ behavior: 'smooth' });
  }
}

function updateCategoryTabUI(category) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === category);
  });
  document.querySelectorAll('.nav-links li').forEach(li => {
    li.classList.toggle('active', li.dataset.navCategory === category);
  });
}

function applySorting(sortBy) {
  state.sortBy = sortBy;
  filterAndRenderProducts();
}

function clearFilters() {
  state.activeCategory = 'all';
  state.searchQuery = '';
  state.sortBy = 'featured';
  if (DOM.globalSearchInput) DOM.globalSearchInput.value = '';
  if (DOM.searchCategorySelect) DOM.searchCategorySelect.value = 'all';
  updateCategoryTabUI('all');
  filterAndRenderProducts();
}

function filterAndRenderProducts() {
  let list = [...state.products];

  // Category filter
  if (state.activeCategory && state.activeCategory !== 'all') {
    list = list.filter(p => p.category === state.activeCategory);
  }

  // Search filter
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      (p.categoryLabel && p.categoryLabel.toLowerCase().includes(q))
    );
  }

  // Sort
  if (state.sortBy === 'price-low') {
    list.sort((a, b) => a.price - b.price);
  } else if (state.sortBy === 'price-high') {
    list.sort((a, b) => b.price - a.price);
  } else if (state.sortBy === 'rating') {
    list.sort((a, b) => b.rating - a.rating);
  } else if (state.sortBy === 'name') {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  state.filteredProducts = list;
  renderProductsGrid(list);

  // Update filter status bar
  const statusStrip = document.getElementById('active-filter-status');
  const statusText = document.getElementById('filter-status-text');
  if (statusStrip && statusText) {
    if (state.activeCategory !== 'all' || state.searchQuery) {
      statusStrip.style.display = 'flex';
      statusText.textContent = state.searchQuery 
        ? `"${state.searchQuery}" (${list.length} items found)`
        : `${formatCategoryName(state.activeCategory)} (${list.length} items)`;
    } else {
      statusStrip.style.display = 'none';
    }
  }
}

function formatCategoryName(cat) {
  const map = {
    solar: 'Solar & Inverters',
    electrical: 'Electrical & Building',
    lighting: 'Lighting & Fixtures',
    kitchen: 'Kitchen & Appliances',
    gas: 'Gas Cylinders & Cookers',
    furniture: 'Furniture & Fittings'
  };
  return map[cat] || cat;
}

function renderProductsGrid(products) {
  if (!DOM.productsGrid) return;

  if (!products.length) {
    DOM.productsGrid.innerHTML = '';
    if (DOM.emptyProducts) DOM.emptyProducts.style.display = 'block';
    return;
  }

  if (DOM.emptyProducts) DOM.emptyProducts.style.display = 'none';

  DOM.productsGrid.innerHTML = products.map(prod => {
    const isWishlisted = state.wishlist.some(id => id === prod.id);
    return `
      <div class="product-card" data-id="${prod.id}">
        <div class="product-thumb">
          ${prod.badge ? `<span class="product-badge-tag">${prod.badge}</span>` : ''}
          <button class="wishlist-heart-btn ${isWishlisted ? 'active' : ''}" onclick="toggleWishlist('${prod.id}')" title="Save to Wishlist">
            <i class="${isWishlisted ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
          </button>
          <img src="${prod.image}" alt="${prod.name}" loading="lazy" onerror="this.onerror=null; this.src='${prod.fallbackImage || prod.image}';">
        </div>
        <div class="product-details">
          <span class="prod-cat-label">${prod.categoryLabel || prod.category}</span>
          <h3 class="prod-title" title="${prod.name}">${prod.name}</h3>
          <div class="prod-rating-row">
            <span class="stars-gold">${'★'.repeat(Math.round(prod.rating))}</span>
            <span class="rating-count">(${prod.reviewsCount || 20})</span>
          </div>
          <div class="prod-price-row">
            <span class="prod-price">₦${formatNaira(prod.price)}</span>
            ${prod.originalPrice ? `<span class="prod-orig-price">₦${formatNaira(prod.originalPrice)}</span>` : ''}
          </div>
          <div class="prod-actions">
            <button class="btn-add-cart" onclick="quickAddToCart('${prod.id}')">
              <i class="fa-solid fa-cart-plus"></i> Add to Cart
            </button>
            <button class="btn-quick-view" onclick="openQuickView('${prod.id}')" title="Quick View">
              <i class="fa-solid fa-eye"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/* ============================================================
   CART FUNCTIONALITY
============================================================ */
function quickAddToCart(productId) {
  const prod = state.products.find(p => p.id === productId);
  if (!prod) return;

  const existing = state.cart.find(item => item.id === productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({
      id: prod.id,
      name: prod.name,
      price: prod.price,
      image: prod.image,
      quantity: 1
    });
  }

  saveCart();
  renderCart();
  showToast(`Added "${prod.name.substring(0, 24)}..." to cart!`);
}

function updateCartQuantity(productId, delta) {
  const item = state.cart.find(i => i.id === productId);
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    state.cart = state.cart.filter(i => i.id !== productId);
  }

  saveCart();
  renderCart();
}

function removeCartItem(productId) {
  state.cart = state.cart.filter(i => i.id !== productId);
  saveCart();
  renderCart();
  showToast('Item removed from cart');
}

function confirmClearCart() {
  if (confirm('Are you sure you want to clear your cart?')) {
    state.cart = [];
    state.appliedPromo = '';
    state.discountPercent = 0;
    saveCart();
    renderCart();
    showToast('Cart cleared');
  }
}

function saveCart() {
  localStorage.setItem('onwaglow_cart', JSON.stringify(state.cart));
}

function renderCart() {
  const totalCount = state.cart.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = state.cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  const discountAmount = (subtotal * state.discountPercent) / 100;
  const grandTotal = Math.max(0, subtotal - discountAmount);

  // Update counters
  if (DOM.cartCount) DOM.cartCount.textContent = totalCount;
  if (DOM.cartDrawerCount) DOM.cartDrawerCount.textContent = totalCount;
  if (DOM.headerCartTotal) DOM.headerCartTotal.textContent = `₦${formatNaira(grandTotal)}`;
  if (DOM.cartSubtotal) DOM.cartSubtotal.textContent = `₦${formatNaira(subtotal)}`;
  if (DOM.cartGrandTotal) DOM.cartGrandTotal.textContent = `₦${formatNaira(grandTotal)}`;

  // Update discount line
  if (DOM.discountLine && DOM.cartDiscount) {
    if (state.discountPercent > 0) {
      DOM.discountLine.style.display = 'flex';
      DOM.cartDiscount.textContent = `-₦${formatNaira(discountAmount)} (${state.discountPercent}%)`;
    } else {
      DOM.discountLine.style.display = 'none';
    }
  }

  // Render items list
  if (!DOM.cartDrawerBody) return;

  if (!state.cart.length) {
    DOM.cartDrawerBody.innerHTML = `
      <div style="text-align: center; padding: 40px 10px; color: var(--text-muted);">
        <i class="fa-solid fa-cart-arrow-down" style="font-size: 3rem; color: var(--text-light); margin-bottom: 12px;"></i>
        <h4 style="color: var(--text-dark); margin-bottom: 6px;">Your cart is empty</h4>
        <p style="font-size: 0.85rem; margin-bottom: 16px;">Explore our solar, electrical, kitchen and furniture supplies.</p>
        <button class="btn btn-primary btn-sm" onclick="closeCartDrawer();">Start Shopping</button>
      </div>
    `;
    return;
  }

  DOM.cartDrawerBody.innerHTML = state.cart.map(item => `
    <div class="cart-item-card">
      <div class="cart-item-img">
        <img src="${item.image}" alt="${item.name}" onerror="this.onerror=null; this.src='images/logo.svg';">
      </div>
      <div class="cart-item-info">
        <div class="cart-item-title">${item.name}</div>
        <div class="cart-item-price">₦${formatNaira(item.price)}</div>
        <div class="cart-item-controls">
          <div class="qty-counter">
            <button onclick="updateCartQuantity('${item.id}', -1)">-</button>
            <span>${item.quantity}</span>
            <button onclick="updateCartQuantity('${item.id}', 1)">+</button>
          </div>
          <button class="remove-item-btn" onclick="removeCartItem('${item.id}')">
            <i class="fa-regular fa-trash-can"></i> Remove
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function applyPromoCode() {
  const input = document.getElementById('promo-code-input');
  const msg = document.getElementById('promo-applied-msg');
  if (!input || !msg) return;

  const code = input.value.trim().toUpperCase();
  if (code === 'GLOW10' || code === 'ONWA10') {
    state.discountPercent = 10;
    state.promoCode = code;
    msg.style.display = 'block';
    msg.textContent = '🎉 10% Discount Code Applied Successfully!';
    renderCart();
  } else if (code === 'SOLAR15') {
    state.discountPercent = 15;
    state.promoCode = code;
    msg.style.display = 'block';
    msg.textContent = '⚡ 15% Solar Discount Code Applied!';
    renderCart();
  } else {
    alert('Invalid promo code. Try "GLOW10" for 10% off your order.');
  }
}

function openCartDrawer() {
  DOM.cartDrawer?.classList.add('active');
  DOM.drawerOverlay?.classList.add('active');
}

function closeCartDrawer() {
  DOM.cartDrawer?.classList.remove('active');
  DOM.drawerOverlay?.classList.remove('active');
}

/* ============================================================
   WISHLIST FUNCTIONALITY
============================================================ */
function toggleWishlist(productId) {
  const index = state.wishlist.indexOf(productId);
  if (index > -1) {
    state.wishlist.splice(index, 1);
    showToast('Removed from wishlist');
  } else {
    state.wishlist.push(productId);
    showToast('Added to wishlist ❤️');
  }
  localStorage.setItem('onwaglow_wishlist', JSON.stringify(state.wishlist));
  renderWishlist();
  filterAndRenderProducts();
}

function renderWishlist() {
  if (DOM.wishlistCount) DOM.wishlistCount.textContent = state.wishlist.length;
  if (DOM.wishlistDrawerCount) DOM.wishlistDrawerCount.textContent = state.wishlist.length;

  if (!DOM.wishlistDrawerBody) return;

  const wishlistProducts = state.products.filter(p => state.wishlist.includes(p.id));

  if (!wishlistProducts.length) {
    DOM.wishlistDrawerBody.innerHTML = `
      <div style="text-align: center; padding: 40px 10px; color: var(--text-muted);">
        <i class="fa-regular fa-heart" style="font-size: 3rem; color: var(--text-light); margin-bottom: 12px;"></i>
        <h4 style="color: var(--text-dark); margin-bottom: 6px;">Your wishlist is empty</h4>
        <p style="font-size: 0.85rem;">Click the heart icon on any product to save it here for later.</p>
      </div>
    `;
    return;
  }

  DOM.wishlistDrawerBody.innerHTML = wishlistProducts.map(prod => `
    <div class="cart-item-card">
      <div class="cart-item-img">
        <img src="${prod.image}" alt="${prod.name}" onerror="this.onerror=null; this.src='images/logo.svg';">
      </div>
      <div class="cart-item-info">
        <div class="cart-item-title">${prod.name}</div>
        <div class="cart-item-price">₦${formatNaira(prod.price)}</div>
        <div style="display: flex; gap: 8px; margin-top: 8px;">
          <button class="btn btn-primary btn-sm" onclick="quickAddToCart('${prod.id}'); toggleWishlist('${prod.id}');">
            <i class="fa-solid fa-cart-plus"></i> Move to Cart
          </button>
          <button class="remove-item-btn" onclick="toggleWishlist('${prod.id}')">
            <i class="fa-solid fa-xmark"></i> Remove
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function openWishlistDrawer() {
  DOM.wishlistDrawer?.classList.add('active');
  DOM.drawerOverlay?.classList.add('active');
}

function closeWishlistDrawer() {
  DOM.wishlistDrawer?.classList.remove('active');
  DOM.drawerOverlay?.classList.remove('active');
}

/* ============================================================
   SOLAR LOAD ESTIMATOR
============================================================ */
function adjustAppliance(key, delta) {
  state.solarLoad[key] = Math.max(0, state.solarLoad[key] + delta);
  const el = document.getElementById(`qty-${key}`);
  if (el) el.textContent = state.solarLoad[key];
  calculateSolarLoad();
}

function updateBackupHours(val) {
  state.solarLoad.backupHours = Number(val);
  const el = document.getElementById('backup-hours-val');
  if (el) el.textContent = `${val} Hours`;
  calculateSolarLoad();
}

function calculateSolarLoad() {
  let totalWatts = 0;
  for (const [key, qty] of Object.entries(state.solarLoad)) {
    if (key !== 'backupHours' && APPLIANCE_WATTS[key]) {
      totalWatts += qty * APPLIANCE_WATTS[key];
    }
  }

  const hours = state.solarLoad.backupHours || 8;
  const totalDailyKwh = (totalWatts * hours) / 1000;

  // Calculate Inverter size (Safety factor 1.35)
  const inverterKva = Math.max(1.5, Math.ceil((totalWatts * 1.35) / 1000 * 2) / 2);
  let inverterText = `${inverterKva}kVA / 24V Pure Sine Wave`;
  if (inverterKva >= 5) {
    inverterText = `${inverterKva}kVA / 48V High-Voltage Hybrid Inverter`;
  }

  // Calculate Battery storage (200Ah 12V = 2.4kWh per unit at 100% or 1.2kWh safe usable)
  const batteryUnits = Math.max(2, Math.ceil(totalDailyKwh / 1.4));
  const batteryText = `${batteryUnits}x 200Ah / 12V Tubular Gel Batteries`;

  // Calculate Solar Panels (550W generating approx 2.2kWh/day in Nigeria peak sun)
  const panelUnits = Math.max(2, Math.ceil(totalDailyKwh / 2.0));
  const panelsText = `${panelUnits}x 550W Monocrystalline Half-Cell Panels`;

  // Charge Controller
  const controllerText = inverterKva >= 5 ? 'Built-in 80A MPPT' : '60A MPPT Smart Charge Controller';

  // Update UI
  const totalLoadEl = document.getElementById('total-load-watts');
  const dailyKwhEl = document.getElementById('total-daily-kwh');
  const recInverterEl = document.getElementById('rec-inverter');
  const recBatteryEl = document.getElementById('rec-battery');
  const recPanelsEl = document.getElementById('rec-panels');
  const recControllerEl = document.getElementById('rec-controller');

  if (totalLoadEl) totalLoadEl.textContent = `${totalWatts} Watts`;
  if (dailyKwhEl) dailyKwhEl.textContent = `${totalDailyKwh.toFixed(2)} kWh`;
  if (recInverterEl) recInverterEl.textContent = inverterText;
  if (recBatteryEl) recBatteryEl.textContent = batteryText;
  if (recPanelsEl) recPanelsEl.textContent = panelsText;
  if (recControllerEl) recControllerEl.textContent = controllerText;
}

function addSolarBundleToCart() {
  quickAddToCart('prod_1'); // 550W panel
  quickAddToCart('prod_2'); // Inverter
  quickAddToCart('prod_3'); // Battery
  quickAddToCart('prod_4'); // Controller
  openCartDrawer();
  showToast('Solar package components added to cart!');
}

function orderSolarViaWhatsApp() {
  const totalWatts = document.getElementById('total-load-watts')?.textContent || '735W';
  const inv = document.getElementById('rec-inverter')?.textContent || '3.5kVA Inverter';
  const bat = document.getElementById('rec-battery')?.textContent || '2x 200Ah Batteries';
  const pan = document.getElementById('rec-panels')?.textContent || '4x 550W Panels';

  const text = encodeURIComponent(
    `Hello ONWAGLOW Technical Support & Sizing Team,\nI ran a Solar Load Estimation for my building:\n- Total Power Load: ${totalWatts}\n- System Recommendation: ${inv}, ${bat}, ${pan}\n\nPlease validate my sizing and provide a comprehensive system quotation and installation schedule.`
  );
  window.open(`https://wa.me/2348137271212?text=${text}`, '_blank');
}

/* ============================================================
   PRODUCT QUICK VIEW
============================================================ */
function openQuickView(productId) {
  const prod = state.products.find(p => p.id === productId);
  if (!prod || !DOM.quickViewContent) return;

  let specsHtml = '';
  if (prod.specs) {
    specsHtml = `
      <table class="qv-specs-table">
        ${Object.entries(prod.specs).map(([k, v]) => `
          <tr>
            <td>${k}</td>
            <td><strong>${v}</strong></td>
          </tr>
        `).join('')}
      </table>
    `;
  }

  DOM.quickViewContent.innerHTML = `
    <div class="qv-img-box">
      <img src="${prod.image}" alt="${prod.name}" onerror="this.onerror=null; this.src='${prod.fallbackImage || prod.image}';">
    </div>
    <div class="qv-details">
      <span class="prod-cat-label">${prod.categoryLabel || prod.category}</span>
      <h3>${prod.name}</h3>
      <div class="prod-rating-row">
        <span class="stars-gold">${'★'.repeat(Math.round(prod.rating))}</span>
        <span class="rating-count">(${prod.reviewsCount} Verified Reviews)</span>
      </div>
      <div class="qv-price-row">
        <span class="prod-price" style="font-size: 1.6rem;">₦${formatNaira(prod.price)}</span>
        ${prod.originalPrice ? `<span class="prod-orig-price">₦${formatNaira(prod.originalPrice)}</span>` : ''}
      </div>
      <p style="font-size: 0.9rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 16px;">${prod.description}</p>
      ${specsHtml}
      <div style="display: flex; gap: 10px; margin-top: 20px;">
        <button class="btn btn-primary" onclick="quickAddToCart('${prod.id}'); closeQuickView();">
          <i class="fa-solid fa-cart-plus"></i> Add to Cart
        </button>
        <button class="btn btn-whatsapp-full" onclick="buyViaWhatsAppSingle('${prod.id}')">
          <i class="fa-brands fa-whatsapp"></i> Buy via WhatsApp
        </button>
      </div>
    </div>
  `;

  DOM.quickViewModal?.classList.add('active');
}

function closeQuickView() {
  DOM.quickViewModal?.classList.remove('active');
}

function buyViaWhatsAppSingle(productId) {
  const prod = state.products.find(p => p.id === productId);
  if (!prod) return;

  const msg = encodeURIComponent(
    `Hello ONWAGLOW Enterprises,\nI would like to order this item:\n*${prod.name}*\nPrice: ₦${formatNaira(prod.price)}\n\nPlease advise on delivery and payment details.`
  );
  window.open(`https://wa.me/2348137271212?text=${msg}`, '_blank');
}

/* ============================================================
   CHECKOUT FLOW
============================================================ */
function openCheckoutModal() {
  if (!state.cart.length) {
    alert('Your cart is empty. Please add items to cart first.');
    return;
  }
  closeCartDrawer();

  // Prefill if logged in
  if (state.currentUser) {
    const nameInput = document.getElementById('chk-name');
    const emailInput = document.getElementById('chk-email');
    const phoneInput = document.getElementById('chk-phone');
    const addrInput = document.getElementById('chk-address');
    if (nameInput) nameInput.value = state.currentUser.name || '';
    if (emailInput) emailInput.value = state.currentUser.email || '';
    if (phoneInput) phoneInput.value = state.currentUser.phone || '';
    if (addrInput) addrInput.value = state.currentUser.address || '';
  }

  // Update Review numbers
  const subtotal = state.cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  const discount = (subtotal * state.discountPercent) / 100;
  const shipping = 5000;
  const total = subtotal - discount + shipping;

  const chkSub = document.getElementById('chk-subtotal');
  const chkDisc = document.getElementById('chk-discount');
  const chkDiscRow = document.getElementById('chk-discount-row');
  const chkShip = document.getElementById('chk-shipping');
  const chkTot = document.getElementById('chk-total');

  if (chkSub) chkSub.textContent = `₦${formatNaira(subtotal)}`;
  if (chkShip) chkShip.textContent = `₦${formatNaira(shipping)}`;
  if (chkTot) chkTot.textContent = `₦${formatNaira(total)}`;

  if (chkDiscRow && chkDisc) {
    if (state.discountPercent > 0) {
      chkDiscRow.style.display = 'flex';
      chkDisc.textContent = `-₦${formatNaira(discount)}`;
    } else {
      chkDiscRow.style.display = 'none';
    }
  }

  DOM.checkoutModal?.classList.add('active');
}

function closeCheckoutModal() {
  DOM.checkoutModal?.classList.remove('active');
}

function togglePaymentView(method) {
  document.querySelectorAll('.payment-card').forEach(card => {
    const input = card.querySelector('input');
    card.classList.toggle('selected', input.value === method);
  });
}

async function handleCheckoutSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('chk-name')?.value.trim();
  const phone = document.getElementById('chk-phone')?.value.trim();
  const email = document.getElementById('chk-email')?.value.trim();
  const address = document.getElementById('chk-address')?.value.trim();
  const notes = document.getElementById('chk-notes')?.value.trim();
  const paymentMethod = document.querySelector('input[name="payment-method"]:checked')?.value || 'Bank Transfer';

  if (!name || !phone || !email || !address) {
    alert('Please fill out all required fields.');
    return;
  }

  const subtotal = state.cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  const discount = (subtotal * state.discountPercent) / 100;
  const shipping = 5000;
  const total = subtotal - discount + shipping;

  const orderPayload = {
    customerName: name,
    customerEmail: email,
    customerPhone: phone,
    deliveryAddress: address,
    notes,
    paymentMethod,
    items: [...state.cart],
    subtotal,
    discount,
    shipping,
    total
  };

  let createdOrder = null;

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (state.authToken) headers['Authorization'] = `Bearer ${state.authToken}`;

    const res = await fetch(`${API_BASE}/api/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify(orderPayload)
    });

    if (res.ok) {
      const data = await res.json();
      createdOrder = data.order;
    }
  } catch (err) {
    console.warn('Backend offline, generating offline order receipt', err);
  }

  if (!createdOrder) {
    createdOrder = {
      id: 'ORD-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000),
      ...orderPayload,
      status: 'Processing',
      trackingStep: 2,
      createdAt: new Date().toISOString()
    };
  }

  // Clear Cart
  state.cart = [];
  state.appliedPromo = '';
  state.discountPercent = 0;
  saveCart();
  renderCart();

  closeCheckoutModal();
  displayOrderSuccess(createdOrder);
}

function displayOrderSuccess(order) {
  if (!DOM.orderReceiptContent) return;

  DOM.orderReceiptContent.innerHTML = `
    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 10px; margin-bottom: 12px;">
      <div>
        <strong>Order ID: <span class="text-orange">${order.id}</span></strong>
        <div style="font-size: 0.8rem; color: var(--text-muted);">${new Date(order.createdAt).toLocaleString()}</div>
      </div>
      <span class="order-status-pill status-processing">${order.status}</span>
    </div>

    <div style="margin-bottom: 14px;">
      <p><strong>Customer:</strong> ${order.customerName} (${order.customerPhone})</p>
      <p><strong>Delivery Address:</strong> ${order.deliveryAddress}</p>
      <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
    </div>

    <div style="border-top: 1px solid var(--border-color); padding-top: 10px;">
      <h5 style="margin-bottom: 8px;">Order Items:</h5>
      <ul style="list-style: none; display: flex; flex-direction: column; gap: 6px; font-size: 0.85rem;">
        ${order.items.map(i => `
          <li style="display: flex; justify-content: space-between;">
            <span>${i.name} (x${i.quantity})</span>
            <strong>₦${formatNaira(i.price * i.quantity)}</strong>
          </li>
        `).join('')}
      </ul>
    </div>

    <div style="border-top: 1px solid var(--border-color); margin-top: 10px; padding-top: 10px; display: flex; justify-content: space-between; font-size: 1.05rem;">
      <strong>Grand Total:</strong>
      <strong class="text-orange">₦${formatNaira(order.total)}</strong>
    </div>

    <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 10px; margin-top: 14px; font-size: 0.8rem;">
      <strong>💳 ONWAGLOW Bank Transfer Account:</strong>
      <p>Bank: <strong>Zenith Bank</strong> | Account Name: <strong>ONWAGLOW Enterprises</strong></p>
      <p>Account Number: <strong>1019283746</strong></p>
    </div>
  `;

  // Configure WhatsApp Share Button
  const btnWa = document.getElementById('btn-share-order-whatsapp');
  if (btnWa) {
    btnWa.onclick = () => {
      const itemList = order.items.map(i => `- ${i.name} (Qty: ${i.quantity}) = ₦${formatNaira(i.price * i.quantity)}`).join('\n');
      const waMsg = encodeURIComponent(
        `*NEW ORDER: ${order.id}*\n*Customer:* ${order.customerName} (${order.customerPhone})\n*Address:* ${order.deliveryAddress}\n*Payment:* ${order.paymentMethod}\n\n*Items:*\n${itemList}\n\n*Total Amount:* ₦${formatNaira(order.total)}\n\nPlease confirm order receipt.`
      );
      window.open(`https://wa.me/2348137271212?text=${waMsg}`, '_blank');
    };
  }

  DOM.orderSuccessModal?.classList.add('active');
}

function closeOrderSuccessModal() {
  DOM.orderSuccessModal?.classList.remove('active');
}

function checkoutDirectWhatsApp() {
  if (!state.cart.length) {
    alert('Please add items to your cart first.');
    return;
  }

  const subtotal = state.cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  const discount = (subtotal * state.discountPercent) / 100;
  const total = subtotal - discount;
  const itemList = state.cart.map(i => `- ${i.name} (Qty: ${i.quantity}) = ₦${formatNaira(i.price * i.quantity)}`).join('\n');

  const waMsg = encodeURIComponent(
    `*ONWAGLOW DIRECT WHATSAPP ORDER*\n\n*Items Breakdown:*\n${itemList}\n\n*Subtotal:* ₦${formatNaira(subtotal)}\n*Discount:* ₦${formatNaira(discount)}\n*Total:* ₦${formatNaira(total)}\n\nHello ONWAGLOW sales team, I would like to place this order immediately.`
  );

  window.open(`https://wa.me/2348137271212?text=${waMsg}`, '_blank');
}

/* ============================================================
   USER AUTHENTICATION & LOGIN
============================================================ */
function openAuthModal(tab = 'login') {
  switchAuthTab(tab);
  DOM.authModal?.classList.add('active');
}

function closeAuthModal() {
  DOM.authModal?.classList.remove('active');
}

function switchAuthTab(tab) {
  const loginForm = document.getElementById('login-form');
  const regForm = document.getElementById('register-form');
  const tabLoginBtn = document.getElementById('tab-login-btn');
  const tabRegBtn = document.getElementById('tab-register-btn');
  const title = document.getElementById('auth-modal-title');

  if (tab === 'login') {
    loginForm.style.display = 'flex';
    regForm.style.display = 'none';
    tabLoginBtn?.classList.add('active');
    tabRegBtn?.classList.remove('active');
    if (title) title.textContent = 'Welcome Back';
  } else {
    loginForm.style.display = 'none';
    regForm.style.display = 'flex';
    tabLoginBtn?.classList.remove('active');
    tabRegBtn?.classList.add('active');
    if (title) title.textContent = 'Create New Account';
  }
}

function quickFillDemo(type) {
  switchAuthTab('login');
  const emailInput = document.getElementById('login-email');
  const passInput = document.getElementById('login-password');

  if (type === 'customer') {
    emailInput.value = 'customer@onwaglow.com';
    passInput.value = 'password123';
  } else if (type === 'admin') {
    emailInput.value = 'admin@onwaglow.com';
    passInput.value = 'admin123';
  }
  showToast(`Auto-filled ${type} credentials! Click 'Sign In'`);
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('login-email')?.value.trim();
  const password = document.getElementById('login-password')?.value.trim();

  if (!email || !password) return;

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      state.currentUser = data.user;
      state.authToken = data.token;
      localStorage.setItem('onwaglow_user', JSON.stringify(data.user));
      localStorage.setItem('onwaglow_token', data.token);

      updateAuthUI();
      closeAuthModal();
      showToast(`Welcome, ${data.user.name}!`);
    } else {
      alert(data.message || 'Login failed. Check your email & password.');
    }
  } catch (err) {
    // Offline simulation fallback for demo
    if (email === 'customer@onwaglow.com' && password === 'password123') {
      const demoUser = { id: 'usr_demo_customer', name: 'Adeola Johnson', email, role: 'customer', phone: '08137271212', address: '15 Platinum Estate, Aseese, Ogun State' };
      setLoggedInUser(demoUser, 'demo_token_123');
    } else if (email === 'admin@onwaglow.com' && password === 'admin123') {
      const adminUser = { id: 'usr_demo_admin', name: 'ONWAGLOW Admin', email, role: 'admin', phone: '08051996449', address: 'Onwa Electronics, 4 Baale Palace, Ogun State, Nigeria' };
      setLoggedInUser(adminUser, 'demo_admin_token');
    } else {
      alert('Login error. Please verify backend connection or use demo credentials.');
    }
  }
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name')?.value.trim();
  const email = document.getElementById('reg-email')?.value.trim();
  const phone = document.getElementById('reg-phone')?.value.trim();
  const password = document.getElementById('reg-password')?.value.trim();
  const address = document.getElementById('reg-address')?.value.trim();

  if (!name || !email || !password) {
    alert('Please provide name, email, and password.');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, password, address })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      state.currentUser = data.user;
      state.authToken = data.token;
      localStorage.setItem('onwaglow_user', JSON.stringify(data.user));
      localStorage.setItem('onwaglow_token', data.token);

      updateAuthUI();
      closeAuthModal();
      showToast(`Account created! Welcome to ONWAGLOW Enterprises.`);
    } else {
      alert(data.message || 'Registration failed.');
    }
  } catch (err) {
    const newUser = { id: 'usr_' + Date.now(), name, email, phone, role: 'customer', address };
    setLoggedInUser(newUser, 'demo_reg_token');
  }
}

function setLoggedInUser(user, token) {
  state.currentUser = user;
  state.authToken = token;
  localStorage.setItem('onwaglow_user', JSON.stringify(user));
  localStorage.setItem('onwaglow_token', token);
  updateAuthUI();
  closeAuthModal();
  showToast(`Welcome, ${user.name}!`);
}

function handleLogout() {
  state.currentUser = null;
  state.authToken = null;
  localStorage.removeItem('onwaglow_user');
  localStorage.removeItem('onwaglow_token');
  updateAuthUI();
  DOM.userDropdownMenu?.classList.remove('active');
  showToast('You have signed out.');
}

function updateAuthUI() {
  if (state.currentUser) {
    if (DOM.userGreeting) DOM.userGreeting.textContent = `Hi, ${state.currentUser.name.split(' ')[0]}`;
    if (DOM.userAccountLabel) DOM.userAccountLabel.textContent = state.currentUser.role === 'admin' ? 'Admin Panel 👑' : 'My Account';
    if (DOM.dropdownUserName) DOM.dropdownUserName.textContent = state.currentUser.name;
    if (DOM.dropdownUserEmail) DOM.dropdownUserEmail.textContent = state.currentUser.email;
    if (DOM.dropdownUserRole) DOM.dropdownUserRole.textContent = state.currentUser.role.toUpperCase();

    if (DOM.openAdminBtn) {
      DOM.openAdminBtn.style.display = state.currentUser.role === 'admin' ? 'flex' : 'none';
    }
  } else {
    if (DOM.userGreeting) DOM.userGreeting.textContent = 'Welcome';
    if (DOM.userAccountLabel) DOM.userAccountLabel.textContent = 'Sign In / Register';
    if (DOM.openAdminBtn) DOM.openAdminBtn.style.display = 'none';
  }

  // Update mobile drawer auth info
  const mobileAuth = document.getElementById('mobile-auth-section');
  if (mobileAuth) {
    if (state.currentUser) {
      mobileAuth.innerHTML = `
        <div style="background: var(--bg-muted); border-radius: var(--radius-md); padding: 12px; margin-bottom: 12px;">
          <strong>${state.currentUser.name}</strong>
          <div style="font-size: 0.8rem; color: var(--text-muted);">${state.currentUser.email}</div>
          <button class="btn btn-outline-secondary btn-sm w-100 mt-2" onclick="handleLogout(); closeMobileDrawer();">Sign Out</button>
        </div>
      `;
    } else {
      mobileAuth.innerHTML = `
        <button class="btn btn-primary w-100" onclick="openAuthModal('login'); closeMobileDrawer();">
          <i class="fa-solid fa-user"></i> Sign In / Register
        </button>
      `;
    }
  }
}

/* ============================================================
   USER ORDERS MODAL
============================================================ */
async function openUserOrdersModal() {
  if (!state.currentUser) {
    openAuthModal('login');
    return;
  }

  const profileName = document.getElementById('modal-profile-name');
  const profileEmail = document.getElementById('modal-profile-email');
  const profileRole = document.getElementById('modal-profile-role');

  if (profileName) profileName.textContent = state.currentUser.name;
  if (profileEmail) profileEmail.textContent = state.currentUser.email;
  if (profileRole) profileRole.textContent = state.currentUser.role === 'admin' ? 'Store Administrator' : 'Verified Customer';

  let orders = [];
  try {
    const headers = {};
    if (state.authToken) headers['Authorization'] = `Bearer ${state.authToken}`;
    const res = await fetch(`${API_BASE}/api/orders/user?email=${encodeURIComponent(state.currentUser.email)}`, { headers });
    if (res.ok) {
      const data = await res.json();
      orders = data.orders;
    }
  } catch (err) {
    console.warn('Orders lookup error', err);
  }

  if (DOM.userOrdersList) {
    if (!orders.length) {
      DOM.userOrdersList.innerHTML = `
        <div style="text-align: center; padding: 30px; color: var(--text-muted);">
          <i class="fa-solid fa-box-open" style="font-size: 2.5rem; color: var(--text-light); margin-bottom: 10px;"></i>
          <p>No previous orders found for this account.</p>
        </div>
      `;
    } else {
      DOM.userOrdersList.innerHTML = orders.map(order => {
        const step = order.trackingStep || 2;
        return `
          <div class="order-history-card">
            <div class="order-head-row">
              <div>
                <strong>${order.id}</strong>
                <div style="font-size: 0.8rem; color: var(--text-muted);">${new Date(order.createdAt).toLocaleDateString()}</div>
              </div>
              <span class="order-status-pill ${order.status === 'Delivered' ? 'status-delivered' : 'status-processing'}">${order.status}</span>
            </div>

            <!-- 4-Step Tracker -->
            <div class="order-tracking-stepper">
              <div class="track-step ${step >= 1 ? 'done' : ''}">
                <div class="step-circle"><i class="fa-solid fa-check"></i></div>
                <span>Order Placed</span>
              </div>
              <div class="track-step ${step >= 2 ? (step > 2 ? 'done' : 'active') : ''}">
                <div class="step-circle">${step > 2 ? '<i class="fa-solid fa-check"></i>' : '2'}</div>
                <span>Processing</span>
              </div>
              <div class="track-step ${step >= 3 ? (step > 3 ? 'done' : 'active') : ''}">
                <div class="step-circle">${step > 3 ? '<i class="fa-solid fa-check"></i>' : '3'}</div>
                <span>Out for Delivery</span>
              </div>
              <div class="track-step ${step >= 4 ? 'done' : ''}">
                <div class="step-circle">${step >= 4 ? '<i class="fa-solid fa-check"></i>' : '4'}</div>
                <span>Delivered</span>
              </div>
            </div>

            <div style="font-size: 0.85rem; border-top: 1px solid var(--border-color); padding-top: 8px; margin-top: 8px;">
              <p><strong>Items:</strong> ${order.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}</p>
              <p><strong>Total:</strong> ₦${formatNaira(order.total)} | <strong>Address:</strong> ${order.deliveryAddress}</p>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  DOM.userOrdersModal?.classList.add('active');
}

function closeUserOrdersModal() {
  DOM.userOrdersModal?.classList.remove('active');
}

/* ============================================================
   ADMIN DASHBOARD MODAL
============================================================ */
async function openAdminModal() {
  if (!state.currentUser || state.currentUser.role !== 'admin') {
    alert('Access restricted to ONWAGLOW Administrators.');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/orders/all`, {
      headers: { 'Authorization': `Bearer ${state.authToken}` }
    });

    if (res.ok) {
      const data = await res.json();
      const orders = data.orders || [];

      const totalRev = orders.reduce((sum, o) => sum + (o.total || 0), 0);
      const totalOrdEl = document.getElementById('admin-total-orders');
      const totalRevEl = document.getElementById('admin-total-revenue');
      const totalQuoEl = document.getElementById('admin-total-quotes');
      const tbody = document.getElementById('admin-orders-tbody');

      if (totalOrdEl) totalOrdEl.textContent = orders.length;
      if (totalRevEl) totalRevEl.textContent = `₦${formatNaira(totalRev)}`;
      if (totalQuoEl) totalQuoEl.textContent = '4 RFQs';

      if (tbody) {
        tbody.innerHTML = orders.map(ord => `
          <tr>
            <td><strong>${ord.id}</strong><br><small>${new Date(ord.createdAt).toLocaleDateString()}</small></td>
            <td>${ord.customerName}<br><small>${ord.customerPhone}</small></td>
            <td>${ord.items.length} items</td>
            <td><strong>₦${formatNaira(ord.total)}</strong></td>
            <td><span class="order-status-pill ${ord.status === 'Delivered' ? 'status-delivered' : 'status-processing'}">${ord.status}</span></td>
            <td>
              <select onchange="updateOrderStatus('${ord.id}', this.value)" style="font-size: 0.78rem; padding: 4px 6px; border-radius: 4px;">
                <option value="" disabled selected>Update Status</option>
                <option value="Processing">Processing</option>
                <option value="Dispatched">Dispatched</option>
                <option value="Delivered">Delivered</option>
              </select>
            </td>
          </tr>
        `).join('');
      }
    }
  } catch (err) {
    console.warn('Admin fetch error', err);
  }

  DOM.adminModal?.classList.add('active');
}

function closeAdminModal() {
  DOM.adminModal?.classList.remove('active');
}

async function updateOrderStatus(orderId, status) {
  const stepMap = { 'Processing': 2, 'Dispatched': 3, 'Delivered': 4 };
  try {
    const res = await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.authToken}`
      },
      body: JSON.stringify({ status, trackingStep: stepMap[status] || 2 })
    });
    if (res.ok) {
      showToast(`Order ${orderId} updated to ${status}!`);
      openAdminModal();
    }
  } catch (err) {
    showToast(`Order updated to ${status}`);
  }
}

/* ============================================================
   CONTRACTOR BULK RFQ MODAL
============================================================ */
function openRFQModal() {
  DOM.rfqModal?.classList.add('active');
}

function closeRFQModal() {
  DOM.rfqModal?.classList.remove('active');
}

async function handleRFQSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('rfq-name')?.value.trim();
  const phone = document.getElementById('rfq-phone')?.value.trim();
  const email = document.getElementById('rfq-email')?.value.trim();
  const projectType = document.getElementById('rfq-project')?.value;
  const location = document.getElementById('rfq-location')?.value.trim();
  const details = document.getElementById('rfq-details')?.value.trim();

  try {
    const res = await fetch(`${API_BASE}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, email, projectType, location, details })
    });

    if (res.ok) {
      alert('Thank you! Your Contractor RFQ has been received. Our sales engineer will reach out shortly.');
      closeRFQModal();
      document.getElementById('rfq-form')?.reset();
    }
  } catch (err) {
    alert('Thank you! Your quote request has been recorded.');
    closeRFQModal();
  }
}

/* ============================================================
   MOBILE DRAWER
============================================================ */
function openMobileDrawer() {
  DOM.mobileNavDrawer?.classList.add('active');
  DOM.drawerOverlay?.classList.add('active');
}

function closeMobileDrawer() {
  DOM.mobileNavDrawer?.classList.remove('active');
  DOM.drawerOverlay?.classList.remove('active');
}

/* ============================================================
   TOAST NOTIFICATION HELPER
============================================================ */
function showToast(message) {
  if (!DOM.toastContainer) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<i class="fa-solid fa-circle-check text-orange"></i> <span>${message}</span>`;
  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/* ============================================================
   FORMAT NAIRA HELPER
============================================================ */
function formatNaira(amount) {
  return Number(amount || 0).toLocaleString('en-NG');
}

/* ============================================================
   FALLBACK CATALOG (If Offline / File protocol)
============================================================ */
function getFallbackProducts() {
  return [
    { id: 'prod_1', name: '550W Monocrystalline Half-Cell Solar Panel', category: 'solar', categoryLabel: 'Solar & Inverters', price: 145000, originalPrice: 165000, rating: 4.9, reviewsCount: 42, badge: 'Best Seller', inStock: true, image: 'images/products/solar-panel-550w.jpg', fallbackImage: 'images/solar-panel-550w.svg', description: 'High-efficiency Tier 1 Monocrystalline A-Grade Solar Panel with 22.8% module efficiency. 25-Year warranty.' },
    { id: 'prod_2', name: '5kVA / 48V Pure Sine Wave Hybrid Solar Inverter', category: 'solar', categoryLabel: 'Solar & Inverters', price: 680000, originalPrice: 750000, rating: 5.0, reviewsCount: 38, badge: 'Top Rated', inStock: true, image: 'images/products/solar-inverter-5kva.jpg', fallbackImage: 'images/solar-inverter-5kva.svg', description: 'Smart Pure Sine Wave hybrid inverter with built-in 80A MPPT solar charge controller.' },
    { id: 'prod_3', name: '200Ah / 12V Deep Cycle Tubular Gel Battery', category: 'solar', categoryLabel: 'Solar & Inverters', price: 285000, originalPrice: 320000, rating: 4.8, reviewsCount: 56, badge: 'Popular', inStock: true, image: 'images/products/tubular-battery-200ah.jpg', fallbackImage: 'images/battery-tubular-200ah.svg', description: 'Heavy-duty deep cycle solar tubular battery engineered for long cycle life (2,500+ cycles).' },
    { id: 'prod_4', name: '60A MPPT Solar Charge Controller with LCD', category: 'solar', categoryLabel: 'Solar & Inverters', price: 85000, originalPrice: 98000, rating: 4.7, reviewsCount: 19, badge: 'Hot', inStock: true, image: 'images/products/mppt-controller.jpg', fallbackImage: 'images/mppt-controller.svg', description: 'Ultra-fast Maximum Power Point Tracking (MPPT) with tracking efficiency up to 99.5%.' },
    { id: 'prod_5', name: '300W All-In-One Solar Street / Flood Light', category: 'solar', categoryLabel: 'Solar & Inverters', price: 52000, originalPrice: 62000, rating: 4.9, reviewsCount: 67, badge: 'Special Offer', inStock: true, image: 'images/products/solar-floodlight.jpg', fallbackImage: 'images/solar-floodlight.svg', description: 'IP67 Waterproof high-lumen outdoor solar security floodlight with radar motion sensor.' },
    { id: 'prod_6', name: '16mm² 4-Core Armoured Copper Underground Cable (Per Meter)', category: 'electrical', categoryLabel: 'Electrical & Building', price: 14500, originalPrice: 16000, rating: 4.9, reviewsCount: 27, badge: 'Contractor Choice', inStock: true, image: 'images/products/armoured-cable.jpg', fallbackImage: 'images/armoured-cable.svg', description: '100% Pure Oxygen-Free Copper XLPE insulated steel wire armoured (SWA) cable.' },
    { id: 'prod_7', name: '12-Way Double Door MCB Distribution Board', category: 'electrical', categoryLabel: 'Electrical & Building', price: 38000, originalPrice: 45000, rating: 4.8, reviewsCount: 31, badge: 'Building Essential', inStock: true, image: 'images/products/distribution-board.jpg', fallbackImage: 'images/distribution-board.svg', description: 'High grade electro-galvanized sheet steel consumer unit with tinted polycarbonate door.' },
    { id: 'prod_8', name: 'Smart Wi-Fi 3-Gang Tempered Glass Touch Switch', category: 'electrical', categoryLabel: 'Electrical & Building', price: 16500, originalPrice: 21000, rating: 4.9, reviewsCount: 54, badge: 'Smart Gadget', inStock: true, image: 'images/products/smart-wifi-switch.jpg', fallbackImage: 'images/smart-switch.svg', description: 'Luxury crystal tempered glass touch switch with Tuya, Alexa & Google Home compatibility.' },
    { id: 'prod_9', name: '5000VA Digital Relay Voltage Stabilizer', category: 'electrical', categoryLabel: 'Electrical & Building', price: 115000, originalPrice: 130000, rating: 4.8, reviewsCount: 40, badge: 'Protection', inStock: true, image: 'images/products/voltage-stabilizer.jpg', fallbackImage: 'images/voltage-stabilizer.svg', description: 'Heavy duty automatic voltage regulator (AVR) with wide input voltage range (95V - 270V).' },
    { id: 'prod_10', name: '50M Heavy Duty Industrial Cable Extension Reel', category: 'electrical', categoryLabel: 'Electrical & Building', price: 42000, originalPrice: 48000, rating: 4.7, reviewsCount: 23, badge: 'Workshop', inStock: true, image: 'images/products/extension-cable-reel.jpg', fallbackImage: 'images/extension-reel.svg', description: 'Industrial grade 50-meter cable reel with 4 shuttered 13A sockets & thermal safety cutout.' },
    { id: 'prod_11', name: 'Modern Nordic 8-Ring Luxury LED Chandelier', category: 'lighting', categoryLabel: 'Lighting & Fixtures', price: 240000, originalPrice: 280000, rating: 5.0, reviewsCount: 33, badge: 'Luxury Choice', inStock: true, image: 'images/products/luxury-chandelier.jpg', fallbackImage: 'images/luxury-chandelier.svg', description: 'Stunning contemporary living room chandelier with 8 gold rings and stepless dimming remote.' },
    { id: 'prod_12', name: 'Magnetic Track Light Rail System 2M + 3 Spotlight Modules', category: 'lighting', categoryLabel: 'Lighting & Fixtures', price: 95000, originalPrice: 110000, rating: 4.9, reviewsCount: 29, badge: 'Trending', inStock: true, image: 'images/products/track-lighting-rail.jpg', fallbackImage: 'images/track-light.svg', description: 'Ultra-sleek modern recessed/surface magnetic rail lighting system for modern homes.' },
    { id: 'prod_13', name: 'Waterproof Outdoor Double-Sided Up & Down Wall Light', category: 'lighting', categoryLabel: 'Lighting & Fixtures', price: 14500, originalPrice: 18000, rating: 4.8, reviewsCount: 47, badge: 'Popular', inStock: true, image: 'images/products/wall-sconce-outdoor.jpg', fallbackImage: 'images/wall-sconce.svg', description: 'Architectural exterior wall sconce light fixture made of die-cast aluminum with IP65.' },
    { id: 'prod_14', name: 'Pack of 10 Rechargeable Emergency 15W LED Bulbs', category: 'lighting', categoryLabel: 'Lighting & Fixtures', price: 28000, originalPrice: 35000, rating: 4.9, reviewsCount: 82, badge: 'Value Pack', inStock: true, image: 'images/products/emergency-bulbs.jpg', fallbackImage: 'images/products/emergency-bulbs.jpg', description: 'Smart rechargeable emergency LED bulbs that automatically stay on for 4-5 hours during blackouts.' },
    { id: 'prod_15', name: 'Luxury Tempered Glass Top Double-Burner Auto Gas Cooker', category: 'kitchen', categoryLabel: 'Kitchen & Appliances', price: 48000, originalPrice: 58000, rating: 4.9, reviewsCount: 51, badge: 'Best Seller', inStock: true, image: 'images/products/gas-cooker-double.jpg', fallbackImage: 'images/products/gas-cooker-double.jpg', description: 'Sleek 8mm shatterproof tempered glass tabletop gas stove with auto piezo ignition.' },
    { id: 'prod_16', name: '8.5L XXL Dual-Zone Digital Air Fryer with Touch Display', category: 'kitchen', categoryLabel: 'Kitchen & Appliances', price: 92000, originalPrice: 105000, rating: 4.9, reviewsCount: 44, badge: 'Top Seller', inStock: true, image: 'images/products/air-fryer.jpg', fallbackImage: 'images/products/air-fryer.jpg', description: 'Large capacity dual-basket air fryer cooking two distinct dishes simultaneously.' },
    { id: 'prod_17', name: 'Commercial 4500W Heavy Duty Blender & Food Processor', category: 'kitchen', categoryLabel: 'Kitchen & Appliances', price: 36000, originalPrice: 44000, rating: 4.8, reviewsCount: 73, badge: 'Hot Item', inStock: true, image: 'images/products/commercial-blender.jpg', fallbackImage: 'images/products/commercial-blender.jpg', description: 'Heavy-duty speed blender with pure copper motor and 2.5L unbreakable jar.' },
    { id: 'prod_18', name: '12-Piece Non-Stick Granite Cookware Pot & Pan Set', category: 'kitchen', categoryLabel: 'Kitchen & Appliances', price: 78000, originalPrice: 90000, rating: 4.9, reviewsCount: 39, badge: 'Family Set', inStock: true, image: 'images/products/cookware-set.jpg', fallbackImage: 'images/products/cookware-set.jpg', description: 'Premium 12-piece eco-friendly granite coating cookware set with silicone handles.' },
    { id: 'prod_19', name: '12.5kg Standard Safe Camping & Home Gas Cylinder', category: 'gas', categoryLabel: 'Cylinders & Gas Burners', price: 34000, originalPrice: 39000, rating: 4.9, reviewsCount: 88, badge: 'High Demand', inStock: true, image: 'images/products/gas-cylinder-12kg.jpg', fallbackImage: 'images/products/gas-cylinder-12kg.jpg', description: 'Standard 12.5kg LPG cylinder manufactured from high-tensile steel, SON certified.' },
    { id: 'prod_20', name: '6kg Camping Gas Cylinder with Burner Head & Stand Plate', category: 'gas', categoryLabel: 'Cylinders & Gas Burners', price: 22000, originalPrice: 26000, rating: 4.8, reviewsCount: 64, badge: 'Compact', inStock: true, image: 'images/products/gas-cylinder-6kg.jpg', fallbackImage: 'images/products/gas-cylinder-6kg.jpg', description: 'Portable 6kg complete gas cooker unit with chrome burner head and pot support ring.' },
    { id: 'prod_21', name: 'High-Pressure Gas Regulator with Pressure Gauge + 2M Hose', category: 'gas', categoryLabel: 'Cylinders & Gas Burners', price: 12500, originalPrice: 16000, rating: 4.9, reviewsCount: 49, badge: 'Safety Essential', inStock: true, image: 'images/products/gas-regulator.jpg', fallbackImage: 'images/products/gas-regulator.jpg', description: 'Gas safety connection kit including automatic shut-off regulator, gauge, hose, and clamps.' },
    { id: 'prod_22', name: 'Smart Wireless LPG Gas Leak Alarm & Safety Detector', category: 'gas', categoryLabel: 'Cylinders & Gas Burners', price: 18500, originalPrice: 23000, rating: 5.0, reviewsCount: 26, badge: 'Life Saver', inStock: true, image: 'images/products/gas-detector.jpg', fallbackImage: 'images/products/gas-detector.jpg', description: 'High-sensitivity gas sensor detecting LPG leaks with 85dB piercing alarm and Wi-Fi alerts.' },
    { id: 'prod_23', name: 'High-Back Ergonomic Executive Mesh Office Chair', category: 'furniture', categoryLabel: 'Furniture & Fittings', price: 110000, originalPrice: 130000, rating: 4.9, reviewsCount: 37, badge: 'Comfort Pick', inStock: true, image: 'images/products/office-chair.jpg', fallbackImage: 'images/products/office-chair.jpg', description: 'Premium breathable mesh office chair with adjustable 3D arms and dynamic lumbar support.' },
    { id: 'prod_24', name: 'Executive 1.6M L-Shaped Managerial Office Desk', category: 'furniture', categoryLabel: 'Furniture & Fittings', price: 265000, originalPrice: 300000, rating: 4.8, reviewsCount: 18, badge: 'Executive Suite', inStock: true, image: 'images/products/executive-desk.jpg', fallbackImage: 'images/products/executive-desk.jpg', description: 'Sophisticated modern office desk with lockable drawers and return cabinet in walnut finish.' },
    { id: 'prod_25', name: 'Modern Floating TV Entertainment Console with LED Ambient Lights', category: 'furniture', categoryLabel: 'Furniture & Fittings', price: 145000, originalPrice: 170000, rating: 4.9, reviewsCount: 24, badge: 'Living Room', inStock: true, image: 'images/products/tv-console.jpg', fallbackImage: 'images/products/tv-console.jpg', description: 'Wall-mounted TV console media unit with underglow LED light strip and hidden cord channels.' },
    { id: 'prod_26', name: '5-Tier Industrial Heavy-Duty Storage Rack (800kg Load)', category: 'furniture', categoryLabel: 'Furniture & Fittings', price: 68000, originalPrice: 80000, rating: 4.8, reviewsCount: 35, badge: 'Storage', inStock: true, image: 'images/products/storage-rack.jpg', fallbackImage: 'images/products/storage-rack.jpg', description: 'Boltless adjustable 5-tier heavy duty metal storage shelving rack with 800kg capacity.' }
  ];
}