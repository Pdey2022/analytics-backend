// ============================================================
// JWT authentication middleware
// ============================================================
var jwt = require('jsonwebtoken');
var config = require('../config');

var JWT_SECRET = process.env.JWT_SECRET || 'analytics-jwt-secret-change-in-production';

/**
 * Verify JWT token from Authorization header.
 * Sets req.user on success.
 */
function requireAuth(req, res, next) {
  var header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid token' });
  }

  var token = header.slice(7);
  try {
    var decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }
}

module.exports = { requireAuth, JWT_SECRET };
