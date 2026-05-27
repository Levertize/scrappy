/**
 * AI Web Scraper — HTML Parser (Cheerio)
 * Extracts structured content from raw HTML
 */

const cheerio = require('cheerio');

/**
 * Parse HTML and extract useful content
 * @param {string} html - Raw HTML string
 * @param {string} sourceUrl - Original URL (for resolving relative links)
 * @returns {Object} Parsed content with text, metadata, links, images
 */
function parseHtml(html, sourceUrl = '') {
  const $ = cheerio.load(html);

  // Remove unwanted elements
  $('script, style, noscript, iframe, svg, nav, footer, header').remove();
  $('[aria-hidden="true"]').remove();
  $('.ad, .ads, .advertisement, .sidebar, .popup, .modal, .cookie-banner').remove();

  // Extract text content (cleaned)
  const textContent = extractText($);

  // Extract metadata
  const metadata = extractMetadata($);

  // Extract links
  const links = extractLinks($, sourceUrl);

  // Extract images
  const images = extractImages($, sourceUrl);

  // Extract tables
  const tables = extractTables($);

  return {
    textContent,
    metadata,
    links,
    images,
    tables,
    wordCount: textContent.split(/\s+/).filter(Boolean).length,
  };
}

/**
 * Extract clean text content from the page
 */
function extractText($) {
  // Get body text, collapse whitespace
  const raw = $('body').text();
  return raw
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

/**
 * Extract page metadata
 */
function extractMetadata($) {
  return {
    title: $('title').text().trim() || $('h1').first().text().trim(),
    description: $('meta[name="description"]').attr('content') || '',
    keywords: $('meta[name="keywords"]').attr('content') || '',
    ogTitle: $('meta[property="og:title"]').attr('content') || '',
    ogDescription: $('meta[property="og:description"]').attr('content') || '',
    ogImage: $('meta[property="og:image"]').attr('content') || '',
    canonical: $('link[rel="canonical"]').attr('href') || '',
    author: $('meta[name="author"]').attr('content') || '',
    publishedDate: $('meta[property="article:published_time"]').attr('content') || 
                   $('time[datetime]').first().attr('datetime') || '',
  };
}

/**
 * Extract all links from the page
 */
function extractLinks($, baseUrl) {
  const links = [];
  const seen = new Set();

  $('a[href]').each((_, el) => {
    let href = $(el).attr('href');
    const text = $(el).text().trim();

    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) {
      return;
    }

    // Resolve relative URLs
    try {
      if (baseUrl && !href.startsWith('http')) {
        href = new URL(href, baseUrl).href;
      }
    } catch {
      return;
    }

    if (!seen.has(href)) {
      seen.add(href);
      links.push({ href, text: text.substring(0, 200) });
    }
  });

  return links.slice(0, 100); // Limit to 100 links
}

/**
 * Extract images from the page
 */
function extractImages($, baseUrl) {
  const images = [];

  $('img[src]').each((_, el) => {
    let src = $(el).attr('src');
    const alt = $(el).attr('alt') || '';

    // Resolve relative URLs
    try {
      if (baseUrl && !src.startsWith('http') && !src.startsWith('data:')) {
        src = new URL(src, baseUrl).href;
      }
    } catch {
      return;
    }

    if (src && !src.startsWith('data:')) {
      images.push({ src, alt: alt.substring(0, 200) });
    }
  });

  return images.slice(0, 50); // Limit to 50 images
}

/**
 * Extract tables from the page
 */
function extractTables($) {
  const tables = [];

  $('table').each((tableIdx, table) => {
    const headers = [];
    const rows = [];

    // Get headers
    $(table).find('thead th, thead td, tr:first-child th').each((_, th) => {
      headers.push($(th).text().trim());
    });

    // Get rows
    $(table).find('tbody tr, tr').each((_, tr) => {
      const row = [];
      $(tr).find('td').each((_, td) => {
        row.push($(td).text().trim());
      });
      if (row.length > 0) {
        rows.push(row);
      }
    });

    if (headers.length > 0 || rows.length > 0) {
      tables.push({ headers, rows });
    }
  });

  return tables.slice(0, 10); // Limit to 10 tables
}

/**
 * Get a trimmed version of text for AI processing
 * Limits content to avoid exceeding token limits
 * @param {string} text - Full text content
 * @param {number} maxChars - Maximum characters (default: 15000)
 * @returns {string} Trimmed text
 */
function trimForAI(text, maxChars = 15000) {
  if (text.length <= maxChars) return text;
  
  return text.substring(0, maxChars) + '\n\n[... content truncated for AI processing ...]';
}

module.exports = { parseHtml, trimForAI };
