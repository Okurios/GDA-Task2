const API = '/api';

const token = localStorage.getItem('gda_token');
if (!token) window.location.href = 'login-v2.html';

// ─── State ────────────────────────────────────────────────────────────────────
let cartSubtotal  = 0;
let deliveryFee   = 0;
let deliveryMethod = 'standard';
let paymentMethod  = 'card';

// ─── Message helper ───────────────────────────────────────────────────────────
function showMsg(text, isError) {
  const box = document.getElementById('msg-box');
  box.textContent = text;
  box.style.display  = 'block';
  box.style.background = isError ? '#ffe0e0' : '#e0ffe0';
  box.style.color      = isError ? '#c00'    : '#060';
  box.style.border     = isError ? '1px solid #c00' : '1px solid #060';
}

// ─── Delivery Method ──────────────────────────────────────────────────────────
function selectDelivery(method, fee, el) {
  deliveryMethod = method;
  deliveryFee    = fee;
  document.querySelectorAll('.delivery-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  el.querySelector('input[type=radio]').checked = true;
  updateTotals();
}

// ─── Payment Method ───────────────────────────────────────────────────────────
function selectPayment(method, el) {
  paymentMethod = method;
  document.querySelectorAll('.pay-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  el.querySelector('input[type=radio]').checked = true;
  document.getElementById('card-info-panel').classList.toggle('visible', method === 'card');
  document.getElementById('paypal-info-panel').classList.toggle('visible', method === 'paypal');
}

// ─── Card input formatters ─────────────────────────────────────────────────────
function formatCardNumber(input) {
  let val = input.value.replace(/\D/g, '').substring(0, 16);
  input.value = val.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(input) {
  let val = input.value.replace(/\D/g, '').substring(0, 4);
  if (val.length >= 3) val = val.substring(0, 2) + '/' + val.substring(2);
  input.value = val;
}

// ─── Update totals display ────────────────────────────────────────────────────
function updateTotals() {
  const grand = cartSubtotal + deliveryFee;
  document.getElementById('subtotal-price').textContent = `€ ${cartSubtotal.toFixed(2)}`;
  document.getElementById('delivery-price-display').textContent =
    deliveryFee > 0 ? `€ ${deliveryFee.toFixed(2)}` : 'Free';
  document.getElementById('delivery-label').textContent =
    deliveryMethod === 'pickup' ? 'Store Pickup' :
    deliveryMethod === 'express' ? 'Express Delivery' : 'Standard Delivery';
  document.getElementById('cart-total-price').textContent = `€ ${grand.toFixed(2)}`;
}

// ─── Load Cart ────────────────────────────────────────────────────────────────
async function loadCart() {
  const tbody  = document.getElementById('cart-table-body');

  try {
    const res = await fetch(`${API}/cart`, { headers: { 'Authorization': 'Bearer ' + token } });

    if (res.status === 401 || res.status === 403) {
      showMsg('Session expired. Please log in again.', true);
      setTimeout(() => window.location.href = 'login-v2.html', 1500);
      return;
    }

    const items = await res.json();
    tbody.innerHTML = '';
    cartSubtotal = 0;

    if (!items.length) {
      tbody.innerHTML = "<tr><td colspan='7' style='text-align:center;padding:30px;color:#999;'>Your cart is empty.</td></tr>";
      updateTotals();
      return;
    }

    items.forEach(item => {
      const qty     = item.quantity || 1;
      const subtotal = item.price * qty;
      cartSubtotal += subtotal;

      tbody.innerHTML += `<tr id="row-${item.id}">
        <td>${item.product_name}</td>
        <td>${item.size || '—'}</td>
        <td>${item.color || '—'}</td>
        <td>€ ${item.price.toFixed(2)}</td>
        <td>
          <div class="qty-controls">
            <button class="qty-btn" onclick="changeQty(${item.id}, ${qty - 1})">−</button>
            <span class="qty-num">${qty}</span>
            <button class="qty-btn" onclick="changeQty(${item.id}, ${qty + 1})">+</button>
          </div>
        </td>
        <td>€ ${subtotal.toFixed(2)}</td>
        <td><button class="delete-btn" onclick="removeItem(${item.id})"><i class="fa-solid fa-xmark"></i></button></td>
      </tr>`;
    });

    updateTotals();
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
  const full_name   = document.getElementById('addr-name').value.trim();
  const phone       = document.getElementById('addr-phone').value.trim();
  const address     = document.getElementById('addr-street').value.trim();
  const city        = document.getElementById('addr-city').value.trim();
  const postal_code = document.getElementById('addr-postal').value.trim();
  const country     = document.getElementById('addr-country').value.trim();

  if (!full_name || !address || !city || !postal_code || !country) {
    showMsg('⚠️ Please fill in all required shipping address fields.', true);
    document.getElementById('addr-name').focus();
    return;
  }

  // PayPal validation
  let paypal_email = '';
  if (paymentMethod === 'paypal') {
    paypal_email = document.getElementById('paypal-email').value.trim();
    if (!paypal_email) {
      showMsg('⚠️ Please enter your PayPal email address.', true);
      document.getElementById('paypal-email').focus();
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paypal_email)) {
      showMsg('⚠️ Please enter a valid PayPal email address.', true);
      document.getElementById('paypal-email').focus();
      return;
    }
  }

  // Card validation
  let card_last4 = '';
  if (paymentMethod === 'card') {
    const cardName   = document.getElementById('card-name').value.trim();
    const cardNumber = document.getElementById('card-number').value.replace(/\s/g, '');
    const cardExpiry = document.getElementById('card-expiry').value.trim();
    const cardCvv    = document.getElementById('card-cvv').value.trim();

    if (!cardName || !cardNumber || !cardExpiry || !cardCvv) {
      showMsg('⚠️ Please fill in all card details.', true);
      document.getElementById('card-name').focus();
      return;
    }
    if (cardNumber.length < 13 || cardNumber.length > 16) {
      showMsg('⚠️ Please enter a valid card number (13–16 digits).', true);
      document.getElementById('card-number').focus();
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
      showMsg('⚠️ Please enter expiry in MM/YY format.', true);
      document.getElementById('card-expiry').focus();
      return;
    }
    if (cardCvv.length < 3) {
      showMsg('⚠️ Please enter a valid CVV (3–4 digits).', true);
      document.getElementById('card-cvv').focus();
      return;
    }
    card_last4 = cardNumber.slice(-4);
  }

  try {
    const res  = await fetch(`${API}/orders`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body:    JSON.stringify({
        payment_method:  paymentMethod,
        delivery_method: deliveryMethod,
        delivery_fee:    deliveryFee,
        card_last4,
        paypal_email,
        full_name, phone, address, city, postal_code, country
      })
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
