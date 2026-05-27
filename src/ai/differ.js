/**
 * AI Web Scraper — AI Diff Engine
 * Compares content snapshots and generates AI-powered change summaries
 */

const { sendMessage } = require('./gemini');

const DIFF_SYSTEM_PROMPT = `You are a change detection AI. Compare two versions of web content and summarize what changed.

Rules:
1. Return a JSON object with this structure:
   { "hasSignificantChanges": true/false, "summary": "...", "details": [ {"type": "added|removed|modified", "description": "..."} ] }
2. IGNORE minor changes: whitespace, timestamps, ad content, session tokens, random IDs.
3. FOCUS on substantive changes: prices, product listings, article content, availability, ratings.
4. Write the summary in Indonesian.
5. Be specific: "Harga iPhone 15 turun dari Rp 21.999.000 menjadi Rp 19.999.000"
6. Return ONLY valid JSON, no markdown code blocks.`;

/**
 * Compare two text snapshots and generate AI summary
 * @param {string} oldText - Previous snapshot text
 * @param {string} newText - New snapshot text
 * @param {string} sourceName - Source name for context
 * @returns {Object} { hasChanges, summary, details[] }
 */
async function compareSnapshots(oldText, newText, sourceName = '') {
  // Quick check — identical content
  if (oldText === newText) {
    return {
      hasChanges: false,
      summary: 'Tidak ada perubahan terdeteksi.',
      details: [],
    };
  }

  // Quick text diff stats
  const oldWords = oldText.split(/\s+/).length;
  const newWords = newText.split(/\s+/).length;
  const wordDiff = Math.abs(newWords - oldWords);
  const wordDiffPercent = oldWords > 0 ? (wordDiff / oldWords * 100).toFixed(1) : 100;

  // If difference is very small (< 2% words changed), likely minor
  if (wordDiffPercent < 2 && wordDiff < 10) {
    return {
      hasChanges: false,
      summary: 'Perubahan minor terdeteksi (whitespace/format), tidak ada perubahan konten signifikan.',
      details: [],
    };
  }

  // Use AI for significant change analysis
  try {
    const userMessage = `Compare these two versions of content from "${sourceName}" and summarize changes.

--- OLD VERSION (${oldWords} words) ---
${oldText.substring(0, 6000)}
--- END OLD ---

--- NEW VERSION (${newWords} words) ---
${newText.substring(0, 6000)}
--- END NEW ---

Word count change: ${oldWords} → ${newWords} (${wordDiffPercent}% difference)
Analyze and return JSON with hasSignificantChanges, summary, and details.`;

    const { content } = await sendMessage(
      DIFF_SYSTEM_PROMPT,
      userMessage,
      { maxTokens: 1024, temperature: 0.1 }
    );

    // Parse AI response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        hasChanges: parsed.hasSignificantChanges === true,
        summary: parsed.summary || 'Perubahan terdeteksi.',
        details: parsed.details || [],
      };
    }

    return {
      hasChanges: true,
      summary: content.substring(0, 500),
      details: [],
    };
  } catch (err) {
    console.warn(`⚠️ AI diff skipped: ${err.message}`);
    // Fallback: simple word count comparison
    return {
      hasChanges: wordDiffPercent > 5,
      summary: `Perubahan terdeteksi: jumlah kata berubah dari ${oldWords} ke ${newWords} (${wordDiffPercent}% perubahan).`,
      details: [{ type: 'modified', description: `Word count: ${oldWords} → ${newWords}` }],
    };
  }
}

module.exports = { compareSnapshots };
