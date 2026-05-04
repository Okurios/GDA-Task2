const API   = '/api';
const token = localStorage.getItem('gda_token');
const role  = localStorage.getItem('gda_role') || 'user';

if (!token) window.location.href = 'login-v2.html';

// Show admin nav link if admin
if (role === 'admin') {
  const al = document.getElementById('admin-nav');
  if (al) al.style.display = 'inline';
}

// ─── Show message helpers ─────────────────────────────────────────────────────
function msg(id, text, ok) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className   = 'msg ' + (ok ? 'ok' : 'err');
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}

// ─── Load Profile ─────────────────────────────────────────────────────────────
async function loadProfile() {
  try {
    const res  = await fetch(`${API}/auth/me`, { headers: { 'Authorization': 'Bearer ' + token } });
    if (!res.ok) { window.location.href = 'login-v2.html'; return; }
    const user = await res.json();

    document.getElementById('p-name').value  = user.fullname;
    document.getElementById('p-email').value = user.email;
    document.getElementById('p-meta').textContent =
      `Member since: ${new Date(user.created_at).toLocaleDateString()}  |  Role: ${user.role}`;
  } catch (e) { console.error(e); }
}

// ─── Save Profile ─────────────────────────────────────────────────────────────
async function saveProfile() {
  const fullname = document.getElementById('p-name').value.trim();
  const email    = document.getElementById('p-email').value.trim();
  if (!fullname || !email) { msg('profile-msg', 'Both fields are required.', false); return; }

  try {
    const res  = await fetch(`${API}/auth/profile`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body:    JSON.stringify({ fullname, email })
    });
    const data = await res.json();
    if (!res.ok) { msg('profile-msg', data.error, false); return; }

    localStorage.setItem('gda_username', fullname);
    msg('profile-msg', data.message, true);
  } catch (e) { msg('profile-msg', 'Cannot connect to server.', false); }
}

// ─── Change Password ──────────────────────────────────────────────────────────
async function changePassword() {
  const current = document.getElementById('cp-current').value;
  const newPw   = document.getElementById('cp-new').value;
  const confirm = document.getElementById('cp-confirm').value;

  if (!current || !newPw || !confirm) { msg('pw-msg', 'All fields are required.', false); return; }
  if (newPw !== confirm)              { msg('pw-msg', 'New passwords do not match.', false); return; }
  if (newPw.length < 8)              { msg('pw-msg', 'Password must be at least 8 characters.', false); return; }

  try {
    const res  = await fetch(`${API}/auth/change-password`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body:    JSON.stringify({ current_password: current, new_password: newPw })
    });
    const data = await res.json();
    if (!res.ok) { msg('pw-msg', data.error, false); return; }

    document.getElementById('cp-current').value = '';
    document.getElementById('cp-new').value     = '';
    document.getElementById('cp-confirm').value = '';
    msg('pw-msg', data.message, true);
  } catch (e) { msg('pw-msg', 'Cannot connect to server.', false); }
}

// ─── Load Order History ───────────────────────────────────────────────────────
async function loadOrders() {
  const loadingEl   = document.getElementById('orders-loading');
  const containerEl = document.getElementById('orders-container');

  try {
    const res    = await fetch(`${API}/orders`, { headers: { 'Authorization': 'Bearer ' + token } });
    const orders = await res.json();

    loadingEl.style.display = 'none';

    if (!orders.length) {
      containerEl.innerHTML = '<div class="empty-orders">No orders yet. Start shopping!</div>';
      return;
    }

    const payIcon = { card:'💳', paypal:'🅿️', cash:'💵' };

    containerEl.innerHTML = orders.map(order => `
      <div class="order-block">
        <div class="order-header">
          <span>Order #${order.id}</span>
          <span>${new Date(order.created_at).toLocaleDateString()}</span>
          <span>${payIcon[order.payment_method] || ''} ${order.payment_method}</span>
          <span style="font-size:16px;">€ ${parseFloat(order.total).toFixed(2)}</span>
        </div>
        <div class="order-items">
          <table>
            <thead><tr><th>Product</th><th>Size</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr></thead>
            <tbody>
              ${order.items.map(item => `
                <tr>
                  <td>${item.product_name}</td>
                  <td>${item.size || '—'}</td>
                  <td>${item.quantity || 1}</td>
                  <td>€ ${parseFloat(item.price).toFixed(2)}</td>
                  <td>€ ${(parseFloat(item.price) * (item.quantity || 1)).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `).join('');
  } catch (e) {
    loadingEl.textContent = '❌ Failed to load orders.';
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
loadProfile();
loadOrders();
