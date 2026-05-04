/**
 * email.js – Nodemailer service using Mailtrap (or any SMTP)
 * Configure via .env — if EMAIL_USER is blank, emails are skipped gracefully.
 */

const nodemailer = require('nodemailer');

const configured = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'sandbox.smtp.mailtrap.io',
  port: parseInt(process.env.EMAIL_PORT || '2525'),
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
  }
});

async function sendEmail(to, subject, html) {
  if (!configured) {
    console.log(`📧  [EMAIL - not configured]  To: ${to}  |  Subject: ${subject}`);
    return;
  }
  try {
    await transporter.sendMail({
      from:    process.env.EMAIL_FROM || 'GDA Sports <noreply@gda-sports.com>',
      to, subject, html
    });
    console.log(`📧  Email sent → ${to}`);
  } catch (e) {
    console.error('📧  Email send failed:', e.message);
  }
}

// ─── Email templates ──────────────────────────────────────────────────────────
function welcomeEmail(fullname) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:30px;border:1px solid #eee;border-radius:10px;">
    <div style="text-align:center;margin-bottom:20px;">
      <h1 style="color:#004b93;margin:0;">GDA Sports</h1>
    </div>
    <h2 style="color:#333;">Welcome aboard, ${fullname}! 🎉</h2>
    <p style="color:#555;">Your account has been created successfully. You're ready to explore our sports gear collection.</p>
    <div style="text-align:center;margin:30px 0;">
      <a href="http://localhost:3000/dashboard-v2.html"
         style="background:#004b93;color:#fff;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:16px;">
        Start Shopping →
      </a>
    </div>
    <p style="color:#999;font-size:12px;text-align:center;">GDA Sports Team &bull; Athens, Solomou 24</p>
  </div>`;
}

function orderConfirmationEmail(fullname, order, items) {
  const rows = items.map(i => `
    <tr>
      <td style="padding:10px;border-bottom:1px solid #eee;">${i.product_name}${i.size ? ` <span style="color:#888;">(${i.size})</span>` : ''}</td>
      <td style="padding:10px;border-bottom:1px solid #eee;text-align:center;">${i.quantity || 1}</td>
      <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;">€${(i.price * (i.quantity || 1)).toFixed(2)}</td>
    </tr>`).join('');

  const shippingBlock = order.address ? `
    <div style="background:#f0f7ff;padding:15px;border-radius:8px;margin:16px 0;border-left:4px solid #004b93;">
      <p style="margin:0 0 6px 0;font-weight:bold;color:#004b93;">🚚 Shipping Address</p>
      <p style="margin:3px 0;color:#555;">${order.full_name || fullname}</p>
      <p style="margin:3px 0;color:#555;">${order.address}</p>
      <p style="margin:3px 0;color:#555;">${[order.city, order.postal_code, order.country].filter(Boolean).join(', ')}</p>
      ${order.phone ? `<p style="margin:3px 0;color:#555;">📞 ${order.phone}</p>` : ''}
    </div>` : '';

  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px;border:1px solid #eee;border-radius:10px;">
    <h1 style="color:#004b93;text-align:center;">GDA Sports</h1>
    <h2 style="color:#28a745;">Order Confirmed! ✅</h2>
    <p style="color:#555;">Hi <strong>${fullname}</strong>, your order has been placed successfully. Here's your receipt:</p>
    <div style="background:#f4f8ff;padding:15px;border-radius:8px;margin:20px 0;">
      <p style="margin:5px 0;"><strong>Order #:</strong> ${order.id}</p>
      <p style="margin:5px 0;"><strong>Payment:</strong> ${order.payment_method}</p>
      <p style="margin:5px 0;"><strong>Date:</strong> ${new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' })}</p>
    </div>
    ${shippingBlock}
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#004b93;color:#fff;">
          <th style="padding:10px;text-align:left;">Product</th>
          <th style="padding:10px;text-align:center;">Qty</th>
          <th style="padding:10px;text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr style="background:#f4f4f4;">
          <td colspan="2" style="padding:12px;font-weight:bold;text-align:right;">Order Total:</td>
          <td style="padding:12px;font-weight:bold;color:#004b93;text-align:right;font-size:18px;">€${parseFloat(order.total).toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>
    <p style="color:#999;font-size:12px;text-align:center;margin-top:24px;">GDA Sports Team &bull; Athens, Solomou 24</p>
  </div>`;
}

function passwordResetEmail(fullname, resetLink) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:30px;border:1px solid #eee;border-radius:10px;">
    <h1 style="color:#004b93;text-align:center;">GDA Sports</h1>
    <h2 style="color:#333;">Password Reset Request 🔑</h2>
    <p style="color:#555;">Hi <strong>${fullname}</strong>,</p>
    <p style="color:#555;">We received a request to reset your password. Click the button below — the link expires in <strong>1 hour</strong>.</p>
    <div style="text-align:center;margin:30px 0;">
      <a href="${resetLink}"
         style="background:#e60000;color:#fff;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:16px;">
        Reset My Password →
      </a>
    </div>
    <p style="color:#888;font-size:13px;">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
    <p style="color:#999;font-size:12px;text-align:center;margin-top:24px;">GDA Sports Team &bull; Athens, Solomou 24</p>
  </div>`;
}

module.exports = { sendEmail, welcomeEmail, orderConfirmationEmail, passwordResetEmail };
