/**
 * CloudPulse - Authentication Routes
 */

const express = require('express');
const crypto = require('crypto');
const { signToken, hashPassword, comparePassword, authenticateToken, requireRole } = require('../auth/jwt');
const { isPgConnected, query, memoryStore } = require('../db');

const router = express.Router();

// Register New User
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Missing required fields: name, email, password' });
    }

    const assignedRole = role === 'admin' ? 'admin' : 'engineer';
    const userId = `usr-${crypto.randomBytes(4).toString('hex')}`;
    const passwordHash = hashPassword(password);

    if (isPgConnected()) {
      const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'User with this email already exists' });
      }

      await query(
        'INSERT INTO users (id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)',
        [userId, name, email, passwordHash, assignedRole]
      );
    } else {
      const exists = memoryStore.users.find(u => u.email === email);
      if (exists) {
        return res.status(409).json({ error: 'User with this email already exists' });
      }
      memoryStore.users.push({
        id: userId,
        name,
        email,
        password_hash: passwordHash,
        role: assignedRole,
        created_at: new Date().toISOString()
      });
    }

    const token = signToken({ id: userId, email, role: assignedRole, name });
    res.status(201).json({
      message: 'User successfully registered',
      token,
      user: { id: userId, name, email, role: assignedRole }
    });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed', details: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    let user = null;
    if (isPgConnected()) {
      const result = await query('SELECT * FROM users WHERE email = $1', [email]);
      if (result.rows.length > 0) {
        user = result.rows[0];
      }
    } else {
      user = memoryStore.users.find(u => u.email === email);
    }

    if (!user || !comparePassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    });

    res.json({
      message: 'Authentication successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Authentication failed', details: err.message });
  }
});

// Get Current User Profile
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// List All Users (Admin Only)
router.get('/users', authenticateToken, requireRole('admin'), async (req, res) => {
  if (isPgConnected()) {
    const result = await query('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC');
    return res.json({ users: result.rows });
  }
  const users = memoryStore.users.map(({ password_hash, ...rest }) => rest);
  res.json({ users });
});

module.exports = router;
