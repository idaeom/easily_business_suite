
import { getDb } from "@/db";
import { users, payrollRuns, expenses, accounts, ledgerEntries, payrollItems, employeeProfiles } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { PayrollService } from "@/lib/payroll";
import { DisbursementService } from "@/lib/disbursement";

// Mock Auth
process.env.IS_SCRIPT = "true";

async function main() {
    console.log("🚀 Starting Payroll Accounting Verification...");
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
        console.log("Creating dummy employee profile for admin...");
        // Insert dummy profile
        await db.insert(employeeProfiles).values({
            userId: admin.id,
            jobTitle: "Test Tester",
            employmentType: "FULL_TIME",
            basicSalary: "500000",
            housingAllowance: "200000",
            transportAllowance: "100000",
            otherAllowances: "0",
            bankName: "Test Bank",
            accountNumber: "1234567890",
            createdAt: new Date(),
            updatedAt: new Date()
        });
        employee = admin;
    }

    // 2. Create Payroll Run
    console.log("Creating Payroll Run...");
    // Use a future month to avoid conflicts
    const month = 12;
    const year = 2030;

    // Clean up previous runs for this date
    const existingRun = await db.query.payrollRuns.findFirst({
        where: eq(payrollRuns.year, year)
    });

    if (existingRun) {
        console.log("Cleaning up existing test run...");
        await db.delete(payrollItems).where(eq(payrollItems.payrollRunId, existingRun.id));
        await db.delete(payrollRuns).where(eq(payrollRuns.id, existingRun.id));
    }

    const run = await PayrollService.createPayrollRun(month, year, admin.id);
    console.log(`Payroll Run Created: ${run.id} (Amount: ${run.totalAmount})`);

    // 3. Approve Payroll (Accrual)
    console.log("Approving Payroll...");
    await PayrollService.submitForCertification(run.id);
    await PayrollService.certifyPayrollRun(run.id, admin.id);
    const { expenseIds } = await PayrollService.approvePayrollRun(run.id, admin.id);

    console.log("Payroll Approved. Generated Expenses:", expenseIds);

    // 4. Verify Accrual GL Entries
    // Find the Accrual Transaction
    const glEntries = await db.select().from(ledgerEntries)
        .orderBy(desc(ledgerEntries.id))
        .limit(10); // Inspect recent

    console.log("\nRecent GL Entries (Accrual Check):");
    /*
    glEntries.forEach(e => {
        console.log(`[${e.accountId}] ${e.direction}: ${e.amount} (${e.description})`);
    });
    */

    // 5. Disburse Salaries
    console.log("\nDisbursing Salaries...");
    const salaryExpenseId = expenseIds.salaryExpenseId;

    // Need a source bank account with funds (Asset)
    const bank = await db.query.accounts.findFirst({
        where: eq(accounts.type, "ASSET")
    });
    if (!bank) throw new Error("No Bank Account Found");

    // Generate Valid OTP
    const { OtpService } = await import("@/lib/otp");
    const otp = await OtpService.generateOtp(admin.email);
    console.log(`Generated OTP: ${otp}`);

    await DisbursementService.disburseExpense(
        salaryExpenseId,
        bank.id,
        admin.id,
        otp,
        "MANUAL",
        "PAYSTACK"
    );

    // 6. Verify Disbursement GL Entries
    console.log("\nVerifying Disbursement GL...");
    const glEntriesAfter = await db.select({
        accountCode: accounts.code,
        accountName: accounts.name,
        direction: ledgerEntries.direction,
        amount: ledgerEntries.amount,
        desc: ledgerEntries.description
    })
        .from(ledgerEntries)
        .innerJoin(accounts, eq(accounts.id, ledgerEntries.accountId))
        .orderBy(desc(ledgerEntries.id))
        .limit(4);

    glEntriesAfter.forEach(e => {
        console.log(`[${e.accountCode} - ${e.accountName}] ${e.direction}: ${e.amount} (${e.desc})`);
    });

    // 7. Check if Liability is Cleared
    const payableAccount = await db.query.accounts.findFirst({ where: eq(accounts.code, "2400") });
    console.log(`\nFinal Payroll Payable (2400) Balance: ${payableAccount?.balance}`);
}

main().catch(console.error);
