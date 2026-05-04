const API   = '/api';
const token = localStorage.getItem('gda_token');
if (!token) window.location.replace('login-v2.html');

const productId = new URLSearchParams(window.location.search).get('id');
if (!productId) window.location.replace('dashboard-v2.html');

let wishlisted   = false;
let selectedRating = 0;

// ─── Toast ────────────────────────────────────────────────────────────────────
function toast(message, type = 'success') {
  const c = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  c.appendChild(el);
  setTimeout(() => { el.classList.add('fade-out'); el.addEventListener('animationend', () => el.remove()); }, 3000);
}

// ─── Colour helper (name → CSS background) ───────────────────────────────────
const COLOR_MAP = {
  black:'#222', white:'#fff', red:'#e60000', blue:'#0047ab', navy:'#001f5b',
  green:'#28a745', yellow:'#ffc107', orange:'#fd7e14', pink:'#e83e8c',
  purple:'#6f42c1', grey:'#888', gray:'#888', brown:'#795548', silver:'#aaa',
  gold:'#c9a227', anthracite:'#3d3d3d', 'light blue':'#5bc0de', cyan:'#17a2b8',
  maroon:'#800000', beige:'#f5f0e8', coral:'#ff7f50', teal:'#008080'
};
function colorCSS(name) {
  return COLOR_MAP[name.toLowerCase().trim()] || '#ccc';
}

// ─── Stars helper ─────────────────────────────────────────────────────────────
function starsHTML(avg) {
  const full = Math.round(avg);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

// ─── Load product + wishlist IDs + own review ─────────────────────────────────
async function init() {
  try {
    const [prodRes, wishRes, mineRes] = await Promise.all([
      fetch(`${API}/products/${productId}`),
      fetch(`${API}/wishlist/ids`, { headers: { 'Authorization': 'Bearer ' + token } }),
      fetch(`${API}/reviews/${productId}/mine`, { headers: { 'Authorization': 'Bearer ' + token } })
    ]);

    if (!prodRes.ok) { window.location.replace('404.html'); return; }
    const product  = await prodRes.json();
    const wishIds  = wishRes.ok ? await wishRes.json() : [];
    const myReview = mineRes.ok ? await mineRes.json() : null;

    wishlisted = wishIds.includes(product.id);
    renderProduct(product, myReview);
    loadReviews();
  } catch (e) {
    document.getElementById('product-content').innerHTML = '<p style="text-align:center;padding:60px;color:#e60000;">Failed to load product. Is the server running?</p>';
  }
}

function renderProduct(p, myReview) {
  document.title = `${p.name} – GDA Sports`;
  const hasSizes   = p.sizes && p.sizes.trim() !== '';
  const sizeValues = hasSizes ? p.sizes.split(',').map(s => s.trim()) : [];
  const sizeSelect = hasSizes
    ? `<div class="size-label">Select Size:</div>
       <select id="detail-size" class="size-select">
         <option value="">— Choose a size —</option>
         ${sizeValues.map(s => `<option value="${s}">${s}</option>`).join('')}
       </select>` : '';

  const hasColors   = p.colors && p.colors.trim() !== '';
  const colorValues = hasColors ? p.colors.split(',').map(c => c.trim()) : [];
  const colorPicker = hasColors
    ? `<div class="size-label" style="margin-top:14px;">Select Colour:</div>
       <select id="detail-color" class="size-select">
         <option value="">— Choose a colour —</option>
         ${colorValues.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}
       </select>` : '';

  const stock = p.stock ?? 999;
  let stockBadge = '';
  if (stock === 0)      stockBadge = '<span class="stock-badge out-stock">Out of Stock</span>';
  else if (stock <= 5)  stockBadge = `<span class="stock-badge low-stock">⚠️ Only ${stock} left!</span>`;
  else if (stock <= 10) stockBadge = `<span class="stock-badge low-stock">${stock} left in stock</span>`;
  else                  stockBadge = '<span class="stock-badge in-stock">✅ In Stock</span>';

  const avgRating   = parseFloat(p.avg_rating || 0);
  const reviewCount = parseInt(p.review_count || 0);
  const heartIcon   = wishlisted ? '<i class="fa-solid fa-heart" style="color:#e60000;"></i>' : '<i class="fa-regular fa-heart"></i>';

  document.getElementById('product-content').innerHTML = `
    <section class="product-section">
      <div class="product-image">
        <img src="${p.image}" alt="${esc(p.name)}" onerror="this.src='logo.png'">
      </div>
      <div class="product-info">
        <div class="brand">${p.brand}</div>
        <div class="product-name">${p.name}</div>
        <div class="stars-row">
          <span class="stars">${starsHTML(avgRating)}</span>
          <span class="rating-text">${avgRating > 0 ? `${avgRating} / 5` : 'No ratings yet'} ${reviewCount > 0 ? `(${reviewCount} review${reviewCount !== 1 ? 's' : ''})` : ''}</span>
        </div>
        <div class="price">€ ${p.price.toFixed(2)}</div>
        ${stockBadge}
        ${p.description && p.description.trim() ? `<p class="product-description">${p.description}</p>` : ''}
        ${sizeSelect}
        ${colorPicker}
        <div class="btn-row">
          <button class="add-btn" id="add-btn" onclick="addToCart(${p.id},'${esc(p.name)}',${p.price},'${esc(p.sizes||'')}','${esc(p.colors||'')}')"
            ${stock === 0 ? 'disabled style="opacity:.5;cursor:not-allowed;"' : ''}>
            ${stock === 0 ? 'Out of Stock' : '🛒 Add to Cart'}
          </button>
          <button class="wish-btn-lg ${wishlisted ? 'active' : ''}" id="wish-btn-lg" onclick="toggleWishlist(${p.id})">${heartIcon}</button>
        </div>
      </div>
    </section>

    <section class="reviews-section" id="reviews-section">
      <h2>Customer Reviews</h2>
      <div id="review-summary"></div>
      <div id="review-form-area">${buildReviewForm(p.id, myReview)}</div>
      <div id="reviews-list"><p style="text-align:center;color:#aaa;">Loading reviews...</p></div>
    </section>`;
}

function buildReviewForm(pid, existing) {
  const r = existing ? existing.rating : 0;
  const c = existing ? (existing.comment || '') : '';
  return `
    <div class="review-form">
      <h3>${existing ? 'Update Your Review' : 'Write a Review'}</h3>
      <div class="star-picker" id="star-picker">
        ${[1,2,3,4,5].map(i => `<span data-v="${i}" class="${i <= r ? 'filled' : ''}" onclick="setRating(${i})">★</span>`).join('')}
      </div>
      <textarea id="review-text" class="review-text" placeholder="Share your thoughts about this product... (optional)">${c}</textarea>
      <button class="submit-review-btn" onclick="submitReview(${pid})">
        ${existing ? 'Update Review' : 'Submit Review'}
      </button>
      ${existing ? `<button class="submit-review-btn" style="background:#e60000;margin-left:8px;" onclick="deleteReview(${pid})">Delete Review</button>` : ''}
      <div class="review-msg" id="review-msg"></div>
    </div>`;
}

function setRating(val) {
  selectedRating = val;
  document.querySelectorAll('#star-picker span').forEach((s, i) => {
    s.classList.toggle('filled', i < val);
  });
}

// ─── Load reviews ─────────────────────────────────────────────────────────────
async function loadReviews() {
  const res  = await fetch(`${API}/reviews/${productId}`);
  const data = await res.json();

  // Summary
  document.getElementById('review-summary').innerHTML = data.count > 0 ? `
    <div class="review-summary">
      <div class="big-score">${data.average}</div>
      <div>
        <div class="big-stars">${starsHTML(data.average)}</div>
        <div class="summary-text">${data.count} review${data.count !== 1 ? 's' : ''}</div>
      </div>
    </div>` : '';

  // List
  const list = document.getElementById('reviews-list');
  if (!data.reviews.length) {
    list.innerHTML = '<p class="no-reviews">No reviews yet — be the first to leave one!</p>';
    return;
  }
  list.innerHTML = data.reviews.map(r => `
    <div class="review-card">
      <div class="reviewer">${r.fullname}</div>
      <div class="review-stars">${starsHTML(r.rating)} <span style="font-size:13px;color:#666;">${r.rating}/5</span></div>
      <div class="review-date">${new Date(r.created_at).toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' })}</div>
      ${r.comment ? `<div class="review-comment">${r.comment}</div>` : ''}
    </div>`).join('');
}

// ─── Submit / delete review ───────────────────────────────────────────────────
async function submitReview(pid) {
  if (!selectedRating) {
    document.getElementById('review-msg').textContent = '⚠️ Please select a star rating.';
    document.getElementById('review-msg').style.color = '#e60000';
    return;
  }
  const comment = document.getElementById('review-text').value.trim();
  try {
    const res  = await fetch(`${API}/reviews`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body:    JSON.stringify({ product_id: pid, rating: selectedRating, comment })
    });
    const data = await res.json();
    if (!res.ok) { toast(data.error || 'Error.', 'error'); return; }
    toast(data.message, 'success');
    selectedRating = 0;
    // Reload the page section
    const mineRes = await fetch(`${API}/reviews/${pid}/mine`, { headers: { 'Authorization': 'Bearer ' + token } });
    const myReview = mineRes.ok ? await mineRes.json() : null;
    document.getElementById('review-form-area').innerHTML = buildReviewForm(pid, myReview);
    loadReviews();
  } catch (e) { toast('Cannot connect to server.', 'error'); }
}

async function deleteReview(pid) {
  try {
    const res = await fetch(`${API}/reviews/${pid}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
    if (res.ok) {
      toast('Review deleted.', 'info');
      document.getElementById('review-form-area').innerHTML = buildReviewForm(pid, null);
      selectedRating = 0;
      loadReviews();
    }
  } catch (e) { toast('Cannot connect to server.', 'error'); }
}

// ─── Add to cart ──────────────────────────────────────────────────────────────
async function addToCart(productId, productName, price, sizesStr, colorsStr) {
  let size = '';
  if (sizesStr && sizesStr.trim()) {
    const sel = document.getElementById('detail-size');
    size = sel ? sel.value : '';
    if (!size) { toast('Please select a size first!', 'error'); return; }
  }
  let color = '';
  if (colorsStr && colorsStr.trim()) {
    const sel = document.getElementById('detail-color');
    color = sel ? sel.value : '';
    if (!color) { toast('Please select a colour first!', 'error'); return; }
  }
  try {
    const res  = await fetch(`${API}/cart/add`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body:    JSON.stringify({ product_id: productId, product_name: productName, price, size, color })
    });
    const data = await res.json();
    if (!res.ok) { toast(data.error || 'Failed to add.', 'error'); return; }
    toast('🛒 ' + data.message, 'success');
  } catch (e) { toast('Cannot connect to server.', 'error'); }
}

// ─── Wishlist toggle ──────────────────────────────────────────────────────────
async function toggleWishlist(pid) {
  try {
    const res  = await fetch(`${API}/wishlist/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body:   JSON.stringify({ product_id: pid })
    });
    const data = await res.json();
    if (!res.ok) { toast(data.error || 'Error.', 'error'); return; }
    wishlisted = data.wishlisted;
    const btn = document.getElementById('wish-btn-lg');
    btn.innerHTML = wishlisted ? '<i class="fa-solid fa-heart" style="color:#e60000;"></i>' : '<i class="fa-regular fa-heart"></i>';
    btn.classList.toggle('active', wishlisted);
    toast(data.message, wishlisted ? 'success' : 'info');
  } catch (e) { toast('Cannot connect to server.', 'error'); }
}

function esc(str) {
  return String(str).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;');
}

function logout() {
  ['gda_token','gda_user','gda_username','gda_role'].forEach(k => localStorage.removeItem(k));
  window.location.replace('login-v2.html');
}

init();
