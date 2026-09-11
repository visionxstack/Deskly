const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Upload ticket attachment
router.post('/tickets/:ticketId/attachments', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { ticketId } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Check if ticket exists and user has access
    const ticketResult = await pool.query(
      'SELECT * FROM tickets WHERE id = $1',
      [ticketId]
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

    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/plain',
    ];

    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Invalid file type' });
    }

    // Save attachment to database
    const result = await pool.query(
      `INSERT INTO ticket_attachments (ticket_id, user_id, filename, file_path, file_size, mime_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [ticketId, req.user.id, req.file.originalname, req.file.path, req.file.size, req.file.mimetype]
    );

    // Generate thumbnail for images
    if (req.file.mimetype.startsWith('image/')) {
      generateThumbnail(req.file.path);
    }

    res.status(201).json({ attachment: result.rows[0] });
  } catch (error) {
    console.error('Upload attachment error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Failed to upload attachment' });
  }
});

// Download ticket attachment
router.get('/attachments/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT ta.*, t.user_id as ticket_user_id, t.organization_id as ticket_org_id
       FROM ticket_attachments ta
       JOIN tickets t ON ta.ticket_id = t.id
       WHERE ta.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const attachment = result.rows[0];

    // VULNERABILITY #2: IDOR - Missing ownership check on attachment download
    // Users can download any attachment if they know the ID
    // Intended to check: if (req.user.role === 'customer' && attachment.ticket_user_id !== req.user.id)

    if (!fs.existsSync(attachment.file_path)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    res.download(attachment.file_path, attachment.filename);
  } catch (error) {
    console.error('Download attachment error:', error);
    res.status(500).json({ error: 'Failed to download attachment' });
  }
});

// Upload user avatar
router.post('/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Invalid file type' });
    }

    // Update user avatar
    const result = await pool.query(
      'UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING id, email, avatar_url',
      [req.file.path, req.user.id]
    );

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Upload avatar error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// Get user avatar
router.get('/avatar/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      'SELECT avatar_url FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const avatarUrl = result.rows[0].avatar_url;

    if (!avatarUrl) {
      return res.status(404).json({ error: 'No avatar set' });
    }

    if (!fs.existsSync(avatarUrl)) {
      return res.status(404).json({ error: 'Avatar file not found' });
    }

    res.sendFile(avatarUrl);
  } catch (error) {
    console.error('Get avatar error:', error);
    res.status(500).json({ error: 'Failed to get avatar' });
  }
});

// Thumbnail generation function (part of RCE chain)
function generateThumbnail(imagePath) {
  const { exec } = require('child_process');
  
  const thumbnailPath = imagePath.replace(/\.[^/.]+$/, '_thumb.jpg');
  
  const command = `convert "${imagePath}" -thumbnail 200x200 "${thumbnailPath}"`;
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('Thumbnail generation error:', error);
    }
  });
}

module.exports = router;
