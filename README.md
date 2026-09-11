# Deskly - Helpdesk & Order Management Platform

**⚠️ TRAINING ENVIRONMENT ONLY - This application contains intentional security vulnerabilities for educational purposes.**

## Overview

Deskly is a realistic B2B SaaS platform that combines helpdesk ticketing with order management. It's designed as a security testing training environment where participants can practice identifying and exploiting various types of vulnerabilities in a controlled, isolated setting.

### Purpose

This application is built for authorized security testing training and practice. It is similar in concept to other deliberately vulnerable applications like DVWA, OWASP Juice Shop, or WebGoat, but with a focus on business logic vulnerabilities and realistic SaaS scenarios.

### ⚠️ Important Safety Notice

- **This is NOT a production application**
- **Do NOT deploy to public internet**
- **Do NOT use real credentials or data**
- **All vulnerabilities are intentional**
- **Network isolated - no access to external systems**
- **Reset capability available for clean testing**

## Features

Deskly includes the following fully-functional features:

- **User Authentication** - Registration, login, JWT sessions, password reset
- **Multi-Tenant Support** - Organizations with role-based access control
- **Support Ticketing** - Create tickets, add comments, file attachments, status workflows
- **Order Management** - Product catalog, order placement, invoice generation
- **Reporting & Analytics** - Search, filter, and export data
- **Admin Panel** - User management, system settings, impersonation features

## User Roles

The application supports four user roles with different access levels:

### 1. Customer
- Belongs to one organization (tenant)
- Can create and view their own tickets
- Can place orders and view their order history
- Can download their own invoices
- Cannot access other organizations' data

### 2. Support Agent
- Platform-level role (not tied to a specific organization)
- Can view and respond to tickets across assigned organizations
- Can reassign tickets and add internal notes
- Cannot access financial data or admin functions

### 3. Organization Admin
- Belongs to one organization
- Can manage users within their organization
- Can view all tickets and orders for their organization
- Can generate organization-level reports

### 4. Platform Admin
- Full access across all organizations
- Can manage all users and organizations
- Can access system settings and configuration
- Can impersonate other users for debugging
- Can export data and view audit logs

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Basic understanding of web security concepts
- Familiarity with security testing tools (Burp Suite, curl, etc.)

### Quick Start

1. **Clone and navigate to the project:**
   ```bash
   cd Deskly
   ```

2. **Start the application:**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

3. **Initialize the database:**
   ```bash
   docker-compose -f docker-compose.dev.yml exec backend npm run seed
   ```

4. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - Health check: http://localhost:3000/health

### Test Accounts

The database seed script creates the following test accounts (all with password `password123`):

#### Platform Level
- **Platform Admin:** admin@deskly.local
- **Support Agent 1:** agent1@deskly.local
- **Support Agent 2:** agent2@deskly.local

#### Acme Corporation
- **Org Admin:** admin@acme.com
- **Customer 1:** customer1@acme.com
- **Customer 2:** customer2@acme.com

#### Globex Industries
- **Org Admin:** admin@globex.com
- **Customer 1:** customer1@globex.com

#### Soylent Corp
- **Customer 1:** customer1@soylent.com

### Environment Reset

To reset the database to a clean state:
```bash
docker-compose -f docker-compose.dev.yml exec backend npm run seed
```

## Security Testing Guidelines

### Scope

You are authorized to test:
- The web application at the provided URLs
- All API endpoints
- All user roles and access levels
- File upload functionality
- Authentication and authorization mechanisms

### Out of Scope

- Do not attempt to attack the hosting infrastructure
- Do not use automated scanners without permission
- Do not attempt to access other participants' sessions
- Do not attempt to compromise the Docker host
- Do not use the RCE vulnerability to attack external systems

### Reporting Format

When you find vulnerabilities, document them with:

1. **Vulnerability Type** - (e.g., IDOR, XSS, SQLi, etc.)
2. **Affected Endpoint** - The specific API endpoint or feature
3. **Reproduction Steps** - Clear steps to reproduce the issue
4. **Proof of Exploit** - Screenshots, logs, or response data
5. **Impact** - Security impact and potential consequences
6. **Flag** - The unique evidence that demonstrates successful exploitation

### Flag Format

Each vulnerability has a unique flag or proof-of-exploit that demonstrates successful exploitation. Flags may be:
- Data returned in API responses
- Files or data accessed
- System state changes
- Network requests to external domains
- Command execution evidence

**Example flag submission:**
```
Vulnerability: IDOR in user profile update
Endpoint: PATCH /api/users/:id
Steps: [detailed steps]
Proof: Successfully changed another user's name from "John" to "Hacked"
Flag: Modified user data returned in API response
```

## API Documentation

### Authentication

All API endpoints (except `/api/auth/login` and `/api/auth/register`) require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Key Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/tickets` - List tickets (filtered by user role)
- `POST /api/tickets` - Create new ticket
- `GET /api/orders` - List orders (filtered by user role)
- `POST /api/orders` - Create new order
- `GET /api/admin/settings` - Get system settings (admin only)
- `GET /api/reports/tickets` - Generate ticket report (admin/agent only)

### Configuration Endpoint

The application exposes client configuration at:
- `GET /api/config/client` - Client configuration (includes various API keys for testing)

## Testing Tips

### Reconnaissance
- Explore the application as different user roles
- Check API responses for interesting data
- Examine JavaScript bundles for configuration
- Test authentication mechanisms
- Map out all available endpoints

### Methodology
- Start with low-hanging fruit (authentication, authorization)
- Test business logic (orders, discounts, refunds)
- Look for injection vulnerabilities (SQLi, XSS)
- Check for access control issues (IDOR)
- Test file upload functionality
- Explore admin and internal endpoints

### Tools
- **Burp Suite** - Web application testing
- **OWASP ZAP** - Automated scanning
- **curl** - API testing
- **Postman** - API exploration
- **Browser DevTools** - Client-side analysis

## Reset and Recovery

If you encounter issues or need a clean environment:

1. **Reset database:**
   ```bash
   docker-compose -f docker-compose.dev.yml exec backend npm run seed
   ```

2. **Restart services:**
   ```bash
   docker-compose -f docker-compose.dev.yml restart
   ```

3. **Clean restart:**
   ```bash
   docker-compose -f docker-compose.dev.yml down
   docker-compose -f docker-compose.dev.yml up -d
   docker-compose -f docker-compose.dev.yml exec backend npm run seed
   ```

## Production Deployment

The application includes a production-ready Docker Compose configuration with additional security safeguards:

- **Network isolation** - Separate VPC/network
- **Resource limits** - CPU/memory quotas
- **Access control** - Basic auth + application auth
- **SSL/TLS** - HTTPS only
- **Rate limiting** - Additional protection at proxy level
- **Monitoring** - Enhanced logging and metrics

**Never deploy the vulnerable version to production.** The production configuration includes safeguards but the application itself contains intentional vulnerabilities.

## Support

For issues or questions about the training environment:
- Check the health endpoint: `/health`
- Review container logs: `docker-compose logs`
- Ensure database is seeded: Check for test accounts
- Verify network connectivity: Check Docker network settings

## License

This training environment is provided for educational purposes only. The intentional vulnerabilities are for security training and should not be used in production systems.

---

**Remember:** This is a controlled training environment. All vulnerabilities are intentional and are meant to help you learn security testing techniques in a safe, isolated setting.
