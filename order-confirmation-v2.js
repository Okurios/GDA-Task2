const API   = 'http://localhost:3000/api';
const token = localStorage.getItem('gda_token');

if (!token) window.location.href = 'login-v2.html';

const params  = new URLSearchParams(window.location.search);
const orderId = params.get('orderId');

if (!orderId) window.location.href = 'dashboard-v2.html';

async function loadOrder() {
  try {
    const res  = await fetch(`${API}/orders/${orderId}`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });

    if (res.status === 401 || res.status === 403) {
      window.location.href = 'login-v2.html'; return;
    }
    if (!res.ok) { window.location.href = 'dashboard-v2.html'; return; }

    const order = await res.json();

    document.getElementById('loading').style.display  = 'none';
    document.getElementById('content').style.display  = 'block';

    document.getElementById('order-id').textContent      = order.id;
    document.getElementById('order-date').textContent    = new Date(order.created_at).toLocaleString();
    document.getElementById('order-payment').textContent = capitalise(order.payment_method);
    document.getElementById('order-total').textContent   = `€ ${parseFloat(order.total).toFixed(2)}`;

    const tbody = document.getElementById('items-body');
    tbody.innerHTML = order.items.map(item => `
      <tr>
        <td>${item.product_name}</td>
        <td>${item.size || '—'}</td>
        <td>${item.quantity || 1}</td>
        <td>€ ${parseFloat(item.price).toFixed(2)}</td>
        <td>€ ${(parseFloat(item.price) * (item.quantity || 1)).toFixed(2)}</td>
      </tr>
    `).join('');

  } catch (e) {
    document.getElementById('loading').textContent = '❌ Failed to load order. Please try again.';
  }
}

function capitalise(str) {
  const map = { card: '💳 Credit/Debit Card', paypal: '🅿️ PayPal', cash: '💵 Cash on Delivery' };
  return map[str] || str;
}

loadOrder();
