const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Internal utility endpoints (admin only)

// Bulk import users (admin only)
router.post('/import/users', authenticateToken, requireRole('platform_admin'), async (req, res) => {
  try {
    const { users } = req.body;

    if (!Array.isArray(users)) {
      return res.status(400).json({ error: 'Users must be an array' });
    }

    const bcrypt = require('bcryptjs');
    const results = [];

    for (const userData of users) {
      try {
        const password_hash = await bcrypt.hash(userData.password || 'defaultPassword123', 10);
        
        const result = await pool.query(
          `INSERT INTO users (email, password_hash, first_name, last_name, role, organization_id)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, email`,
          [userData.email, password_hash, userData.first_name, userData.last_name, userData.role || 'customer', userData.organization_id]
        );

        results.push({ success: true, user: result.rows[0] });
      } catch (error) {
        results.push({ success: false, email: userData.email, error: error.message });
      }
    }

    res.json({ results });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ error: 'Failed to import users' });
  }
});

// Webhook receiver for external integrations
router.post('/webhooks/stripe', async (req, res) => {
  try {
    const { event_type, data } = req.body;

    // In a real app, this would process Stripe webhooks
    // For this vulnerable app, we'll just log it
    console.log('Stripe webhook received:', event_type, data);

    // VULNERABILITY: No signature verification on webhook
    // In a real app, you'd verify the Stripe signature

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Webhook receiver for payment processing
router.post('/webhooks/payment', async (req, res) => {
  try {
    const { transaction_id, status, amount } = req.body;

    // In a real app, this would update order status based on payment
    console.log('Payment webhook received:', transaction_id, status, amount);

    res.json({ received: true });
  } catch (error) {
    console.error('Payment webhook error:', error);
    res.status(500).json({ error: 'Payment webhook processing failed' });
  }
});

// System health check (internal)
router.get('/health/detailed', authenticateToken, requireRole('platform_admin'), async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT NOW()');
    const diskUsage = require('fs').statSync('.');
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        status: 'connected',
        time: dbResult.rows[0].now,
      },
      disk: {
        usage: diskUsage,
      },
      memory: process.memoryUsage(),
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

// Clear cache (admin only)
router.post('/cache/clear', authenticateToken, requireRole('platform_admin'), async (req, res) => {
  try {
    // In a real app, this would clear Redis or other cache
    res.json({ message: 'Cache cleared successfully' });
  } catch (error) {
    console.error('Clear cache error:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

// Rebuild search index (admin only)
router.post('/search/rebuild', authenticateToken, requireRole('platform_admin'), async (req, res) => {
  try {
    // In a real app, this would rebuild the search index
    res.json({ message: 'Search index rebuild started' });
  } catch (error) {
    console.error('Rebuild search error:', error);
    res.status(500).json({ error: 'Failed to rebuild search index' });
  }
});

// Get system metrics (admin only)
router.get('/metrics', authenticateToken, requireRole('platform_admin'), async (req, res) => {
  try {
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const ticketCount = await pool.query('SELECT COUNT(*) FROM tickets');
    const orderCount = await pool.query('SELECT COUNT(*) FROM orders');
    const orgCount = await pool.query('SELECT COUNT(*) FROM organizations');

    res.json({
      users: parseInt(userCount.rows[0].count),
      tickets: parseInt(ticketCount.rows[0].count),
      orders: parseInt(orderCount.rows[0].count),
      organizations: parseInt(orgCount.rows[0].count),
      uptime: process.uptime(),
    });
  } catch (error) {
    console.error('Get metrics error:', error);
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

// Debug endpoint (admin only) - should be removed in production
router.get('/debug/session', authenticateToken, requireRole('platform_admin'), async (req, res) => {
  try {
    res.json({
      user: req.user,
      headers: req.headers,
      ip: req.ip,
    });
  } catch (error) {
    console.error('Debug session error:', error);
    res.status(500).json({ error: 'Debug session failed' });
  }
});

module.exports = router;
