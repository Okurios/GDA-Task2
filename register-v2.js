const API = 'http://localhost:3000/api';

// ─── Show "already logged in" banner (no auto-redirect) ──────────────────────
const existingToken = localStorage.getItem('gda_token');
if (existingToken) {
  const banner   = document.getElementById('session-banner');
  const nameSpan = document.getElementById('banner-name');
  if (banner) {
    nameSpan.textContent = localStorage.getItem('gda_username') || 'a user';
    banner.style.display = 'block';
  }
}

function clearSession() {
  ['gda_token','gda_user','gda_username','gda_role'].forEach(k => localStorage.removeItem(k));
  document.getElementById('session-banner').style.display = 'none';
}

// ─── Message helper ───────────────────────────────────────────────────────────
function showMessage(text, isError) {
  const box = document.getElementById('message-box');
  box.textContent = text;
  box.style.display  = 'block';
  box.style.background = isError ? '#ffe0e0' : '#e0ffe0';
  box.style.color      = isError ? '#c00'    : '#060';
  box.style.border     = isError ? '1px solid #c00' : '1px solid #060';
}

// ─── Password strength indicator ─────────────────────────────────────────────
function getStrength(pw) {
  let score = 0;
  if (pw.length >= 8)              score++;
  if (pw.length >= 12)             score++;
  if (/[A-Z]/.test(pw))           score++;
  if (/[0-9]/.test(pw))           score++;
  if (/[^A-Za-z0-9]/.test(pw))   score++;

  if (score <= 1) return { label: 'Weak',   color: '#e60000', width: '33%'  };
  if (score <= 3) return { label: 'Medium', color: '#f5a623', width: '66%'  };
  return            { label: 'Strong', color: '#28a745', width: '100%' };
}

function updateStrength() {
  const pw    = document.getElementById('reg-password').value;
  const bar   = document.getElementById('strength-bar');
  const label = document.getElementById('strength-label');

  if (!pw) {
    bar.style.width = '0';
    label.textContent = '';
    return;
  }
  const s = getStrength(pw);
  bar.style.width      = s.width;
  bar.style.background = s.color;
  label.textContent    = 'Password strength: ' + s.label;
  label.style.color    = s.color;

  // Also re-check confirm match
  checkMatch();
}

// ─── Confirm password match hint ─────────────────────────────────────────────
function checkMatch() {
  const pw      = document.getElementById('reg-password').value;
  const confirm = document.getElementById('reg-confirm').value;
  const hint    = document.getElementById('match-hint');
  if (!confirm) { hint.textContent = ''; return; }
  if (pw === confirm) {
    hint.textContent = '✅ Passwords match';
    hint.style.color = '#28a745';
  } else {
    hint.textContent = '❌ Passwords do not match';
    hint.style.color = '#e60000';
  }
}

// ─── Email format validation ──────────────────────────────────────────────────
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

document.getElementById('reg-email').addEventListener('input', function () {
  const hint = document.getElementById('email-hint');
  if (!this.value) { hint.textContent = ''; return; }
  if (isValidEmail(this.value)) {
    hint.textContent = '✅ Valid email';
    hint.style.color = '#28a745';
  } else {
    hint.textContent = '❌ Enter a valid email (e.g. name@example.com)';
    hint.style.color = '#e60000';
  }
});

// ─── Register form submit ─────────────────────────────────────────────────────
document.getElementById('register-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const btn      = document.getElementById('register-btn');
  const fullname = document.getElementById('reg-fullname').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm  = document.getElementById('reg-confirm').value;

  // Validations
  if (!fullname) {
    showMessage('Please enter your full name.', true); return;
  }
  if (!isValidEmail(email)) {
    showMessage('Please enter a valid email address.', true); return;
  }
  if (password.length < 8) {
    showMessage('Password must be at least 8 characters long.', true); return;
  }
  if (password !== confirm) {
    showMessage('Passwords do not match. Please re-enter.', true); return;
  }

  // Prevent double-submit
  btn.disabled    = true;
  btn.textContent = 'Creating account...';

  try {
    const response = await fetch(`${API}/auth/register`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ fullname, email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      showMessage(data.error || 'Registration failed.', true);
      btn.disabled    = false;
      btn.textContent = 'Register';
      return;
    }

    showMessage(data.message + ' Redirecting to login...', false);
    setTimeout(() => { window.location.href = 'login-v2.html'; }, 1500);

  } catch (err) {
    showMessage('Cannot connect to server. Make sure the backend is running.', true);
    btn.disabled    = false;
    btn.textContent = 'Register';
  }
});
