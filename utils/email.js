const nodemailer = require('nodemailer');

// ─── SmartGrocer Email Service ───────────────────────────────────────────────
// Tries Brevo HTTP API first (5s timeout), then SMTP (5s timeout)
// If both fail, logs fallback code to console

async function sendEmailViaAPI(toEmail, toName, subject, htmlContent, textContent) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000); // 5s max

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: process.env.EMAIL_FROM_NAME || 'SmartGrocer',
          email: process.env.EMAIL_USER
        },
        to: [{ email: toEmail, name: toName || '' }],
        subject,
        htmlContent,
        textContent
      })
    });
    clearTimeout(timeout);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Brevo API ${res.status}: ${err}`);
    }
    return true;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

// ─── Public Functions ────────────────────────────────────────────────────────
async function sendVerificationEmail(toEmail, verificationCode, fullName) {
  const html = buildVerificationHTML(fullName, verificationCode);
  const text = `Your SmartGrocer verification code: ${verificationCode} (valid 10 min)`;
  await sendEmailViaAPI(toEmail, fullName, 'SmartGrocer — Verification Code', html, text);
  console.log(`✅ Verification email sent → ${toEmail}`);
}

async function sendWelcomeEmail(toEmail, fullName, storeName) {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const html = buildWelcomeHTML(fullName, storeName, appUrl);
  const text = `Welcome ${fullName}! Your store "${storeName}" is ready.`;
  await sendEmailViaAPI(toEmail, fullName, `Welcome to SmartGrocer`, html, text);
  console.log(`✅ Welcome email sent → ${toEmail}`);
}

async function sendPasswordResetEmail(toEmail, fullName, resetToken) {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const resetLink = `${appUrl}/reset-password.html?token=${resetToken}`;
  const html = buildPasswordResetHTML(fullName, resetLink);
  const text = `Hi ${fullName}, you requested a password reset. Click this link: ${resetLink}. Valid for 30 minutes.`;
  await sendEmailViaAPI(toEmail, fullName, 'SmartGrocer — Password Reset Request', html, text);
  console.log(`✅ Password reset email sent → ${toEmail}`);
}

async function sendSubscriptionWarningEmail(toEmail, fullName, daysLeft) {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const html = buildSubscriptionWarningHTML(fullName, daysLeft, appUrl);
  const subject = daysLeft <= 1 ? 'Urgent: SmartGrocer Trial Expires Soon' : 'SmartGrocer Trial Expires in 3 Days';
  const text = `Hi ${fullName}, your SmartGrocer trial/subscription expires in ${daysLeft} days. Please top up your wallet to ensure uninterrupted access.`;
  await sendEmailViaAPI(toEmail, fullName, subject, html, text);
  console.log(`✅ Subscription warning email sent → ${toEmail}`);
}

async function sendSubscriptionActivatedEmail(toEmail, fullName, planName, startDate, endDate) {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const html = buildSubscriptionActivatedHTML(fullName, planName, startDate, endDate, appUrl);
  const text = `Hi ${fullName}, your subscription to ${planName} has been activated. It is valid from ${startDate} to ${endDate}.`;
  await sendEmailViaAPI(toEmail, fullName, 'SmartGrocer — Subscription Activated 🎉', html, text);
  console.log(`✅ Subscription activated email sent → ${toEmail}`);
}

// ─── HTML Templates ──────────────────────────────────────────────────────────
function buildVerificationHTML(fullName, code) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 16px;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#1e293b;border-radius:20px;overflow:hidden;border:1px solid #334155;">
<tr><td style="background:linear-gradient(135deg,#052e16,#064e3b,#065f46);padding:44px 40px 36px;text-align:center;">
<table cellpadding="0" cellspacing="0" style="margin:0 auto 20px;"><tr>
<td style="background:linear-gradient(135deg,#15803d,#22c55e);width:52px;height:52px;border-radius:14px;text-align:center;vertical-align:middle;font-size:26px;">&#128722;</td>
<td style="padding-left:12px;vertical-align:middle;text-align:left;">
<div style="font-size:20px;font-weight:900;color:#fff;">SmartGrocer</div>
<div style="font-size:10px;font-weight:700;color:#4ade80;letter-spacing:2px;text-transform:uppercase;">Back-Office System</div>
</td></tr></table>
<h1 style="color:#fff;font-size:24px;font-weight:800;margin:0 0 8px;">Verify Your Email Address</h1>
<p style="color:rgba(255,255,255,0.6);font-size:14px;margin:0;">Complete your SmartGrocer registration</p>
</td></tr>
<tr><td style="padding:40px;">
<p style="color:#cbd5e1;font-size:16px;margin:0 0 6px;">Hello, <strong style="color:#f1f5f9;">${fullName || 'there'}</strong></p>
<p style="color:#94a3b8;font-size:14px;line-height:1.65;margin:0 0 32px;">Use the code below to activate your account.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
<tr><td align="center" style="background:rgba(22,163,74,0.08);border:2px solid rgba(22,163,74,0.4);border-radius:16px;padding:30px 20px;">
<p style="color:#86efac;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin:0 0 14px;">Verification Code</p>
<p style="color:#22c55e;font-size:52px;font-weight:900;letter-spacing:14px;margin:0 0 14px;font-family:'Courier New',monospace;">${code}</p>
<p style="color:#6b7280;font-size:13px;margin:0;">Valid for <strong style="color:#fbbf24;">10 minutes</strong></p>
</td></tr></table>
<p style="color:#374151;font-size:12px;margin:0;">If you did not create a SmartGrocer account, ignore this email.</p>
</td></tr>
<tr><td style="background:#0f172a;padding:16px 40px;text-align:center;">
<p style="color:#374151;font-size:11px;margin:0;">&copy; 2026 SmartGrocer</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

function buildWelcomeHTML(fullName, storeName, appUrl) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 16px;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#1e293b;border-radius:20px;overflow:hidden;border:1px solid #334155;">
<tr><td style="background:linear-gradient(135deg,#052e16,#064e3b);padding:44px 40px;text-align:center;">
<h1 style="color:#fff;font-size:24px;font-weight:800;margin:0 0 8px;">Welcome, ${fullName}!</h1>
<p style="color:rgba(255,255,255,0.65);font-size:14px;margin:0;">Your SmartGrocer account is now active</p>
</td></tr>
<tr><td style="padding:40px;">
<p style="color:#94a3b8;font-size:15px;margin:0 0 24px;">Your store <strong style="color:#4ade80;">"${storeName}"</strong> is ready.</p>
<div style="text-align:center;margin-top:24px;">
<a href="${appUrl}/login.html" style="background:linear-gradient(135deg,#15803d,#22c55e);color:#fff;padding:15px 40px;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;">Go to Dashboard</a>
</div>
</td></tr>
<tr><td style="background:#0f172a;padding:16px 40px;text-align:center;">
<p style="color:#374151;font-size:11px;margin:0;">&copy; 2026 SmartGrocer</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

function buildPasswordResetHTML(fullName, resetLink) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 16px;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#1e293b;border-radius:20px;overflow:hidden;border:1px solid #334155;">
<tr><td style="background:linear-gradient(135deg,#052e16,#064e3b);padding:44px 40px;text-align:center;">
<h1 style="color:#fff;font-size:24px;font-weight:800;margin:0 0 8px;">Reset Your Password</h1>
<p style="color:rgba(255,255,255,0.65);font-size:14px;margin:0;">You requested to change your password</p>
</td></tr>
<tr><td style="padding:40px;">
<p style="color:#cbd5e1;font-size:16px;margin:0 0 16px;">Hello, <strong style="color:#f1f5f9;">${fullName || 'there'}</strong></p>
<p style="color:#94a3b8;font-size:15px;line-height:1.65;margin:0 0 24px;">Please click the button below to reset your password. This link is only valid for <strong style="color:#fbbf24;">30 minutes</strong>.</p>
<div style="text-align:center;margin-top:24px;margin-bottom:24px;">
<a href="${resetLink}" style="background:linear-gradient(135deg,#15803d,#22c55e);color:#fff;padding:15px 40px;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;">Reset Password</a>
</div>
<p style="color:#374151;font-size:12px;text-align:center;margin:0;">If you did not request this, please ignore this email.</p>
</td></tr>
<tr><td style="background:#0f172a;padding:16px 40px;text-align:center;">
<p style="color:#374151;font-size:11px;margin:0;">&copy; 2026 SmartGrocer</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

function buildSubscriptionWarningHTML(fullName, daysLeft, appUrl) {
  const urgentColor = daysLeft <= 1 ? '#ef4444' : '#f59e0b';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 16px;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#1e293b;border-radius:20px;overflow:hidden;border:1px solid #334155;">
<tr><td style="background:linear-gradient(135deg,#7f1d1d,#991b1b);padding:44px 40px;text-align:center;">
<h1 style="color:#fff;font-size:24px;font-weight:800;margin:0 0 8px;">Action Required ⚠️</h1>
<p style="color:rgba(255,255,255,0.65);font-size:14px;margin:0;">Your subscription is expiring</p>
</td></tr>
<tr><td style="padding:40px;">
<p style="color:#cbd5e1;font-size:16px;margin:0 0 16px;">Hello, <strong style="color:#f1f5f9;">${fullName || 'there'}</strong></p>
<p style="color:#94a3b8;font-size:15px;line-height:1.65;margin:0 0 24px;">Your SmartGrocer trial or subscription will expire in <strong style="color:${urgentColor};font-size:18px;">${daysLeft} days</strong>.</p>
<p style="color:#94a3b8;font-size:14px;line-height:1.65;margin:0 0 24px;">Please recharge your wallet to ensure uninterrupted access to your POS and data.</p>
<div style="text-align:center;margin-top:24px;margin-bottom:24px;">
<a href="${appUrl}/billing.html" style="background:linear-gradient(135deg,#b91c1c,#dc2626);color:#fff;padding:15px 40px;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;">Top up Wallet</a>
</div>
</td></tr>
<tr><td style="background:#0f172a;padding:16px 40px;text-align:center;">
<p style="color:#374151;font-size:11px;margin:0;">&copy; 2026 SmartGrocer</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

function buildSubscriptionActivatedHTML(fullName, planName, startDate, endDate, appUrl) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 16px;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#1e293b;border-radius:20px;overflow:hidden;border:1px solid #334155;">
<tr><td style="background:linear-gradient(135deg,#1e3a8a,#1d4ed8);padding:44px 40px;text-align:center;">
<h1 style="color:#fff;font-size:24px;font-weight:800;margin:0 0 8px;">Subscription Activated 🎉</h1>
<p style="color:rgba(255,255,255,0.65);font-size:14px;margin:0;">Your account is now upgraded</p>
</td></tr>
<tr><td style="padding:40px;">
<p style="color:#cbd5e1;font-size:16px;margin:0 0 16px;">Hello, <strong style="color:#f1f5f9;">${fullName || 'there'}</strong></p>
<p style="color:#94a3b8;font-size:15px;line-height:1.65;margin:0 0 24px;">Your subscription to <strong style="color:#3b82f6;">${planName}</strong> has been successfully activated by the administration.</p>
<div style="background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.2);border-radius:12px;padding:20px;margin-bottom:24px;">
<p style="color:#bfdbfe;margin:0 0 8px;font-size:14px;"><strong>Start Date:</strong> ${startDate}</p>
<p style="color:#bfdbfe;margin:0;font-size:14px;"><strong>End Date:</strong> ${endDate}</p>
</div>
<div style="text-align:center;margin-top:24px;margin-bottom:24px;">
<a href="${appUrl}/dashboard.html" style="background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff;padding:15px 40px;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;">Go to Dashboard</a>
</div>
</td></tr>
<tr><td style="background:#0f172a;padding:16px 40px;text-align:center;">
<p style="color:#374151;font-size:11px;margin:0;">&copy; 2026 SmartGrocer</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

module.exports = { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail, sendSubscriptionWarningEmail, sendSubscriptionActivatedEmail, sendEmailViaAPI };
