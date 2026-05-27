/**
 * AI Web Scraper — Notification Service
 * Handles in-app notifications and email alerts via SMTP
 */

const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../storage/db');

// Lazy-init SMTP transporter
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass || user === 'your-email@gmail.com') {
    return null; // SMTP not configured
  }

  transporter = nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: { user, pass },
  });

  console.log('📧 SMTP transporter configured');
  return transporter;
}

/**
 * Create an in-app notification
 * @param {string} userId
 * @param {string} type - 'change_detected', 'scrape_complete', 'scrape_failed', 'system'
 * @param {string} title
 * @param {string} message
 * @param {Object} meta - Extra metadata (scheduleId, url, etc.)
 */
function createNotification(userId, type, title, message, meta = {}) {
  const id = uuidv4();
  db.prepare(
    'INSERT INTO notifications (id, user_id, type, title, message, meta) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, userId, type, title, message, JSON.stringify(meta));

  console.log(`🔔 Notification: [${type}] ${title}`);
  return id;
}

/**
 * Send an email alert
 * @param {string} toEmail
 * @param {string} subject
 * @param {string} htmlBody
 */
async function sendEmailAlert(toEmail, subject, htmlBody) {
  const smtp = getTransporter();
  if (!smtp) {
    console.warn('⚠️ Email skipped: SMTP not configured');
    return false;
  }

  try {
    await smtp.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: toEmail,
      subject: `[AI Web Scraper] ${subject}`,
      html: wrapEmailTemplate(subject, htmlBody),
    });
    console.log(`📧 Email sent to ${toEmail}: ${subject}`);
    return true;
  } catch (err) {
    console.error(`❌ Email failed: ${err.message}`);
    return false;
  }
}

/**
 * Send change detection alert (in-app + email)
 */
async function sendChangeAlert(userId, schedule, changeSummary) {
  // In-app notification
  createNotification(userId, 'change_detected', 
    `Perubahan terdeteksi: ${schedule.job_name}`,
    changeSummary,
    { scheduleId: schedule.id, url: schedule.url }
  );

  // Email alert (if enabled)
  if (schedule.alert_email) {
    const user = db.prepare('SELECT email FROM users WHERE id = ?').get(userId);
    if (user) {
      await sendEmailAlert(user.email,
        `Perubahan Terdeteksi — ${schedule.job_name}`,
        `
        <h2>🔔 Perubahan Terdeteksi</h2>
        <p><strong>URL:</strong> <a href="${schedule.url}">${schedule.url}</a></p>
        <p><strong>Jadwal:</strong> ${schedule.job_name} (${schedule.interval_label})</p>
        <hr>
        <h3>Ringkasan Perubahan</h3>
        <p>${changeSummary}</p>
        <hr>
        <p style="color:#666;font-size:12px;">
          Buka dashboard untuk melihat detail: <a href="http://localhost:3000">Dashboard</a>
        </p>
        `
      );
    }
  }
}

/**
 * Wrap HTML content in a styled email template
 */
function wrapEmailTemplate(title, content) {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;margin:0;padding:20px;">
      <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.08);overflow:hidden;">
        <div style="background:linear-gradient(135deg,#6366f1,#4338ca);padding:24px 32px;">
          <h1 style="color:white;margin:0;font-size:18px;">🤖 AI Web Scraper</h1>
        </div>
        <div style="padding:24px 32px;">
          ${content}
        </div>
        <div style="border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;color:#94a3b8;font-size:12px;">
          © 2026 AI Web Scraper — Automated notification
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Get unread notification count
 */
function getUnreadCount(userId) {
  const row = db.prepare(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0'
  ).get(userId);
  return row.count;
}

module.exports = { createNotification, sendEmailAlert, sendChangeAlert, getUnreadCount };
