const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireRole, requireOrgAccess } = require('../middleware/auth');

const router = express.Router();

// Get all tickets
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, priority, organization_id, assigned_agent_id } = req.query;

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

    // Filter based on user role
    if (req.user.role === 'customer') {
      query += ` AND t.user_id = $${paramCount}`;
      params.push(req.user.id);
      paramCount++;
    } else if (req.user.role === 'org_admin') {
      query += ` AND t.organization_id = $${paramCount}`;
      params.push(req.user.organization_id);
      paramCount++;
    }
    // Support agents and platform admins can see all (or filtered by assignment)

    // Apply additional filters
    if (status) {
      query += ` AND t.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (priority) {
      query += ` AND t.priority = $${paramCount}`;
      params.push(priority);
      paramCount++;
    }

    if (organization_id) {
      query += ` AND t.organization_id = $${paramCount}`;
      params.push(organization_id);
      paramCount++;
    }

    if (assigned_agent_id) {
      query += ` AND t.assigned_agent_id = $${paramCount}`;
      params.push(assigned_agent_id);
      paramCount++;
    }

    query += ' ORDER BY t.created_at DESC';

    const result = await pool.query(query, params);
    res.json({ tickets: result.rows });
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ error: 'Failed to get tickets' });
  }
});

// Get ticket by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT t.*, 
              u.first_name || ' ' || u.last_name as user_name,
              a.first_name || ' ' || a.last_name as agent_name,
              o.name as organization_name
       FROM tickets t
       JOIN users u ON t.user_id = u.id
       LEFT JOIN users a ON t.assigned_agent_id = a.id
       JOIN organizations o ON t.organization_id = o.id
       WHERE t.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = result.rows[0];

    // Check access
    if (req.user.role === 'customer' && ticket.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (req.user.role === 'org_admin' && ticket.organization_id !== req.user.organization_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get comments
    const commentsResult = await pool.query(
      `SELECT tc.*, u.first_name || ' ' || u.last_name as author_name, u.role
       FROM ticket_comments tc
       JOIN users u ON tc.user_id = u.id
       WHERE tc.ticket_id = $1
       ORDER BY tc.created_at ASC`,
      [id]
    );

    // Get attachments
    const attachmentsResult = await pool.query(
      `SELECT ta.id, ta.filename, ta.file_size, ta.mime_type, ta.created_at,
              u.first_name || ' ' || u.last_name as uploader_name
       FROM ticket_attachments ta
       JOIN users u ON ta.user_id = u.id
       WHERE ta.ticket_id = $1
       ORDER BY ta.created_at ASC`,
      [id]
    );

    res.json({
      ticket,
      comments: commentsResult.rows,
      attachments: attachmentsResult.rows,
    });
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ error: 'Failed to get ticket' });
  }
});

// Create ticket
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, priority, organization_id } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const orgId = organization_id || req.user.organization_id;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    // Check access
    if (req.user.role === 'customer' && orgId !== req.user.organization_id) {
      return res.status(403).json({ error: 'Cannot create ticket for another organization' });
    }

    const result = await pool.query(
      `INSERT INTO tickets (title, description, priority, user_id, organization_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [title, description, priority || 'medium', req.user.id, orgId]
    );

    // Log ticket creation
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES ($1, 'TICKET_CREATE', 'ticket', $2, $3, $4, $5)`,
      [req.user.id, result.rows[0].id, JSON.stringify({ title }), req.ip, req.get('user-agent')]
    );

    res.status(201).json({ ticket: result.rows[0] });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// Update ticket
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, assigned_agent_id } = req.body;

    // Check if ticket exists and user has access
    const ticketResult = await pool.query(
      'SELECT * FROM tickets WHERE id = $1',
      [id]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = ticketResult.rows[0];

    // Check access
    if (req.user.role === 'customer' && ticket.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (req.user.role === 'org_admin' && ticket.organization_id !== req.user.organization_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (title) {
      updates.push(`title = $${paramCount}`);
      values.push(title);
      paramCount++;
    }

    if (description) {
      updates.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }

    if (status) {
      updates.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (priority) {
      updates.push(`priority = $${paramCount}`);
      values.push(priority);
      paramCount++;
    }

    // Only agents and admins can reassign
    if (assigned_agent_id && (req.user.role === 'support_agent' || req.user.role === 'platform_admin' || req.user.role === 'org_admin')) {
      updates.push(`assigned_agent_id = $${paramCount}`);
      values.push(assigned_agent_id);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    const query = `
      UPDATE tickets
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    // Log ticket update
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES ($1, 'TICKET_UPDATE', 'ticket', $2, $3, $4, $5)`,
      [req.user.id, id, JSON.stringify(req.body), req.ip, req.get('user-agent')]
    );

    res.json({ ticket: result.rows[0] });
  } catch (error) {
    console.error('Update ticket error:', error);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

// Add comment to ticket
router.post('/:id/comments', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, is_internal } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Check if ticket exists and user has access
    const ticketResult = await pool.query(
      'SELECT * FROM tickets WHERE id = $1',
      [id]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = ticketResult.rows[0];

    // Check access
    if (req.user.role === 'customer' && ticket.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (req.user.role === 'org_admin' && ticket.organization_id !== req.user.organization_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only agents and admins can add internal comments
    if (is_internal && req.user.role === 'customer') {
      return res.status(403).json({ error: 'Cannot add internal comments' });
    }

    const result = await pool.query(
      `INSERT INTO ticket_comments (ticket_id, user_id, content, is_internal)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, req.user.id, content, is_internal || false]
    );

    res.status(201).json({ comment: result.rows[0] });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Delete ticket
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if ticket exists and user has access
    const ticketResult = await pool.query(
      'SELECT * FROM tickets WHERE id = $1',
      [id]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = ticketResult.rows[0];

    // Only platform admins can delete tickets
    if (req.user.role !== 'platform_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await pool.query('DELETE FROM tickets WHERE id = $1', [id]);

    res.json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    console.error('Delete ticket error:', error);
    res.status(500).json({ error: 'Failed to delete ticket' });
  }
});

module.exports = router;
