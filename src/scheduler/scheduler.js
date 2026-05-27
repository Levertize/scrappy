/**
 * AI Web Scraper — Scheduler Engine
 * Cron-based monitoring scheduler using node-cron
 */

const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../storage/db');
const { scrapeUrl, isValidUrl } = require('../scraper/playwright');
const { parseHtml, trimForAI } = require('../scraper/parser');
const { compareSnapshots } = require('../ai/differ');
const { createNotification, sendChangeAlert } = require('../notifications/notifier');

// Active cron tasks: Map<scheduleId, cronTask>
const activeTasks = new Map();

// Supported intervals
const INTERVALS = {
  '30min':  { cron: '*/30 * * * *',  label: 'Setiap 30 menit' },
  '1h':    { cron: '0 * * * *',      label: 'Setiap 1 jam' },
  '6h':    { cron: '0 */6 * * *',    label: 'Setiap 6 jam' },
  '12h':   { cron: '0 */12 * * *',   label: 'Setiap 12 jam' },
  '24h':   { cron: '0 0 * * *',      label: 'Setiap 24 jam' },
};

/**
 * Initialize scheduler — load active schedules from DB and start cron tasks
 */
function initScheduler() {
  const activeSchedules = db.prepare(
    "SELECT * FROM schedules WHERE status = 'active'"
  ).all();

  console.log(`⏰ Loading ${activeSchedules.length} active schedule(s)...`);

  for (const schedule of activeSchedules) {
    startCronTask(schedule);
  }

  console.log(`⏰ Scheduler initialized with ${activeTasks.size} active task(s)`);
}

/**
 * Create a new monitoring schedule
 * @param {string} userId
 * @param {string} url
 * @param {string} jobName
 * @param {string} intervalKey - '30min', '1h', '6h', '12h', '24h'
 * @returns {Object} Created schedule
 */
function createSchedule(userId, url, jobName, intervalKey) {
  const interval = INTERVALS[intervalKey];
  if (!interval) {
    throw new Error(`Invalid interval: ${intervalKey}. Valid: ${Object.keys(INTERVALS).join(', ')}`);
  }

  if (!isValidUrl(url)) {
    throw new Error('Invalid or blocked URL.');
  }

  // Check user limit (max 10 for free plan)
  const count = db.prepare(
    "SELECT COUNT(*) as count FROM schedules WHERE user_id = ? AND status != 'stopped'"
  ).get(userId);
  if (count.count >= 10) {
    throw new Error('Maximum 10 monitored URLs reached. Upgrade your plan for more.');
  }

  const id = uuidv4();
  const schedule = {
    id,
    user_id: userId,
    job_name: jobName || new URL(url).hostname,
    url,
    cron_expression: interval.cron,
    interval_label: interval.label,
    status: 'active',
  };

  db.prepare(
    'INSERT INTO schedules (id, user_id, job_name, url, cron_expression, interval_label, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, userId, schedule.job_name, url, interval.cron, interval.label, 'active');

  // Start cron immediately
  const fullSchedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id);
  startCronTask(fullSchedule);

  // Run first scrape immediately (async, non-blocking)
  runScheduledScrape(fullSchedule).catch(err => {
    console.error(`Initial scrape failed for schedule ${id}:`, err.message);
  });

  console.log(`⏰ Schedule created: ${schedule.job_name} (${interval.label})`);
  return fullSchedule;
}

/**
 * Start a cron task for a schedule
 */
function startCronTask(schedule) {
  // Stop existing task if any
  stopCronTask(schedule.id);

  const task = cron.schedule(schedule.cron_expression, async () => {
    console.log(`⏰ Cron triggered: ${schedule.job_name}`);
    try {
      await runScheduledScrape(schedule);
    } catch (err) {
      console.error(`⏰ Scheduled scrape failed: ${err.message}`);
    }
  });

  activeTasks.set(schedule.id, task);
}

/**
 * Stop a cron task
 */
function stopCronTask(scheduleId) {
  const existing = activeTasks.get(scheduleId);
  if (existing) {
    existing.stop();
    activeTasks.delete(scheduleId);
  }
}

/**
 * Run a scheduled scrape + diff comparison
 */
async function runScheduledScrape(schedule) {
  console.log(`🔄 Scheduled scrape: ${schedule.url}`);

  try {
    // Step 1: Scrape the page
    const { html, title } = await scrapeUrl(schedule.url);
    const parsed = parseHtml(html, schedule.url);
    const extractedText = trimForAI(parsed.textContent);

    // Step 2: Get previous snapshot
    const prevSnapshot = db.prepare(
      'SELECT id, extracted_text, data FROM snapshots WHERE schedule_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(schedule.id);

    // Step 3: Save new snapshot
    const newVersion = prevSnapshot ? (db.prepare(
      'SELECT MAX(version) as v FROM snapshots WHERE schedule_id = ?'
    ).get(schedule.id).v || 0) + 1 : 1;

    const snapshotId = uuidv4();
    const snapshotData = JSON.stringify({
      title: title || parsed.metadata.title,
      metadata: parsed.metadata,
      wordCount: parsed.wordCount,
      tables: parsed.tables,
      links: parsed.links.slice(0, 10),
    });

    db.prepare(
      'INSERT INTO snapshots (id, schedule_id, version, extracted_text, data, word_count) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(snapshotId, schedule.id, newVersion, extractedText, snapshotData, parsed.wordCount);

    // Step 4: Compare with previous snapshot (if exists)
    let diffResult = { hasChanges: false, summary: 'Initial scan — no previous data to compare.', details: [] };

    if (prevSnapshot) {
      diffResult = await compareSnapshots(
        prevSnapshot.extracted_text || '',
        extractedText,
        schedule.job_name
      );

      // Save change history
      const changeId = uuidv4();
      db.prepare(
        'INSERT INTO change_history (id, schedule_id, snapshot_old_id, snapshot_new_id, has_changes, change_summary, change_details) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(changeId, schedule.id, prevSnapshot.id, snapshotId, diffResult.hasChanges ? 1 : 0, diffResult.summary, JSON.stringify(diffResult.details));

      // Send alert if changes detected
      if (diffResult.hasChanges) {
        await sendChangeAlert(schedule.user_id, schedule, diffResult.summary);
      }
    }

    // Step 5: Update schedule metadata
    db.prepare(
      "UPDATE schedules SET last_run_at = datetime('now'), run_count = run_count + 1, updated_at = datetime('now') WHERE id = ?"
    ).run(schedule.id);

    console.log(`✅ Scheduled scrape complete: ${schedule.job_name} (v${newVersion}, changes: ${diffResult.hasChanges})`);

  } catch (err) {
    console.error(`❌ Scheduled scrape failed for ${schedule.job_name}:`, err.message);

    // Notify user of failure
    createNotification(schedule.user_id, 'scrape_failed',
      `Monitoring gagal: ${schedule.job_name}`,
      `Error: ${err.message}`,
      { scheduleId: schedule.id, url: schedule.url }
    );
  }
}

/**
 * Pause a schedule
 */
function pauseSchedule(scheduleId) {
  stopCronTask(scheduleId);
  db.prepare("UPDATE schedules SET status = 'paused', updated_at = datetime('now') WHERE id = ?").run(scheduleId);
}

/**
 * Resume a schedule
 */
function resumeSchedule(scheduleId) {
  db.prepare("UPDATE schedules SET status = 'active', updated_at = datetime('now') WHERE id = ?").run(scheduleId);
  const schedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(scheduleId);
  if (schedule) startCronTask(schedule);
}

/**
 * Delete a schedule
 */
function deleteSchedule(scheduleId) {
  stopCronTask(scheduleId);
  db.prepare('DELETE FROM snapshots WHERE schedule_id = ?').run(scheduleId);
  db.prepare('DELETE FROM change_history WHERE schedule_id = ?').run(scheduleId);
  db.prepare('DELETE FROM schedules WHERE id = ?').run(scheduleId);
}

/**
 * Get available intervals
 */
function getIntervals() {
  return Object.entries(INTERVALS).map(([key, val]) => ({ key, ...val }));
}

module.exports = {
  initScheduler,
  createSchedule,
  pauseSchedule,
  resumeSchedule,
  deleteSchedule,
  getIntervals,
  INTERVALS,
};
