/**
 * AI Web Scraper — Chat Context Management
 * RAG-based approach: inject scraped data as context for Gemini
 */

const { sendConversation } = require('./gemini');
const { db } = require('../storage/db');

/**
 * System prompt for data chat
 */
const CHAT_SYSTEM_PROMPT = `You are an AI data analyst assistant for a web scraping platform. Users will ask you questions about data they've scraped from websites.

Rules:
1. ONLY answer based on the provided scraped data context. Do NOT make up or hallucinate data.
2. If the data doesn't contain the answer, say so clearly: "Data yang tersedia tidak mencakup informasi tersebut."
3. Format responses clearly. Use markdown for tables, lists, and emphasis when helpful.
4. When comparing data, be precise with numbers and sources.
5. Respond in the same language as the user's question (usually Indonesian).
6. Keep responses concise but informative.
7. If asked to sort, filter, or calculate, do so accurately based on the data.`;

/**
 * Process a chat message with data context
 * @param {string} userId - User ID
 * @param {string} message - User's message
 * @param {string|null} jobId - Specific scrape job to use as context (null = use all recent)
 * @returns {Object} { response, usage }
 */
async function processChat(userId, message, jobId = null) {
  // Build data context from scrape results
  const dataContext = buildDataContext(userId, jobId);

  // Get chat history (last 10 messages for context window)
  const history = getChatHistory(userId, jobId, 10);

  // Build messages array
  const systemPrompt = CHAT_SYSTEM_PROMPT + '\n\n--- SCRAPED DATA CONTEXT ---\n' + dataContext + '\n--- END DATA CONTEXT ---';

  const messages = [
    ...history.map(msg => ({
      role: msg.role,
      content: msg.content,
    })),
    { role: 'user', content: message },
  ];

  // Send to Gemini
  const { content, usage } = await sendConversation(
    systemPrompt,
    messages,
    { maxTokens: 2048, temperature: 0.3 }
  );

  // Save both messages to DB
  const { v4: uuidv4 } = require('uuid');

  db.prepare(
    'INSERT INTO chat_messages (id, user_id, job_id, role, content) VALUES (?, ?, ?, ?, ?)'
  ).run(uuidv4(), userId, jobId, 'user', message);

  db.prepare(
    'INSERT INTO chat_messages (id, user_id, job_id, role, content) VALUES (?, ?, ?, ?, ?)'
  ).run(uuidv4(), userId, jobId, 'assistant', content);

  return { response: content, usage };
}

/**
 * Build data context string from user's scraped data
 */
function buildDataContext(userId, jobId) {
  let results;

  if (jobId) {
    // Get data for specific job
    results = db.prepare(`
      SELECT sr.data, sr.extracted_text, sj.name, sj.url 
      FROM scrape_results sr 
      JOIN scrape_jobs sj ON sr.job_id = sj.id 
      WHERE sj.id = ? AND sj.user_id = ?
    `).all(jobId, userId);
  } else {
    // Get data from all recent jobs (last 5)
    results = db.prepare(`
      SELECT sr.data, sr.extracted_text, sj.name, sj.url 
      FROM scrape_results sr 
      JOIN scrape_jobs sj ON sr.job_id = sj.id 
      WHERE sj.user_id = ? AND sj.status = 'success'
      ORDER BY sj.created_at DESC 
      LIMIT 5
    `).all(userId);
  }

  if (results.length === 0) {
    return 'No scraped data available. The user has not scraped any websites yet.';
  }

  let context = '';
  for (const result of results) {
    context += `\n\n📄 Source: ${result.name} (${result.url})\n`;

    // Include AI extracted data if available
    if (result.data) {
      try {
        const data = JSON.parse(result.data);
        if (data.aiExtracted?.items) {
          context += `AI Extracted Data (${data.aiExtracted.items.length} items):\n`;
          context += JSON.stringify(data.aiExtracted.items, null, 2).substring(0, 5000);
        } else if (data.tables?.length > 0) {
          context += `Table Data:\n`;
          context += JSON.stringify(data.tables, null, 2).substring(0, 3000);
        }
      } catch {
        // Fallback to extracted text
      }
    }

    // Always include some text content
    if (result.extracted_text) {
      context += `\nPage Content:\n${result.extracted_text.substring(0, 3000)}`;
    }
  }

  // Limit total context size
  return context.substring(0, 12000);
}

/**
 * Get chat history for a user/job
 */
function getChatHistory(userId, jobId, limit = 10) {
  if (jobId) {
    return db.prepare(
      'SELECT role, content FROM chat_messages WHERE user_id = ? AND job_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(userId, jobId, limit).reverse();
  }

  return db.prepare(
    'SELECT role, content FROM chat_messages WHERE user_id = ? AND job_id IS NULL ORDER BY created_at DESC LIMIT ?'
  ).all(userId, limit).reverse();
}

/**
 * Clear chat history
 */
function clearChatHistory(userId, jobId = null) {
  if (jobId) {
    db.prepare('DELETE FROM chat_messages WHERE user_id = ? AND job_id = ?').run(userId, jobId);
  } else {
    db.prepare('DELETE FROM chat_messages WHERE user_id = ?').run(userId);
  }
}

module.exports = { processChat, clearChatHistory };
