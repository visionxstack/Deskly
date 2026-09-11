const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Generate ticket report
router.get('/tickets', authenticateToken, requireRole('platform_admin', 'org_admin', 'support_agent'), async (req, res) => {
  try {
    const { 
      start_date, 
      end_date, 
      organization_id, 
      status, 
      priority,
      sort_by,
      sort_order
    } = req.query;

    let query = `
      SELECT t.*, 
             u.first_name || ' ' || u.last_name as user_name,
             a.first_name || ' ' || a.last_name as agent_name,
             o.name as organization_name
      FROM tickets t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN users a ON t.assigned_agent_id = a.id
      JOIN organizations o ON t.organization_id = o.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;

    // Filter by date range
    if (start_date) {
      query += ` AND t.created_at >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      query += ` AND t.created_at <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }

    // Filter by organization
    if (organization_id) {
      query += ` AND t.organization_id = $${paramCount}`;
      params.push(organization_id);
      paramCount++;
    }

    // Filter by status
    if (status) {
      query += ` AND t.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    // Filter by priority
    if (priority) {
      query += ` AND t.priority = $${paramCount}`;
      params.push(priority);
      paramCount++;
    }

    if (sort_by) {
      const validSortFields = ['created_at', 'updated_at', 'status', 'priority', 'title'];
      query += ` ORDER BY ${sort_by}`;
      
      if (sort_order && (sort_order === 'ASC' || sort_order === 'DESC')) {
        query += ` ${sort_order}`;
      } else {
        query += ' DESC';
      }
    } else {
      query += ' ORDER BY t.created_at DESC';
    }

    const result = await pool.query(query, params);
    res.json({ tickets: result.rows });
  } catch (error) {
    console.error('Ticket report error:', error);
    res.status(500).json({ error: 'Failed to generate ticket report' });
  }
});

// Generate order report
router.get('/orders', authenticateToken, requireRole('platform_admin', 'org_admin'), async (req, res) => {
  try {
    const { 
      start_date, 
      end_date, 
      organization_id, 
      status,
      group_by
    } = req.query;

    let query;
    const params = [];
    let paramCount = 1;

    if (group_by) {
      query = `
        SELECT ${group_by}, COUNT(*) as count, SUM(final_amount) as total
        FROM orders o
        JOIN organizations org ON o.organization_id = org.id
        WHERE 1=1
      `;
    } else {
      query = `
        SELECT o.*, 
               u.first_name || ' ' || u.last_name as user_name,
               org.name as organization_name
        FROM orders o
        JOIN users u ON o.user_id = u.id
        JOIN organizations org ON o.organization_id = org.id
        WHERE 1=1
      `;
    }

    // Filter by date range
    if (start_date) {
      query += ` AND o.created_at >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      query += ` AND o.created_at <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }

    // Filter by organization
    if (organization_id) {
      query += ` AND o.organization_id = $${paramCount}`;
      params.push(organization_id);
      paramCount++;
    }

    // Filter by status
    if (status) {
      query += ` AND o.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (group_by) {
      query += ` GROUP BY ${group_by}`;
    } else {
      query += ' ORDER BY o.created_at DESC';
    }

    const result = await pool.query(query, params);
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Order report error:', error);
    res.status(500).json({ error: 'Failed to generate order report' });
  }
});

// Export to CSV (admin only)
router.get('/export/:type', authenticateToken, requireRole('platform_admin'), async (req, res) => {
  try {
    const { type } = req.params;
    const { 
      start_date, 
      end_date, 
      organization_id,
      format
    } = req.query;

    let query;
    let filename;

    if (type === 'tickets') {
      filename = 'tickets_export.csv';
      query = `
        SELECT t.id, t.title, t.status, t.priority, t.created_at,
               u.email as user_email, o.name as organization_name
        FROM tickets t
        JOIN users u ON t.user_id = u.id
        JOIN organizations o ON t.organization_id = o.id
        WHERE 1=1
      `;
    } else if (type === 'orders') {
      filename = 'orders_export.csv';
      query = `
        SELECT o.id, o.status, o.total_amount, o.final_amount, o.created_at,
               u.email as user_email, o.discount_code
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE 1=1
      `;
    } else if (type === 'users') {
      filename = 'users_export.csv';
      query = `
        SELECT u.id, u.email, u.role, u.created_at,
               o.name as organization_name
        FROM users u
        LEFT JOIN organizations o ON u.organization_id = o.id
        WHERE 1=1
      `;
    } else {
      return res.status(400).json({ error: 'Invalid export type' });
    }

    const params = [];
    let paramCount = 1;

    if (start_date) {
      query += ` AND created_at >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      query += ` AND created_at <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }

    if (organization_id) {
      query += ` AND organization_id = $${paramCount}`;
      params.push(organization_id);
      paramCount++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    // Generate CSV
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No data to export' });
    }

    const headers = Object.keys(result.rows[0]);
    const csvContent = [
      headers.join(','),
      ...result.rows.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape quotes and wrap in quotes if contains comma
          if (value === null || value === undefined) return '';
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      )
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

module.exports = router;
