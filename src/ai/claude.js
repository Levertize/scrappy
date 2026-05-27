/**
 * AI Web Scraper — Claude API Client
 * Handles communication with Anthropic's Claude API
 */

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

/**
 * Send a message to Claude API
 * @param {string} systemPrompt - System instructions
 * @param {string} userMessage - User message content
 * @param {Object} options
 * @param {number} options.maxTokens - Max tokens in response (default: 4096)
 * @param {number} options.temperature - Temperature (default: 0.3)
 * @returns {Object} { content, usage }
 */
async function sendMessage(systemPrompt, userMessage, options = {}) {
  const {
    maxTokens = 4096,
    temperature = 0.3,
  } = options;

  const apiKey = process.env.CLAUDE_API_KEY;

  if (!apiKey || apiKey === 'sk-ant-your-api-key-here') {
    throw new Error('Claude API key not configured. Set CLAUDE_API_KEY in .env file.');
  }

  const requestBody = {
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userMessage },
    ],
  };

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg = errorData.error?.message || `Claude API error: ${response.status}`;
    throw new Error(errorMsg);
  }

  const data = await response.json();

  return {
    content: data.content[0]?.text || '',
    usage: data.usage || {},
  };
}

/**
 * Send a multi-turn conversation to Claude API
 * @param {string} systemPrompt - System instructions
 * @param {Array} messages - Array of { role, content } messages
 * @param {Object} options
 * @returns {Object} { content, usage }
 */
async function sendConversation(systemPrompt, messages, options = {}) {
  const {
    maxTokens = 4096,
    temperature = 0.3,
  } = options;

  const apiKey = process.env.CLAUDE_API_KEY;

  if (!apiKey || apiKey === 'sk-ant-your-api-key-here') {
    throw new Error('Claude API key not configured. Set CLAUDE_API_KEY in .env file.');
  }

  const requestBody = {
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages,
  };

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg = errorData.error?.message || `Claude API error: ${response.status}`;
    throw new Error(errorMsg);
  }

  const data = await response.json();

  return {
    content: data.content[0]?.text || '',
    usage: data.usage || {},
  };
}

module.exports = { sendMessage, sendConversation };
