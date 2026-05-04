const API   = '/api';
const token = localStorage.getItem('gda_token');
if (!token) window.location.replace('login-v2.html');

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

function esc(str) {
  return String(str).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;');
}

async function loadWishlist() {
  const content = document.getElementById('content');
  try {
    const res   = await fetch(`${API}/wishlist`, { headers: { 'Authorization': 'Bearer ' + token } });
    const items = await res.json();

    if (!items.length) {
      content.innerHTML = `
        <div class="empty-msg">
          <p>💔 Your wishlist is empty.</p>
          <p><a href="dashboard-v2.html">Browse products →</a></p>
        </div>`;
      return;
    }

    content.innerHTML = `<div class="products-grid">${items.map(p => {
      const hasSizes   = p.sizes && p.sizes.trim() !== '';
      const sizeValues = hasSizes ? p.sizes.split(',').map(s => s.trim()) : [];
      const sizeSelect = hasSizes
        ? `<select id="wsize-${p.product_id}" class="size-select">
             <option value="">— Select Size —</option>
             ${sizeValues.map(s => `<option value="${s}">${s}</option>`).join('')}
           </select>`
        : '';
      const stock      = p.stock ?? 999;
      const stockBadge = (stock > 0 && stock <= 5) ? `<span class="stock-low">⚠️ Only ${stock} left!</span>`
                       : (stock > 0 && stock <= 10) ? `<span class="stock-low">Only ${stock} left!</span>` : '';
      const outOfStock = stock === 0;

      return `
        <div class="product-card" id="wcard-${p.product_id}">
          <div class="image-box">
            <img src="${p.image}" alt="${esc(p.name)}" onerror="this.src='logo.png'">
          </div>
          <div class="card-body">
            <div class="brand-name">${p.brand}</div>
            <div class="product-title">${p.name}</div>
            <div class="price">€ ${p.price.toFixed(2)}</div>
            ${stockBadge}
            ${sizeSelect}
            <button class="add-btn" onclick="addToCart(${p.product_id},'${esc(p.name)}',${p.price},'${esc(p.sizes||'')}')"
              ${outOfStock ? 'disabled style="opacity:.5;cursor:not-allowed"' : ''}>
              ${outOfStock ? 'Out of Stock' : 'Add to Cart'}
            </button>
            <button class="remove-btn" onclick="removeFromWishlist(${p.product_id})">❌ Remove from Wishlist</button>
          </div>
        </div>`;
    }).join('')}</div>`;
  } catch (e) {
    content.innerHTML = '<div class="empty-msg">❌ Failed to load wishlist.</div>';
  }
}

async function addToCart(productId, productName, price, sizesStr) {
  let size = '';
  if (sizesStr && sizesStr.trim()) {
    const sel = document.getElementById(`wsize-${productId}`);
    size = sel ? sel.value : '';
    if (!size) { toast('Please select a size first!', 'error'); return; }
  }
  try {
    const res  = await fetch(`${API}/cart/add`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body:    JSON.stringify({ product_id: productId, product_name: productName, price, size })
    });
    const data = await res.json();
    if (!res.ok) { toast(data.error || 'Failed to add.', 'error'); return; }
    toast('🛒 ' + data.message, 'success');
  } catch (e) { toast('Cannot connect to server.', 'error'); }
}

async function removeFromWishlist(productId) {
  try {
    const res  = await fetch(`${API}/wishlist/${productId}`, {
      method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token }
    });
    if (res.ok) {
      toast('Removed from wishlist.', 'info');
      const card = document.getElementById(`wcard-${productId}`);
      if (card) card.remove();
      // If no cards left, show empty message
      const grid = document.querySelector('.products-grid');
      if (grid && !grid.children.length) loadWishlist();
    }
  } catch (e) { toast('Cannot connect to server.', 'error'); }
}

function logout() {
  ['gda_token','gda_user','gda_username','gda_role'].forEach(k => localStorage.removeItem(k));
  window.location.replace('login-v2.html');
}

loadWishlist();
