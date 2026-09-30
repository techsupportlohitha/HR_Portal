# HR Management System

A comprehensive, full-stack HR Management web application built with React, Node.js, Express, PostgreSQL, and Prisma. 

This system acts as a centralized HR portal, designed from the ground up with strict **Role-Based and Employee-Level Access Control** to ensure that confidential HR information is strictly protected and never exposed to unauthorized employees.

## 🚀 Key Modules & Features

- **Dashboard**: Role-specific overview with key metrics and quick actions for pending approvals.
- **Employee Management**: Full employee directory, profile management, document verification, and automatic user account provisioning.
- **Leave Management**: Leave requests, holiday lists, manager approvals, and real-time attendance tracking.
- **Recruitment Tracker**: Manage job requisitions, track candidates through screening, interviewing, and offering stages.
- **Asset Management**: Track company laptops and assets, issue/return workflows, and condition monitoring.
- **Performance Review**: Goal setting, manager evaluations, and continuous feedback tracking.
- **Training Management**: Schedule training sessions, manage participants, and track completion.
- **Travel & Expenses**: Manage travel requests, office expenses, and multi-tier approval workflows.
- **HR Helpdesk**: Centralized ticketing system for employee requests and queries with status tracking.
- **Policies & Documents**: Upload, categorize, and track employee acknowledgements for HR handbooks and policies.
- **Workforce Analytics**: Dynamic charts tracking attendance, leave histories, and employee strength.
- **Notifications**: Real-time, event-driven system notifications for HR events (requests, approvals, onboarding).
- **Audit & Security**: Comprehensive audit logs capturing data modifications, login history tracking, and dynamic role management.

## 🛡️ Security Architecture

The most critical design principle of this application is its multi-layered security model:

1. **Dynamic Role Permissions Matrix**: Admins can dynamically toggle permissions (`View`, `Add`, `Edit`, `Delete`, `Approve`, `Export`) for any role across any module using the UI. (Default roles: Admin, Management, HR, Employee).
2. **Employee-Level Data Scoping**: Data is strictly isolated. 
   - `EMPLOYEE`s (Self Scope) can only fetch and view their own data (e.g., their own travel requests).
   - `HR/MANAGEMENT/ADMIN` (Org Scope) have unrestricted or module-specific visibility.
3. **Data Export Restrictions**: Bulk CSV/PDF downloads are strictly gated behind a `canExport` database permission to prevent unauthorized data exfiltration.

## 💻 Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, Recharts, Lucide Icons, React Hook Form
- **Backend**: Node.js, Express, TypeScript, Zod Validation, Multer (File Uploads)
- **Database**: PostgreSQL with Prisma ORM
- **Auth & Security**: JWT tokens, bcrypt password hashing

## ⚙️ Quick Start

### 1. Prerequisites
- Node.js 18+
- PostgreSQL 14+ 
- npm

### 2. Installation
Clone the repository and install dependencies for both the frontend and backend:
```bash
# Install all dependencies from root
npm install

# Alternatively, install separately:
# cd server && npm install
# cd client && npm install
```

### 3. Environment Variables
Create a `.env` file in the `server` directory (you can copy `.env.example`):
```env
PORT=5000
DATABASE_URL="postgresql://user:password@localhost:5432/hrmanagement?schema=public"
JWT_SECRET="your_super_secret_jwt_key_change_in_production"
JWT_EXPIRES_IN="7d"
CORS_ORIGIN="http://localhost:5173"
```
*Note: Ensure you never commit your actual `.env` file. It is excluded in `.gitignore`.*

### 4. Database Setup
```bash
cd server

# Push the schema to the database
npx prisma db push

# Run the seeder to create the default Admin account and permission catalogs
npm run db:seed
```

### 5. Running the Application
You can run both servers simultaneously from the root directory:
```bash
# Start both client and server concurrently
npm run dev
```

Alternatively, run them separately:
```bash
# Terminal 1 (Backend)
cd server
npm run dev

# Terminal 2 (Frontend)
cd client
npm run dev
```

The application will be available at `http://localhost:5173`.
