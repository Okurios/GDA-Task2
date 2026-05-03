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

// ─── Login form ───────────────────────────────────────────────────────────────
document.getElementById('login-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const btn      = document.getElementById('login-btn');
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  btn.disabled    = true;
  btn.textContent = 'Logging in...';

  try {
    const response = await fetch(`${API}/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      showMessage(data.error || 'Login failed.', true);
      btn.disabled    = false;
      btn.textContent = 'Login';
      return;
    }

    // Store fresh credentials (replaces any previous session)
    localStorage.setItem('gda_token',    data.token);
    localStorage.setItem('gda_user',     JSON.stringify(data.user));
    localStorage.setItem('gda_username', data.user.fullname);
    localStorage.setItem('gda_role',     data.user.role || 'user');

    showMessage(data.message + ' Redirecting...', false);
    // Use replace() so the login page is removed from history (Back won't return here)
    setTimeout(() => { window.location.replace('dashboard-v2.html'); }, 1000);

  } catch (err) {
    showMessage('Cannot connect to server. Make sure the backend is running.', true);
    btn.disabled    = false;
    btn.textContent = 'Login';
  }
});

// ─── bfcache guard: if browser restores frozen page, reset it cleanly ────────
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    // Page restored from back-forward cache — reset to clean state
    const btn = document.getElementById('login-btn');
    btn.disabled    = false;
    btn.textContent = 'Login';
    document.getElementById('message-box').style.display = 'none';

    // Re-evaluate session banner based on current localStorage
    const t      = localStorage.getItem('gda_token');
    const banner = document.getElementById('session-banner');
    if (t && banner) {
      document.getElementById('banner-name').textContent =
        localStorage.getItem('gda_username') || 'a user';
      banner.style.display = 'block';
    } else if (banner) {
      banner.style.display = 'none';
    }
  }
});
