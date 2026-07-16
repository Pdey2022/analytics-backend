// ============================================================
// Database initialisation — run via: npm run migrate
// ============================================================
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'analytics.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Ensure the data directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Run the schema
const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
db.exec(schema);

console.log(`✓ Database migrated successfully at ${DB_PATH}`);
db.close();
