const API = 'http://localhost:3000/api';

const token = localStorage.getItem('gda_token');
if (!token) window.location.href = 'login-v2.html';

function showMsg(text, isError) {
  const box = document.getElementById('msg-box');
  box.textContent = text;
  box.style.display  = 'block';
  box.style.background = isError ? '#ffe0e0' : '#e0ffe0';
  box.style.color      = isError ? '#c00'    : '#060';
  box.style.border     = isError ? '1px solid #c00' : '1px solid #060';
}

// ─── Load Cart ────────────────────────────────────────────────────────────────
async function loadCart() {
  const tbody  = document.getElementById('cart-table-body');
  const totEl  = document.getElementById('cart-total-price');

  try {
    const res = await fetch(`${API}/cart`, { headers: { 'Authorization': 'Bearer ' + token } });

    if (res.status === 401 || res.status === 403) {
      showMsg('Session expired. Please log in again.', true);
      setTimeout(() => window.location.href = 'login-v2.html', 1500);
      return;
    }

    const items = await res.json();
    tbody.innerHTML = '';
    let total = 0;

    if (!items.length) {
      tbody.innerHTML = "<tr><td colspan='5' style='text-align:center;padding:30px;color:#999;'>Your cart is empty.</td></tr>";
      totEl.innerText = '€ 0.00';
      return;
    }

    items.forEach(item => {
      const qty     = item.quantity || 1;
      const subtotal = item.price * qty;
      total += subtotal;

      tbody.innerHTML += `<tr id="row-${item.id}">
        <td>${item.product_name}</td>
        <td>${item.size || '—'}</td>
        <td>€ ${item.price.toFixed(2)}</td>
        <td>
          <div class="qty-controls">
            <button class="qty-btn" onclick="changeQty(${item.id}, ${qty - 1})">−</button>
            <span class="qty-num">${qty}</span>
            <button class="qty-btn" onclick="changeQty(${item.id}, ${qty + 1})">+</button>
          </div>
        </td>
        <td>€ ${subtotal.toFixed(2)}</td>
        <td><button class="delete-btn" onclick="removeItem(${item.id})">❌</button></td>
      </tr>`;
    });

    totEl.innerText = `€ ${total.toFixed(2)}`;
  } catch (err) {
    showMsg('Cannot connect to server. Make sure the backend is running.', true);
  }
}

// ─── Change Quantity ──────────────────────────────────────────────────────────
async function changeQty(cartItemId, newQty) {
  if (newQty < 1) { removeItem(cartItemId); return; }

  try {
    const res  = await fetch(`${API}/cart/update/${cartItemId}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body:    JSON.stringify({ quantity: newQty })
    });
    if (res.ok) loadCart();
    else { const d = await res.json(); showMsg(d.error || 'Update failed.', true); }
  } catch (e) { showMsg('Cannot connect to server.', true); }
}

// ─── Remove Item ──────────────────────────────────────────────────────────────
async function removeItem(cartItemId) {
  try {
    const res  = await fetch(`${API}/cart/remove/${cartItemId}`, {
      method:  'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (res.ok) loadCart();
    else { const d = await res.json(); showMsg(d.error || 'Remove failed.', true); }
  } catch (e) { showMsg('Cannot connect to server.', true); }
}

// ─── Complete Order ───────────────────────────────────────────────────────────
async function completeOrder() {
  const payment_method = document.querySelector('input[name="payment"]:checked').value;

  try {
    const res  = await fetch(`${API}/orders`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body:    JSON.stringify({ payment_method })
    });
    const data = await res.json();

    if (!res.ok) { showMsg(data.error || 'Order failed.', true); return; }

    showMsg(`✅ ${data.message}`, false);
    setTimeout(() => {
      window.location.href = `order-confirmation-v2.html?orderId=${data.orderId}`;
    }, 1200);
  } catch (e) { showMsg('Cannot connect to server.', true); }
}

loadCart();
