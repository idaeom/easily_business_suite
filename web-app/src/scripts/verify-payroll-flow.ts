
import { config } from "dotenv";
config({ path: ".env.local" }); // Load env before imports

import { getDb } from "@/db";
import { users, employeeProfiles, payrollRuns, payrollItems, ledgerEntries, expenses, transactions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { PayrollService } from "@/lib/payroll";
import { createEmployeeProfile } from "@/actions/hr";

// SET SCRIPT CONTEXT
process.env.IS_SCRIPT = "true";

async function main() {
    const db = await getDb();
    console.log("🚀 Starting Payroll Flow Verification...");

    // 1. Setup Test User & Employee
    console.log("\n1️⃣  Setting up Test Employee...");
    const testEmail = "payroll_test_user@example.com";
    let user = await db.query.users.findFirst({
        where: eq(users.email, testEmail)
    });

    if (!user) {
        console.log("   Creating new test user...");
        const [newUser] = await db.insert(users).values({
            email: testEmail,
            name: "Payroll Test User",
            password: "hashed_password_placeholder",
            role: "ADMIN" // Ensure rights
        }).returning();
        user = newUser;
    } else {
        console.log(`   Found existing user: ${user.id}`);
    }

    // Check Employee Profile
    const existingProfile = await db.query.employeeProfiles.findFirst({
        where: eq(employeeProfiles.userId, user!.id)
    });

    if (!existingProfile) {
        console.log("   Creating Employee Profile...");
        await createEmployeeProfile({
            userId: user!.id,
            jobTitle: "Senior Tester",
            employmentType: "FULL_TIME",
            basicSalary: 500000,
            housingAllowance: 200000,
            transportAllowance: 100000,
            otherAllowances: 50000,
            isPensionActive: true,
            pensionVoluntary: 0,
            bankName: "Test Bank",
            accountNumber: "1234567890",
            pfaName: "Test PFA",
            pfaCode: "PFA001",
            pensionId: "PEN-TEST-001",
            taxId: "TAX-TEST-001"
        });
        console.log("   Employee Profile Created.");
    } else {
        console.log("   Employee Profile already exists.");
    }

    // 2. Clean up previous test runs for this month/year to run fresh
    const month = 12;
    const year = 2025; // Future date to avoid conflicts with real data
    console.log(`\n2️⃣  Cleaning up any existing run for ${month}/${year}...`);

    // Find run to delete cascade
    const existingRun = await db.query.payrollRuns.findFirst({
        where: (runs, { and, eq }) => and(eq(runs.month, month), eq(runs.year, year))
    });

    if (existingRun) {
        // Manual cleanup if cascade not set properly on all relations, but schema says cascade on items
        // We might need to delete linked transactions/expenses explicitly if not cascaded
        await db.delete(payrollRuns).where(eq(payrollRuns.id, existingRun.id));
        console.log("   Deleted previous run.");
    }

    // 3. Create Draft Run
    console.log(`\n3️⃣  Generating Draft Payroll Run for ${month}/${year}...`);
    const run = await PayrollService.createPayrollRun(month, year, user!.id);
    console.log(`   Run Created: ${run.id} (Status: ${run.status})`);
    console.log(`   Total Amount (Net): ₦${Number(run.totalAmount).toLocaleString()}`);

    // Verify Items
    const items = await db.query.payrollItems.findMany({
        where: eq(payrollItems.payrollRunId, run.id)
    });
    console.log(`   Generated ${items.length} Payslips.`);
    const item = items.find(i => i.userId === user!.id);
    if (item) {
        console.log("   >> Test User Payslip:");
        console.log(`      Gross: ₦${Number(item.grossPay).toLocaleString()}`);
        console.log(`      Net:   ₦${Number(item.netPay).toLocaleString()}`);
        const bd = item.breakdown as any;
        console.log(`      Tax:   ₦${Number(bd.tax.paye).toLocaleString()}`);
        console.log(`      Pension: ₦${Number(bd.deductions.pension).toLocaleString()}`);
    }

    // 4. Lifecycle: Submit -> Certify -> Approve
    console.log("\n4️⃣  Executing Approval Lifecycle...");

    // Submit
    await PayrollService.submitForCertification(run.id);
    console.log("   -> Submitted for Certification");

    // Certify
    await PayrollService.certifyPayrollRun(run.id, user!.id);
    console.log("   -> Certified");

    // Approve
    console.log("   -> Approving (Triggers GL Posting)...");
    const { expenseIds } = await PayrollService.approvePayrollRun(run.id, user!.id);
    console.log("   -> Approved!");
    console.log("   Generated Expenses:", expenseIds);

    // 5. Verify GL Entries
    console.log("\n5️⃣  Verifying GL Entries...");

    // Find Transaction from Meta
    const updatedRun = await db.query.payrollRuns.findFirst({
        where: eq(payrollRuns.id, run.id)
    });

    // The Approve action creates EXPENSES. Expenses create TRANSACTIONS when approved.
    // Wait, PayrollService.approvePayrollRun calls ExpenseService.createExpense & approveExpense.
    // So we should see Transactions linked to those Expenses.

    console.log("   Checking Salary Expense Transaction...");
    if (expenseIds.salaryExpenseId) {
        const salaryExp = await db.query.expenses.findFirst({
            where: eq(expenses.id, expenseIds.salaryExpenseId),
            with: { expenseAccount: true }
        });
        console.log(`   Expense [${salaryExp?.description}]: ₦${salaryExp?.amount}`);
        // Find GL entries for this expense (via transaction usually linked, schema says expenseId on transaction? No, usually Transaction linked to Expense or vice versa?)
        // Let's check ledgerEntries roughly by description or time

        // Actually ExpenseService.approveExpense logic:
        // 1. Debits Expense Account
        // 2. Credits Payable (Source Account is null -> Accounts Payable / Liability?)
        // Let's check the ledger for the last few entries.

        const entries = await db.query.ledgerEntries.findMany({
            orderBy: [desc(ledgerEntries.id)],
            limit: 10,
            with: { account: true }
        });

        console.log("   Latest Ledger Entries:");
        entries.forEach(e => {
            console.log(`     [${e.direction}] ${e.account.name} (${e.account.code}): ₦${e.amount} - ${e.description}`);
        });
    }

    console.log("\n✅ Verification Complete.");
}

main().catch(console.error);
