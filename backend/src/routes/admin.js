const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all organizations
router.get('/organizations', authenticateToken, requireRole('platform_admin'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM organizations ORDER BY created_at DESC'
    );

    res.json({ organizations: result.rows });
  } catch (error) {
    console.error('Get organizations error:', error);
    res.status(500).json({ error: 'Failed to get organizations' });
  }
});

// Create organization
router.post('/organizations', authenticateToken, requireRole('platform_admin'), async (req, res) => {
  try {
    const { name, slug } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required' });
    }

    const result = await pool.query(
      'INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING *',
      [name, slug]
    );

    res.status(201).json({ organization: result.rows[0] });
  } catch (error) {
    console.error('Create organization error:', error);
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

// Get system settings
router.get('/settings', authenticateToken, requireRole('platform_admin'), async (req, res) => {
  try {
    const settings = {
      site_name: 'Deskly',
      support_email: 'support@deskly.local',
      agent_signature: '<p>Best regards,<br>The Deskly Team</p>',
      maintenance_mode: false,
      max_upload_size: 10485760, // 10MB
    };

    res.json({ settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// Update system settings
router.patch('/settings', authenticateToken, requireRole('platform_admin'), async (req, res) => {
  try {
    const { site_name, support_email, agent_signature, maintenance_mode, max_upload_size } = req.body;

    res.json({ 
      message: 'Settings updated successfully',
      settings: {
        site_name: site_name || 'Deskly',
        support_email: support_email || 'support@deskly.local',
        agent_signature: agent_signature || '<p>Best regards,<br>The Deskly Team</p>',
        maintenance_mode: maintenance_mode || false,
        max_upload_size: max_upload_size || 10485760,
      }
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Get audit logs
router.get('/audit-logs', authenticateToken, requireRole('platform_admin'), async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    const result = await pool.query(
      `SELECT al.*, u.email as user_email
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({ logs: result.rows });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Failed to get audit logs' });
  }
});

// Get invoice PDF download link
router.get('/invoices/:id/download', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT i.*, o.user_id, o.organization_id
       FROM invoices i
       JOIN orders o ON i.order_id = o.id
       WHERE i.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = result.rows[0];

    if (!invoice.pdf_path) {
      // Generate PDF on the fly
      const fs = require('fs');
      const pdfPath = `/tmp/invoice_${invoice.invoice_number}.pdf`;
      
      fs.writeFileSync(pdfPath, `Invoice: ${invoice.invoice_number}\nAmount: $${invoice.final_amount}`);
      
      await pool.query(
        'UPDATE invoices SET pdf_path = $1 WHERE id = $2',
        [pdfPath, id]
      );

      invoice.pdf_path = pdfPath;
    }

    const fs = require('fs');
    if (!fs.existsSync(invoice.pdf_path)) {
      return res.status(404).json({ error: 'PDF file not found' });
    }

    res.download(invoice.pdf_path, `invoice_${invoice.invoice_number}.pdf`);
  } catch (error) {
    console.error('Download invoice error:', error);
    res.status(500).json({ error: 'Failed to download invoice' });
  }
});

// Impersonate user (view as user)
router.post('/impersonate/:userId', authenticateToken, requireRole('platform_admin'), async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      'SELECT id, email, first_name, last_name, role, organization_id FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Log impersonation
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES ($1, 'IMPERSONATE', 'user', $2, $3, $4, $5)`,
      [req.user.id, userId, JSON.stringify({ impersonated_user: user.email }), req.ip, req.get('user-agent')]
    );

    // Generate a special impersonation token
    const jwt = require('jsonwebtoken');
    const impersonationToken = jwt.sign(
      { 
        userId: user.id, 
        role: user.role, 
        impersonatedBy: req.user.id,
        isImpersonation: true 
      },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '1h' }
    );

    res.json({ 
      user,
      impersonationToken 
    });
  } catch (error) {
    console.error('Impersonate error:', error);
    res.status(500).json({ error: 'Failed to impersonate user' });
  }
});

// Get user's internal notes (support agent feature)
router.get('/users/:userId/internal-notes', authenticateToken, requireRole('support_agent', 'platform_admin'), async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `SELECT tc.*, t.id as ticket_id, t.organization_id
       FROM ticket_comments tc
       JOIN tickets t ON tc.ticket_id = t.id
       WHERE tc.user_id = $1 AND tc.is_internal = true
       ORDER BY tc.created_at DESC`,
      [userId]
    );

    res.json({ notes: result.rows });
  } catch (error) {
    console.error('Get internal notes error:', error);
    res.status(500).json({ error: 'Failed to get internal notes' });
  }
});

// Email template preview (admin only)
router.get('/email-templates/:templateName/preview', authenticateToken, requireRole('platform_admin'), async (req, res) => {
  try {
    const { templateName } = req.params;

    // VULNERABILITY #12: XSS in email template preview
    // The template content is rendered without sanitization
    const templates = {
      'welcome': {
        subject: 'Welcome to Deskly',
        body: `<h1>Welcome {{userName}}!</h1><p>Your account has been created successfully.</p>`,
      },
      'password-reset': {
        subject: 'Password Reset',
        body: `<p>Click here to reset your password: {{resetLink}}</p>`,
      },
      'order-confirmation': {
        subject: 'Order Confirmation',
        body: `<h1>Order #{{orderNumber}}</h1><p>Thank you for your purchase!</p>`,
      },
    };

    const template = templates[templateName];

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ template });
  } catch (error) {
    console.error('Get template preview error:', error);
    res.status(500).json({ error: 'Failed to get template preview' });
  }
});

// Update email template (admin only)
router.patch('/email-templates/:templateName', authenticateToken, requireRole('platform_admin'), async (req, res) => {
  try {
    const { templateName } = req.params;
    const { subject, body } = req.body;

    // In a real app, this would update the template in the database
    // For this vulnerable app, we'll just return success
    // The body field can contain XSS payloads

    res.json({ 
      message: 'Template updated successfully',
      template: { templateName, subject, body }
    });
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

module.exports = router;
