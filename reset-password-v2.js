const API = '/api';

// ─── Get token from URL ───────────────────────────────────────────────────────
const token = new URLSearchParams(window.location.search).get('token');

if (!token) {
  document.getElementById('invalid-token').style.display = 'block';
} else {
  document.getElementById('reset-form').style.display = 'block';
}

// ─── Message helper ───────────────────────────────────────────────────────────
function showMessage(text, isError) {
  const box = document.getElementById('message-box');
  box.textContent    = text;
  box.style.display  = 'block';
  box.style.background = isError ? '#ffe0e0' : '#e0ffe0';
  box.style.color      = isError ? '#c00'    : '#060';
  box.style.border     = isError ? '1px solid #c00' : '1px solid #060';
}

// ─── Password strength indicator ─────────────────────────────────────────────
function getStrength(pw) {
  let score = 0;
  if (pw.length >= 8)            score++;
  if (pw.length >= 12)           score++;
  if (/[A-Z]/.test(pw))         score++;
  if (/[0-9]/.test(pw))         score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label:'Weak',   color:'#e60000', width:'33%'  };
  if (score <= 3) return { label:'Medium', color:'#f5a623', width:'66%'  };
  return                { label:'Strong', color:'#28a745', width:'100%' };
}

function updateStrength() {
  const pw    = document.getElementById('new-password').value;
  const bar   = document.getElementById('strength-bar');
  const label = document.getElementById('strength-label');
  if (!pw) { bar.style.width = '0'; label.textContent = ''; return; }
  const s = getStrength(pw);
  bar.style.width      = s.width;
  bar.style.background = s.color;
  label.textContent    = 'Strength: ' + s.label;
  label.style.color    = s.color;
}

// ─── Reset form submit ────────────────────────────────────────────────────────
document.getElementById('reset-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const btn         = document.getElementById('save-btn');
  const new_password = document.getElementById('new-password').value;

  if (new_password.length < 8) {
    showMessage('Password must be at least 8 characters.', true); return;
  }

  btn.disabled    = true;
  btn.textContent = 'Saving...';

  try {
    const res  = await fetch(`${API}/auth/reset-password`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token, new_password })
    });
    const data = await res.json();

    if (!res.ok) {
      if (data.error && (data.error.includes('expired') || data.error.includes('Invalid'))) {
        document.getElementById('reset-form').style.display  = 'none';
        document.getElementById('invalid-token').style.display = 'block';
      }
      showMessage(data.error || 'Reset failed.', true);
      btn.disabled    = false;
      btn.textContent = 'Save New Password';
      return;
    }

    showMessage(data.message + ' Redirecting to login...', false);
    setTimeout(() => { window.location.replace('login-v2.html'); }, 2000);

  } catch (err) {
    showMessage('Cannot connect to server.', true);
    btn.disabled    = false;
    btn.textContent = 'Save New Password';
  }
});
