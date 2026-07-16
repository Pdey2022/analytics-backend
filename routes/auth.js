// ============================================================
// POST /api/auth/* — User registration and login
// ============================================================
var { Router } = require('express');
var bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');
var { getDb } = require('../db/connection');
var { JWT_SECRET } = require('../middleware/jwt');

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

module.exports = router;
