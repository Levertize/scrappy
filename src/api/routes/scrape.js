/**
 * AI Web Scraper — Scrape API Routes
 * POST /api/scrape       — Start a new scrape job
 * GET  /api/scrape       — List user's scrape jobs
 * GET  /api/scrape/:id   — Get scrape job details + results
 * DELETE /api/scrape/:id — Delete a scrape job
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../../storage/db');
const { authenticate } = require('../middleware/auth');
const { scrapeLimiter } = require('../middleware/rateLimit');
const { scrapeUrl, isValidUrl } = require('../../scraper/playwright');
const { parseHtml, trimForAI } = require('../../scraper/parser');

const router = express.Router();

// All scrape routes require authentication
router.use(authenticate);

/**
 * POST /api/scrape
 * Start a new scrape job
 * Body: { url: string, name?: string }
 */
router.post('/', scrapeLimiter, async (req, res) => {
  try {
    const { url, name } = req.body;

    if (!url) {
      return res.status(400).json({
        error: { message: 'URL is required.' },
      });
    }

    // Validate URL
    if (!isValidUrl(url)) {
      return res.status(400).json({
        error: { message: 'Invalid or blocked URL. Only public http/https URLs are allowed.' },
      });
    }

    // Create job record
    const jobId = uuidv4();
    const jobName = name || new URL(url).hostname;

    db.prepare(
      'INSERT INTO scrape_jobs (id, user_id, name, url, status) VALUES (?, ?, ?, ?, ?)'
    ).run(jobId, req.user.id, jobName, url, 'running');

    // Return immediately with job ID
    res.status(202).json({
      message: 'Scraping started.',
      job: {
        id: jobId,
        name: jobName,
        url,
        status: 'running',
      },
    });

    // Run scraping in background (non-blocking)
    runScrapeJob(jobId, url, req.user.id).catch(err => {
      console.error(`Scrape job ${jobId} failed:`, err.message);
    });

  } catch (err) {
    console.error('Scrape API error:', err);
    res.status(500).json({
      error: { message: 'Failed to start scrape job.' },
    });
  }
});

/**
 * Run the scraping pipeline in background
 */
async function runScrapeJob(jobId, url, userId) {
  try {
    // Step 1: Scrape the page with Playwright
    console.log(`🔄 Scraping: ${url}`);
    const { html, title } = await scrapeUrl(url);

    // Step 2: Parse HTML with Cheerio
    const parsed = parseHtml(html, url);

    // Step 3: Save results to database
    const resultId = uuidv4();
    const extractedText = trimForAI(parsed.textContent);

    db.prepare(
      'INSERT INTO scrape_results (id, job_id, data, raw_html, extracted_text) VALUES (?, ?, ?, ?, ?)'
    ).run(
      resultId,
      jobId,
      JSON.stringify({
        title: title || parsed.metadata.title,
        metadata: parsed.metadata,
        tables: parsed.tables,
        links: parsed.links.slice(0, 20),
        images: parsed.images.slice(0, 10),
        wordCount: parsed.wordCount,
      }),
      html,
      extractedText,
    );

    // Update job status to success
    db.prepare(
      'UPDATE scrape_jobs SET status = ?, items_count = ?, name = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).run('success', parsed.tables.length > 0 ? parsed.tables[0].rows.length : parsed.wordCount, title || new URL(url).hostname, jobId);

    // Increment user's scrape count
    db.prepare(
      'UPDATE users SET scrape_count = scrape_count + 1 WHERE id = ?'
    ).run(userId);

    console.log(`✅ Scrape complete: ${url} (${parsed.wordCount} words)`);

  } catch (err) {
    // Update job status to failed
    db.prepare(
      'UPDATE scrape_jobs SET status = ?, error_message = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).run('failed', err.message, jobId);

    console.error(`❌ Scrape job ${jobId} failed:`, err.message);
  }
}

/**
 * GET /api/scrape
 * List all scrape jobs for the authenticated user
 */
router.get('/', (req, res) => {
  try {
    const jobs = db.prepare(
      'SELECT id, name, url, status, items_count, error_message, created_at, updated_at FROM scrape_jobs WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
    ).all(req.user.id);

    res.json({ jobs });
  } catch (err) {
    console.error('List scrapes error:', err);
    res.status(500).json({
      error: { message: 'Failed to list scrape jobs.' },
    });
  }
});

/**
 * GET /api/scrape/:id
 * Get a specific scrape job with its results
 */
router.get('/:id', (req, res) => {
  try {
    const job = db.prepare(
      'SELECT * FROM scrape_jobs WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id);

    if (!job) {
      return res.status(404).json({
        error: { message: 'Scrape job not found.' },
      });
    }

    // Get results
    const results = db.prepare(
      'SELECT id, data, extracted_text, created_at FROM scrape_results WHERE job_id = ?'
    ).all(req.params.id);

    // Parse JSON data
    const parsedResults = results.map(r => ({
      ...r,
      data: r.data ? JSON.parse(r.data) : null,
    }));

    res.json({
      job,
      results: parsedResults,
    });
  } catch (err) {
    console.error('Get scrape error:', err);
    res.status(500).json({
      error: { message: 'Failed to get scrape job.' },
    });
  }
});

/**
 * DELETE /api/scrape/:id
 * Delete a scrape job and its results
 */
router.delete('/:id', (req, res) => {
  try {
    const job = db.prepare(
      'SELECT id FROM scrape_jobs WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id);

    if (!job) {
      return res.status(404).json({
        error: { message: 'Scrape job not found.' },
      });
    }

    // Delete results first (cascade should handle, but be explicit)
    db.prepare('DELETE FROM scrape_results WHERE job_id = ?').run(req.params.id);
    db.prepare('DELETE FROM scrape_jobs WHERE id = ?').run(req.params.id);

    res.json({ message: 'Scrape job deleted.' });
  } catch (err) {
    console.error('Delete scrape error:', err);
    res.status(500).json({
      error: { message: 'Failed to delete scrape job.' },
    });
  }
});

module.exports = router;
