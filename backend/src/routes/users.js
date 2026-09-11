const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { authenticateToken, requireRole, requireOrgAccess } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin/org admin only)
router.get('/', authenticateToken, requireRole('platform_admin', 'org_admin', 'support_agent'), async (req, res) => {
  try {
    let query;
    let params;

    if (req.user.role === 'platform_admin' || req.user.role === 'support_agent') {
      query = `
        SELECT id, email, first_name, last_name, role, organization_id, avatar_url, is_active, created_at
        FROM users
        ORDER BY created_at DESC
      `;
      params = [];
    } else {
      // Org admin can only see users in their org
      query = `
        SELECT id, email, first_name, last_name, role, organization_id, avatar_url, is_active, created_at
        FROM users
        WHERE organization_id = $1
        ORDER BY created_at DESC
      `;
      params = [req.user.organization_id];
    }

    const result = await pool.query(query, params);
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get user by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check access
    if (req.user.role !== 'platform_admin' && req.user.role !== 'support_agent') {
      if (req.user.id !== id && req.user.organization_id) {
        // Check if same org
        const orgCheck = await pool.query(
          'SELECT organization_id FROM users WHERE id = $1',
          [id]
        );
        
        if (orgCheck.rows.length === 0 || orgCheck.rows[0].organization_id !== req.user.organization_id) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }
    }

    const result = await pool.query(
      `SELECT id, email, first_name, last_name, role, organization_id, avatar_url, is_active, created_at
       FROM users WHERE id = $1`,
      [id]
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

// Update user profile
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, avatar_url } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (first_name) {
      updates.push(`first_name = $${paramCount}`);
      values.push(first_name);
      paramCount++;
    }

    if (last_name) {
      updates.push(`last_name = $${paramCount}`);
      values.push(last_name);
      paramCount++;
    }

    if (avatar_url) {
      updates.push(`avatar_url = $${paramCount}`);
      values.push(avatar_url);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    const query = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, email, first_name, last_name, role, organization_id, avatar_url
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Update user role (admin only)
router.patch('/:id/role', authenticateToken, requireRole('platform_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['customer', 'support_agent', 'org_admin', 'platform_admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const result = await pool.query(
      `UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, email, first_name, last_name, role, organization_id`,
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log the role change
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES ($1, 'ROLE_CHANGE', 'user', $2, $3, $4, $5)`,
      [req.user.id, id, JSON.stringify({ new_role: role }), req.ip, req.get('user-agent')]
    );

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, requireRole('platform_admin'), async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
