/**
 * AI Web Scraper — Database Connection & Schema
 * Uses better-sqlite3 for synchronous SQLite operations
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const DB_PATH = process.env.DATABASE_PATH || './data/scraper.db';
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * Initialize database tables
 */
function initDatabase() {
  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      plan TEXT DEFAULT 'free',
      scrape_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Scrape jobs table
    CREATE TABLE IF NOT EXISTS scrape_jobs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      items_count INTEGER DEFAULT 0,
      error_message TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Scrape results table (stores extracted data)
    CREATE TABLE IF NOT EXISTS scrape_results (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      data TEXT,
      raw_html TEXT,
      extracted_text TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (job_id) REFERENCES scrape_jobs(id) ON DELETE CASCADE
    );

    -- Chat messages table
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      job_id TEXT,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (job_id) REFERENCES scrape_jobs(id) ON DELETE SET NULL
    );

    -- Monitoring schedules table (Phase 2)
    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      job_name TEXT NOT NULL,
      url TEXT NOT NULL,
      cron_expression TEXT NOT NULL,
      interval_label TEXT NOT NULL,
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'stopped')),
      last_run_at TEXT,
      next_run_at TEXT,
      run_count INTEGER DEFAULT 0,
      alert_enabled INTEGER DEFAULT 1,
      alert_email INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Content snapshots for diff comparison (Phase 2)
    CREATE TABLE IF NOT EXISTS snapshots (
      id TEXT PRIMARY KEY,
      schedule_id TEXT NOT NULL,
      version INTEGER DEFAULT 1,
      extracted_text TEXT,
      data TEXT,
      word_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE
    );

    -- Change history with AI summaries (Phase 2)
    CREATE TABLE IF NOT EXISTS change_history (
      id TEXT PRIMARY KEY,
      schedule_id TEXT NOT NULL,
      snapshot_old_id TEXT,
      snapshot_new_id TEXT,
      has_changes INTEGER DEFAULT 0,
      change_summary TEXT,
      change_details TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE
    );

    -- In-app notifications (Phase 2)
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      meta TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_scrape_jobs_user ON scrape_jobs(user_id);
    CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON scrape_jobs(status);
    CREATE INDEX IF NOT EXISTS idx_scrape_results_job ON scrape_results(job_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_job ON chat_messages(job_id);
    CREATE INDEX IF NOT EXISTS idx_schedules_user ON schedules(user_id);
    CREATE INDEX IF NOT EXISTS idx_schedules_status ON schedules(status);
    CREATE INDEX IF NOT EXISTS idx_snapshots_schedule ON snapshots(schedule_id);
    CREATE INDEX IF NOT EXISTS idx_change_history_schedule ON change_history(schedule_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, is_read);
  `);

  console.log('✅ Database initialized successfully');
}

module.exports = { db, initDatabase };
