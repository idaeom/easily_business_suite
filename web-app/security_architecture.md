# Security Architecture Review
**Date:** December 5, 2025
**Status:** Updated & Hardened

## 1. Authentication & Authorization
### Authentication
- **Mechanism:** NextAuth.js with Credentials Provider (Email/Password).
- **Password Storage:** `bcrypt` hashing.
- **Session Strategy:** JWT (Stateless).
- **Session Duration:** 30 days.

### Authorization (RBAC)
We enforce Role-Based Access Control (RBAC) at the Server Action level.
- **Roles:** `ADMIN`, `USER`.
- **Permissions:** Granular permissions (e.g., `EXPENSE_PAY`, `FINANCE_CREATE`) stored in `users.permissions` array.

| Action | Required Role/Permission |
| :--- | :--- |
| **Create User** | `ADMIN` |
| **Manage Task Stages** | `ADMIN` |
| **Manage Task Templates** | `ADMIN` |
| **Simulate Inflow** | `ADMIN` |
| **Create Dedicated Account** | `ADMIN` |
| **Disburse Expense** | `ADMIN` OR `EXPENSE_PAY` |
| **Create Manual Journal** | `ADMIN` OR `FINANCE_CREATE` |
| **Create Task/Expense** | Authenticated User |

## 2. Critical Safeguards Implemented
### "First User" Vulnerability Fix
- **Issue:** Previous implementation fetched `db.select().from(users).limit(1)` in many actions, effectively performing actions as the first user in the DB (often Admin) regardless of who was logged in.
- **Fix:** All actions now strictly use `getAuthenticatedUser()` which validates the session and fetches the *actual* logged-in user.

### Financial Integrity
- **Double Entry:** All financial movements (disbursements, manual journals) use strict Double Entry bookkeeping.
- **Atomic Transactions:** Critical operations (Disbursement, Journal Posting) are wrapped in database transactions to ensure data integrity.
- **Balance Checks:**
    - **Internal:** Source account balance is checked against the ledger.
    - **External:** Real provider balance (Paystack/Squadco) is checked before initiating transfers (in Online mode).

### App Modes (Live vs Test)
- **Mechanism:** `APP_MODE` cookie (or env var).
- **Safety:**
    - **Visuals:** Distinct UI themes (Orange for Test, Slate for Live) to prevent confusion.
    - **Logic:** `DisbursementService` checks `getAppMode()` server-side.
    - **Test Mode:** Skips real API calls, simulates success, and uses mock references.
    - **Live Mode:** Enforces real API calls and balance checks.

## 3. Data Protection
- **Input Validation:** Zod schemas used for complex inputs (e.g., `createExpense`).
- **Sanitization:** Basic inputs are typed.
- **Audit Logging:** Critical actions (Disbursement) are logged to `audit_logs` table.

## 4. Remaining Risks & Future Work
- **API Rate Limiting:** Not yet implemented for public endpoints (Login).
- **2FA:** Not yet implemented for high-value transactions.
- **Webhook Signature Verification:** Implemented for Paystack/Squadco but needs regular rotation of secrets.
- **File Uploads:** Currently stored on local disk (`public/uploads`). Needs migration to S3/Blob Storage for production scalability and security.
