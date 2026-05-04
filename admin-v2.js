const API   = '/api';
const token = localStorage.getItem('gda_token');
const role  = localStorage.getItem('gda_role') || 'user';

// Only admins allowed
if (!token || role !== 'admin') {
  alert('Admin access only.');
  window.location.href = 'login-v2.html';
}

const authHdr = { 'Authorization': 'Bearer ' + token };
const jsonHdr = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };

// ─── Tabs ─────────────────────────────────────────────────────────────────────
function switchTab(name, btn) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b  => b.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  btn.classList.add('active');
  if (name === 'products') loadProducts();
  if (name === 'users')    loadUsers();
  if (name === 'orders')   loadOrders();
}

// ─── Stats ────────────────────────────────────────────────────────────────────
async function loadStats() {
  try {
    const r = await fetch(`${API}/admin/stats`, { headers: authHdr });
    if (!r.ok) return;
    const d = await r.json();
    document.getElementById('s-users').textContent    = d.userCount;
    document.getElementById('s-orders').textContent   = d.orderCount;
    document.getElementById('s-products').textContent = d.productCount;
    document.getElementById('s-revenue').textContent  = d.revenue;
  } catch (e) {}
}

// ─── Products ─────────────────────────────────────────────────────────────────
async function loadProducts() {
  const loading = document.getElementById('products-loading');
  const table   = document.getElementById('products-table');
  const tbody   = document.getElementById('products-tbody');
  loading.style.display = 'block'; table.style.display = 'none';

  try {
    const r    = await fetch(`${API}/admin/products`, { headers: authHdr });
    const list = await r.json();
    loading.style.display = 'none'; table.style.display = 'table';

    tbody.innerHTML = list.map(p => `
      <tr>
        <td>${p.id}</td>
        <td>${p.name}</td>
        <td>${p.brand}</td>
        <td>${p.category}</td>
        <td>${p.gender || 'unisex'}</td>
        <td>€ ${parseFloat(p.price).toFixed(2)}</td>
        <td>${p.sizes || '—'}</td>
        <td>${p.stock ?? '—'}</td>
        <td style="white-space:nowrap;">
          <button class="btn btn-edit" onclick="editProduct(${p.id},'${esc(p.name)}','${esc(p.brand)}','${p.category}','${p.gender||'unisex'}',${p.price},'${esc(p.image||'')}','${esc(p.sizes||'')}','${esc(p.colors||'')}',${p.stock||0},'${esc(p.description||'')}')"><i class="fa-solid fa-pen"></i> Edit</button>
          <button class="btn btn-del"  onclick="deleteProduct(${p.id},'${esc(p.name)}')" style="margin-left:4px;"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>`).join('');
  } catch (e) { loading.textContent = '❌ Failed to load products.'; }
}

function showProductForm() {
  document.getElementById('pf-id').value          = '';
  document.getElementById('pf-name').value        = '';
  document.getElementById('pf-brand').value       = '';
  document.getElementById('pf-category').value    = 'shoes';
  document.getElementById('pf-gender').value      = 'unisex';
  document.getElementById('pf-price').value       = '';
  document.getElementById('pf-stock').value       = '100';
  document.getElementById('pf-image').value       = '';
  document.getElementById('pf-sizes').value       = '';
  document.getElementById('pf-colors').value      = '';
  document.getElementById('pf-description').value = '';
  document.getElementById('pf-title').textContent = 'Add New Product';
  document.getElementById('product-form-panel').style.display = 'block';
  document.getElementById('product-form-panel').scrollIntoView({ behavior: 'smooth' });
}

function hideProductForm() {
  document.getElementById('product-form-panel').style.display = 'none';
}

function editProduct(id, name, brand, category, gender, price, image, sizes, colors, stock, description) {
  document.getElementById('pf-id').value          = id;
  document.getElementById('pf-name').value        = name;
  document.getElementById('pf-brand').value       = brand;
  document.getElementById('pf-category').value    = category;
  document.getElementById('pf-gender').value      = gender || 'unisex';
  document.getElementById('pf-price').value       = price;
  document.getElementById('pf-stock').value       = stock;
  document.getElementById('pf-image').value       = image;
  document.getElementById('pf-sizes').value       = sizes;
  document.getElementById('pf-colors').value      = colors || '';
  document.getElementById('pf-description').value = description || '';
  document.getElementById('pf-title').textContent = 'Edit Product #' + id;
  document.getElementById('product-form-panel').style.display = 'block';
  document.getElementById('product-form-panel').scrollIntoView({ behavior: 'smooth' });
}

async function submitProduct() {
  const id    = document.getElementById('pf-id').value;
  const body  = {
    name:        document.getElementById('pf-name').value.trim(),
    brand:       document.getElementById('pf-brand').value.trim(),
    category:    document.getElementById('pf-category').value,
    gender:      document.getElementById('pf-gender').value,
    price:       document.getElementById('pf-price').value,
    stock:       document.getElementById('pf-stock').value,
    image:       document.getElementById('pf-image').value.trim(),
    sizes:       document.getElementById('pf-sizes').value.trim(),
    colors:      document.getElementById('pf-colors').value.trim(),
    description: document.getElementById('pf-description').value.trim(),
  };
  if (!body.name || !body.brand || !body.price) {
    showFormMsg('Name, brand and price are required.', false); return;
  }

  const url    = id ? `${API}/admin/products/${id}` : `${API}/admin/products`;
  const method = id ? 'PUT' : 'POST';

  try {
    const r    = await fetch(url, { method, headers: jsonHdr, body: JSON.stringify(body) });
    const data = await r.json();
    if (!r.ok) { showFormMsg(data.error, false); return; }
    showFormMsg(data.message, true);
    hideProductForm();
    loadProducts();
    loadStats();
  } catch (e) { showFormMsg('Cannot connect to server.', false); }
}

async function deleteProduct(id, name) {
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
  try {
    const r = await fetch(`${API}/admin/products/${id}`, { method: 'DELETE', headers: authHdr });
    const d = await r.json();
    if (!r.ok) { alert(d.error); return; }
    loadProducts(); loadStats();
  } catch (e) { alert('Cannot connect to server.'); }
}

function showFormMsg(text, ok) {
  const el = document.getElementById('pf-msg');
  el.textContent = text;
  el.className   = 'msg-box ' + (ok ? 'msg-ok' : 'msg-err');
  el.style.display = 'block';
  if (ok) setTimeout(() => el.style.display = 'none', 3000);
}

// ─── Users ────────────────────────────────────────────────────────────────────
async function loadUsers() {
  const loading = document.getElementById('users-loading');
  const table   = document.getElementById('users-table');
  const tbody   = document.getElementById('users-tbody');
  loading.style.display = 'block'; table.style.display = 'none';

  try {
    const r    = await fetch(`${API}/admin/users`, { headers: authHdr });
    const list = await r.json();
    loading.style.display = 'none'; table.style.display = 'table';

    const myId = JSON.parse(localStorage.getItem('gda_user') || '{}').id;

    tbody.innerHTML = list.map(u => {
      const isSelf = u.id === myId;
      const badge  = u.role === 'admin'
        ? `<span class="badge-admin">admin</span>`
        : `<span class="badge-user">user</span>`;
      const roleBtn = isSelf ? '' : (u.role === 'admin'
        ? `<button class="btn btn-gray" onclick="setRole(${u.id},'user')">→ user</button>`
        : `<button class="btn btn-edit" onclick="setRole(${u.id},'admin')">→ admin</button>`);
      const delBtn  = isSelf ? '' :
        `<button class="btn btn-del" onclick="deleteUser(${u.id},'${esc(u.fullname)}')" style="margin-left:4px;"><i class="fa-solid fa-trash"></i></button>`;
      return `<tr>
        <td>${u.id}</td>
        <td>${u.fullname}${isSelf ? ' <em style="color:#888;font-size:12px;">(you)</em>' : ''}</td>
        <td>${u.email}</td>
        <td>${badge}</td>
        <td>${new Date(u.created_at).toLocaleDateString()}</td>
        <td style="white-space:nowrap;">${roleBtn}${delBtn}</td>
      </tr>`;
    }).join('');
  } catch (e) { loading.textContent = '❌ Failed to load users.'; }
}

async function setRole(userId, newRole) {
  try {
    const r = await fetch(`${API}/admin/users/${userId}/role`, {
      method: 'PUT', headers: jsonHdr, body: JSON.stringify({ role: newRole })
    });
    const d = await r.json();
    if (!r.ok) { showUsersMsg(d.error, false); return; }
    showUsersMsg(d.message, true);
    loadUsers();
  } catch (e) { showUsersMsg('Cannot connect to server.', false); }
}

async function deleteUser(userId, name) {
  if (!confirm(`Delete user "${name}"? Their cart will also be deleted.`)) return;
  try {
    const r = await fetch(`${API}/admin/users/${userId}`, { method: 'DELETE', headers: authHdr });
    const d = await r.json();
    if (!r.ok) { showUsersMsg(d.error, false); return; }
    showUsersMsg(d.message, true);
    loadUsers(); loadStats();
  } catch (e) { showUsersMsg('Cannot connect to server.', false); }
}

function showUsersMsg(text, ok) {
  const el = document.getElementById('users-msg');
  el.textContent = text;
  el.className   = 'msg-box ' + (ok ? 'msg-ok' : 'msg-err');
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 3500);
}

// ─── Orders ───────────────────────────────────────────────────────────────────
async function loadOrders() {
  const loading = document.getElementById('orders-loading');
  const table   = document.getElementById('orders-table');
  const tbody   = document.getElementById('orders-tbody');
  loading.style.display = 'block'; table.style.display = 'none';

  try {
    const r    = await fetch(`${API}/admin/orders`, { headers: authHdr });
    const list = await r.json();
    loading.style.display = 'none'; table.style.display = 'table';

    const payIcon = {
      card:   '<i class="fa-solid fa-credit-card"></i>',
      paypal: '<i class="fa-brands fa-paypal"></i>',
      cash:   '<i class="fa-solid fa-money-bill-wave"></i>'
    };
    const delIcon = {
      standard: '<i class="fa-solid fa-box"></i>',
      express:  '<i class="fa-solid fa-bolt"></i>',
      pickup:   '<i class="fa-solid fa-store"></i>'
    };

    tbody.innerHTML = list.map(o => {
      const itemsSummary = o.items
        .map(i => {
          const opts = [i.size, i.color].filter(Boolean).join(', ');
          return `${i.product_name}${opts ? ' ('+opts+')' : ''} x${i.quantity||1}`;
        })
        .join('<br>');
      const addrParts = [o.full_name, o.address, o.city, o.postal_code, o.country].filter(Boolean);
      const address   = addrParts.length ? addrParts.join(', ') : '—';
      const phone     = o.phone ? `<i class="fa-solid fa-phone"></i> ${o.phone}` : '';
      const delivery  = `${delIcon[o.delivery_method]||'📦'} ${o.delivery_method || 'standard'}`;
      const delFee    = o.delivery_fee > 0 ? ` (+€${parseFloat(o.delivery_fee).toFixed(2)})` : ' (Free)';
      const cardInfo  = o.payment_method === 'card' && o.card_last4
        ? `<br><small style="color:#888;">•••• ${o.card_last4}</small>`
        : o.payment_method === 'paypal' && o.paypal_email
        ? `<br><small style="color:#888;">${o.paypal_email}</small>` : '';
      return `<tr>
        <td>${o.id}</td>
        <td>${o.fullname}</td>
        <td>${o.email}</td>
        <td>${payIcon[o.payment_method]||''} ${o.payment_method}${cardInfo}</td>
        <td>${delivery}${delFee}</td>
        <td><strong>€ ${parseFloat(o.total).toFixed(2)}</strong></td>
        <td style="font-size:12px;line-height:1.6;">${address}${phone ? '<br>'+phone : ''}</td>
        <td>${new Date(o.created_at).toLocaleDateString()}</td>
        <td style="font-size:12px;line-height:1.6;">${itemsSummary}</td>
      </tr>`;
    }).join('');
  } catch (e) { loading.textContent = '❌ Failed to load orders.'; }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function esc(str) {
  return String(str).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;');
}

function logout() {
  ['gda_token','gda_user','gda_username','gda_role'].forEach(k => localStorage.removeItem(k));
  window.location.href = 'login-v2.html';
}

// ─── Init ─────────────────────────────────────────────────────────────────────
loadStats();
loadProducts();
