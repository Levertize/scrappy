/**
 * AI Web Scraper — Playwright Browser Automation
 * Handles headless browser rendering for JS-heavy websites
 */

const { chromium } = require('playwright');

// Browser instance pool
let browser = null;

// Rotating user agents
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

/**
 * Get or create a shared browser instance
 */
async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
    console.log('🌐 Playwright browser launched');
  }
  return browser;
}

/**
 * Scrape a URL and return the rendered HTML content
 * @param {string} url - The URL to scrape
 * @param {Object} options
 * @param {number} options.timeout - Max wait time in ms (default: 30000)
 * @param {boolean} options.waitForNetwork - Wait until network is idle (default: true)
 * @returns {Object} { html, title, url: finalUrl, statusCode }
 */
async function scrapeUrl(url, options = {}) {
  const {
    timeout = 30000,
    waitForNetwork = true,
  } = options;

  const browserInstance = await getBrowser();
  const context = await browserInstance.newContext({
    userAgent: USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
    viewport: { width: 1920, height: 1080 },
    locale: 'id-ID',
  });

  const page = await context.newPage();

  try {
    // Navigate to URL with timeout
    const response = await page.goto(url, {
      timeout,
      waitUntil: waitForNetwork ? 'networkidle' : 'domcontentloaded',
    });

    if (!response) {
      throw new Error('No response received from the page');
    }

    const statusCode = response.status();

    // Wait a bit more for any lazy-loaded content
    await page.waitForTimeout(1000);

    // Get the final URL (after redirects)
    const finalUrl = page.url();

    // Get page title
    const title = await page.title();

    // Get full rendered HTML
    const html = await page.content();

    console.log(`✅ Scraped: ${finalUrl} (status: ${statusCode})`);

    return {
      html,
      title,
      url: finalUrl,
      statusCode,
    };
  } catch (err) {
    console.error(`❌ Scrape failed for ${url}:`, err.message);
    throw new Error(`Failed to scrape ${url}: ${err.message}`);
  } finally {
    await context.close();
  }
}

/**
 * Close the shared browser instance
 */
async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
    console.log('🌐 Playwright browser closed');
  }
}

/**
 * Validate a URL for safety (prevent SSRF)
 * @param {string} url - URL to validate
 * @returns {boolean}
 */
function isValidUrl(url) {
  try {
    const parsed = new URL(url);

    // Only allow http/https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    // Block internal/local addresses
    const hostname = parsed.hostname.toLowerCase();
    const blocked = [
      'localhost', '127.0.0.1', '0.0.0.0', '::1',
      '169.254.', '10.', '172.16.', '172.17.', '172.18.',
      '172.19.', '172.20.', '172.21.', '172.22.', '172.23.',
      '172.24.', '172.25.', '172.26.', '172.27.', '172.28.',
      '172.29.', '172.30.', '172.31.', '192.168.',
    ];

    for (const b of blocked) {
      if (hostname === b || hostname.startsWith(b)) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

module.exports = { scrapeUrl, closeBrowser, isValidUrl };
