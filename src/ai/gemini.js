/**
 * AI Web Scraper — Gemini API Client
 * Handles communication with Google's Gemini API
 */

const GEMINI_MODEL = 'gemini-2.5-flash';

/**
 * Build the Gemini API URL with the API key
 */
function getApiUrl() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your-gemini-api-key-here') {
    throw new Error('Gemini API key not configured. Set GEMINI_API_KEY in .env file.');
  }
  return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
}

/**
 * Send a message to Gemini API
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

  const requestBody = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: userMessage }],
      },
    ],
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature,
    },
  };

  const response = await fetch(getApiUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg = errorData.error?.message || `Gemini API error: ${response.status}`;
    throw new Error(errorMsg);
  }

  const data = await response.json();

  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const usage = {
    input_tokens: data.usageMetadata?.promptTokenCount || 0,
    output_tokens: data.usageMetadata?.candidatesTokenCount || 0,
    total_tokens: data.usageMetadata?.totalTokenCount || 0,
  };

  return { content, usage };
}

/**
 * Send a multi-turn conversation to Gemini API
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

  // Convert messages to Gemini format
  // Gemini uses 'user' and 'model' roles (not 'assistant')
  const geminiContents = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  const requestBody = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: geminiContents,
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature,
    },
  };

  const response = await fetch(getApiUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg = errorData.error?.message || `Gemini API error: ${response.status}`;
    throw new Error(errorMsg);
  }

  const data = await response.json();

  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const usage = {
    input_tokens: data.usageMetadata?.promptTokenCount || 0,
    output_tokens: data.usageMetadata?.candidatesTokenCount || 0,
    total_tokens: data.usageMetadata?.totalTokenCount || 0,
  };

  return { content, usage };
}

module.exports = { sendMessage, sendConversation };
