const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all orders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, organization_id } = req.query;

    let query = `
      SELECT o.*, 
             u.first_name || ' ' || u.last_name as user_name,
             org.name as organization_name
      FROM orders o
      JOIN users u ON o.user_id = u.id
      JOIN organizations org ON o.organization_id = org.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;

    // Filter based on user role
    if (req.user.role === 'customer') {
      query += ` AND o.user_id = $${paramCount}`;
      params.push(req.user.id);
      paramCount++;
    } else if (req.user.role === 'org_admin') {
      query += ` AND o.organization_id = $${paramCount}`;
      params.push(req.user.organization_id);
      paramCount++;
    }

    // Apply additional filters
    if (status) {
      query += ` AND o.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (organization_id) {
      query += ` AND o.organization_id = $${paramCount}`;
      params.push(organization_id);
      paramCount++;
    }

    query += ' ORDER BY o.created_at DESC';

    const result = await pool.query(query, params);
    res.json({ orders: result.rows });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to get orders' });
  }
});

// Get order by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT o.*, 
              u.first_name || ' ' || u.last_name as user_name,
              org.name as organization_name
       FROM orders o
       JOIN users u ON o.user_id = u.id
       JOIN organizations org ON o.organization_id = org.id
       WHERE o.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = result.rows[0];

    // Check access
    if (req.user.role === 'customer' && order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (req.user.role === 'org_admin' && order.organization_id !== req.user.organization_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get order items
    const itemsResult = await pool.query(
      `SELECT oi.*, p.name as product_name
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [id]
    );

    res.json({
      order,
      items: itemsResult.rows,
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to get order' });
  }
});

// Get products catalog
router.get('/products/catalog', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM products WHERE is_active = true ORDER BY name'
    );

    res.json({ products: result.rows });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to get products' });
  }
});

// Create order
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { items, discount_code } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order items are required' });
    }

    // Validate items and calculate total
    let totalAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      const productResult = await pool.query(
        'SELECT * FROM products WHERE id = $1 AND is_active = true',
        [item.product_id]
      );

      if (productResult.rows.length === 0) {
        return res.status(400).json({ error: `Product ${item.product_id} not found or inactive` });
      }

      const product = productResult.rows[0];

      if (product.stock_quantity < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
      }

      const itemTotal = parseFloat(product.price) * item.quantity;
      totalAmount += itemTotal;

      validatedItems.push({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: product.price,
        total_price: itemTotal,
      });
    }

    // Apply discount code if provided
    let discountAmount = 0;
    if (discount_code) {
      const discountResult = await pool.query(
        'SELECT * FROM discount_codes WHERE code = $1 AND is_active = true AND (expires_at IS NULL OR expires_at > NOW())',
        [discount_code]
      );

      if (discountResult.rows.length > 0) {
        const discount = discountResult.rows[0];

        discountAmount = totalAmount * (discount.discount_percent / 100);

        // Update discount usage
        await pool.query(
          'UPDATE discount_codes SET current_uses = current_uses + 1 WHERE id = $1',
          [discount.id]
        );
      }
    }

    const finalAmount = totalAmount - discountAmount;

    // Create order
    const orderResult = await pool.query(
      `INSERT INTO orders (user_id, organization_id, total_amount, discount_code, discount_amount, final_amount)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.id, req.user.organization_id, totalAmount, discount_code, discountAmount, finalAmount]
    );

    const order = orderResult.rows[0];

    // Create order items and update stock
    for (const item of validatedItems) {
      await pool.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [order.id, item.product_id, item.quantity, item.unit_price, item.total_price]
      );

      await pool.query(
        'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }

    // Generate invoice
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    await pool.query(
      'INSERT INTO invoices (order_id, invoice_number) VALUES ($1, $2)',
      [order.id, invoiceNumber]
    );

    res.status(201).json({ order });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Update order status
router.patch('/:id/status', authenticateToken, requireRole('platform_admin', 'support_agent', 'org_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await pool.query(
      'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ order: result.rows[0] });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Request refund
router.post('/:id/refund', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE id = $1',
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Check access
    if (req.user.role === 'customer' && order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (order.status === 'refunded') {
      return res.status(400).json({ error: 'Order already refunded' });
    }

    if (order.status !== 'delivered') {
      return res.status(400).json({ error: 'Order must be delivered before refund' });
    }

    // Update order status
    await pool.query(
      "UPDATE orders SET status = 'refunded', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [id]
    );

    // Restore stock
    const itemsResult = await pool.query(
      'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
      [id]
    );

    for (const item of itemsResult.rows) {
      await pool.query(
        'UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }

    res.json({ message: 'Refund processed successfully' });
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

module.exports = router;
