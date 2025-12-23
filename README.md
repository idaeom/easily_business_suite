# Easily Business Suite

**Easily Business Suite** is an enterprise-grade ERP solution designed to unify and streamline business operations across Commerce, Finance, and Human Resources. It serves as a central nervous system for modern businesses, integrating critical functions into a single, cohesive platform.

## 🚀 Key Modules

### 1. 🛒 Commerce Pro (POS & Retail)
Designed for speed and accuracy in high-volume retail environments.
*   **Smart Checkout**: Support for barcode scanning, product search, and quick keys.
*   **Multi-Payment Splits**: Process complex transactions with mixed payment methods (Cash, Card, Transfer, Loyalty Points, Credit).
*   **Shift Management**: Strict cash control with Opening/Closing reconciliation and variance tracking.

### 2. 📦 Inventory & Supply Chain
Professional stock management with audit-ready traceability.
*   **Procurement Cycle**: Vendor management, Requisition approvals, and Goods Received Notes (GRN).
*   **Stock Control**: Inter-outlet transfers, Stock Adjustments, and Manual counts.
*   **Valuation Reports**: Real-time Inventory Valuation based on Moving Average Cost (COGS).

### 3. 💰 Finance Pro
A double-entry accounting system running under the hood.
*   **General Ledger**: Automatic posting of all transactions to the GL with a Standard Chart of Accounts.
*   **Financial Statements**: Real-time Profit & Loss (P&L) and Balance Sheet.
*   **Business Accounts**: Manage multiple bank accounts, cash drawers, and mobile wallets.
*   **Budgeting & Expenses**: Track spending against allocated budgets with multi-level approval hierarchies.

### 4. 👥 HR & Payroll Pro
End-to-end employee lifecycle management, localized for Nigerian compliance.
*   **Workforce Management**: Employee profiles, roles, and employment types (Full-time/Contract).
*   **Payroll Engine**: Automated monthly payroll calculating Basic, Allowances, PAYE Tax, and Pension (8%).
*   **Disbursement**: One-click batch payment processing for salaries.
*   **Compliance**: Statutory reporting and automated GL posting of liabilities.

### 5. ✅ Task & Project Management
Integrated productivity tools to keep teams aligned.
*   **Kanban Board**: Drag-and-drop task management with custom workflow stages.
*   **Collaboration**: Comments, file attachments, and assignment notifications.

### 6. 🛡️ System Administration
Robust security and control.
*   **RBAC (Role-Based Access Control)**: Granular permissions module (e.g., `POS_ACCESS`, `HR_VIEW_SENSITIVE`).
*   **Audit Logs**: Comprehensive trail of sensitive actions for security and compliance.

---

## 🛠 Tech Stack

The suite is architected as a Monorepo:

*   **`web-app`**: The core administration dashboard and business logic.
    *   **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
    *   **Database**: PostgreSQL (via Supabase)
    *   **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
    *   **UI**: Shadcn UI + Tailwind CSS
    *   **Auth**: NextAuth.js

*   **`mobile-app`**: (Upcoming) Mobile interface for field operations.

---

## ⚡️ Getting Started

### Prerequisites
*   Node.js 18+
*   PostgreSQL Database

### Setup

1.  **Clone the repository**
    ```bash
    git clone https://github.com/idaeom/easily_business_suite.git
    cd easily_business_suite
    ```

2.  **Install Dependencies**
    ```bash
    cd web-app
    npm install
    ```

3.  **Environment Variables**
    Create a `.env` file in `web-app/` with your database connection:
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

## 🤝 Contributing
1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/amazing-feature`).
3.  Commit your changes.
4.  Push to the branch.
5.  Open a Pull Request.

---

## 📄 License
Private Property of Easily.