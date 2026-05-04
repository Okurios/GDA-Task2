const API = '/api';

// ─── Auth Guard ───────────────────────────────────────────────────────────────
const token    = localStorage.getItem('gda_token');
const userName = localStorage.getItem('gda_username');
const userRole = localStorage.getItem('gda_role') || 'user';

if (!token) window.location.replace('login-v2.html');

const welcomeEl = document.getElementById('welcome-message');
if (welcomeEl && userName) welcomeEl.innerText = 'Welcome, ' + userName;

if (userRole === 'admin') {
  const al  = document.getElementById('admin-link');
  const mal = document.getElementById('mobile-admin-link');
  if (al)  al.style.display  = 'inline-block';
  if (mal) mal.style.display = 'block';
}

// ─── Mobile nav ───────────────────────────────────────────────────────────────
function openMobileNav()  { document.getElementById('mobile-nav').classList.add('open'); }
function closeMobileNav() { document.getElementById('mobile-nav').classList.remove('open'); }

// ─── Toast Notifications ──────────────────────────────────────────────────────
function toast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('fade-out');
    el.addEventListener('animationend', () => el.remove());
  }, 3000);
}

// ─── Stars helper ─────────────────────────────────────────────────────────────
function starsHTML(avg, count) {
  if (!count || count === 0) return '<span style="color:#aaa;font-size:12px;">No reviews yet</span>';
  const full = Math.round(avg);
  const stars = '★'.repeat(full) + '☆'.repeat(5 - full);
  return `<span style="color:#f5a623;">${stars}</span> <span style="font-size:12px;color:#888;">${avg} (${count})</span>`;
}

// ─── State ────────────────────────────────────────────────────────────────────
let wishlisted      = new Set();
let currentCategory = 'all';
let currentGender   = '';

// Advanced filter state
let advFilters = {
  brand:     '',
  size:      '',
  minPrice:  '',
  maxPrice:  '',
  minRating: '',
  inStock:   false
};

// ─── Advanced Filter Panel ────────────────────────────────────────────────────
function toggleAdvPanel() {
  const panel = document.getElementById('advPanel');
  const btn   = document.getElementById('advToggleBtn');
  panel.classList.toggle('open');
  const isOpen = panel.classList.contains('open');
  btn.querySelector('.panel-arrow').textContent = isOpen ? '▲' : '▼';
}

function updateFilterBadge() {
  const btn = document.getElementById('advToggleBtn');
  if (!btn) return;
  const count = [advFilters.brand, advFilters.size, advFilters.minRating,
                 advFilters.minPrice, advFilters.maxPrice,
                 advFilters.inStock ? '1' : ''].filter(Boolean).length;
  const badge = btn.querySelector('.filter-badge');
  if (count > 0) {
    btn.classList.add('has-filters');
    if (badge) badge.textContent = count;
    else btn.insertAdjacentHTML('beforeend', `<span class="filter-badge">${count}</span>`);
  } else {
    btn.classList.remove('has-filters');
    if (badge) badge.remove();
  }
}

function toggleChip(chip, type) {
  const container = chip.closest('.adv-chips');
  // Check if same chip is already selected (toggle off)
  const alreadyActive = chip.classList.contains('active');
  // Deselect all chips of the same type
  container.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));

  if (alreadyActive) {
    // Toggle off
    if (type === 'brand')  advFilters.brand     = '';
    if (type === 'size')   advFilters.size      = '';
    if (type === 'rating') advFilters.minRating = '';
  } else {
    // Select this chip
    chip.classList.add('active');
    if (type === 'brand')  advFilters.brand     = chip.dataset.brand;
    if (type === 'size')   advFilters.size      = chip.dataset.size;
    if (type === 'rating') advFilters.minRating = chip.dataset.rating;
  }
  // No auto-apply — user presses "Apply Filters" to trigger search
}

function applyAdvFilters() {
  advFilters.minPrice = document.getElementById('minPrice').value;
  advFilters.maxPrice = document.getElementById('maxPrice').value;
  advFilters.inStock  = document.getElementById('inStockOnly').checked;
  updateFilterBadge();
  loadProducts();
}

function clearAdvFilters() {
  advFilters = { brand: '', size: '', minPrice: '', maxPrice: '', minRating: '', inStock: false };
  document.getElementById('minPrice').value      = '';
  document.getElementById('maxPrice').value      = '';
  document.getElementById('inStockOnly').checked = false;
  document.querySelectorAll('.adv-panel .chip').forEach(c => c.classList.remove('active'));
  updateFilterBadge();
  loadProducts();
}

// ─── Load Brand chips dynamically ────────────────────────────────────────────
async function loadBrands() {
  try {
    const res    = await fetch(`${API}/products/brands`);
    const brands = res.ok ? await res.json() : [];
    const container = document.getElementById('brandChips');
    if (!container) return;
    container.innerHTML = brands.map(b => `
      <span class="chip" data-brand="${esc(b)}" onclick="toggleChip(this,'brand')">${b}</span>
    `).join('');
  } catch (e) { /* silently fail */ }
}

// ─── Load Products (server-side search/filter/sort) ───────────────────────────
async function loadProducts() {
  const q    = (document.getElementById('searchInput').value || '').trim();
  const sort = document.getElementById('sortSelect').value;

  const params = new URLSearchParams();
  if (currentCategory && currentCategory !== 'all') params.set('category', currentCategory);
  if (currentGender)                                params.set('gender',   currentGender);
  if (q)                        params.set('q',         q);
  if (sort && sort !== 'default') params.set('sort',    sort);

  // Advanced filters
  if (advFilters.brand)     params.set('brand',     advFilters.brand);
  if (advFilters.size)      params.set('size',      advFilters.size);
  if (advFilters.minPrice)  params.set('minPrice',  advFilters.minPrice);
  if (advFilters.maxPrice)  params.set('maxPrice',  advFilters.maxPrice);
  if (advFilters.minRating) params.set('minRating', advFilters.minRating);
  if (advFilters.inStock)   params.set('inStock',   '1');

  try {
    const container = document.getElementById('productsContainer');
    container.innerHTML = '<div id="loading-msg">Loading products...</div>';

    const [prodRes, wishRes] = await Promise.all([
      fetch(`${API}/products?${params}`),
      fetch(`${API}/wishlist/ids`, { headers: { 'Authorization': 'Bearer ' + token } })
    ]);

    const products = await prodRes.json();
    const ids      = wishRes.ok ? await wishRes.json() : [];
    wishlisted     = new Set(ids);

    renderProducts(products);
  } catch (err) {
    document.getElementById('productsContainer').innerHTML =
      '<div id="loading-msg">❌ Failed to load products. Is the server running?</div>';
  }
}

function renderProducts(products) {
  const container = document.getElementById('productsContainer');
  if (!products.length) {
    container.innerHTML = '<div id="loading-msg">No products found matching your filters.</div>';
    return;
  }
  container.innerHTML = products.map(p => {
    const stock      = p.stock ?? 999;
    const stockBadge = (stock > 0 && stock <= 5)
      ? `<span class="stock-low">⚠️ Only ${stock} left!</span>`
      : (stock > 0 && stock <= 10)
        ? `<span class="stock-low">Only ${stock} left!</span>` : '';
    const outOfStock = stock === 0;
    const heart      = wishlisted.has(p.id) ? '<i class="fa-solid fa-heart" style="color:#e60000;"></i>' : '<i class="fa-regular fa-heart"></i>';
    const avgRating  = parseFloat(p.avg_rating || 0);
    const revCount   = parseInt(p.review_count || 0);

    return `
      <div class="product-card" data-category="${p.category}" data-price="${p.price}">
        <button class="wish-btn" id="wish-${p.id}" onclick="toggleWishlist(${p.id})" title="Wishlist">${heart}</button>
        <div class="image-box" style="cursor:pointer;" onclick="window.location.href='product-v2.html?id=${p.id}'">
          <img src="${p.image}" alt="${esc(p.name)}" onerror="this.src='logo.png'">
        </div>
        <div class="brand-name">${p.brand}</div>
        <div class="product-title">${p.name}</div>
        <div class="price">€ ${p.price.toFixed(2)}</div>
        <div style="margin-bottom:6px;">${starsHTML(avgRating, revCount)}</div>
        ${outOfStock ? '<span class="stock-low">Out of Stock</span>' : stockBadge}
        <button class="add-btn" onclick="window.location.href='product-v2.html?id=${p.id}'">
          View Product
        </button>
      </div>`;
  }).join('');
}

function esc(str) {
  return String(str).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;');
}

// ─── Wishlist toggle ──────────────────────────────────────────────────────────
async function toggleWishlist(productId) {
  try {
    const res  = await fetch(`${API}/wishlist/toggle`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body:    JSON.stringify({ product_id: productId })
    });
    const data = await res.json();
    if (!res.ok) { toast(data.error || 'Wishlist error.', 'error'); return; }
    const btn = document.getElementById(`wish-${productId}`);
    if (data.wishlisted) {
      wishlisted.add(productId);
      if (btn) btn.innerHTML = '<i class="fa-solid fa-heart" style="color:#e60000;"></i>';
      toast('Added to wishlist!', 'success');
    } else {
      wishlisted.delete(productId);
      if (btn) btn.innerHTML = '<i class="fa-regular fa-heart"></i>';
      toast('Removed from wishlist.', 'info');
    }
  } catch (e) { toast('Cannot connect to server.', 'error'); }
}

async function loadCartCount() {
  try {
    const res   = await fetch(`${API}/cart`, { headers: { 'Authorization': 'Bearer ' + token } });
    if (!res.ok) return;
    const items = await res.json();
    const total = items.reduce((s, i) => s + (i.quantity || 1), 0);
    const badge = document.getElementById('cart-count');
    if (badge) badge.innerText = total;
  } catch (e) {}
}

// ─── Filter & Sort (now triggers server-side fetch) ───────────────────────────
function filterCategory(category, btn) {
  currentCategory = category;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  loadProducts();
}

function filterGender(gender, btn) {
  if (currentGender === gender) {
    currentGender = '';
    btn.classList.remove('active');
  } else {
    currentGender = gender;
    document.querySelectorAll('.filter-btn').forEach(b => {
      if (b.id === 'gender-men-btn' || b.id === 'gender-women-btn') b.classList.remove('active');
    });
    btn.classList.add('active');
  }
  loadProducts();
}

let searchTimer = null;
function filterBySearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadProducts, 300); // debounce 300ms
}

function sortProducts() { loadProducts(); }

// ─── Logout ───────────────────────────────────────────────────────────────────
function logout() {
  ['gda_token','gda_user','gda_username','gda_role'].forEach(k => localStorage.removeItem(k));
  window.location.replace('login-v2.html');
}

// ─── Init ─────────────────────────────────────────────────────────────────────
loadBrands();
loadProducts();
loadCartCount();
