# Time Analytics Tracker

A browser extension + cloud backend for tracking time spent on websites. Includes a full analytics dashboard with per-device filtering, site categorization, user authentication, and date-range reporting.

## Features

- ⏱ **Automatic time tracking** — Chrome extension tracks active tabs, detects idle time, and batches data
- 📊 **Interactive dashboard** — Summary cards, top sites bar chart, daily activity line chart, categories donut chart
- 📁 **Custom reports** — Filter by device and date range with auto-generated charts and tables
- 🏷️ **Site categorization** — 150+ mapped domains across 12 categories (Development, AI, Social Media, etc.)
- 👤 **User authentication** — Register / login with JWT tokens
- ⚙️ **Settings & user management** — Change name, password, view all registered users
- 💻 **Multi-device support** — Each browser instance registers as a separate device with auto-detected name
- ☁️ **Cloud-ready** — Deployable to Railway, Azure, or any Node.js host

## Architecture

```
┌─────────────────────┐       POST /api/analytics       ┌──────────────────────────┐
│  Browser Extension  │ ──────────────────────────────▶  │    Cloud Backend         │
│  (Manifest V3)      │   { deviceId, visits: [...] }   │    (Express.js)           │
│                     │ ◀────────────────────────────── │                          │
│  - Tabs tracking    │       201 + confirmation        │  ┌────────────────────┐  │
│  - Idle detection   │                                  │  │  SQLite            │  │
│  - Batched upload   │                                  │  │  (better-sqlite3)  │  │
│  - Device identity  │                                  │  └────────────────────┘  │
└─────────────────────┘                                  └──────────────────────────┘
                                                                  │
                                                          ┌───────┴───────┐
                                                          │   Browser     │
                                                          │  Dashboard    │
                                                          │  (HTML + JS)  │
                                                          └───────────────┘
```

## Project Structure

```
analytics-extension/
├── manifest.json              # Extension manifest (MV3)
├── background.js              # Service worker — tracks visits & uploads
├── popup/
│   ├── popup.html             # Extension popup UI
│   └── popup.js               # Popup logic
│
├── cloud-backend/
│   ├── server.js              # Express.js entry point (dashboard, settings, reports HTML)
│   ├── config.js              # Configuration via env vars
│   ├── package.json           # Dependencies
│   │
│   ├── db/
│   │   ├── schema.sql         # Database schema
│   │   ├── init.js            # Migration script
│   │   └── connection.js      # DB connection singleton
│   │
│   ├── routes/
│   │   ├── analytics.js       # POST /api/analytics — ingestion
│   │   ├── reports.js         # GET /api/reports/* — queries
│   │   ├── auth.js            # POST /api/auth/* — register, login, profile
│   │   └── categories.js      # Domain-to-category mapping engine
│   │
│   └── middleware/
│       ├── auth.js            # API key authentication (extension → backend)
│       └── jwt.js             # JWT authentication (dashboard → backend)
│
└── README.md
```

## Quick Start

### 1. Start the Cloud Backend

```bash
cd cloud-backend
npm install
npm start
```

The server starts on **http://localhost:5000**.

### 2. Load the Extension in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `analytics-extension/` folder

### 3. Open the Dashboard

Navigate to **http://localhost:5000** and register an account. The dashboard will show your browsing analytics in real-time.

### 4. Verify

Open the DevTools console for the extension (service worker) — you should see:

```
[Analytics] Device ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
[Analytics] Uploaded 5 visits
```

Browse some sites, then check the dashboard graphs update.

## Dashboard Pages

| Page | Route | Description |
|---|---|---|
| **Dashboard** | `/` | Summary cards, top sites, daily activity chart, categories, devices table |
| **Reports** | `/reports` | Filter by device and date range with detailed charts & tables |
| **Settings** | `/settings` | Profile management, change password, view all users |
| **Login** | `/login` | Sign in / Sign up |

## API Reference

### Authentication Endpoints

#### `POST /api/auth/register`
```json
{ "email": "user@example.com", "password": "secret123", "displayName": "User" }
// → { "token": "...", "user": { ... } }
```

#### `POST /api/auth/login`
```json
{ "email": "user@example.com", "password": "secret123" }
// → { "token": "...", "user": { ... } }
```

#### `GET /api/auth/me` (JWT required)
Returns the current user's profile.

#### `PUT /api/auth/profile` (JWT required)
```json
{ "displayName": "New Name" }
```

#### `PUT /api/auth/password` (JWT required)
```json
{ "currentPassword": "old", "newPassword": "new" }
```

#### `GET /api/auth/users` (JWT required)
Lists all registered users.

### Analytics Ingestion

#### `POST /api/analytics` (API Key required)
```json
{
  "deviceId": "uuid-v4",
  "deviceName": "Windows Chrome",
  "visits": [
    {
      "domain": "github.com",
      "pageTitle": null,
      "timeSpentSeconds": 120,
      "timestamp": "2026-07-16T10:30:00.000Z"
    }
  ]
}
```

### Report Endpoints (JWT required)

All report endpoints accept `deviceId`, `from` (YYYY-MM-DD), and `to` (YYYY-MM-DD) query params.

#### `GET /api/reports/summary`
Overall stats: total visits, time, unique domains, active days.

#### `GET /api/reports/top-sites?days=7&limit=10`
Most visited domains ranked by time spent.

#### `GET /api/reports/timeline?days=7`
Daily time breakdown for line charting.

#### `GET /api/reports/categories?days=7`
Time grouped by site category (Development, AI, Social Media, etc.).

#### `GET /api/reports/devices`
List all registered devices with first/last seen timestamps.

#### `GET /api/health`
```json
{ "status": "ok", "uptime": 123.45, "timestamp": "..." }
```

## Deployment

### Deploy to Railway (recommended)

1. Push this repo to GitHub
2. Create a new Railway project from your GitHub repo
3. Set the **Root Directory** to `cloud-backend`
4. Set the **Start Command** to `node server.js`
5. Add environment variables:
   - `API_KEY` — a strong random secret
   - `JWT_SECRET` — a strong random secret for auth tokens
   - `CORS_ORIGINS` — `*` or your extension's URL

> ⚠️ **Note:** Railway uses ephemeral storage. SQLite data resets on each deploy. For persistent data, use Azure SQL Database or PostgreSQL.

### Update the Extension for Production

1. In `background.js`, update `CLOUD_ENDPOINT` to your Railway URL
2. In `manifest.json`, update `host_permissions` with your Railway domain
3. Update `API_KEY` in both `config.js` and `background.js`

## Tech Stack

| Layer | Technology |
|---|---|
| **Extension** | Chrome Manifest V3, Service Worker |
| **Backend** | Node.js, Express.js 4.21 |
| **Database** | SQLite (better-sqlite3) |
| **Auth** | JWT (jsonwebtoken) + bcryptjs |
| **Charts** | Chart.js 4.4 (CDN) |
| **Hosting** | Railway.app / Azure
