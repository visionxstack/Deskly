const pool = require('./config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function seed() {
  try {
    console.log('Starting database seed...');

    // Clear existing data
    console.log('Clearing existing data...');
    await pool.query('DELETE FROM audit_logs');
    await pool.query('DELETE FROM password_reset_tokens');
    await pool.query('DELETE FROM refresh_tokens');
    await pool.query('DELETE FROM ticket_comments');
    await pool.query('DELETE FROM ticket_attachments');
    await pool.query('DELETE FROM tickets');
    await pool.query('DELETE FROM order_items');
    await pool.query('DELETE FROM invoices');
    await pool.query('DELETE FROM orders');
    await pool.query('DELETE FROM discount_codes');
    await pool.query('DELETE FROM products');
    await pool.query('DELETE FROM users');
    await pool.query('DELETE FROM organizations');

    // Create organizations
    console.log('Creating organizations...');
    const org1 = await pool.query(
      "INSERT INTO organizations (name, slug) VALUES ('Acme Corporation', 'acme-corp') RETURNING id"
    );
    const org2 = await pool.query(
      "INSERT INTO organizations (name, slug) VALUES ('Globex Industries', 'globex-ind') RETURNING id"
    );
    const org3 = await pool.query(
      "INSERT INTO organizations (name, slug) VALUES ('Soylent Corp', 'soylent-corp') RETURNING id"
    );

    const acmeId = org1.rows[0].id;
    const globexId = org2.rows[0].id;
    const soylentId = org3.rows[0].id;

    // Create users
    console.log('Creating users...');
    const passwordHash = await bcrypt.hash('password123', 10);

    // Platform admin
    const admin = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, organization_id)
       VALUES ('admin@deskly.local', $1, 'System', 'Admin', 'platform_admin', NULL)
       RETURNING id`,
      [passwordHash]
    );

    // Support agents
    const agent1 = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, organization_id)
       VALUES ('agent1@deskly.local', $1, 'John', 'Smith', 'support_agent', NULL)
       RETURNING id`,
      [passwordHash]
    );

    const agent2 = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, organization_id)
       VALUES ('agent2@deskly.local', $1, 'Jane', 'Doe', 'support_agent', NULL)
       RETURNING id`,
      [passwordHash]
    );

    // Org admins
    const acmeAdmin = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, organization_id)
       VALUES ('admin@acme.com', $1, 'Alice', 'Johnson', 'org_admin', $2)
       RETURNING id`,
      [passwordHash, acmeId]
    );

    const globexAdmin = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, organization_id)
       VALUES ('admin@globex.com', $1, 'Bob', 'Williams', 'org_admin', $2)
       RETURNING id`,
      [passwordHash, globexId]
    );

    // Customers for Acme
    const acmeCustomer1 = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, organization_id)
       VALUES ('customer1@acme.com', $1, 'Charlie', 'Brown', 'customer', $2)
       RETURNING id`,
      [passwordHash, acmeId]
    );

    const acmeCustomer2 = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, organization_id)
       VALUES ('customer2@acme.com', $1, 'Diana', 'Prince', 'customer', $2)
       RETURNING id`,
      [passwordHash, acmeId]
    );

    // Customers for Globex
    const globexCustomer1 = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, organization_id)
       VALUES ('customer1@globex.com', $1, 'Eve', 'Adams', 'customer', $2)
       RETURNING id`,
      [passwordHash, globexId]
    );

    // Customers for Soylent
    const soylentCustomer1 = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, organization_id)
       VALUES ('customer1@soylent.com', $1, 'Frank', 'Miller', 'customer', $2)
       RETURNING id`,
      [passwordHash, soylentId]
    );

    // Create products
    console.log('Creating products...');
    const products = [
      { name: 'Basic Support Plan', description: 'Monthly support subscription', price: 99.99, stock: 100 },
      { name: 'Premium Support Plan', description: 'Priority support with 24/7 availability', price: 199.99, stock: 50 },
      { name: 'Enterprise Support Plan', description: 'Dedicated support team and SLA guarantees', price: 499.99, stock: 20 },
      { name: 'Training Session', description: '2-hour training session for your team', price: 149.99, stock: 30 },
      { name: 'Custom Integration', description: 'Custom API integration service', price: 299.99, stock: 15 },
      { name: 'Data Migration Service', description: 'Complete data migration from legacy systems', price: 399.99, stock: 10 },
    ];

    const productIds = [];
    for (const product of products) {
      const result = await pool.query(
        `INSERT INTO products (name, description, price, stock_quantity)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [product.name, product.description, product.price, product.stock]
      );
      productIds.push(result.rows[0].id);
    }

    // Create discount codes
    console.log('Creating discount codes...');
    await pool.query(
      "INSERT INTO discount_codes (code, discount_percent, max_uses, expires_at) VALUES ('WELCOME10', 10, 100, NOW() + INTERVAL '30 days')"
    );
    await pool.query(
      "INSERT INTO discount_codes (code, discount_percent, max_uses, expires_at) VALUES ('LOYALTY20', 20, 50, NOW() + INTERVAL '60 days')"
    );
    await pool.query(
      "INSERT INTO discount_codes (code, discount_percent, max_uses, expires_at) VALUES ('FLASH50', 50, 10, NOW() + INTERVAL '7 days')"
    );

    // Create tickets
    console.log('Creating tickets...');
    const ticket1 = await pool.query(
      `INSERT INTO tickets (title, description, status, priority, user_id, organization_id, assigned_agent_id)
       VALUES ('Login issues', 'I cannot log in to my account. It says invalid credentials but I am sure the password is correct.', 'open', 'high', $1, $2, $3)
       RETURNING id`,
      [acmeCustomer1.rows[0].id, acmeId, agent1.rows[0].id]
    );

    const ticket2 = await pool.query(
      `INSERT INTO tickets (title, description, status, priority, user_id, organization_id, assigned_agent_id)
       VALUES ('Feature request', 'Can you add dark mode to the dashboard?', 'in_progress', 'medium', $1, $2, $3)
       RETURNING id`,
      [acmeCustomer2.rows[0].id, acmeId, agent1.rows[0].id]
    );

    const ticket3 = await pool.query(
      `INSERT INTO tickets (title, description, status, priority, user_id, organization_id, assigned_agent_id)
       VALUES ('Billing question', 'I was charged twice for my subscription. Please refund one of the charges.', 'pending_customer', 'critical', $1, $2, $3)
       RETURNING id`,
      [globexCustomer1.rows[0].id, globexId, agent2.rows[0].id]
    );

    const ticket4 = await pool.query(
      `INSERT INTO tickets (title, description, status, priority, user_id, organization_id)
       VALUES ('Integration help', 'Need help setting up the API integration with our CRM system.', 'open', 'medium', $1, $2)
       RETURNING id`,
      [soylentCustomer1.rows[0].id, soylentId]
    );

    // Create ticket comments
    console.log('Creating ticket comments...');
    await pool.query(
      `INSERT INTO ticket_comments (ticket_id, user_id, content, is_internal)
       VALUES ($1, $2, 'Thank you for reporting this issue. We are looking into it.', false)`,
      [ticket1.rows[0].id, agent1.rows[0].id]
    );

    await pool.query(
      `INSERT INTO ticket_comments (ticket_id, user_id, content, is_internal)
       VALUES ($1, $2, 'Customer has confirmed they are using the correct email address.', true)`,
      [ticket1.rows[0].id, agent1.rows[0].id]
    );

    await pool.query(
      `INSERT INTO ticket_comments (ticket_id, user_id, content, is_internal)
       VALUES ($1, $2, 'This is a great suggestion! We have added it to our roadmap.', false)`,
      [ticket2.rows[0].id, agent1.rows[0].id]
    );

    // Create orders
    console.log('Creating orders...');
    const order1 = await pool.query(
      `INSERT INTO orders (user_id, organization_id, status, total_amount, discount_code, discount_amount, final_amount)
       VALUES ($1, $2, 'delivered', 99.99, 'WELCOME10', 10.00, 89.99)
       RETURNING id`,
      [acmeCustomer1.rows[0].id, acmeId]
    );

    const order2 = await pool.query(
      `INSERT INTO orders (user_id, organization_id, status, total_amount, discount_code, discount_amount, final_amount)
       VALUES ($1, $2, 'processing', 199.99, NULL, 0, 199.99)
       RETURNING id`,
      [globexCustomer1.rows[0].id, globexId]
    );

    const order3 = await pool.query(
      `INSERT INTO orders (user_id, organization_id, status, total_amount, discount_code, discount_amount, final_amount)
       VALUES ($1, $2, 'shipped', 499.99, 'LOYALTY20', 100.00, 399.99)
       RETURNING id`,
      [acmeCustomer2.rows[0].id, acmeId]
    );

    // Create order items
    console.log('Creating order items...');
    await pool.query(
      `INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
       VALUES ($1, $2, 1, 99.99, 99.99)`,
      [order1.rows[0].id, productIds[0]]
    );

    await pool.query(
      `INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
       VALUES ($1, $2, 1, 199.99, 199.99)`,
      [order2.rows[0].id, productIds[1]]
    );

    await pool.query(
      `INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
       VALUES ($1, $2, 1, 499.99, 499.99)`,
      [order3.rows[0].id, productIds[2]]
    );

    // Create invoices
    console.log('Creating invoices...');
    await pool.query(
      `INSERT INTO invoices (order_id, invoice_number)
       VALUES ($1, 'INV-2024-001')`,
      [order1.rows[0].id]
    );

    await pool.query(
      `INSERT INTO invoices (order_id, invoice_number)
       VALUES ($1, 'INV-2024-002')`,
      [order2.rows[0].id]
    );

    await pool.query(
      `INSERT INTO invoices (order_id, invoice_number)
       VALUES ($1, 'INV-2024-003')`,
      [order3.rows[0].id]
    );

    console.log('Database seed completed successfully!');
    console.log('\nTest accounts:');
    console.log('Platform Admin: admin@deskly.local / password123');
    console.log('Support Agent: agent1@deskly.local / password123');
    console.log('Support Agent: agent2@deskly.local / password123');
    console.log('Acme Admin: admin@acme.com / password123');
    console.log('Acme Customer: customer1@acme.com / password123');
    console.log('Globex Admin: admin@globex.com / password123');
    console.log('Globex Customer: customer1@globex.com / password123');
    console.log('Soylent Customer: customer1@soylent.com / password123');

  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
