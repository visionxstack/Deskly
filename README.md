# Deskly - Helpdesk & Order Management Platform

Deskly is a comprehensive B2B SaaS platform that combines helpdesk ticketing with order management. It provides organizations with a unified solution for customer support, order processing, and team collaboration.

## Features

### Core Functionality
- **User Authentication** - Secure registration, login, JWT sessions, and password reset
- **Multi-Tenant Support** - Organization-based isolation with role-based access control
- **Support Ticketing** - Create tickets, add comments, file attachments, and status workflows
- **Order Management** - Product catalog, order placement, invoice generation, and tracking
- **Reporting & Analytics** - Advanced search, filtering, and data export capabilities
- **Admin Panel** - User management, system settings, and administrative tools

### User Roles

**Customer**
- Belongs to one organization (tenant)
- Create and view their own tickets
- Place orders and view order history
- Download invoices and receipts

**Support Agent**
- Platform-level role for customer support
- View and respond to tickets across assigned organizations
- Reassign tickets and add internal notes
- Track ticket resolution metrics

**Organization Admin**
- Manage users within their organization
- View all tickets and orders for their organization
- Generate organization-level reports
- Manage team permissions

**Platform Admin**
- Full access across all organizations
- Manage users, organizations, and system settings
- Access audit logs and system metrics
- Export data and manage platform configuration

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Docker and Docker Compose (optional)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-org/deskly.git
   cd deskly
   ```

2. **Install dependencies:**
   ```bash
   # Backend
   cd backend
   npm install

   # Frontend
   cd ../frontend
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   # Copy example environment file
   cp backend/.env.example backend/.env

   # Edit with your configuration
   nano backend/.env
   ```

4. **Set up the database:**
   ```bash
   # Using Docker (recommended)
   docker-compose up -d postgres
   docker-compose exec backend npm run seed

   # Or local PostgreSQL
   createdb deskly
   psql deskly < backend/src/config/schema.sql
   cd backend && npm run seed
   ```

5. **Start the application:**
   ```bash
   # Development mode
   cd backend && npm run dev
   cd frontend && npm run dev

   # Or using Docker
   docker-compose up
   ```

6. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - Health check: http://localhost:3000/health

## Quick Start (Local Development)

### Database Setup
```bash
# Start PostgreSQL container
docker-compose up -d postgres

# Initialize database schema
PGPASSWORD=deskly_password psql -h localhost -U deskly_user -d deskly -f backend/src/config/schema.sql

# Seed database with test data
cd backend && npm run seed
```

### Start Development Servers

**Terminal 1: Backend**
```bash
cd backend
npm run dev
# Backend running on http://localhost:3000
```

**Terminal 2: Frontend**
```bash
cd frontend
npm run dev
# Frontend running on http://localhost:5173
```

### Test Login Credentials

All test accounts use password: `password123`

| Role | Email | Organization |
|------|-------|--------------|
| Platform Admin | admin@deskly.local | N/A |
| Support Agent | agent1@deskly.local | N/A |
| Support Agent | agent2@deskly.local | N/A |
| Org Admin | admin@acme.com | Acme Corporation |
| Customer | customer1@acme.com | Acme Corporation |
| Org Admin | admin@globex.com | Globex Industries |
| Customer | customer1@globex.com | Globex Industries |
| Customer | customer1@soylent.com | Soylent Corp |

## Docker Deployment

### Development
```bash
docker-compose -f docker-compose.dev.yml up -d
```

### Production
```bash
# Set up environment
cp .env.prod .env
# Edit .env with production values

# Generate SSL certificates
./setup-ssl.sh

# Start production stack
docker-compose -f docker-compose.prod.yml up -d
```

## Configuration

### Environment Variables

**Database:**
- `DB_HOST` - Database host (default: localhost)
- `DB_PORT` - Database port (default: 5432)
- `DB_NAME` - Database name (default: deskly)
- `DB_USER` - Database user (default: deskly_user)
- `DB_PASSWORD` - Database password

**Authentication:**
- `JWT_SECRET` - Secret key for JWT token signing
- `FRONTEND_URL` - Frontend application URL

**Server:**
- `PORT` - Backend server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

## API Documentation

### Authentication

All API endpoints require authentication via JWT token:

```
Authorization: Bearer <your_jwt_token>
```

### Key Endpoints

**Authentication:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user info

**Tickets:**
- `GET /api/tickets` - List tickets
- `POST /api/tickets` - Create ticket
- `GET /api/tickets/:id` - Get ticket details
- `PATCH /api/tickets/:id` - Update ticket
- `POST /api/tickets/:id/comments` - Add comment

**Orders:**
- `GET /api/orders` - List orders
- `POST /api/orders` - Create order
- `GET /api/orders/:id` - Get order details
- `POST /api/orders/:id/refund` - Request refund

**Admin:**
- `GET /api/admin/settings` - Get system settings
- `PATCH /api/admin/settings` - Update system settings
- `GET /api/admin/organizations` - List organizations
- `POST /api/admin/impersonate/:userId` - Impersonate user

## Development

### Project Structure
```
deskly/
├── backend/           # Node.js/Express API
│   ├── src/
│   │   ├── config/   # Database and configuration
│   │   ├── routes/   # API endpoints
│   │   ├── middleware/ # Express middleware
│   │   └── models/   # Data models
│   └── uploads/      # File upload directory
├── frontend/         # React SPA
│   ├── src/
│   │   ├── components/ # React components
│   │   └── App.jsx   # Main application
└── nginx/            # Nginx configuration
```

### Scripts

**Backend:**
- `npm start` - Start production server
- `npm run dev` - Start development server with hot-reload
- `npm run seed` - Seed database with sample data

**Frontend:**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Security

Deskly implements industry-standard security practices:

- **Authentication:** JWT-based session management
- **Authorization:** Role-based access control (RBAC)
- **Input Validation:** Comprehensive input sanitization
- **SQL Injection Prevention:** Parameterized queries throughout
- **XSS Protection:** Content Security Policy and output encoding
- **Rate Limiting:** API rate limiting to prevent abuse
- **Security Headers:** HSTS, CSP, and other security headers
- **File Upload:** Type validation and size restrictions

## Support

For issues, questions, or contributions:
- GitHub Issues: https://github.com/your-org/deskly/issues
- Documentation: https://docs.deskly.com
- Email: support@deskly.com

## License

Copyright © 2024 Deskly. All rights reserved.
