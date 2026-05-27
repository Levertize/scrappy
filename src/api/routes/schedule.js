/**
 * AI Web Scraper — Schedule API Routes
 * POST   /api/schedule         — Create new monitoring schedule
 * GET    /api/schedule         — List user's schedules
 * GET    /api/schedule/intervals — Get available intervals
 * PUT    /api/schedule/:id     — Update schedule (pause/resume)
 * DELETE /api/schedule/:id     — Delete schedule
 * GET    /api/schedule/:id/history — Get change history
 */

const express = require('express');
const { db } = require('../../storage/db');
const { authenticate } = require('../middleware/auth');
const { createSchedule, pauseSchedule, resumeSchedule, deleteSchedule, getIntervals } = require('../../scheduler/scheduler');

const router = express.Router();
router.use(authenticate);

/**
 * POST /api/schedule
 * Create a new monitoring schedule
 */
router.post('/', async (req, res) => {
  try {
    const { url, name, interval } = req.body;

    if (!url) {
      return res.status(400).json({ error: { message: 'URL is required.' } });
    }
    if (!interval) {
      return res.status(400).json({ error: { message: 'Interval is required.' } });
    }

    const schedule = createSchedule(req.user.id, url, name, interval);

    res.status(201).json({
      message: 'Monitoring schedule created.',
      schedule,
    });
  } catch (err) {
    console.error('Create schedule error:', err);
    res.status(400).json({ error: { message: err.message } });
  }
});

/**
 * GET /api/schedule
 * List all schedules for the user
 */
router.get('/', (req, res) => {
  try {
    const schedules = db.prepare(
      "SELECT * FROM schedules WHERE user_id = ? AND status != 'stopped' ORDER BY created_at DESC"
    ).all(req.user.id);

    // Get latest change for each schedule
    const enriched = schedules.map(s => {
      const latestChange = db.prepare(
        'SELECT has_changes, change_summary, created_at FROM change_history WHERE schedule_id = ? ORDER BY created_at DESC LIMIT 1'
      ).get(s.id);

      const snapshotCount = db.prepare(
        'SELECT COUNT(*) as count FROM snapshots WHERE schedule_id = ?'
      ).get(s.id);

      return {
        ...s,
        latestChange: latestChange || null,
        snapshotCount: snapshotCount.count,
      };
    });

    res.json({ schedules: enriched });
  } catch (err) {
    console.error('List schedules error:', err);
    res.status(500).json({ error: { message: 'Failed to list schedules.' } });
  }
});

/**
 * GET /api/schedule/intervals
 * Get available monitoring intervals
 */
router.get('/intervals', (req, res) => {
  res.json({ intervals: getIntervals() });
});

/**
 * PUT /api/schedule/:id
 * Update schedule (pause/resume/update settings)
 */
router.put('/:id', (req, res) => {
  try {
    const schedule = db.prepare(
      'SELECT * FROM schedules WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id);

    if (!schedule) {
      return res.status(404).json({ error: { message: 'Schedule not found.' } });
    }

    const { action, alert_enabled, alert_email } = req.body;

    if (action === 'pause') {
      pauseSchedule(schedule.id);
      return res.json({ message: 'Schedule paused.', status: 'paused' });
    }

    if (action === 'resume') {
      resumeSchedule(schedule.id);
      return res.json({ message: 'Schedule resumed.', status: 'active' });
    }

    // Update alert settings
    if (alert_enabled !== undefined || alert_email !== undefined) {
      if (alert_enabled !== undefined) {
        db.prepare('UPDATE schedules SET alert_enabled = ? WHERE id = ?').run(alert_enabled ? 1 : 0, schedule.id);
      }
      if (alert_email !== undefined) {
        db.prepare('UPDATE schedules SET alert_email = ? WHERE id = ?').run(alert_email ? 1 : 0, schedule.id);
      }
      return res.json({ message: 'Settings updated.' });
    }

    res.status(400).json({ error: { message: 'Provide action (pause/resume) or settings to update.' } });
  } catch (err) {
    console.error('Update schedule error:', err);
    res.status(500).json({ error: { message: 'Failed to update schedule.' } });
  }
});

/**
 * DELETE /api/schedule/:id
 */
router.delete('/:id', (req, res) => {
  try {
    const schedule = db.prepare(
      'SELECT id FROM schedules WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id);

    if (!schedule) {
      return res.status(404).json({ error: { message: 'Schedule not found.' } });
    }

    deleteSchedule(req.params.id);
    res.json({ message: 'Schedule deleted.' });
  } catch (err) {
    console.error('Delete schedule error:', err);
    res.status(500).json({ error: { message: 'Failed to delete schedule.' } });
  }
});

/**
 * GET /api/schedule/:id/history
 * Get change history for a schedule
 */
router.get('/:id/history', (req, res) => {
  try {
    const schedule = db.prepare(
      'SELECT id FROM schedules WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id);

    if (!schedule) {
      return res.status(404).json({ error: { message: 'Schedule not found.' } });
    }

    const history = db.prepare(
      'SELECT id, has_changes, change_summary, change_details, created_at FROM change_history WHERE schedule_id = ? ORDER BY created_at DESC LIMIT 50'
    ).all(req.params.id);

    res.json({ history });
  } catch (err) {
    console.error('Get history error:', err);
    res.status(500).json({ error: { message: 'Failed to get change history.' } });
  }
});

module.exports = router;
