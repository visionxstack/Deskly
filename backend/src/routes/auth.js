const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, first_name, last_name, organization_slug } = req.body;

    // Validate input
    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Get or create organization
    let organization_id;
    if (organization_slug) {
      const orgResult = await pool.query(
        'SELECT id FROM organizations WHERE slug = $1',
        [organization_slug]
      );
      
      if (orgResult.rows.length === 0) {
        return res.status(400).json({ error: 'Organization not found' });
      }
      
      organization_id = orgResult.rows[0].id;
    } else {
      // Create new organization
      const orgName = `${first_name} ${last_name}'s Organization`;
      const slug = orgName.toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).substr(2, 9);
      
      const orgResult = await pool.query(
        'INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id',
        [orgName, slug]
      );
      
      organization_id = orgResult.rows[0].id;
    }

    // Create user
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, organization_id)
       VALUES ($1, $2, $3, $4, 'customer', $5)
       RETURNING id, email, first_name, last_name, role, organization_id`,
      [email.toLowerCase(), password_hash, first_name, last_name, organization_id]
    );

    const user = userResult.rows[0];

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '15m' }
    );

    const refreshToken = uuidv4();
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, refreshExpiresAt]
    );

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        organization_id: user.organization_id,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const result = await pool.query(
      'SELECT id, email, password_hash, first_name, last_name, role, organization_id, is_active FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '15m' }
    );

    const refreshToken = uuidv4();
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, refreshExpiresAt]
    );

    // Log login
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, ip_address, user_agent)
       VALUES ($1, 'LOGIN', $2, $3)`,
      [user.id, req.ip, req.get('user-agent')]
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        organization_id: user.organization_id,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const result = await pool.query(
      `SELECT rt.user_id, rt.expires_at, u.id, u.email, u.role, u.organization_id, u.is_active
       FROM refresh_tokens rt
       JOIN users u ON rt.user_id = u.id
       WHERE rt.token = $1 AND rt.expires_at > NOW()`,
      [refreshToken]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const tokenData = result.rows[0];
    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    // Generate new access token
    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '15m' }
    );

    res.json({ accessToken });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await pool.query(
        'DELETE FROM refresh_tokens WHERE token = $1 AND user_id = $2',
        [refreshToken, req.user.id]
      );
    }

    // Log logout
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, ip_address, user_agent)
       VALUES ($1, 'LOGOUT', $2, $3)`,
      [req.user.id, req.ip, req.get('user-agent')]
    );

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Request password reset
router.post('/password-reset/request', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const result = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      // Don't reveal if email exists
      return res.json({ message: 'If the email exists, a reset link will be sent' });
    }

    const userId = result.rows[0].id;
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [userId, token, expiresAt]
    );

    // In a real app, you would send an email here
    console.log(`Password reset token for ${email}: ${token}`);

    res.json({ message: 'If the email exists, a reset link will be sent' });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Password reset request failed' });
  }
});

// Reset password
router.post('/password-reset/confirm', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password required' });
    }

    const result = await pool.query(
      `SELECT prt.user_id, u.email
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token = $1 AND prt.expires_at > NOW() AND prt.used = false`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const userId = result.rows[0].user_id;

    const password_hash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [password_hash, userId]
    );

    await pool.query(
      'UPDATE password_reset_tokens SET used = true WHERE token = $1',
      [token]
    );

    // Invalidate all refresh tokens for this user
    await pool.query(
      'DELETE FROM refresh_tokens WHERE user_id = $1',
      [userId]
    );

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, role, organization_id, avatar_url, is_active
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

module.exports = router;
