const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    
    // Get user from database
    const result = await pool.query(
      'SELECT id, email, role, organization_id, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

const requireOrgAccess = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Platform admins and support agents can access all orgs
  if (req.user.role === 'platform_admin' || req.user.role === 'support_agent') {
    return next();
  }

  // Other roles must be in the same organization
  const orgId = req.params.orgId || req.body.organization_id || req.query.organization_id;
  
  if (!orgId) {
    return res.status(400).json({ error: 'Organization ID required' });
  }

  if (req.user.organization_id !== orgId) {
    return res.status(403).json({ error: 'Access denied to this organization' });
  }

  next();
};

module.exports = {
  authenticateToken,
  requireRole,
  requireOrgAccess,
};
