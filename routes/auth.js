// ============================================================
// /api/auth/* — User registration, login, profile
// ============================================================
var { Router } = require('express');
var bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');
var { getDb } = require('../db/connection');
var { JWT_SECRET, requireAuth } = require('../middleware/jwt');

var router = Router();

/**
 * POST /api/auth/register
 * Body: { email, password, displayName? }
 */
router.post('/register', function (req, res) {
  try {
    var { email, password, displayName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    var db = getDb();

    // Check if email already exists
    var existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    var hash = bcrypt.hashSync(password, 10);
    var result = db.prepare(
      'INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)'
    ).run(email, hash, displayName || null);

    var token = jwt.sign(
      { id: result.lastInsertRowid, email: email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token: token,
      user: { id: result.lastInsertRowid, email: email, displayName: displayName || null }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
router.post('/login', function (req, res) {
  try {
    var { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    var db = getDb();
    var user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    var valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    db.prepare('UPDATE users SET last_login = datetime(\'now\') WHERE id = ?').run(user.id);

    var token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token: token,
      user: { id: user.id, email: user.email, displayName: user.display_name }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/me — Get current user profile
 */
router.get('/me', requireAuth, function (req, res) {
  try {
    var db = getDb();
    var user = db.prepare('SELECT id, email, display_name, created_at, last_login FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: { id: user.id, email: user.email, displayName: user.display_name, createdAt: user.created_at, lastLogin: user.last_login } });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/auth/profile — Update display name
 * Body: { displayName }
 */
router.put('/profile', requireAuth, function (req, res) {
  try {
    var { displayName } = req.body;
    var db = getDb();
    db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(displayName || null, req.user.id);
    res.json({ message: 'Profile updated', displayName: displayName || null });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/auth/password — Change password
 * Body: { currentPassword, newPassword }
 */
router.put('/password', requireAuth, function (req, res) {
  try {
    var { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current and new password required' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });

    var db = getDb();
    var user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    var valid = bcrypt.compareSync(currentPassword, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    var hash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.user.id);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/users — List all registered users
 */
router.get('/users', requireAuth, function (req, res) {
  try {
    var db = getDb();
    var users = db.prepare('SELECT id, email, display_name, created_at, last_login FROM users ORDER BY created_at DESC').all();
    res.json({
      users: users.map(function (u) {
        return {
          id: u.id,
          email: u.email,
          displayName: u.display_name,
          createdAt: u.created_at,
          lastLogin: u.last_login
        };
      })
    });
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
