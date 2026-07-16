// ============================================================
// Cloud Analytics Tenant — Express.js Server
// ============================================================
const express = require('express');
const cors = require('cors');
const config = require('./config');
const { getDb, closeDb } = require('./db/connection');

const app = express();

// ── Middleware ──────────────────────────────────────────────
app.use(cors({ origin: config.corsOrigins }));
app.use(express.json({ limit: '1mb' }));

// ── Routes ─────────────────────────────────────────────────
const analyticsRoutes = require('./routes/analytics');
const reportsRoutes  = require('./routes/reports');
const authRoutes     = require('./routes/auth');

app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports',   reportsRoutes);
app.use('/api/auth',      authRoutes);

// ── Health check ───────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ── Login page ─────────────────────────────────────────────
app.get('/login', (_req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sign In — Analytics</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', sans-serif;
      background: #0b0e14; color: #e1e7ef;
      display: flex; justify-content: center; align-items: center;
      min-height: 100vh; padding: 20px;
    }
    .login-card {
      background: #111820; border: 1px solid #1e2430; border-radius: 14px;
      padding: 40px 36px; width: 100%; max-width: 400px;
    }
    .login-card .logo {
      width: 42px; height: 42px; border-radius: 12px;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; color: #fff; font-weight: 700; margin-bottom: 20px;
      box-shadow: 0 4px 12px rgba(37,99,235,0.3);
    }
    .login-card h1 { font-size: 1.4rem; font-weight: 700; margin-bottom: 4px; }
    .login-card .sub { color: #4a5568; font-size: 0.85rem; margin-bottom: 24px; }
    .login-card label { display: block; font-size: 0.78rem; color: #8b9bb5; margin-bottom: 4px; font-weight: 500; }
    .login-card input {
      width: 100%; background: #0b0e14; border: 1px solid #1e2430;
      border-radius: 8px; padding: 10px 12px; color: #e1e7ef;
      font-size: 0.9rem; font-family: inherit; outline: none; margin-bottom: 14px;
    }
    .login-card input:focus { border-color: #2563eb; }
    .login-card button {
      width: 100%; background: #2563eb; border: none; border-radius: 8px;
      padding: 11px; color: #fff; font-size: 0.9rem; font-weight: 600;
      cursor: pointer; font-family: inherit; margin-top: 4px;
    }
    .login-card button:hover { background: #1d4ed8; }
    .login-card button:disabled { opacity: 0.5; cursor: default; }
    .login-card .error { color: #f87171; font-size: 0.82rem; margin-top: 10px; display: none; }
    .login-card .toggle { text-align: center; margin-top: 16px; font-size: 0.82rem; color: #4a5568; }
    .login-card .toggle a { color: #60a5fa; cursor: pointer; text-decoration: none; }
    .login-card .toggle a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="login-card">
    <div class="logo">T</div>
    <h1 id="formTitle">Sign In</h1>
    <div class="sub" id="formSub">Access your analytics dashboard</div>
    <div id="errorMsg" class="error"></div>
    <input type="email" id="emailInput" placeholder="Email" autocomplete="email" />
    <input type="password" id="passwordInput" placeholder="Password" autocomplete="current-password" />
    <input type="password" id="confirmInput" placeholder="Confirm password" style="display:none;" autocomplete="new-password" />
    <button id="submitBtn" onclick="submitForm()">Sign In</button>
    <div class="toggle">
      <span id="toggleText">Don't have an account? </span>
      <a id="toggleLink" onclick="toggleMode()">Sign Up</a>
    </div>
  </div>
  <script>
    var isLogin = true;
    function toggleMode() {
      isLogin = !isLogin;
      document.getElementById('formTitle').textContent = isLogin ? 'Sign In' : 'Create Account';
      document.getElementById('formSub').textContent = isLogin ? 'Access your analytics dashboard' : 'Register to view analytics';
      document.getElementById('submitBtn').textContent = isLogin ? 'Sign In' : 'Create Account';
      document.getElementById('confirmInput').style.display = isLogin ? 'none' : 'block';
      document.getElementById('toggleText').textContent = isLogin ? "Don't have an account? " : 'Already have an account? ';
      document.getElementById('toggleLink').textContent = isLogin ? 'Sign Up' : 'Sign In';
      document.getElementById('errorMsg').style.display = 'none';
    }
    function submitForm() {
      var btn = document.getElementById('submitBtn');
      var err = document.getElementById('errorMsg');
      btn.disabled = true; btn.textContent = 'Loading...';
      err.style.display = 'none';

      var email = document.getElementById('emailInput').value.trim();
      var password = document.getElementById('passwordInput').value;
      var endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      var body = { email: email, password: password };

      if (!isLogin) {
        var confirm = document.getElementById('confirmInput').value;
        if (password !== confirm) {
          err.textContent = 'Passwords do not match'; err.style.display = 'block';
          btn.disabled = false; btn.textContent = isLogin ? 'Sign In' : 'Create Account';
          return;
        }
      }

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.token) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          window.location.href = '/';
        } else {
          err.textContent = data.error || 'Something went wrong';
          err.style.display = 'block';
        }
      })
      .catch(function () {
        err.textContent = 'Network error';
        err.style.display = 'block';
      })
      .finally(function () {
        btn.disabled = false;
        btn.textContent = isLogin ? 'Sign In' : 'Create Account';
      });
    }
    // Check if already logged in
    if (localStorage.getItem('token')) { window.location.href = '/'; }
  </script>
</body>
</html>
  `);
});

// ── Dashboard (served at /) ────────────────────────────────
app.get('/', function (_req, res) {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Time Analytics Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    html { font-size: 15px; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0b0e14; color: #e1e7ef;
      padding: 0; min-height: 100vh;
    }

    /* ── Scrollbar ─────────────────────── */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #2a2f3a; border-radius: 3px; }

    /* ── Container ─────────────────────── */
    /* ── Layout ────────────────────────── */
    .layout { display: flex; min-height: 100vh; }
    .app { flex: 1; max-width: 1200px; padding: 0 24px 48px; }

    /* ── Sidebar ──────────────────────── */
    .sidebar {
      width: 220px; min-height: 100vh;
      background: #0f131a; border-right: 1px solid #1e2430;
      display: flex; flex-direction: column; flex-shrink: 0;
    }
    .sidebar .logo-area {
      padding: 20px 18px 16px; border-bottom: 1px solid #1e2430;
      display: flex; align-items: center; gap: 10px;
    }
    .sidebar .logo-area .logo {
      width: 32px; height: 32px; border-radius: 8px;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; color: #fff; font-weight: 700;
      box-shadow: 0 3px 10px rgba(37,99,235,0.3);
    }
    .sidebar .logo-area .brand { font-size: 0.95rem; font-weight: 700; color: #f0f3f8; }
    .sidebar .logo-area .brand span { color: #4a5568; font-weight: 400; }

    .sidebar .nav-items { flex: 1; padding: 12px 10px; }
    .sidebar .nav-item {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 12px; border-radius: 8px; font-size: 0.82rem;
      color: #6b7a8f; cursor: pointer; transition: all 0.15s;
      margin-bottom: 2px;
    }
    .sidebar .nav-item:hover { background: #161b22; color: #c9d1d9; }
    .sidebar .nav-item.active { background: #1e293b; color: #f0f3f8; }
    .sidebar .nav-item .icon { font-size: 1rem; width: 22px; text-align: center; }

    .sidebar .user-area {
      padding: 14px 14px 18px; border-top: 1px solid #1e2430;
    }
    .sidebar .user-area .user-name {
      font-size: 0.82rem; font-weight: 600; color: #c9d1d9;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .sidebar .user-area .user-email {
      font-size: 0.72rem; color: #4a5568;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      margin-bottom: 10px;
    }
    .sidebar .user-area .logout-btn {
      width: 100%; background: none; border: 1px solid #1e2430;
      border-radius: 6px; padding: 7px; color: #6b7a8f;
      font-size: 0.78rem; cursor: pointer; font-family: inherit;
      transition: all 0.15s;
    }
    .sidebar .user-area .logout-btn:hover {
      border-color: #f43f5e; color: #f43f5e;
    }

    @media (max-width: 768px) {
      .sidebar { width: 56px; }
      .sidebar .logo-area .brand,
      .sidebar .nav-item span,
      .sidebar .user-area .user-name,
      .sidebar .user-area .user-email { display: none; }
      .sidebar .user-area { padding: 10px; }
    }

    /* ── Top Nav ───────────────────────── */
    .topbar {
      display: flex; justify-content: space-between; align-items: center;
      padding: 18px 0 16px; border-bottom: 1px solid #1e2430; margin-bottom: 28px;
      flex-wrap: wrap; gap: 12px;
    }
    .topbar-left { display: flex; align-items: center; gap: 14px; }
    .topbar-logo {
      width: 36px; height: 36px; border-radius: 10px;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; color: #fff; font-weight: 700;
      box-shadow: 0 4px 12px rgba(37,99,235,0.3);
    }
    .topbar-title { font-size: 1.15rem; font-weight: 700; color: #f0f3f8; letter-spacing: -0.3px; }
    .topbar-title span { color: #6b7a8f; font-weight: 400; }
    .topbar-right { display: flex; align-items: center; gap: 14px; }
    .live-badge {
      display: inline-flex; align-items: center; gap: 7px;
      background: #111820; border: 1px solid #1e2430;
      padding: 5px 14px 5px 12px; border-radius: 20px; font-size: 0.78rem; font-weight: 500;
      color: #8b9bb5;
    }
    .live-badge .dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: #22c55e; box-shadow: 0 0 8px rgba(34,197,94,0.5);
      animation: pulse 2s infinite;
    }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
    .last-updated { font-size: 0.78rem; color: #4a5568; font-weight: 500; white-space: nowrap; }

    /* ── Period pills ──────────────────── */
    .period-bar {
      display: flex; gap: 4px; margin-bottom: 24px;
      background: #111820; padding: 4px; border-radius: 10px;
      width: fit-content; border: 1px solid #1e2430;
    }
    .period-pill {
      padding: 7px 18px; border-radius: 7px; font-size: 0.8rem; font-weight: 500;
      color: #6b7a8f; cursor: pointer; transition: all 0.2s; border: none; background: none;
      font-family: inherit;
    }
    .period-pill:hover { color: #c9d1d9; }
    .period-pill.active {
      background: #1e293b; color: #f0f3f8;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }

    /* ── Stats Grid ────────────────────── */
    .stats-grid {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 28px;
    }
    .stat-card {
      background: #111820; border: 1px solid #1e2430; border-radius: 12px;
      padding: 20px 18px; position: relative; overflow: hidden;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .stat-card:hover { border-color: #2a2f3a; box-shadow: 0 4px 20px rgba(0,0,0,0.2); }
    .stat-card .stat-icon {
      font-size: 1.4rem; margin-bottom: 10px; opacity: 0.7;
    }
    .stat-card .stat-value {
      font-size: 1.85rem; font-weight: 800; color: #f0f3f8;
      letter-spacing: -0.5px; line-height: 1.1;
    }
    .stat-card .stat-label {
      font-size: 0.72rem; font-weight: 500; color: #4a5568;
      text-transform: uppercase; letter-spacing: 0.8px; margin-top: 6px;
    }
    .stat-card .stat-glow {
      position: absolute; top: -40px; right: -40px;
      width: 120px; height: 120px; border-radius: 50%; opacity: 0.04;
      pointer-events: none;
    }

    /* ── Charts ────────────────────────── */
    .charts-grid {
      display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 28px;
    }
    .chart-card {
      background: #111820; border: 1px solid #1e2430; border-radius: 12px;
      padding: 20px 20px 14px; transition: border-color 0.2s;
    }
    .chart-card:hover { border-color: #2a2f3a; }
    .chart-card .chart-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;
    }
    .chart-card .chart-title {
      font-size: 0.78rem; font-weight: 600; color: #4a5568;
      text-transform: uppercase; letter-spacing: 0.6px;
    }
    .chart-card .chart-count {
      font-size: 0.72rem; color: #2a2f3a; font-weight: 500;
    }
    .chart-card canvas { max-height: 280px; width: 100% !important; }

    /* ── Device section ────────────────── */
    .device-card {
      background: #111820; border: 1px solid #1e2430; border-radius: 12px;
      padding: 20px 20px 8px; margin-bottom: 28px; transition: border-color 0.2s;
    }
    .device-card:hover { border-color: #2a2f3a; }
    .device-card .section-title {
      font-size: 0.78rem; font-weight: 600; color: #4a5568;
      text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 14px;
    }
    /* ── Device toolbar ──────────────────── */
    .device-toolbar {
      display: flex; align-items: center; gap: 12px;
      margin-bottom: 14px; flex-wrap: wrap;
    }
    .device-toolbar .count-badge {
      font-size: 0.78rem; color: #4a5568; font-weight: 500;
      background: #0b0e14; padding: 4px 12px; border-radius: 6px;
      border: 1px solid #1e2430; white-space: nowrap;
    }
    .device-select {
      background: #0b0e14; border: 1px solid #1e2430;
      border-radius: 8px; padding: 7px 32px 7px 12px;
      color: #e1e7ef; font-size: 0.82rem; font-family: inherit;
      cursor: pointer; outline: none; min-width: 180px;
      -webkit-appearance: none; appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%234a5568' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
      background-repeat: no-repeat; background-position: right 10px center;
    }
    .device-select:hover, .device-select:focus { border-color: #2a2f3a; }
    .device-select option { background: #111820; color: #e1e7ef; }
    .table-wrap {
      max-height: 340px; overflow-y: auto; border: 1px solid #1e2430;
      border-radius: 8px; background: #0b0e14;
    }
    .table-wrap table { border-collapse: collapse; }
    .table-wrap thead { position: sticky; top: 0; z-index: 1; }
    .table-wrap thead th { background: #111820; }

    /* ── Table ─────────────────────────── */
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    th {
      text-align: left; color: #4a5568; font-weight: 600; padding: 10px 12px;
      border-bottom: 1px solid #1e2430; font-size: 0.72rem;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    td { padding: 10px 12px; border-bottom: 1px solid #141a24; color: #c9d1d9; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: rgba(30,36,48,0.4); }
    tr.active-row td { background: rgba(37,99,235,0.06); }
    td .mono { font-family: 'SF Mono', 'Cascadia Code', monospace; font-size: 0.8rem; color: #4a5568; }
    .device-link {
      color: #60a5fa; cursor: pointer; text-decoration: none; font-weight: 500;
      transition: color 0.15s;
    }
    .device-link:hover { color: #93c5fd; text-decoration: underline; }
    .status-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-right: 6px; }
    .status-active { color: #22c55e; }
    .status-inactive { color: #4a5568; }
    .report-link { text-decoration: none; font-size: 1rem; display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; background: #1e293b; transition: all 0.15s; }
    .report-link:hover { background: #2563eb; transform: scale(1.1); }

    /* ── API section ───────────────────── */
    .api-card {
      background: #111820; border: 1px solid #1e2430; border-radius: 12px;
      padding: 14px 20px; transition: border-color 0.2s;
    }
    .api-card:hover { border-color: #2a2f3a; }
    .api-toggle {
      color: #4a5568; font-size: 0.75rem; font-weight: 600; cursor: pointer;
      text-transform: uppercase; letter-spacing: 0.6px; user-select: none;
      display: flex; align-items: center; gap: 6px;
    }
    .api-toggle:hover { color: #8b9bb5; }
    .api-toggle .arrow { transition: transform 0.2s; font-size: 0.65rem; }
    .api-toggle.open .arrow { transform: rotate(90deg); }
    .api-list { margin-top: 12px; display: none; }
    .api-list.open { display: block; }
    .api-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 7px 0; border-bottom: 1px solid #141a24; font-size: 0.82rem;
    }
    .api-row:last-child { border-bottom: none; }
    .api-row code { color: #c9d1d9; font-size: 0.82rem; }
    .api-row .desc { color: #4a5568; font-size: 0.78rem; }
    .method {
      font-weight: 600; font-size: 0.65rem; padding: 2px 7px; border-radius: 4px;
      letter-spacing: 0.3px;
    }
    .method.get  { background: rgba(34,197,94,0.1); color: #4ade80; }
    .method.post { background: rgba(168,85,247,0.1); color: #c084fc; }

    /* ── Responsive ────────────────────── */
    @media (max-width: 900px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 1100px) {
      .charts-grid { grid-template-columns: 1fr 1fr; }
    }
    @media (max-width: 700px) {
      .charts-grid { grid-template-columns: 1fr; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
      .app { padding: 0 16px 32px; }
      .stat-card .stat-value { font-size: 1.5rem; }
      .topbar-title { font-size: 1rem; }
    }
  </style>
</head>
<body>
  <div class="layout">
    <!-- Sidebar -->
    <div class="sidebar">
      <div class="logo-area">
        <div class="logo">T</div>
        <div class="brand">Analytics <span>App</span></div>
      </div>
      <div class="nav-items">
        <div class="nav-item active"><span class="icon">📊</span><span>Dashboard</span></div>
        <div class="nav-item" onclick="window.location.href='/reports'"><span class="icon">📁</span><span>Reports</span></div>
        <div class="nav-item" onclick="window.location.href='/settings'"><span class="icon">⚙️</span><span>Settings</span></div>
      </div>
      <div class="user-area">
        <div class="user-name" id="userName">Loading...</div>
        <div class="user-email" id="userEmail"></div>
        <button class="logout-btn" id="logoutBtn">🚪 Sign Out</button>
      </div>
    </div>

    <div class="app">
    <!-- Top Bar -->
    <div class="topbar">
      <div class="topbar-left">
        <div class="topbar-logo">T</div>
        <div class="topbar-title">Analytics <span>Dashboard</span></div>
      </div>
      <div class="topbar-right">
        <span class="last-updated" id="lastUpdated">Loading...</span>
        <div class="live-badge"><span class="dot"></span> Live</div>
      </div>
    </div>

    <!-- Period Selector -->
    <div class="period-bar">
      <button class="period-pill active" data-days="1">Today</button>
      <button class="period-pill" data-days="7">7 Days</button>
      <button class="period-pill" data-days="30">30 Days</button>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid" id="statsGrid">
      <div class="stat-card">
        <div class="stat-icon">⏱</div>
        <div class="stat-value" id="totalTime">--</div>
        <div class="stat-label">Time Online</div>
        <div class="stat-glow" style="background:#2563eb;"></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📄</div>
        <div class="stat-value" id="totalVisits">--</div>
        <div class="stat-label">Visits</div>
        <div class="stat-glow" style="background:#22c55e;"></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🌐</div>
        <div class="stat-value" id="uniqueSites">--</div>
        <div class="stat-label">Sites</div>
        <div class="stat-glow" style="background:#c084fc;"></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">💻</div>
        <div class="stat-value" id="uniqueDevices">--</div>
        <div class="stat-label">Devices</div>
        <div class="stat-glow" style="background:#f59e0b;"></div>
      </div>
    </div>

    <!-- Charts -->
    <div class="charts-grid">
      <div class="chart-card">
        <div class="chart-header">
          <span class="chart-title">Top Sites</span>
          <span class="chart-count" id="topSitesCount"></span>
        </div>
        <canvas id="topSitesChart"></canvas>
      </div>
      <div class="chart-card">
        <div class="chart-header">
          <span class="chart-title">Daily Activity</span>
          <span class="chart-count" id="timelineCount"></span>
        </div>
        <canvas id="timelineChart"></canvas>
      </div>
      <div class="chart-card">
        <div class="chart-header">
          <span class="chart-title">Site Categories</span>
          <span class="chart-count" id="categoriesCount"></span>
        </div>
        <canvas id="categoriesChart"></canvas>
      </div>
    </div>

    <!-- Devices -->
    <div class="device-card">
      <div class="section-title">Registered Devices</div>
      <div class="device-toolbar">
        <select class="device-select" id="deviceSelect">
          <option value="">All Devices</option>
        </select>
        <span class="count-badge" id="deviceCount">0 devices</span>
      </div>
      <div class="table-wrap" id="devicesTableWrap">
        <table id="devicesTable">
          <thead><tr><th>Device</th><th>First Seen</th><th>Last Seen</th><th>Status</th><th style="width:60px;">Report</th></tr></thead>
          <tbody id="devicesBody"><tr><td colspan="5" style="text-align:center;color:#4a5568;padding:24px;">Loading...</td></tr></tbody>
        </table>
      </div>
    </div>

    <!-- API Endpoints -->
    <div class="api-card">
      <div class="api-toggle" id="apiToggle"><span class="arrow">▶</span> API Endpoints</div>
      <div class="api-list" id="apiList">
        <div class="api-row"><span><span class="method post">POST</span> <code>/api/analytics</code></span><span class="desc">Ingest visit data</span></div>
        <div class="api-row"><span><span class="method get">GET</span> <code>/api/reports/summary</code></span><span class="desc">Overall stats</span></div>
        <div class="api-row"><span><span class="method get">GET</span> <code>/api/reports/top-sites?days=N</code></span><span class="desc">Top sites</span></div>
        <div class="api-row"><span><span class="method get">GET</span> <code>/api/reports/timeline?days=N</code></span><span class="desc">Daily timeline</span></div>
        <div class="api-row"><span><span class="method get">GET</span> <code>/api/reports/devices</code></span><span class="desc">Registered devices</span></div>
        <div class="api-row"><span><span class="method get">GET</span> <code>/api/health</code></span><span class="desc">Health check</span></div>
      </div>
    </div>
  </div>
  </div>

  <script>
    // Redirect to login if no token
    if (!localStorage.getItem('token')) {
      window.location.href = '/login';
    }

    var currentDays = 1;
    var selectedDeviceId = null;
    var topSitesChartInstance = null;
    var timelineChartInstance = null;
    var categoriesChartInstance = null;
    var cachedDevices = [];

    function formatTime(seconds) {
      if (seconds < 60) return seconds + 's';
      if (seconds < 3600) return Math.floor(seconds / 60) + 'm ' + (seconds % 60) + 's';
      var h = Math.floor(seconds / 3600);
      var m = Math.floor((seconds % 3600) / 60);
      return h + 'h ' + m + 'm';
    }

    function selectDevice(deviceId) {
      selectedDeviceId = deviceId;
      loadDashboard();
    }

    function loadDashboard() {
      document.getElementById('lastUpdated').textContent = 'Refreshing...';
      var token = localStorage.getItem('token') || '';
      var headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
      };
      var devParam = selectedDeviceId ? '&deviceId=' + selectedDeviceId : '';

      Promise.all([
        fetch('/api/reports/summary' + (selectedDeviceId ? '?deviceId=' + selectedDeviceId : ''), { headers: headers }).then(function (r) { return r.json(); }),
        fetch('/api/reports/top-sites?days=' + currentDays + '&limit=10' + devParam, { headers: headers }).then(function (r) { return r.json(); }),
        fetch('/api/reports/timeline?days=' + currentDays + devParam, { headers: headers }).then(function (r) { return r.json(); }),
        fetch('/api/reports/categories?days=' + currentDays + devParam, { headers: headers }).then(function (r) { return r.json(); }),
        fetch('/api/reports/devices', { headers: headers }).then(function (r) { return r.json(); }),
      ]).then(function (results) {
        var summary = results[0];
        var topSites = results[1];
        var timeline = results[2];
        var categoriesData = results[3];
        var devicesData = results[4];
        cachedDevices = devicesData.devices || [];

        // Update user info in sidebar
        var userData = localStorage.getItem('user');
        if (userData) {
          try {
            var u = JSON.parse(userData);
            document.getElementById('userName').textContent = u.displayName || u.email;
            document.getElementById('userEmail').textContent = u.email;
          } catch(e) {}
        }
        var stats = summary.stats || {};

        var selectedDeviceName = '';
        if (selectedDeviceId) {
          var found = cachedDevices.find(function (d) { return d.id === selectedDeviceId; });
          selectedDeviceName = found ? (found.name || found.id.slice(0, 8) + '...') : selectedDeviceId.slice(0, 8) + '...';
        }

        document.getElementById('totalTime').textContent = formatTime(stats.total_seconds || 0);
        document.getElementById('totalVisits').textContent = stats.total_visits || 0;
        document.getElementById('uniqueSites').textContent = stats.unique_domains || 0;
        document.getElementById('uniqueDevices').textContent = selectedDeviceName || (stats.unique_devices || 0);

        // Top Sites chart
        var sites = topSites.rows || [];
        document.getElementById('topSitesCount').textContent = sites.length + ' sites';
        if (topSitesChartInstance) topSitesChartInstance.destroy();
        var colors = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#7c3aed', '#8b5cf6', '#a78bfa', '#22c55e', '#34d399', '#6ee7b7'];
        topSitesChartInstance = new Chart(document.getElementById('topSitesChart'), {
          type: 'bar',
          data: {
            labels: sites.map(function (s) { return s.domain; }).reverse(),
            datasets: [{
              data: sites.map(function (s) { return s.total_seconds; }).reverse(),
              backgroundColor: sites.map(function (_, i) { return colors[i % colors.length]; }).reverse(),
              borderRadius: 3,
              borderSkipped: false,
            }]
          },
          options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { color: '#1e2430', drawBorder: false }, ticks: { color: '#4a5568', font: { size: 10 } } },
              y: { grid: { display: false }, ticks: { color: '#8b9bb5', font: { size: 11 } } }
            }
          }
        });

        // Timeline chart
        var days = timeline.rows || [];
        document.getElementById('timelineCount').textContent = days.length + ' days';
        if (timelineChartInstance) timelineChartInstance.destroy();
        timelineChartInstance = new Chart(document.getElementById('timelineChart'), {
          type: 'line',
          data: {
            labels: days.map(function (d) { return d.visit_date; }),
            datasets: [{
              label: 'Minutes',
              data: days.map(function (d) { return Math.round(d.total_seconds / 60); }),
              borderColor: '#2563eb',
              backgroundColor: function (ctx) {
                var g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 280);
                g.addColorStop(0, 'rgba(37,99,235,0.25)');
                g.addColorStop(1, 'rgba(37,99,235,0.01)');
                return g;
              },
              fill: true, tension: 0.35,
              pointBackgroundColor: '#2563eb', pointRadius: 3,
              pointHoverRadius: 6, borderWidth: 2,
            }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { color: '#1e2430', drawBorder: false }, ticks: { color: '#4a5568', font: { size: 10 } } },
              y: { grid: { color: '#1e2430', drawBorder: false }, ticks: { color: '#4a5568', font: { size: 10 } }, beginAtZero: true }
            },
            interaction: { intersect: false, mode: 'index' }
          }
        });

        // Categories donut chart
        var cats = categoriesData.categories || [];
        document.getElementById('categoriesCount').textContent = cats.length + ' categories';
        if (categoriesChartInstance) categoriesChartInstance.destroy();
        categoriesChartInstance = new Chart(document.getElementById('categoriesChart'), {
          type: 'doughnut',
          data: {
            labels: cats.map(function (c) { return c.category; }),
            datasets: [{
              data: cats.map(function (c) { return Math.round(c.total_seconds / 60); }),
              backgroundColor: cats.map(function (c) { return c.color || '#4a5568'; }),
              borderColor: '#111820',
              borderWidth: 2,
            }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: { color: '#8b9bb5', font: { size: 10 }, padding: 12, boxWidth: 12 }
              }
            },
            cutout: '60%',
          }
        });

        // Device dropdown
        var devices = cachedDevices;
        var sel = document.getElementById('deviceSelect');
        sel.innerHTML = '<option value="">All Devices</option>';
        devices.forEach(function (d) {
          var label = d.name || d.id.slice(0, 8) + '...';
          var opt = document.createElement('option');
          opt.value = d.id;
          opt.textContent = label;
          if (d.id === selectedDeviceId) opt.selected = true;
          sel.appendChild(opt);
        });
        document.getElementById('deviceCount').textContent = devices.length + ' device' + (devices.length !== 1 ? 's' : '');

        // Devices table
        var tbody = document.getElementById('devicesBody');
        if (devices.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#4a5568;padding:24px;">No devices registered yet.</td></tr>';
        } else {
          var html = '';
          devices.forEach(function (d) {
            var st = d.is_active ? '<span class="status-active"><span class="status-dot" style="background:#22c55e;"></span>Active</span>' : '<span class="status-inactive"><span class="status-dot" style="background:#4a5568;"></span>Inactive</span>';
            var lastSeenLabel = d.last_seen || '';
            // If inactive, append a note showing last data time
            if (!d.is_active && d.last_seen) {
              st = '<span class="status-inactive"><span class="status-dot" style="background:#f59e0b;"></span>Inactive</span><div style="font-size:0.7rem;color:#6b7a8f;margin-top:2px;">Last data: ' + d.last_seen + '</div>';
            }
            var nm = d.name || '<span class="mono">' + (d.id || '').slice(0, 8) + '...</span>';
            var ac = d.id === selectedDeviceId ? ' class="active-row"' : '';
            html += '<tr' + ac + '><td><a class="device-link" data-did="' + d.id + '" href="#">' + nm + '</a></td><td style="color:#6b7a8f;">' + (d.first_seen || '') + '</td><td style="color:#6b7a8f;">' + (d.last_seen || '') + '</td><td>' + st + '</td><td><a class="report-link" href="/reports?deviceId=' + d.id + '" title="View report for ' + (d.name || d.id) + '">📊</a></td></tr>';
          });
          tbody.innerHTML = html;
          tbody.querySelectorAll('.device-link').forEach(function (el) {
            el.addEventListener('click', function (e) { e.preventDefault(); selectDevice(this.getAttribute('data-did') || null); });
          });
        }

        document.getElementById('lastUpdated').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      }).catch(function () {
        document.getElementById('lastUpdated').textContent = 'Error';
      });
    }

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', function () {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    });

    // Device dropdown change
    document.getElementById('deviceSelect').addEventListener('change', function () {
      selectDevice(this.value || null);
    });

    // Period pills
    document.querySelectorAll('.period-pill').forEach(function (el) {
      el.addEventListener('click', function () {
        document.querySelectorAll('.period-pill').forEach(function (p) { p.classList.remove('active'); });
        this.classList.add('active');
        currentDays = parseInt(this.getAttribute('data-days'));
        loadDashboard();
      });
    });

    // API toggle
    document.getElementById('apiToggle').addEventListener('click', function () {
      this.classList.toggle('open');
      document.getElementById('apiList').classList.toggle('open');
    });

    loadDashboard();
    setInterval(loadDashboard, 30000);
  </script>
</body>
</html>
  `);
});

// ── Reports page ───────────────────────────────────────────
app.get('/reports', function (_req, res) {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reports — Analytics</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html { font-size: 15px; }
    body {
      font-family: 'Inter', sans-serif;
      background: #0b0e14; color: #e1e7ef; display: flex; min-height: 100vh;
    }
    .sidebar {
      width: 220px; min-height: 100vh;
      background: #0f131a; border-right: 1px solid #1e2430;
      display: flex; flex-direction: column; flex-shrink: 0;
    }
    .sidebar .logo-area { padding: 20px 18px 16px; border-bottom: 1px solid #1e2430; display: flex; align-items: center; gap: 10px; }
    .sidebar .logo-area .logo { width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(135deg, #2563eb, #1d4ed8); display: flex; align-items: center; justify-content: center; font-size: 16px; color: #fff; font-weight: 700; box-shadow: 0 3px 10px rgba(37,99,235,0.3); }
    .sidebar .logo-area .brand { font-size: 0.95rem; font-weight: 700; color: #f0f3f8; }
    .sidebar .logo-area .brand span { color: #4a5568; font-weight: 400; }
    .sidebar .nav-items { flex: 1; padding: 12px 10px; }
    .sidebar .nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; font-size: 0.82rem; color: #6b7a8f; cursor: pointer; transition: all 0.15s; margin-bottom: 2px; }
    .sidebar .nav-item:hover { background: #161b22; color: #c9d1d9; }
    .sidebar .nav-item.active { background: #1e293b; color: #f0f3f8; }
    .sidebar .nav-item .icon { font-size: 1rem; width: 22px; text-align: center; }
    .sidebar .user-area { padding: 14px 14px 18px; border-top: 1px solid #1e2430; }
    .sidebar .user-area .user-name { font-size: 0.82rem; font-weight: 600; color: #c9d1d9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sidebar .user-area .user-email { font-size: 0.72rem; color: #4a5568; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 10px; }
    .sidebar .user-area .logout-btn { width: 100%; background: none; border: 1px solid #1e2430; border-radius: 6px; padding: 7px; color: #6b7a8f; font-size: 0.78rem; cursor: pointer; font-family: inherit; }
    .sidebar .user-area .logout-btn:hover { border-color: #f43f5e; color: #f43f5e; }

    .main { flex: 1; padding: 28px 32px; max-width: 1100px; }
    .main h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 4px; }
    .main .sub { color: #4a5568; font-size: 0.85rem; margin-bottom: 24px; }

    .filter-bar { display: flex; align-items: flex-end; gap: 14px; flex-wrap: wrap; margin-bottom: 24px; background: #111820; border: 1px solid #1e2430; border-radius: 10px; padding: 16px 20px; }
    .filter-group { display: flex; flex-direction: column; gap: 4px; }
    .filter-group label { font-size: 0.72rem; color: #6b7a8f; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
    .filter-group select, .filter-group input { background: #0b0e14; border: 1px solid #1e2430; border-radius: 6px; padding: 8px 10px; color: #e1e7ef; font-size: 0.85rem; font-family: inherit; outline: none; min-width: 150px; }
    .filter-group select:focus, .filter-group input:focus { border-color: #2563eb; }
    .filter-bar .gen-btn { background: #2563eb; border: none; border-radius: 6px; padding: 8px 20px; color: #fff; font-size: 0.85rem; font-weight: 500; cursor: pointer; font-family: inherit; }
    .filter-bar .gen-btn:hover { background: #1d4ed8; }

    .report-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .stat-card { background: #111820; border: 1px solid #1e2430; border-radius: 10px; padding: 16px; text-align: center; }
    .stat-card .stat-icon { font-size: 1.3rem; margin-bottom: 6px; }
    .stat-card .stat-value { font-size: 1.2rem; font-weight: 700; color: #f0f3f8; }
    .stat-card .stat-label { font-size: 0.75rem; color: #4a5568; margin-top: 2px; }

    .charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    @media (max-width: 800px) { .charts-row { grid-template-columns: 1fr; } }
    .chart-card { background: #111820; border: 1px solid #1e2430; border-radius: 10px; padding: 18px; }
    .chart-card h3 { font-size: 0.9rem; color: #f0f3f8; margin-bottom: 12px; font-weight: 600; }
    .chart-card .chart-container { position: relative; height: 220px; }

    .data-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
    .data-table th { text-align: left; padding: 8px 10px; color: #6b7a8f; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #1e2430; }
    .data-table td { padding: 10px; border-bottom: 1px solid #141a24; color: #c9d1d9; }
    .data-table tr:hover td { background: #141a24; }
    .data-table .num { text-align: right; font-variant-numeric: tabular-nums; }
    .loading-msg { text-align: center; color: #4a5568; padding: 40px; font-size: 0.9rem; }
    .empty-msg { text-align: center; color: #4a5568; padding: 30px; font-size: 0.85rem; }
  </style>
</head>
<body>
  <div class="sidebar">
    <div class="logo-area"><div class="logo">T</div><div class="brand">Analytics <span>App</span></div></div>
    <div class="nav-items">
      <div class="nav-item" onclick="window.location.href='/'"><span class="icon">📊</span><span>Dashboard</span></div>
      <div class="nav-item active"><span class="icon">📁</span><span>Reports</span></div>
      <div class="nav-item" onclick="window.location.href='/settings'"><span class="icon">⚙️</span><span>Settings</span></div>
    </div>
    <div class="user-area">
      <div class="user-name" id="userName">Loading...</div>
      <div class="user-email" id="userEmail"></div>
      <button class="logout-btn" onclick="localStorage.removeItem('token');localStorage.removeItem('user');window.location.href='/login'">🚪 Sign Out</button>
    </div>
  </div>
  <div class="main">
    <h1>Reports</h1>
    <div class="sub">Filter analytics by device and date range</div>

    <!-- Filter Bar -->
    <div class="filter-bar">
      <div class="filter-group">
        <label>Device</label>
        <select id="deviceSelect"><option value="">All Devices</option></select>
      </div>
      <div class="filter-group">
        <label>From</label>
        <input type="date" id="fromDate" />
      </div>
      <div class="filter-group">
        <label>To</label>
        <input type="date" id="toDate" />
      </div>
      <div class="filter-group" style="justify-content:flex-end;flex-direction:row;gap:8px;">
        <button class="gen-btn" id="generateBtn">⟳ Generate Report</button>
        <button class="gen-btn" id="downloadBtn" style="background:#1a2e4a;" title="Download report as HTML">📥 Download</button>
      </div>
    </div>

    <!-- Summary Stats -->
    <div class="report-grid" id="statsGrid">
      <div class="stat-card"><div class="stat-icon">⏱</div><div class="stat-value">-</div><div class="stat-label">Time Online</div></div>
      <div class="stat-card"><div class="stat-icon">📄</div><div class="stat-value">-</div><div class="stat-label">Visits</div></div>
      <div class="stat-card"><div class="stat-icon">🌐</div><div class="stat-value">-</div><div class="stat-label">Sites</div></div>
      <div class="stat-card"><div class="stat-icon">📅</div><div class="stat-value">-</div><div class="stat-label">Active Days</div></div>
    </div>

    <!-- Charts -->
    <div class="charts-row">
      <div class="chart-card"><h3>Top Sites</h3><div class="chart-container"><canvas id="topSitesChart"></canvas></div></div>
      <div class="chart-card"><h3>Daily Activity</h3><div class="chart-container"><canvas id="timelineChart"></canvas></div></div>
    </div>
    <div class="charts-row">
      <div class="chart-card"><h3>Site Categories</h3><div class="chart-container"><canvas id="categoriesChart"></canvas></div></div>
      <div class="chart-card"><h3>Top Sites (Table)</h3>
        <div style="max-height:220px;overflow-y:auto;">
          <table class="data-table">
            <thead><tr><th>#</th><th>Domain</th><th class="num">Visits</th><th class="num">Time</th><th class="num">Avg/Visit</th></tr></thead>
            <tbody id="topSitesBody"><tr><td colspan="5" class="empty-msg">No data</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <script>
    var token = localStorage.getItem('token');
    if (!token) { window.location.href = '/login'; }

    var charts = {};
    var lastSummary = null, lastTopSites = null, lastTimeline = null, lastCategories = null;
    var lastDeviceId = '', lastFrom = '', lastTo = '';

    function api(path) {
      return fetch(path, { headers: { 'Authorization': 'Bearer ' + token } }).then(function (r) { return r.json(); });
    }

    function fmtTime(s) {
      if (!s || s === 0) return '0m';
      var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
      return (h ? h + 'h ' : '') + m + 'm';
    }

    function destroyChart(key) { if (charts[key]) { charts[key].destroy(); delete charts[key]; } }

    function fmtTimeFull(s) {
      if (!s || s === 0) return '0 seconds';
      var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
      var parts = [];
      if (h) parts.push(h + 'h');
      if (m) parts.push(m + 'm');
      if (sec) parts.push(sec + 's');
      return parts.join(' ') || '0s';
    }

    function downloadReport() {
      if (!lastSummary && !lastTopSites) { alert('No report data to download. Click Generate Report first.'); return; }

      var deviceLabel = document.getElementById('deviceSelect').selectedOptions[0].textContent;
      var fromLabel = document.getElementById('fromDate').value || 'N/A';
      var toLabel = document.getElementById('toDate').value || 'N/A';
      var now = new Date();
      var dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

      var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Analytics Report</title>';
      html += '<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:30px auto;padding:0 20px;color:#1a1a2e;background:#fff;}';
      html += 'h1{color:#1a1a2e;border-bottom:2px solid #2563eb;padding-bottom:8px;}';
      html += '.meta{color:#6b7280;font-size:0.9rem;margin-bottom:20px;}';
      html += 'h2{color:#2563eb;margin-top:24px;}';
      html += 'table{width:100%;border-collapse:collapse;margin:10px 0;}';
      html += 'th{background:#f3f4f6;text-align:left;padding:8px 10px;font-size:0.85rem;border-bottom:2px solid #d1d5db;}';
      html += 'td{padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:0.9rem;}';
      html += 'tr:hover td{background:#f9fafb;}';
      html += '.num{text-align:right;}';
      html += '.stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0;}';
      html += '.stat-card{background:#f3f4f6;border-radius:8px;padding:14px;text-align:center;}';
      html += '.stat-card .val{font-size:1.3rem;font-weight:700;color:#1a1a2e;}';
      html += '.stat-card .lbl{font-size:0.75rem;color:#6b7280;margin-top:4px;}';
      html += '.footer{color:#9ca3af;font-size:0.8rem;margin-top:30px;border-top:1px solid #e5e7eb;padding-top:12px;text-align:center;}';
      html += '</style></head><body>';

      html += '<h1>📊 Analytics Report</h1>';
      html += '<div class="meta">Generated: ' + dateStr + ' &nbsp;|&nbsp; Device: ' + deviceLabel + ' &nbsp;|&nbsp; Period: ' + fromLabel + ' → ' + toLabel + '</div>';

      // Summary
      if (lastSummary) {
        html += '<h2>Summary</h2><div class="stat-grid">';
        html += '<div class="stat-card"><div class="val">' + fmtTime(lastSummary.total_seconds) + '</div><div class="lbl">Time Online</div></div>';
        html += '<div class="stat-card"><div class="val">' + (lastSummary.total_visits || 0) + '</div><div class="lbl">Visits</div></div>';
        html += '<div class="stat-card"><div class="val">' + (lastSummary.unique_domains || 0) + '</div><div class="lbl">Sites</div></div>';
        html += '<div class="stat-card"><div class="val">' + (lastSummary.active_days || 0) + '</div><div class="lbl">Active Days</div></div>';
        html += '</div>';
      }

      // Top Sites
      if (lastTopSites && lastTopSites.length > 0) {
        html += '<h2>Top Sites</h2><table><thead><tr><th>#</th><th>Domain</th><th class="num">Visits</th><th class="num">Time</th><th class="num">Avg/Visit</th></tr></thead><tbody>';
        lastTopSites.forEach(function (r, i) {
          html += '<tr><td>' + (i+1) + '</td><td>' + r.domain + '</td><td class="num">' + r.visit_count + '</td><td class="num">' + fmtTimeFull(r.total_seconds) + '</td><td class="num">' + (r.avg_seconds_per_visit || 0) + 's</td></tr>';
        });
        html += '</tbody></table>';
      }

      // Timeline
      if (lastTimeline && lastTimeline.length > 0) {
        html += '<h2>Daily Activity</h2><table><thead><tr><th>Date</th><th class="num">Visits</th><th class="num">Time</th></tr></thead><tbody>';
        lastTimeline.forEach(function (r) {
          html += '<tr><td>' + r.visit_date + '</td><td class="num">' + r.visit_count + '</td><td class="num">' + fmtTimeFull(r.total_seconds) + '</td></tr>';
        });
        html += '</tbody></table>';
      }

      // Categories
      if (lastCategories && lastCategories.length > 0) {
        html += '<h2>Site Categories</h2><table><thead><tr><th>Category</th><th class="num">Time</th><th class="num">Visits</th></tr></thead><tbody>';
        lastCategories.forEach(function (c) {
          html += '<tr><td>' + c.category + '</td><td class="num">' + fmtTimeFull(c.total_seconds) + '</td><td class="num">' + c.total_visits + '</td></tr>';
        });
        html += '</tbody></table>';
      }

      html += '<div class="footer">Time Analytics Tracker — Auto-generated report</div>';
      html += '</body></html>';

      var blob = new Blob([html], { type: 'text/html' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'analytics-report-' + now.toISOString().slice(0, 10) + '.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    function loadReport() {
      var deviceId = document.getElementById('deviceSelect').value;
      var from = document.getElementById('fromDate').value;
      var to = document.getElementById('toDate').value;
      lastDeviceId = deviceId; lastFrom = from; lastTo = to;
      var params = '';
      if (deviceId) params += '&deviceId=' + deviceId;
      if (from) params += '&from=' + from;
      if (to) params += '&to=' + to;
      var base = '/api/reports';

      // Summary
      api(base + '/summary?' + params.substring(1)).then(function (d) {
        if (d.stats) {
          lastSummary = d.stats;
          document.querySelector('#statsGrid .stat-card:nth-child(1) .stat-value').textContent = fmtTime(d.stats.total_seconds);
          document.querySelector('#statsGrid .stat-card:nth-child(2) .stat-value').textContent = d.stats.total_visits || 0;
          document.querySelector('#statsGrid .stat-card:nth-child(3) .stat-value').textContent = d.stats.unique_domains || 0;
          document.querySelector('#statsGrid .stat-card:nth-child(4) .stat-value').textContent = d.stats.active_days || 0;
        }
      });

      // Top Sites (chart + table)
      api(base + '/top-sites?limit=10' + params).then(function (d) {
        destroyChart('topSites');
        var tbody = document.getElementById('topSitesBody');
        if (!d.rows || d.rows.length === 0) {
          lastTopSites = null;
          tbody.innerHTML = '<tr><td colspan="5" class="empty-msg">No data</td></tr>';
          return;
        }
        lastTopSites = d.rows;
        var labels = [], data = [], colors = [];
        var html = '';
        d.rows.forEach(function (r, i) {
          labels.push(r.domain);
          data.push(Math.round(r.total_seconds / 60));
          colors.push('hsl(' + (i * 35) + ', 60%, 50%)');
          html += '<tr><td>' + (i+1) + '</td><td>' + r.domain + '</td><td class="num">' + r.visit_count + '</td><td class="num">' + fmtTime(r.total_seconds) + '</td><td class="num">' + (r.avg_seconds_per_visit || 0) + 's</td></tr>';
        });
        tbody.innerHTML = html;
        var ctx = document.getElementById('topSitesChart').getContext('2d');
        charts.topSites = new Chart(ctx, {
          type: 'bar',
          data: { labels: labels, datasets: [{ label: 'Minutes', data: data, backgroundColor: colors, borderRadius: 4 }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
            scales: { x: { ticks: { color: '#6b7a8f', font: { size: 10 } } }, y: { ticks: { color: '#6b7a8f' }, grid: { color: '#1e2430' } } } }
        });
      });

      // Timeline
      api(base + '/timeline?' + params.substring(1)).then(function (d) {
        destroyChart('timeline');
        if (!d.rows || d.rows.length === 0) { lastTimeline = null; return; }
        lastTimeline = d.rows;
        var labels = [], data = [];
        d.rows.forEach(function (r) { labels.push(r.visit_date); data.push(Math.round(r.total_seconds / 60)); });
        var ctx = document.getElementById('timelineChart').getContext('2d');
        charts.timeline = new Chart(ctx, {
          type: 'line',
          data: { labels: labels, datasets: [{ label: 'Minutes', data: data, borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.1)', fill: true, tension: 0.3, pointRadius: 3 }] },
          options: { responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { ticks: { color: '#6b7a8f', font: { size: 10 } } }, y: { ticks: { color: '#6b7a8f' }, grid: { color: '#1e2430' } } } }
        });
      });

      // Categories
      api(base + '/categories?' + params.substring(1)).then(function (d) {
        destroyChart('categories');
        if (!d.categories || d.categories.length === 0) { lastCategories = null; return; }
        lastCategories = d.categories;
        var labels = [], data = [], colors = [];
        d.categories.forEach(function (c) { labels.push(c.category); data.push(Math.round(c.total_seconds / 60)); colors.push(c.color || '#4a5568'); });
        var ctx = document.getElementById('categoriesChart').getContext('2d');
        charts.categories = new Chart(ctx, {
          type: 'doughnut',
          data: { labels: labels, datasets: [{ data: data, backgroundColor: colors, borderColor: '#111820', borderWidth: 2 }] },
          options: { responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'right', labels: { color: '#8b9bb5', font: { size: 10 }, boxWidth: 12 } } } }
        });
      });
    }

    // Parse URL query params
    var urlParams = new URLSearchParams(window.location.search);
    var urlDeviceId = urlParams.get('deviceId') || '';

    // Set default date range (last 7 days)
    (function () {
      var today = new Date();
      var sevenAgo = new Date(today);
      sevenAgo.setDate(sevenAgo.getDate() - 7);
      document.getElementById('fromDate').value = sevenAgo.toISOString().split('T')[0];
      document.getElementById('toDate').value = today.toISOString().split('T')[0];
    })();

    document.getElementById('generateBtn').addEventListener('click', loadReport);
    document.getElementById('downloadBtn').addEventListener('click', downloadReport);

    // Load user info
    api('/api/auth/me').then(function (d) {
      if (d.user) {
        document.getElementById('userName').textContent = d.user.displayName || d.user.email;
        document.getElementById('userEmail').textContent = d.user.email;
      }
    });

    // Load devices for filter, then auto-select from URL and auto-load
    api('/api/reports/devices').then(function (d) {
      var sel = document.getElementById('deviceSelect');
      if (d.devices) {
        d.devices.forEach(function (dev) {
          var opt = document.createElement('option');
          opt.value = dev.id;
          opt.textContent = dev.name || dev.id;
          if (dev.id === urlDeviceId) opt.selected = true;
          sel.appendChild(opt);
        });
      }
      // Auto-load report after devices are ready
      loadReport();
    });
  </script>
</body>
</html>
  `);
});

// ── Settings page ──────────────────────────────────────────
app.get('/settings', function (_req, res) {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Settings — Analytics</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html { font-size: 15px; }
    body {
      font-family: 'Inter', sans-serif;
      background: #0b0e14; color: #e1e7ef; display: flex; min-height: 100vh;
    }
    .sidebar {
      width: 220px; min-height: 100vh;
      background: #0f131a; border-right: 1px solid #1e2430;
      display: flex; flex-direction: column; flex-shrink: 0;
    }
    .sidebar .logo-area { padding: 20px 18px 16px; border-bottom: 1px solid #1e2430; display: flex; align-items: center; gap: 10px; }
    .sidebar .logo-area .logo { width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(135deg, #2563eb, #1d4ed8); display: flex; align-items: center; justify-content: center; font-size: 16px; color: #fff; font-weight: 700; box-shadow: 0 3px 10px rgba(37,99,235,0.3); }
    .sidebar .logo-area .brand { font-size: 0.95rem; font-weight: 700; color: #f0f3f8; }
    .sidebar .logo-area .brand span { color: #4a5568; font-weight: 400; }
    .sidebar .nav-items { flex: 1; padding: 12px 10px; }
    .sidebar .nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; font-size: 0.82rem; color: #6b7a8f; cursor: pointer; transition: all 0.15s; margin-bottom: 2px; }
    .sidebar .nav-item:hover { background: #161b22; color: #c9d1d9; }
    .sidebar .nav-item.active { background: #1e293b; color: #f0f3f8; }
    .sidebar .nav-item .icon { font-size: 1rem; width: 22px; text-align: center; }
    .sidebar .user-area { padding: 14px 14px 18px; border-top: 1px solid #1e2430; }
    .sidebar .user-area .user-name { font-size: 0.82rem; font-weight: 600; color: #c9d1d9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sidebar .user-area .user-email { font-size: 0.72rem; color: #4a5568; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 10px; }
    .sidebar .user-area .logout-btn { width: 100%; background: none; border: 1px solid #1e2430; border-radius: 6px; padding: 7px; color: #6b7a8f; font-size: 0.78rem; cursor: pointer; font-family: inherit; }
    .sidebar .user-area .logout-btn:hover { border-color: #f43f5e; color: #f43f5e; }

    .main { flex: 1; padding: 28px 32px; max-width: 960px; }
    .main h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 4px; }
    .main .sub { color: #4a5568; font-size: 0.85rem; margin-bottom: 28px; }

    .section { margin-bottom: 28px; }
    .section h2 { font-size: 0.9rem; color: #f0f3f8; margin-bottom: 14px; font-weight: 600; }
    .card { background: #111820; border: 1px solid #1e2430; border-radius: 10px; padding: 20px; }
    .card .row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #141a24; }
    .card .row:last-child { border-bottom: none; }
    .card .row .label { font-size: 0.82rem; color: #8b9bb5; }
    .card .row .value { font-size: 0.85rem; color: #e1e7ef; font-weight: 500; }
    .card input { background: #0b0e14; border: 1px solid #1e2430; border-radius: 6px; padding: 8px 10px; color: #e1e7ef; font-size: 0.85rem; font-family: inherit; outline: none; width: 200px; }
    .card input:focus { border-color: #2563eb; }
    .card .btn { background: #2563eb; border: none; border-radius: 6px; padding: 7px 16px; color: #fff; font-size: 0.8rem; font-weight: 500; cursor: pointer; font-family: inherit; }
    .card .btn:hover { background: #1d4ed8; }
    .card .btn:disabled { opacity: 0.5; cursor: default; }
    .card .msg { font-size: 0.78rem; margin-top: 8px; display: none; }
    .card .msg.success { color: #22c55e; display: block; }
    .card .msg.error { color: #f87171; display: block; }
    .date-range { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .date-range input[type="date"] { background: #0b0e14; border: 1px solid #1e2430; border-radius: 6px; padding: 8px 10px; color: #e1e7ef; font-size: 0.82rem; font-family: inherit; outline: none; }
    .date-range input[type="date"]:focus { border-color: #2563eb; }
    .users-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
    .users-table th { text-align: left; padding: 8px 10px; color: #6b7a8f; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #1e2430; }
    .users-table td { padding: 10px; border-bottom: 1px solid #141a24; color: #c9d1d9; }
    .users-table tr:hover td { background: #141a24; }
    .users-table .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 0.72rem; font-weight: 500; }
    .users-table .badge.admin { background: #1e3a5f; color: #60a5fa; }
    .users-table .badge.active { background: #14532d; color: #4ade80; }
    .users-table .user-avatar { width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, #2563eb, #1d4ed8); display: inline-flex; align-items: center; justify-content: center; font-size: 0.75rem; color: #fff; font-weight: 700; }
    .card .user-count { font-size: 0.82rem; color: #8b9bb5; margin-top: 8px; text-align: center; }
  </style>
</head>
<body>
  <div class="sidebar">
    <div class="logo-area"><div class="logo">T</div><div class="brand">Analytics <span>App</span></div></div>
    <div class="nav-items">
      <div class="nav-item" onclick="window.location.href='/'" data-page="dashboard"><span class="icon">📊</span><span>Dashboard</span></div>
      <div class="nav-item" onclick="window.location.href='/'"><span class="icon">📁</span><span>Reports</span></div>
      <div class="nav-item active"><span class="icon">⚙️</span><span>Settings</span></div>
    </div>
    <div class="user-area">
      <div class="user-name" id="userName">Loading...</div>
      <div class="user-email" id="userEmail"></div>
      <button class="logout-btn" onclick="localStorage.removeItem('token');localStorage.removeItem('user');window.location.href='/login'">🚪 Sign Out</button>
    </div>
  </div>
  <div class="main">
    <h1>Settings</h1>
    <div class="sub">Manage your account</div>

    <div class="section">
      <h2>Profile</h2>
      <div class="card">
        <div class="row"><span class="label">Email</span><span class="value" id="profileEmail">-</span></div>
        <div class="row"><span class="label">Display Name</span><span class="value" id="profileName">-</span></div>
        <div class="row" style="gap:10px;flex-wrap:wrap;"><span class="label">Change Name</span><input type="text" id="nameInput" placeholder="New display name" /><button class="btn" id="updateNameBtn">Update</button><span class="msg" id="nameMsg"></span></div>
        <div class="row"><span class="label">Member Since</span><span class="value" id="profileSince">-</span></div>
      </div>
    </div>

    <div class="section">
      <h2>Password</h2>
      <div class="card">
        <div class="row" style="gap:10px;flex-wrap:wrap;"><span class="label">Current</span><input type="password" id="currentPw" placeholder="Current password" /></div>
        <div class="row" style="gap:10px;flex-wrap:wrap;"><span class="label">New</span><input type="password" id="newPw" placeholder="New password (6+ chars)" /></div>
        <div class="row" style="gap:10px;flex-wrap:wrap;"><span class="label"></span><button class="btn" id="changePwBtn">Change Password</button><span class="msg" id="pwMsg"></span></div>
      </div>
    </div>

    <div class="section">
      <h2>Users <span style="font-weight:400;color:#4a5568;font-size:0.78rem;">(registered accounts)</span></h2>
      <div class="card" style="padding:0;overflow:hidden;">
        <table class="users-table">
          <thead>
            <tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Last Login</th></tr>
          </thead>
          <tbody id="usersBody">
            <tr><td colspan="6" style="text-align:center;color:#4a5568;padding:20px;">Loading...</td></tr>
          </tbody>
        </table>
        <div class="user-count" id="userCount"></div>
      </div>
    </div>
  </div>
  <script>
    var token = localStorage.getItem('token');
    if (!token) { window.location.href = '/login'; }

    function api(endpoint, opts) {
      opts = opts || {};
      opts.headers = opts.headers || {};
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Authorization'] = 'Bearer ' + token;
      return fetch('/api/auth' + endpoint, opts).then(function (r) { return r.json(); });
    }

    // Current user info
    var currentUserId = null;

    // Load profile
    api('/me').then(function (d) {
      if (d.user) {
        currentUserId = d.user.id;
        document.getElementById('userName').textContent = d.user.displayName || d.user.email;
        document.getElementById('userEmail').textContent = d.user.email;
        document.getElementById('profileEmail').textContent = d.user.email;
        document.getElementById('profileName').textContent = d.user.displayName || '(not set)';
        document.getElementById('profileSince').textContent = d.user.createdAt || '-';
      }
    });

    // Load all users
    function loadUsers() {
      api('/users').then(function (d) {
        var tbody = document.getElementById('usersBody');
        if (!d.users || d.users.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#4a5568;padding:20px;">No users found</td></tr>';
          return;
        }
        var html = '';
        d.users.forEach(function (u) {
          var initial = (u.displayName || u.email || '?')[0].toUpperCase();
          var isMe = u.id === currentUserId;
          var role = isMe ? '<span class="badge admin">Admin</span>' : '<span class="badge active">User</span>';
          var status = '<span style="color:#4ade80;">&#9679;</span> Active';
          var joined = u.createdAt ? u.createdAt.split('T')[0] : '-';
          var lastLogin = u.lastLogin ? u.lastLogin.split('T')[0] : 'Never';
          html += '<tr>';
          html += '<td><div style="display:flex;align-items:center;gap:10px;"><div class="user-avatar">' + initial + '</div><span>' + (u.displayName || '(no name)') + '</span></div></td>';
          html += '<td>' + u.email + '</td>';
          html += '<td>' + role + '</td>';
          html += '<td>' + status + '</td>';
          html += '<td>' + joined + '</td>';
          html += '<td>' + lastLogin + '</td>';
          html += '</tr>';
        });
        tbody.innerHTML = html;
        document.getElementById('userCount').textContent = d.users.length + ' user' + (d.users.length !== 1 ? 's' : '') + ' registered';
      }).catch(function () {
        document.getElementById('usersBody').innerHTML = '<tr><td colspan="6" style="text-align:center;color:#f87171;padding:20px;">Failed to load users</td></tr>';
      });
    }

    loadUsers();

    // Update name
    document.getElementById('updateNameBtn').addEventListener('click', function () {
      var name = document.getElementById('nameInput').value.trim();
      if (!name) return;
      var btn = this; btn.disabled = true;
      api('/profile', { method: 'PUT', body: JSON.stringify({ displayName: name }) }).then(function (d) {
        var msg = document.getElementById('nameMsg');
        if (d.message) { msg.className = 'msg success'; msg.textContent = 'Name updated!'; location.reload(); }
        else { msg.className = 'msg error'; msg.textContent = d.error || 'Error'; }
        btn.disabled = false;
      });
    });

    // Change password
    document.getElementById('changePwBtn').addEventListener('click', function () {
      var currentPw = document.getElementById('currentPw').value;
      var newPw = document.getElementById('newPw').value;
      if (!currentPw || !newPw) { document.getElementById('pwMsg').className = 'msg error'; document.getElementById('pwMsg').textContent = 'Fill in both fields'; return; }
      var btn = this; btn.disabled = true;
      api('/password', { method: 'PUT', body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }) }).then(function (d) {
        var msg = document.getElementById('pwMsg');
        if (d.message) { msg.className = 'msg success'; msg.textContent = 'Password changed!'; document.getElementById('currentPw').value = ''; document.getElementById('newPw').value = ''; }
        else { msg.className = 'msg error'; msg.textContent = d.error || 'Error'; }
        btn.disabled = false;
      });
    });
  </script>
</body>
</html>
  `);
});

// ── Global error handler ───────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ──────────────────────────────────────────────────
app.listen(config.port, () => {
  // Initialise DB on startup
  getDb();
  console.log(`✓ Analytics tenant running on http://localhost:${config.port}`);
  console.log(`  POST /api/analytics   — ingest visit data`);
  console.log(`  GET  /api/reports/*   — query analytics`);
  console.log(`  GET  /api/health      — health check`);
});

// ── Graceful shutdown ──────────────────────────────────────
process.on('SIGINT', () => { closeDb(); process.exit(0); });
process.on('SIGTERM', () => { closeDb(); process.exit(0); });
