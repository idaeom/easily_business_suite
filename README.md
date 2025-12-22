# Easily Business Suite

**Easily Business Suite** is a comprehensive, enterprise-grade ERP solution designed to streamline business operations across Commerce, Finance, and Human Resources.

## 🚀 Overview

The suite is architected as a **Monorepo** containing:
*   **`web-app`**: The core administration dashboard and business logic (Next.js).
*   **`mobile-app`**: (Upcoming) Mobile interface for field operations.

## 📦 Modules

### 1. Commerce Pro
Manage the entire lifecycle of goods and services.
*   **Sales Pro**: Quote-to-Cash workflow, Customer Management, Point of Sale (POS), and Wallet funding.
*   **Inventory Pro**: Stock management, Reorder points, Warehousing.
*   **Operations Pro**: Dispatch, Logistics, and Delivery management.

### 2. Finance Pro
Robust financial tracking and integrity.
*   **General Ledger**: Double-entry accounting core with Standard Chart of Accounts (Service, Retail, Manufacturing templates).
*   **Revenue Pro**: POS Shift Reconciliation, Cash Variance tracking, and Wallet Funding verification.
*   **Business Banking**: Management of physical bank accounts and wallets, mapped to GL assets.
*   **Expenses & Budgeting**: Track spending against allocated budgets with multi-level approval and disbursement logic.
*   **Financial Reports**: Income statements, Balance sheets, and cash flow (Real-time).

### 3. HR Pro
Manage teams, payroll, and compliance (Nigeria Localized).
*   **Workforce**: Employee directory and roles (RBAC).
*   **Payroll Engine**:
    *   Automated PAYE (Tax) and Pension (8%) calculations.
    *   Statutory compliance with Consolidated Relief Allowance (CRA).
    *   Automated GL Posting (Salaries Expense, Tax Payable, Pension Payable).
*   **Disbursement**: Direct expense logging for payroll liabilities.

## 🛠 Tech Stack

*   **Framework**: [Next.js 14](https://nextjs.org/) (App Router, Server Actions)
*   **Database**: PostgreSQL
*   **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
*   **UI Components**: [Shadcn UI](https://ui.shadcn.com/) + Tailwind CSS
*   **Authentication**: NextAuth.js
*   **State Management**: React Server Components & Hooks

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
    DATABASE_URL="postgresql://user:password@localhost:5432/easily_db"
    NEXTAUTH_SECRET="your-secret-key"
    NEXTAUTH_URL="http://localhost:3000"
    ```

4.  **Database Migration**
    ```bash
    npm run db:push
    ```

5.  **Run Development Server**
    ```bash
    npm run dev
    ```
    Visit [http://localhost:3000](http://localhost:3000).

## 🤝 Contributing
1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/amazing-feature`).
3.  Commit your changes.
4.  Push to the branch.
5.  Open a Pull Request.

## 📄 License
Private / Proprietary.