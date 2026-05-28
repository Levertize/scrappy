/**
 * AI Web Scraper — Chat API Routes
 * POST /api/chat          — Send message, get AI response
 * GET  /api/chat/history  — Get chat history
 * DELETE /api/chat/history — Clear chat history
 */

const express = require('express');
const { db } = require('../../storage/db');
const { authenticate } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimit');
const { processChat, clearChatHistory } = require('../../ai/chat');

const router = express.Router();
router.use(authenticate);
router.use(apiLimiter);

/**
 * POST /api/chat
 * Send a chat message and get AI response
 * Body: { message: string, jobId?: string }
 */
router.post('/', async (req, res) => {
  try {
    const { message, jobId } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        error: { message: 'Message is required.' },
      });
    }

    const { response, usage } = await processChat(
      req.user.id,
      message.trim(),
      jobId || null,
    );

    res.json({
      message: response,
      usage,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Chat error:', err);

    // Friendly error for API key issues
    if (err.message.includes('API key') || err.message.includes('API_KEY')) {
      return res.status(503).json({
        error: { message: 'AI service not configured. Please set your Gemini API key.' },
      });
    }

    // Friendly error for rate limits / quota issues
    const errMsg = err.message.toLowerCase();
    if (errMsg.includes('quota') || errMsg.includes('limit') || errMsg.includes('rate')) {
      return res.status(429).json({
        error: { message: 'Batas kuota Gemini API terlampaui (rate limit). Silakan tunggu sebentar dan coba lagi.' },
      });
    }

    res.status(500).json({
      error: { message: 'Failed to process chat message.' },
    });
  }
});

/**
 * GET /api/chat/active-jobs
 * Get list of job IDs that have active chat history
 */
router.get('/active-jobs', (req, res) => {
  try {
    const rows = db.prepare(
      'SELECT DISTINCT job_id FROM chat_messages WHERE user_id = ? AND job_id IS NOT NULL'
    ).all(req.user.id);
    const activeJobIds = rows.map(r => r.job_id);
    res.json({ activeJobIds });
  } catch (err) {
    console.error('Active jobs error:', err);
    res.status(500).json({
      error: { message: 'Failed to get active chat jobs.' },
    });
  }
});

/**
 * GET /api/chat/history?jobId=xxx
 * Get chat history
 */
router.get('/history', (req, res) => {
  try {
    const { jobId } = req.query;

    let messages;
    if (jobId) {
      messages = db.prepare(
        'SELECT id, role, content, created_at FROM chat_messages WHERE user_id = ? AND job_id = ? ORDER BY created_at ASC'
      ).all(req.user.id, jobId);
    } else {
      messages = db.prepare(
        'SELECT id, role, content, created_at FROM chat_messages WHERE user_id = ? AND job_id IS NULL ORDER BY created_at ASC LIMIT 100'
      ).all(req.user.id);
    }

    res.json({ messages });
  } catch (err) {
    console.error('Chat history error:', err);
    res.status(500).json({
      error: { message: 'Failed to get chat history.' },
    });
  }
});

/**
 * DELETE /api/chat/history
 * Clear chat history
 */
router.delete('/history', (req, res) => {
  try {
    const { jobId } = req.query;
    clearChatHistory(req.user.id, jobId || null);
    res.json({ message: 'Chat history cleared.' });
  } catch (err) {
    console.error('Clear chat error:', err);
    res.status(500).json({
      error: { message: 'Failed to clear chat history.' },
    });
  }
});

module.exports = router;
