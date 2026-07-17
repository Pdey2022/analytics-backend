-- ============================================================
-- Analytics Cloud Tenant — Database Schema
-- Supports: SQLite (dev) / Azure SQL (production)
-- ============================================================
-- User accounts
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    created_at DATETIME NOT NULL DEFAULT (datetime ('now')),
    last_login DATETIME
);

-- Track registered devices (browser extension instances)
CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY, -- UUID v4
    name TEXT, -- Optional friendly label
    api_key TEXT NOT NULL, -- Secret key for auth
    first_seen DATETIME NOT NULL DEFAULT (datetime ('now')),
    last_seen DATETIME NOT NULL DEFAULT (datetime ('now')),
    is_active INTEGER NOT NULL DEFAULT 1 -- Soft-delete / disable
);

-- Individual page-visit events
CREATE TABLE IF NOT EXISTS site_visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL REFERENCES devices (id),
    domain TEXT NOT NULL, -- e.g. "github.com"
    page_title TEXT, -- Page <title> if available
    time_spent_seconds INTEGER NOT NULL,
    visited_at DATETIME NOT NULL, -- When the visit started
    created_at DATETIME NOT NULL DEFAULT (datetime ('now'))
);

-- Daily aggregated summaries (for fast reporting)
CREATE TABLE IF NOT EXISTS daily_summary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL REFERENCES devices (id),
    domain TEXT NOT NULL,
    visit_date TEXT NOT NULL, -- "YYYY-MM-DD"
    total_visits INTEGER NOT NULL DEFAULT 0,
    total_seconds INTEGER NOT NULL DEFAULT 0,
    UNIQUE (device_id, domain, visit_date)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_visits_device ON site_visits (device_id);

CREATE INDEX IF NOT EXISTS idx_visits_domain ON site_visits (domain);

CREATE INDEX IF NOT EXISTS idx_visits_date ON site_visits (visited_at);

CREATE INDEX IF NOT EXISTS idx_summary_device ON daily_summary (device_id, visit_date);