/**
 * AI Web Scraper — AI-Powered Data Extractor
 * Uses Gemini to extract structured data from scraped content
 */

const { sendMessage } = require('../ai/gemini');

/**
 * System prompt for data extraction
 */
const EXTRACTION_SYSTEM_PROMPT = `You are a data extraction AI. Your job is to analyze web page content and extract structured data.

Rules:
1. Return ONLY valid JSON, no markdown, no explanation, no code blocks.
2. Identify and extract data entities (products, articles, listings, etc.)
3. For each entity, extract all available fields: name, price, description, rating, date, author, image URL, link, etc.
4. If the page contains a table or list of items, extract each item as a separate object.
5. If the page is an article, extract: title, author, date, summary, full text.
6. If no structured data is found, extract the main content as text with metadata.
7. Always return an object with "type" (product_listing, article, table_data, general_content) and "items" array.
8. Prices should keep their original format (e.g., "Rp 21.999.000").
9. Ratings should be numeric when possible.`;

/**
 * Extract structured data from scraped content using Gemini AI
 * @param {string} textContent - Cleaned text from the page
 * @param {Object} metadata - Page metadata (title, description, etc.)
 * @param {string} customInstruction - Optional user instruction for custom extraction
 * @returns {Object} Structured extracted data
 */
async function extractData(textContent, metadata = {}, customInstruction = '') {
  const userMessage = buildExtractionPrompt(textContent, metadata, customInstruction);

  try {
    const { content, usage } = await sendMessage(
      EXTRACTION_SYSTEM_PROMPT,
      userMessage,
      { maxTokens: 4096, temperature: 0.1 }
    );

    // Parse JSON response
    let extracted;
    try {
      // Try to extract JSON from the response (handle possible markdown wrapping)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      } else {
        extracted = JSON.parse(content);
      }
    } catch (parseErr) {
      console.warn('⚠️ Failed to parse AI extraction as JSON, using raw text');
      extracted = {
        type: 'general_content',
        items: [{
          title: metadata.title || 'Untitled',
          content: content,
        }],
      };
    }

    console.log(`🧠 AI Extraction: ${extracted.items?.length || 0} items, tokens: ${usage.input_tokens}→${usage.output_tokens}`);

    return {
      extracted,
      usage,
    };
  } catch (err) {
    console.error('❌ AI Extraction failed:', err.message);
    throw err;
  }
}

/**
 * Build the extraction prompt from content + metadata
 */
function buildExtractionPrompt(textContent, metadata, customInstruction) {
  let prompt = `Analyze the following web page content and extract all structured data.\n\n`;

  if (metadata.title) {
    prompt += `Page Title: ${metadata.title}\n`;
  }
  if (metadata.description) {
    prompt += `Description: ${metadata.description}\n`;
  }

  prompt += `\n--- PAGE CONTENT ---\n${textContent}\n--- END CONTENT ---\n`;

  if (customInstruction) {
    prompt += `\nSpecial instruction: ${customInstruction}\n`;
  }

  prompt += `\nExtract all structured data and return as JSON with "type" and "items" fields.`;

  return prompt;
}

module.exports = { extractData };
