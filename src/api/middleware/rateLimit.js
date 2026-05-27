/**
 * AI Web Scraper — Simple In-Memory Rate Limiter
 */

/**
 * Create a rate limiter middleware
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @param {number} options.max - Max requests per window (default: 100)
 * @param {string} options.message - Error message when limit exceeded
 * @returns {Function} Express middleware
 */
function createRateLimiter(options = {}) {
  const {
    windowMs = 60 * 1000,
    max = 100,
    message = 'Too many requests, please try again later.',
  } = options;

  // Store: IP -> { count, resetTime }
  const clients = new Map();

  // Cleanup old entries periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of clients) {
      if (now > value.resetTime) {
        clients.delete(key);
      }
    }
  }, windowMs);

  return (req, res, next) => {
    const key = req.user?.id || req.ip || req.connection.remoteAddress;
    const now = Date.now();

    let client = clients.get(key);

    if (!client || now > client.resetTime) {
      client = { count: 0, resetTime: now + windowMs };
      clients.set(key, client);
    }

    client.count++;

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': max,
      'X-RateLimit-Remaining': Math.max(0, max - client.count),
      'X-RateLimit-Reset': new Date(client.resetTime).toISOString(),
    });

    if (client.count > max) {
      return res.status(429).json({
        error: { message },
      });
    }

    next();
  };
}

// Pre-configured limiters
const apiLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 100 });
const authLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20, message: 'Too many auth attempts.' });
const scrapeLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 50, message: 'Scrape rate limit reached.' });

module.exports = { createRateLimiter, apiLimiter, authLimiter, scrapeLimiter };
