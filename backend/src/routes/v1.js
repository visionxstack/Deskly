const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Deprecated v1 endpoints - kept for backwards compatibility
// These are older versions of current endpoints

// Get tickets (deprecated)
router.get('/tickets', authenticateToken, async (req, res) => {
  try {
    // Old version without the rich filtering
    const result = await pool.query(
      `SELECT t.*, u.first_name || ' ' || u.last_name as user_name
       FROM tickets t
       JOIN users u ON t.user_id = u.id
       WHERE t.user_id = $1
       ORDER BY t.created_at DESC`,
      [req.user.id]
    );

    res.json({ tickets: result.rows });
  } catch (error) {
    console.error('V1 Get tickets error:', error);
    res.status(500).json({ error: 'Failed to get tickets' });
  }
});

// Get user profile (deprecated)
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, first_name, last_name FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ profile: result.rows[0] });
  } catch (error) {
    console.error('V1 Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Legacy order endpoint (deprecated)
router.get('/my-orders', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );

    res.json({ orders: result.rows });
  } catch (error) {
    console.error('V1 Get orders error:', error);
    res.status(500).json({ error: 'Failed to get orders' });
  }
});

module.exports = router;
