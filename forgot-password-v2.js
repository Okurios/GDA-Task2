const API = '/api';

function showMessage(text, isError) {
  const box = document.getElementById('message-box');
  box.textContent    = text;
  box.style.display  = 'block';
  box.style.background = isError ? '#ffe0e0' : '#e0ffe0';
  box.style.color      = isError ? '#c00'    : '#060';
  box.style.border     = isError ? '1px solid #c00' : '1px solid #060';
}

document.getElementById('forgot-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const btn   = document.getElementById('reset-btn');
  const email = document.getElementById('reset-email').value.trim();

  btn.disabled    = true;
  btn.textContent = 'Sending...';

  try {
    const res  = await fetch(`${API}/auth/forgot-password`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email })
    });
    const data = await res.json();

    if (!res.ok) {
      showMessage(data.error || 'Something went wrong.', true);
      btn.disabled    = false;
      btn.textContent = 'Send Reset Link';
      return;
    }

    showMessage(data.message, false);
    btn.disabled    = false;
    btn.textContent = 'Send Reset Link';

  } catch (err) {
    showMessage('Cannot connect to server.', true);
    btn.disabled    = false;
    btn.textContent = 'Send Reset Link';
  }
});
