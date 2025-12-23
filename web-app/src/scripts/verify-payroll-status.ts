
import { getDb } from "@/db";
import { users, payrollRuns, expenses, accounts, ledgerEntries, payrollItems, employeeProfiles } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { PayrollService } from "@/lib/payroll";
import { DisbursementService } from "@/lib/disbursement";

// Mock Auth
process.env.IS_SCRIPT = "true";

async function main() {
    console.log("🚀 Starting Payroll Status Sync Verification...");
    const db = await getDb();

    // 1. Setup User & Employee (if needed)
    console.log("Looking for admin user...");
    const admin = await db.query.users.findFirst({ where: eq(users.role, "ADMIN") });
    if (!admin) throw new Error("No Admin Found");

    // Ensure we have an employee profile for the admin (or someone)
    let employee = await db.query.users.findFirst({
        where: (u, { exists }) => exists(
            db.select().from(employeeProfiles).where(eq(employeeProfiles.userId, u.id))
        )
    });

    if (!employee) {
        // ... (Skipping profile creation if already exists from previous runs)
        // Assume exists or previous main() logic handles it. 
        // For robustness, find ANY employee.
        throw new Error("No Employee Profile Found. Please run verify-payroll-accounting.ts first or ensure data.");
    }

    // 2. Create Payroll Run
    console.log("Creating Payroll Run...");
    const month = 11; // Different month/year
    const year = 2030;

    // Clean up
    const existingRun = await db.query.payrollRuns.findFirst({ where: eq(payrollRuns.year, year) });
    if (existingRun) {
        await db.delete(payrollItems).where(eq(payrollItems.payrollRunId, existingRun.id));
        await db.delete(payrollRuns).where(eq(payrollRuns.id, existingRun.id));
    }

    const run = await PayrollService.createPayrollRun(month, year, admin.id);

    // 3. Approve Payroll (Accrual)
    console.log("Approving Payroll...");
    await PayrollService.submitForCertification(run.id);
    await PayrollService.certifyPayrollRun(run.id, admin.id);
    const { expenseIds } = await PayrollService.approvePayrollRun(run.id, admin.id);
    console.log("Expense IDs:", expenseIds);

    // 4. Disburse All Expenses
    console.log("Disbursing All Expenses...");

    // Generate Valid OTP (Reusing logic)
    const { OtpService } = await import("@/lib/otp");
    const otp = await OtpService.generateOtp(admin.email);

    // Find a funded account
    const activeAccounts = await db.query.accounts.findMany({ where: eq(accounts.type, "ASSET") });
    const bank = activeAccounts.find(a => Number(a.balance) > 1000000); // Find one with > 1M

    if (!bank) {
        throw new Error("No Funded Bank Account Found (Need > 1M for payroll test)");
    }
    console.log(`Using Source Account: ${bank.name} [ID: ${bank.id}] Balance: ${bank.balance}`);

    // Generate & Use OTP for Salary
    const salaryOtp = await OtpService.generateOtp(admin.email);
    console.log("Disbursing Salary...");
    await DisbursementService.disburseExpense(expenseIds.salaryExpenseId, bank.id, admin.id, salaryOtp, "MANUAL", "PAYSTACK");

    if (expenseIds.taxExpenseId) {
        const taxOtp = await OtpService.generateOtp(admin.email);
        console.log("Disbursing Tax...");
        await DisbursementService.disburseExpense(expenseIds.taxExpenseId, bank.id, admin.id, taxOtp, "MANUAL", "PAYSTACK");
    }

    if (expenseIds.pensionExpenseId) {
        const pensionOtp = await OtpService.generateOtp(admin.email);
        console.log("Disbursing Pension...");
        await DisbursementService.disburseExpense(expenseIds.pensionExpenseId, bank.id, admin.id, pensionOtp, "MANUAL", "PAYSTACK");
    }

    // 5. Verify Run Status
    const finalRun = await db.query.payrollRuns.findFirst({ where: eq(payrollRuns.id, run.id) });
    console.log(`Final Payroll Run Status: ${finalRun?.status}`);

    if (finalRun?.status === "PAID") {
        console.log("✅ SUCCESS: Status updated to PAID.");
    } else {
        console.error("❌ FAILURE: Status is " + finalRun?.status);
    }
}

main().catch(console.error);
