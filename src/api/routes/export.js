/**
 * AI Web Scraper — Export API Routes
 * GET /api/export/:jobId — Download scraped data as JSON or CSV
 */

const express = require('express');
const { db } = require('../../storage/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

/**
 * GET /api/export/:jobId?format=json|csv
 * Export scraped data
 */
router.get('/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;
    const format = (req.query.format || 'json').toLowerCase();

    // Verify job belongs to user
    const job = db.prepare(
      'SELECT id, name, url FROM scrape_jobs WHERE id = ? AND user_id = ?'
    ).get(jobId, req.user.id);

    if (!job) {
      return res.status(404).json({
        error: { message: 'Scrape job not found.' },
      });
    }

    // Get results
    const results = db.prepare(
      'SELECT data, extracted_text, created_at FROM scrape_results WHERE job_id = ?'
    ).all(jobId);

    if (results.length === 0) {
      return res.status(404).json({
        error: { message: 'No data found for this scrape job.' },
      });
    }

    // Parse all data
    const allData = results.map(r => r.data ? JSON.parse(r.data) : {});

    // Get items from AI extraction or fallback
    let exportItems = [];
    for (const data of allData) {
      if (data.aiExtracted?.items?.length > 0) {
        exportItems.push(...data.aiExtracted.items);
      } else if (data.tables?.length > 0) {
        // Convert tables to flat items
        for (const table of data.tables) {
          for (const row of table.rows) {
            const item = {};
            table.headers.forEach((h, i) => {
              item[h || `column_${i}`] = row[i] || '';
            });
            exportItems.push(item);
          }
        }
      } else {
        exportItems.push({
          title: data.title || '',
          content: data.metadata?.description || '',
          wordCount: data.wordCount || 0,
          url: job.url,
        });
      }
    }

    const safeName = job.name.replace(/[^a-zA-Z0-9_-]/g, '_');

    if (format === 'csv') {
      // Export as CSV
      const csv = convertToCSV(exportItems);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}.csv"`);
      res.send('\ufeff' + csv); // BOM for Excel UTF-8 support
    } else {
      // Export as JSON
      const exportData = {
        job: {
          id: job.id,
          name: job.name,
          url: job.url,
          exportedAt: new Date().toISOString(),
        },
        totalItems: exportItems.length,
        items: exportItems,
      };
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}.json"`);
      res.send(JSON.stringify(exportData, null, 2));
    }
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({
      error: { message: 'Failed to export data.' },
    });
  }
});

/**
 * Convert array of objects to CSV string
 */
function convertToCSV(items) {
  if (items.length === 0) return '';

  // Collect all unique keys across all items
  const keys = [...new Set(items.flatMap(item => Object.keys(item)))];

  // Header row
  const header = keys.map(k => escapeCSV(k)).join(',');

  // Data rows
  const rows = items.map(item => {
    return keys.map(k => {
      let val = item[k];
      if (val === null || val === undefined) val = '';
      if (typeof val === 'object') val = JSON.stringify(val);
      return escapeCSV(String(val));
    }).join(',');
  });

  return [header, ...rows].join('\n');
}

/**
 * Escape a CSV field value
 */
function escapeCSV(value) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

module.exports = router;
