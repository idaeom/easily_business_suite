# Easily Business Suite

Easily Business Suite is a comprehensive Enterprise Resource Planning (ERP) solution designed to streamline business operations including Point of Sale (POS), Inventory Management, Finance, Human Resources, and Reporting.

## Key Features

### 🛒 Point of Sale (POS)
*   **Fast Checkout**: Efficient interface for processing sales.
*   **Payment Split**: Support for multiple payment methods per transaction (Cash, Card, Transfer, Loyalty, Business Accounts).
*   **Loyalty Integration**: Earn and redeem loyalty points directly at checkout.
*   **Customer Management**: Link sales to customers for history tracking.

### 📦 Inventory Management
*   **Real-time Stock Tracking**: View stock levels per outlet and globally.
*   **Goods Receiving (GRN)**: Manage purchase orders and receive stock partial/full with vendor invoices.
*   **Stock Transfers**: Dispatch and receive items between outlets.
*   **Low Stock Alerts**: Visual indicators and dashboard widgets for items running low.
*   **Product Categories**: Organize items with customizable categories.

### 💰 Finance & Accounting
*   **Chart of Accounts (COA)**: Standardized accounting structure with flexible GL Mapping.
*   **Business Accounts**: Manage bank accounts, cash drawers, and mobile wallets.
*   **Revenue Reconciliation**: Shift-based reconciliation for cash variances and sales verification.
*   **Financial Reports**: Automated Profit & Loss (P&L) and Balance Sheet generation.

### 👥 HR & Payroll
*   **Employee Management**: Track employee details, roles, and employment status.
*   **Payroll Processing**: Automate salary calculations, deductions, and tax schedules.
*   **Payslip Generation**: Generate and export professional PDF payslips.
*   **Expense Integration**: Payroll approvals automatically create expense records for disbursement.

### 📊 Reporting
*   **Sales Reports**: Detailed breakdown of revenue by product, category, and outlet.
*   **Inventory Reports**: Stock valuation and movement history.
*   **Payroll Reports**: Salary and tax summaries.

## Tech Stack

*   **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
*   **Language**: TypeScript
*   **Database**: PostgreSQL (via Supabase)
*   **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
*   **UI Components**: [Shadcn UI](https://ui.shadcn.com/) + Tailwind CSS
*   **Authentication**: NextAuth.js

## Getting Started

### Prerequisites
*   Node.js 18+
*   PostgreSQL Database (Supabase recommended)

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/idaeom/easily_business_suite.git
    cd easily_business_suite/web-app
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Configure Environment:
    Create a `.env` file in the root directory:
    ```env
    DATABASE_URL="postgresql://user:password@host:port/db"
    NEXTAUTH_SECRET="your-secret"
    NEXTAUTH_URL="http://localhost:3000"
    ```

4.  Push Database Schema:
    ```bash
    npx drizzle-kit push
    ```

5.  Seed Default Data (Optional):
    ```bash
    npm run seed
    ```

6.  Run Development Server:
    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) to view the application.

## Development Workflows

### Database Updates
When modifying `src/db/schema.ts`:
1.  Make changes to the schema file.
2.  Run `npx drizzle-kit push` to update the database.

### Verification Scripts
Located in `src/scripts/`, these scripts verify core business logic:
*   `npm run verify-inventory`: Checks inventory flow.
*   `npm run verify-payroll`: Audits payroll calculations.
*   `npm run verify-finance`: Ensures GL integrity.

## License
Private Property of Easily.
