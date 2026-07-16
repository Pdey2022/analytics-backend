// ============================================================
// Authentication middleware
// ============================================================
const config = require('../config');

/**
 * Validates the API key sent by the browser extension.
 * The extension sends the key in the `X-Api-Key` header.
 */
function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];

  if (!key || key !== config.apiKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or invalid API key. Send it in the X-Api-Key header.',
    });
  }

  next();
}

module.exports = { requireApiKey };
