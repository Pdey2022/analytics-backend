// ============================================================
// GET/POST/DELETE /api/blocklist — Manage blocked domains
// ============================================================
const { Router } = require('express');
const { getDb } = require('../db/connection');
const { requireAuth } = require('../middleware/jwt');

const router = Router();

router.use(requireAuth);

/**
 * GET /api/blocklist — List all blocked domains
 */
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const domains = db.prepare(`
      SELECT b.id, b.domain, b.created_at, u.email AS added_by_email
      FROM blocked_domains b
      LEFT JOIN users u ON u.id = b.added_by
      ORDER BY b.created_at DESC
    `).all();
    res.json({ domains });
  } catch (err) {
    console.error('Error listing blocked domains:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/blocklist — Add a domain to the blocklist
 * Body: { domain: "example.com" }
 */
router.post('/', (req, res) => {
  try {
    var domain = (req.body.domain || '').toLowerCase().trim();
    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }
    // Remove protocol and path if someone pastes a full URL
    domain = domain.replace(/^https?:\/\//, '').split('/')[0].split('?')[0];

    const db = getDb();
    db.prepare('INSERT OR IGNORE INTO blocked_domains (domain, added_by) VALUES (?, ?)')
      .run(domain, req.user.id);

    res.status(201).json({ message: 'Domain blocked', domain: domain });
  } catch (err) {
    console.error('Error adding blocked domain:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/blocklist/:id — Remove a domain from the blocklist
 */
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM blocked_domains WHERE id = ?').run(req.params.id);
    res.json({ message: 'Domain unblocked' });
  } catch (err) {
    console.error('Error deleting blocked domain:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
