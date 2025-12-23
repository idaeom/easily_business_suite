# Easily Business Suite

Easily Business Suite is an enterprise-grade ERP solution engineered to unify business operations. It integrates Point of Sale (POS), Inventory & Supply Chain, Financial Accounting, Human Resources, and Project Management into a single, cohesive platform.

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
*   **RBAC (Role-Based Access Control)**: Pre-defined roles (Admin, Manager, Accountant, Cashier).
*   **Granular Permissions**: Module-level toggle permissions (e.g., `POS_ACCESS`, `HR_VIEW_SENSITIVE`, `APPROVE_EXPENSE`).
*   **Audit Logs**: Comprehensive trail of sensitive actions (Deletions, Price Changes, Logins).
*   **Multi-Outlet**: Centralized management for multi-branch businesses.

---

## 🛠️ Tech Stack

*   **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
*   **Language**: TypeScript
*   **Database**: PostgreSQL
*   **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
*   **Styling**: Tailwind CSS + [Shadcn UI](https://ui.shadcn.com/)
*   **Auth**: NextAuth.js
*   **State**: Server Actions & React Hooks

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

The project includes a suite of verification scripts in `src/scripts` to ensure accounting integrity:

*   `npm run verify-cogs`: Audits Cost of Goods Sold calculations and GL postings.
*   `npm run verify-payroll`: Validates payroll tax calculations and net pay accuracy.
*   `npm run verify-finance`: Checks General Ledger balance consistency vs Business Accounts.

---

## 🔐 Security Architecture

*   **Middleware Protection**: Route-level guarding based on User Role.
*   **Server Action Security**: All mutations (`create`, `update`, `delete`) are protected by server-side permission checks.
*   **UI Guarding**: `<Protect>` component ensures unauthorized users cannot see sensitive UI elements.

---

## License
Private Property of Easily.
