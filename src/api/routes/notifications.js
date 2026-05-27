/**
 * AI Web Scraper — Notification API Routes
 * GET    /api/notifications             — List notifications
 * GET    /api/notifications/unread-count — Get unread count
 * PUT    /api/notifications/:id/read    — Mark one as read
 * PUT    /api/notifications/read-all    — Mark all as read
 */

const express = require('express');
const { db } = require('../../storage/db');
const { authenticate } = require('../middleware/auth');
const { getUnreadCount } = require('../../notifications/notifier');

const router = express.Router();
router.use(authenticate);

/**
 * GET /api/notifications
 * List notifications (paginated)
 */
router.get('/', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = parseInt(req.query.offset) || 0;

    const notifications = db.prepare(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(req.user.id, limit, offset);

    const total = db.prepare(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ?'
    ).get(req.user.id);

    res.json({
      notifications,
      total: total.count,
      unreadCount: getUnreadCount(req.user.id),
    });
  } catch (err) {
    console.error('List notifications error:', err);
    res.status(500).json({ error: { message: 'Failed to list notifications.' } });
  }
});

/**
 * GET /api/notifications/unread-count
 * Get unread notification count (for badge)
 */
router.get('/unread-count', (req, res) => {
  try {
    res.json({ count: getUnreadCount(req.user.id) });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to get count.' } });
  }
});

/**
 * PUT /api/notifications/read-all
 * Mark all as read
 */
router.put('/read-all', (req, res) => {
  try {
    db.prepare(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0'
    ).run(req.user.id);
    res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to mark as read.' } });
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark one notification as read
 */
router.put('/:id/read', (req, res) => {
  try {
    const result = db.prepare(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?'
    ).run(req.params.id, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: { message: 'Notification not found.' } });
    }

    res.json({ message: 'Notification marked as read.' });
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to mark as read.' } });
  }
});

module.exports = router;
