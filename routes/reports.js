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
 * Build a date WHERE clause and params for reports.
 * Supports: from/to (date range) OR days (relative).
 */
function dateWhere(req) {
  var from = req.query.from;
  var to = req.query.to;
  var days = parseInt(req.query.days, 10) || 7;
  var clause, params;
  if (from && to) {
    clause = 'visit_date >= ? AND visit_date <= ?';
    params = [from, to];
  } else if (from) {
    clause = 'visit_date >= ?';
    params = [from];
  } else if (to) {
    clause = 'visit_date <= ?';
    params = [to];
  } else {
    clause = "visit_date >= date('now', ? || ' days')";
    params = ['-' + days];
  }
  return { clause: clause, params: params, days: days, from: from || null, to: to || null };
}

/**
 * GET /api/reports/top-sites?deviceId=xxx&from=YYYY-MM-DD&to=YYYY-MM-DD&days=7&limit=10
 */
router.get('/top-sites', (req, res) => {
  try {
    const deviceId = req.query.deviceId || null;
    const limit = parseInt(req.query.limit, 10) || 10;
    const dw = dateWhere(req);
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
        WHERE device_id = ? AND ${dw.clause}
        GROUP BY domain
        ORDER BY total_seconds DESC
        LIMIT ?
      `).all(deviceId, ...dw.params, limit);
    } else {
      rows = db.prepare(`
        SELECT
          domain,
          SUM(total_visits)  AS visit_count,
          SUM(total_seconds) AS total_seconds,
          ROUND(AVG(total_seconds * 1.0 / NULLIF(total_visits, 0)), 1) AS avg_seconds_per_visit
        FROM daily_summary
        WHERE ${dw.clause}
        GROUP BY domain
        ORDER BY total_seconds DESC
        LIMIT ?
      `).all(...dw.params, limit);
    }

    res.json({ deviceId: deviceId || 'all', days: dw.days, from: dw.from, to: dw.to, rows });
  } catch (err) {
    console.error('Error fetching top-sites report:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/reports/timeline?deviceId=xxx&from=YYYY-MM-DD&to=YYYY-MM-DD&days=7
 */
router.get('/timeline', (req, res) => {
  try {
    const deviceId = req.query.deviceId || null;
    const dw = dateWhere(req);
    const db = getDb();

    let rows;
    if (deviceId) {
      rows = db.prepare(`
        SELECT
          visit_date,
          SUM(total_visits)  AS visit_count,
          SUM(total_seconds) AS total_seconds
        FROM daily_summary
        WHERE device_id = ? AND ${dw.clause}
        GROUP BY visit_date
        ORDER BY visit_date ASC
      `).all(deviceId, ...dw.params);
    } else {
      rows = db.prepare(`
        SELECT
          visit_date,
          SUM(total_visits)  AS visit_count,
          SUM(total_seconds) AS total_seconds
        FROM daily_summary
        WHERE ${dw.clause}
        GROUP BY visit_date
        ORDER BY visit_date ASC
      `).all(...dw.params);
    }

    res.json({ deviceId: deviceId || 'all', days: dw.days, from: dw.from, to: dw.to, rows });
  } catch (err) {
    console.error('Error fetching timeline report:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/reports/summary?deviceId=xxx&from=YYYY-MM-DD&to=YYYY-MM-DD
 */
router.get('/summary', (req, res) => {
  try {
    const deviceId = req.query.deviceId || null;
    const dw = dateWhere(req);
    const db = getDb();

    // For summary we use site_visits, so adapt date clause
    var dateClause = dw.clause.replace(/visit_date/g, 'date(visited_at)');

    let stats;
    if (deviceId) {
      stats = db.prepare(`
        SELECT
          COUNT(*)                          AS total_visits,
          COALESCE(SUM(time_spent_seconds), 0) AS total_seconds,
          COUNT(DISTINCT domain)            AS unique_domains,
          COUNT(DISTINCT date(visited_at))  AS active_days
        FROM site_visits
        WHERE device_id = ? AND ${dateClause}
      `).get(deviceId, ...dw.params);

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
        WHERE ${dateClause}
      `).get(...dw.params);
    }

    res.json({ deviceId: deviceId || 'all', days: dw.days, from: dw.from, to: dw.to, stats });
  } catch (err) {
    console.error('Error fetching summary report:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/reports/devices
 */
router.get('/devices', (req, res) => {
  try {
    const db = getDb();
    const devices = db.prepare(`
      SELECT id, name, first_seen, last_seen, is_active
      FROM devices
      ORDER BY last_seen DESC
    `).all();

    // Compute dynamic active status based on last_seen within 15 minutes
    var now = new Date();
    var computed = devices.map(function (d) {
      var active = d.is_active ? 1 : 0;
      if (d.last_seen) {
        var lastSeen = new Date(d.last_seen + 'Z');
        var diffMs = now - lastSeen;
        if (diffMs > 15 * 60 * 1000) {
          active = 0;
        }
      }
      return {
        id: d.id,
        name: d.name,
        first_seen: d.first_seen,
        last_seen: d.last_seen,
        is_active: active
      };
    });

    res.json({ devices: computed });
  } catch (err) {
    console.error('Error listing devices:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/reports/categories?deviceId=xxx&from=YYYY-MM-DD&to=YYYY-MM-DD&days=7
 */
router.get('/categories', (req, res) => {
  try {
    const deviceId = req.query.deviceId || null;
    const dw = dateWhere(req);
    const db = getDb();

    let rows;
    if (deviceId) {
      rows = db.prepare(`
        SELECT domain, SUM(total_seconds) AS total_seconds, SUM(total_visits) AS total_visits
        FROM daily_summary
        WHERE device_id = ? AND ${dw.clause}
        GROUP BY domain
        ORDER BY total_seconds DESC
      `).all(deviceId, ...dw.params);
    } else {
      rows = db.prepare(`
        SELECT domain, SUM(total_seconds) AS total_seconds, SUM(total_visits) AS total_visits
        FROM daily_summary
        WHERE ${dw.clause}
        GROUP BY domain
        ORDER BY total_seconds DESC
      `).all(...dw.params);
    }

    var categories = {};
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

    res.json({ deviceId: deviceId || 'all', days: dw.days, from: dw.from, to: dw.to, categories: result });
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
