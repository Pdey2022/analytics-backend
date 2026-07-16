// ============================================================
// GET /api/reports/*  — Query aggregated analytics
// ============================================================
const { Router } = require('express');
const { getDb } = require('../db/connection');
const { requireAuth } = require('../middleware/jwt');
const { categorizeDomain, CATEGORY_COLORS } = require('./categories');

const router = Router();

router.use(requireAuth);

/**
 * GET /api/reports/top-sites?deviceId=xxx&days=7&limit=10
 *
 * Returns the most visited domains for a device (or all devices).
 */
router.get('/top-sites', (req, res) => {
  try {
    const deviceId = req.query.deviceId || null;
    const days = parseInt(req.query.days, 10) || 7;
    const limit = parseInt(req.query.limit, 10) || 10;
    const db = getDb();

    let rows;
    if (deviceId) {
      rows = db.prepare(`
        SELECT
          domain,
          SUM(total_visits)  AS visit_count,
          SUM(total_seconds) AS total_seconds,
          ROUND(AVG(total_seconds * 1.0 / NULLIF(total_visits, 0)), 1) AS avg_seconds_per_visit
        FROM daily_summary
        WHERE device_id = ?
          AND visit_date >= date('now', ? || ' days')
        GROUP BY domain
        ORDER BY total_seconds DESC
        LIMIT ?
      `).all(deviceId, `-${days}`, limit);
    } else {
      rows = db.prepare(`
        SELECT
          domain,
          SUM(total_visits)  AS visit_count,
          SUM(total_seconds) AS total_seconds,
          ROUND(AVG(total_seconds * 1.0 / NULLIF(total_visits, 0)), 1) AS avg_seconds_per_visit
        FROM daily_summary
        WHERE visit_date >= date('now', ? || ' days')
        GROUP BY domain
        ORDER BY total_seconds DESC
        LIMIT ?
      `).all(`-${days}`, limit);
    }

    res.json({ deviceId: deviceId || 'all', days, rows });
  } catch (err) {
    console.error('Error fetching top-sites report:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/reports/timeline?deviceId=xxx&days=7
 *
 * Returns total time per day for the given period (for charting).
 */
router.get('/timeline', (req, res) => {
  try {
    const deviceId = req.query.deviceId || null;
    const days = parseInt(req.query.days, 10) || 7;
    const db = getDb();

    let rows;
    if (deviceId) {
      rows = db.prepare(`
        SELECT
          visit_date,
          SUM(total_visits)  AS visit_count,
          SUM(total_seconds) AS total_seconds
        FROM daily_summary
        WHERE device_id = ?
          AND visit_date >= date('now', ? || ' days')
        GROUP BY visit_date
        ORDER BY visit_date ASC
      `).all(deviceId, `-${days}`);
    } else {
      rows = db.prepare(`
        SELECT
          visit_date,
          SUM(total_visits)  AS visit_count,
          SUM(total_seconds) AS total_seconds
        FROM daily_summary
        WHERE visit_date >= date('now', ? || ' days')
        GROUP BY visit_date
        ORDER BY visit_date ASC
      `).all(`-${days}`);
    }

    res.json({ deviceId: deviceId || 'all', days, rows });
  } catch (err) {
    console.error('Error fetching timeline report:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/reports/summary?deviceId=xxx
 *
 * Quick overall stats for a device.
 */
router.get('/summary', (req, res) => {
  try {
    const deviceId = req.query.deviceId || null;
    const db = getDb();

    let stats;
    if (deviceId) {
      stats = db.prepare(`
        SELECT
          COUNT(*)                          AS total_visits,
          COALESCE(SUM(time_spent_seconds), 0) AS total_seconds,
          COUNT(DISTINCT domain)            AS unique_domains,
          COUNT(DISTINCT date(visited_at))  AS active_days
        FROM site_visits
        WHERE device_id = ?
      `).get(deviceId);

      // Also get the device info
      const device = db.prepare('SELECT id, name, first_seen, last_seen FROM devices WHERE id = ?').get(deviceId);
      stats.device = device || null;
    } else {
      stats = db.prepare(`
        SELECT
          COUNT(*)                          AS total_visits,
          COALESCE(SUM(time_spent_seconds), 0) AS total_seconds,
          COUNT(DISTINCT domain)            AS unique_domains,
          COUNT(DISTINCT device_id)         AS unique_devices,
          COUNT(DISTINCT date(visited_at))  AS active_days
        FROM site_visits
      `).get();
    }

    res.json({ deviceId: deviceId || 'all', stats });
  } catch (err) {
    console.error('Error fetching summary report:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/reports/devices
 *
 * List all registered devices.
 */
router.get('/devices', (req, res) => {
  try {
    const db = getDb();
    const devices = db.prepare(`
      SELECT id, name, first_seen, last_seen, is_active
      FROM devices
      ORDER BY last_seen DESC
    `).all();

    res.json({ devices });
  } catch (err) {
    console.error('Error listing devices:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/reports/categories?deviceId=xxx&days=7
 *
 * Returns time spent grouped by site category.
 */
router.get('/categories', (req, res) => {
  try {
    const deviceId = req.query.deviceId || null;
    const days = parseInt(req.query.days, 10) || 7;
    const db = getDb();

    let rows;
    if (deviceId) {
      rows = db.prepare(`
        SELECT domain, SUM(total_seconds) AS total_seconds, SUM(total_visits) AS total_visits
        FROM daily_summary
        WHERE device_id = ? AND visit_date >= date('now', ? || ' days')
        GROUP BY domain
        ORDER BY total_seconds DESC
      `).all(deviceId, `-${days}`);
    } else {
      rows = db.prepare(`
        SELECT domain, SUM(total_seconds) AS total_seconds, SUM(total_visits) AS total_visits
        FROM daily_summary
        WHERE visit_date >= date('now', ? || ' days')
        GROUP BY domain
        ORDER BY total_seconds DESC
      `).all(`-${days}`);
    }

    // Group by category
    var categories = {};
    var otherSeconds = 0;

    rows.forEach(function (row) {
      var cat = categorizeDomain(row.domain);
      if (!categories[cat]) {
        categories[cat] = { category: cat, total_seconds: 0, total_visits: 0, color: CATEGORY_COLORS[cat] || '#4a5568' };
      }
      categories[cat].total_seconds += row.total_seconds;
      categories[cat].total_visits += row.total_visits;
    });

    var result = Object.keys(categories).map(function (k) { return categories[k]; });
    result.sort(function (a, b) { return b.total_seconds - a.total_seconds; });

    res.json({ deviceId: deviceId || 'all', days: days, categories: result });
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
