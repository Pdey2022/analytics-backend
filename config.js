// ============================================================
// Application configuration
// ============================================================

module.exports = {
  port: process.env.PORT || 5000,

  // Minimum time-spent (seconds) to accept a visit record (anti-noise)
  minTimeSpentSeconds: 2,

  // How often (ms) the extension should batch-send data
  // (informational — the extension reads this at setup)
  recommendedBatchIntervalMs: 5 * 60 * 1000, // 5 minutes

  // CORS — restrict to your extension's origin in production
  corsOrigins: process.env.CORS_ORIGINS || '*',

  // API key for extension → cloud auth (set via env var in production)
  apiKey: process.env.API_KEY || 'dev-secret-change-in-production',

  // Data retention (days) — visits older than this are auto-purged
  retentionDays: parseInt(process.env.RETENTION_DAYS, 10) || 90,
};
