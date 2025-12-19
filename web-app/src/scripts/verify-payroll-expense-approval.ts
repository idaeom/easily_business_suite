
import { getDb } from "../db";
import { users, payrollRuns, expenses } from "../db/schema";
import { eq } from "drizzle-orm";
import { PayrollService } from "../lib/payroll";

async function main() {
    console.log("Verifying Payroll -> Expense Auto-Approval...");
    const db = await getDb();

    // 1. Get Admin User
    const admin = await db.query.users.findFirst({ where: eq(users.email, "hr@test.com") });
    if (!admin) throw new Error("HR Admin not found");

    // 2. Create Payroll Run for specific future month to avoid conflicts
    const month = 1;
    const year = 2025;

    // Cleanup if exists from previous run
    const existing = await db.query.payrollRuns.findFirst({
        where: (runs, { and, eq }) => and(eq(runs.month, month), eq(runs.year, year))
    });

    if (existing) {
        console.log("Cleaning up existing test run...");
        await db.delete(payrollRuns).where(eq(payrollRuns.id, existing.id));
    }

    console.log(`Creating Payroll Run for ${month}/${year}...`);
    const run = await PayrollService.createPayrollRun(month, year, admin.id);
    console.log(`Run Created: ${run.id} (Status: ${run.status})`);

    // 3. Approve Payroll Run
    console.log("Approving Payroll Run...");
    const result = await PayrollService.approvePayrollRun(run.id, admin.id);
    console.log(`Run Approved. Linked Expense IDs: ${result.expenseIds}`);

    // 4. Verify Expense Status
    const expense = await db.query.expenses.findFirst({
        where: eq(expenses.id, result.expenseIds[0])
    });

    if (!expense) throw new Error("Expense not found!");

    console.log(`Expense Status: ${expense.status}`);
    console.log(`Expense Approver: ${expense.approverId}`);

    if (expense.status === "APPROVED") {
        console.log("✅ SUCCESS: Expense was automatically approved.");
    } else {
        console.error(`❌ FAILURE: Expense status is ${expense.status}, expected APPROVED.`);
        process.exit(1);
    }

    process.exit(0);
}

main().catch(console.error);
