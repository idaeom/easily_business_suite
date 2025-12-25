# Briefly Business Suite

Briefly Business Suite is an enterprise-grade ERP solution engineered to unify business operations. It integrates Point of Sale (POS), Inventory & Supply Chain, Financial Accounting, Human Resources, and Project Management into a single, cohesive platform.

This monorepo contains the `web-app` (Next.js) which serves as the primary interface for all business operations.

---

## 🚀 Key Modules

### 1. 🛒 Point of Sale & Retail Operations
Designed for speed and accuracy in high-volume retail environments.
*   **Smart Checkout**: Support for barcode scanning, product search, and quick keys.
*   **Multi-Payment Splits**: Process complex transactions with mixed payment methods (Cash, Card, Transfer, Loyalty Points, Credit).
*   **Shift Management**: Strict cash control with Opening/Closing reconciliation and variance tracking.
*   **Loyalty Program**: Integrated reward points system (Earn & Burn) with configurable rates.

### 2. 📦 Inventory & Supply Chain
Professional stock management with audit-ready traceability.
*   **Procurement Cycle**: Vendor management, Requisition approvals, and Goods Received Notes (GRN).
*   **Stock Control**: Inter-outlet transfers, Stock Adjustments (Damaged/Expired), and Manual counts.
*   **Valuation Reports**: Real-time Inventory Valuation based on Moving Average Cost (COGS).
*   **Low Stock Alerts**: Automated thresholds and reorder indicators.

### 3. 💰 Finance & Accounting
A double-entry accounting system running under the hood.
*   **General Ledger**: Automatic posting of all transactions (Sales, purchasing, expenses) to the GL.
*   **Financial Statements**: Real-time Profit & Loss (P&L) and Balance Sheet.
*   **Budgeting**: Set and track budgets per expense category.
*   **Business Accounts**: Manage multiple bank accounts, cash/till accounts, and mobile wallets.
*   **Expense Management**: Payment disbursement flow with approval hierarchy (Requester -> Approver -> Payer).

### 4. 👥 HR & Payroll
End-to-end employee lifecycle management.
*   **Employee Profiles**: Track roles, employment types (Full-time/Contract), and compensation details.
*   **Payroll Engine**: Automated monthly payroll runs calculating Basic, Allowances, Tax, and Pension.
*   **Disbursement**: One-click batch payment processing for salaries.
*   **Payslips**: Professional PDF generation.
*   **Performance**: KPI-based Appraisals and Leave Management.

### 5. ✅ Task & Project Management
Integrated productivity tools to manage teams.
*   **Kanban Board**: Drag-and-drop task management with custom stages.
*   **Templates**: Reusable task structures for recurring operations.
*   **Collaboration**: Task comments, file attachments, and assignment notifications.

### 6. 🛡️ System Administration & Security
Robust security framework for enterprise control.
*   **RBAC (Role-Based Access Control)**: Pre-defined roles (Admin, Manager, Accountant, Cashier) with granular permissions.
*   **Audit Logs**: Comprehensive trail of sensitive actions (Deletions, Price Changes, Logins).
*   **Multi-Outlet**: Centralized management for multi-branch businesses.
*   **User Management**: Advanced search, filtering, and role management for administrators.

---

## 🛠️ Tech Stack

*   **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
*   **Language**: TypeScript
*   **Database**: PostgreSQL
*   **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
*   **Styling**: Tailwind CSS + [Shadcn UI](https://ui.shadcn.com/)
*   **Auth**: NextAuth.js
*   **Validation**: Zod
*   **Charts**: Recharts
*   **Date Handling**: Date-fns

---

## 🔐 Security Architecture

We prioritize security in every layer of the application.

### 1. Secure File Uploads
*   **Private Storage**: Files are stored in a private directory (`storage/uploads`), never in the public web root.
*   **Magic Number Validation**: We strictly validate file types by checking binary signatures, not just extensions, to prevent spoofing (e.g., renames `.exe` to `.pdf`).
*   **Authenticated Serving**: Files are served via a secured API route (`/api/uploads/view/[id]`) that checks user permissions before streaming content.
*   **UUID Sanitization**: Filenames are randomized with UUIDs to prevent directory traversal and collision attacks.

### 2. SSRF Protection (Server-Side Request Forgery)
*   **Input Validation**: All user-supplied URLs are strictly validated.
*   **Private Network Blocking**: Our `safeFetch` utility blocks requests to internal IP ranges (e.g., `127.0.0.1`, `10.0.0.0/8`, `192.168.0.0/16`) to prevent attackers from probing internal infrastructure.
*   **DNS Rebinding Protection**: We resolve hostnames and verify IPs before connection.
*   **Redirect handling**: Redirects are strictly monitored to ensure they don't lead to unsafe destinations.

### 3. WAF & Network Security
*   **Rate Limiting**: Implemented to prevent abuse and denial-of-service attacks.
*   **Security Headers**: Configured with strict Content Security Policy (CSP), HSTS, and X-Content-Type-Options.
*   **Structured Logging**: All security events are logged for audit and monitoring.

### 4. Access Control
*   **Middleware Protection**: Route-level guarding based on User Role.
*   **Server Action Security**: All mutations (`create`, `update`, `delete`) are protected by strictly typed server-side permission checks.
*   **UI Guarding**: `<Protect>` component ensures unauthorized users cannot see sensitive UI elements.

---

## 🚦 Getting Started

### Prerequisites
*   Node.js 18+
*   PostgreSQL Database (Supabase recommended)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/idaeom/easily_business_suite.git
    cd easily_business_suite/web-app
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env` file based on `.env.example`:
    ```env
    DATABASE_URL="postgresql://user:password@host:port/db"
    NEXTAUTH_SECRET="your-secret-key"
    NEXTAUTH_URL="http://localhost:3000"
    ```

4.  **Database Migration**
    ```bash
    npx drizzle-kit push
    ```

5.  **Run Development Server**
    ```bash
    npm run dev
    ```

---

## 🧪 Verification & Testing

The project includes a suite of verification scripts in `src/scripts` to ensure system integrity and security:

### Business Logic Verification
*   `npm run verify-cogs`: Audits Cost of Goods Sold calculations and GL postings.
*   `npm run verify-payroll`: Validates payroll tax calculations and net pay accuracy.
*   `npm run verify-finance`: Checks General Ledger balance consistency vs Business Accounts.

### Security Verification
*   `npm run verify-upload-security`:  Tests the file upload system against malicious file types (e.g., executables) and verifies private storage isolation.
*   `npm run verify-permissions`: Audits RBAC implementation across key modules.

---

## 📄 License
Private Property of Briefly.
