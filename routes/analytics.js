// ============================================================
// POST /api/analytics — Ingest visit data from the extension
// ============================================================
const { Router } = require('express');
const { getDb } = require('../db/connection');
const { requireApiKey } = require('../middleware/auth');
const config = require('../config');

const router = Router();

// All analytics endpoints require the API key
router.use(requireApiKey);

/**
 * POST /api/analytics
 *
 * Accepts a single visit payload or an array (batch).
 *
 * Single payload:
   *   { deviceId, deviceName?, domain, pageTitle?, timeSpentSeconds, timestamp }
   *
   * Batch payload:
   *   { deviceId, deviceName?, visits: [{ domain, pageTitle?, timeSpentSeconds, timestamp }, ...] }
   */
router.post('/', (req, res) => {
  try {
    const body = req.body;

    // --- Determine if single or batch ---
    const visits = body.visits || [body];
    const deviceId = body.deviceId;
    const deviceName = body.deviceName || null;

    if (!deviceId) {
      return res.status(400).json({ error: 'Missing required field: deviceId' });
    }

    const db = getDb();
    const results = { inserted: 0, skipped: 0 };

    // Upsert: register or update the device's last_seen and name
    if (deviceName) {
      db.prepare(`
        INSERT INTO devices (id, api_key, name, first_seen, last_seen)
        VALUES (?, ?, ?, datetime('now'), datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          name = COALESCE(NULLIF(?, ''), name),
          last_seen = datetime('now'),
          is_active = 1
      `).run(deviceId, config.apiKey, deviceName, deviceName);
    } else {
      db.prepare(`
        INSERT INTO devices (id, api_key, first_seen, last_seen)
        VALUES (?, ?, datetime('now'), datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          last_seen = datetime('now'),
          is_active = 1
      `).run(deviceId, config.apiKey);
    }
    // Prepare statements for batch insert
    const insertVisit = db.prepare(`
      INSERT INTO site_visits (device_id, domain, page_title, time_spent_seconds, visited_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const upsertSummary = db.prepare(`
      INSERT INTO daily_summary (device_id, domain, visit_date, total_visits, total_seconds)
      VALUES (?, ?, ?, 1, ?)
      ON CONFLICT(device_id, domain, visit_date) DO UPDATE SET
        total_visits  = total_visits  + 1,
        total_seconds = total_seconds + excluded.total_seconds
    `);

    const insertMany = db.transaction((rows) => {
      for (const v of rows) {
        // Validate
        if (!v.domain || typeof v.timeSpentSeconds !== 'number') {
          results.skipped++;
          continue;
        }
        if (v.timeSpentSeconds < config.minTimeSpentSeconds) {
          results.skipped++;
          continue;
        }

        const visitDate = (v.timestamp || new Date().toISOString()).slice(0, 10);

        insertVisit.run(
          deviceId,
          v.domain,
          v.pageTitle || null,
          Math.round(v.timeSpentSeconds),
          v.timestamp || new Date().toISOString()
        );

        upsertSummary.run(deviceId, v.domain, visitDate, Math.round(v.timeSpentSeconds));
        results.inserted++;
      }
    });

    insertMany(visits);

    res.status(201).json({
      message: 'Analytics ingested successfully',
      deviceId,
      results,
    });
  } catch (err) {
    console.error('Error ingesting analytics:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
