
import { getDb } from "../db";
import { users, employeeProfiles, payrollRuns, payrollItems, transactions, ledgerEntries, accounts } from "../db/schema";
import { createEmployeeProfile } from "../actions/hr";
import { runPayroll } from "../actions/payroll";
import { eq, desc, and } from "drizzle-orm";

async function main() {
    console.log("Starting Payroll GL Verification...");
    const db = await getDb();

    // 0. Cleanup (Optional: clear run for this month to allow re-run)
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    await db.delete(payrollRuns)
        .where(and(eq(payrollRuns.month, currentMonth), eq(payrollRuns.year, currentYear)));
    console.log("Cleaned up existing payroll runs for this month.");

    // 1. Create Test User & Employee
    const email = `employee_${Date.now()}@test.com`;
    const [user] = await db.insert(users).values({
        email,
        name: "Test Employee",
        role: "USER" // Using enum value directly/string
    }).returning();

    console.log(`Created User: ${user.id}`);

    // Salary: 500,000 Monthly
    // Basic: 200k, Housing: 150k, Transport: 100k, Other: 50k
    // Gross: 500k
    // Pension Base: 450k -> 8% = 36,000
    // Tax Base: 500k - 36k = 464,000 (Annualized for Tax Calc)
    // 464k * 12 = 5,568,000 Annual
    // Relief: 200k + (20% * 5,568,000) = 200,000 + 1,113,600 = 1,313,600
    // Taxable: 5,568,000 - 1,313,600 = 4,254,400
    // Tax Calc (Annual):
    // 300k @ 7% = 21,000
    // 300k @ 11% = 33,000
    // 500k @ 15% = 75,000
    // 500k @ 19% = 95,000
    // 1.6M @ 21% = 336,000
    // Rem: 4.254M - 3.2M = 1,054,400 @ 24% = 253,056
    // Total Annual Tax: ~813,056
    // Monthly Tax: ~67,754.66

    // Exp Net: 500,000 - 36,000 (Pension) - 67,754 (Tax) = ~396,245

    await createEmployeeProfile({
        userId: user.id,
        jobTitle: "Software Engineer",
        employmentType: "FULL_TIME",
        basicSalary: 200000,
        housingAllowance: 150000,
        transportAllowance: 100000,
        otherAllowances: 50000,
        isPensionActive: true,
        bankName: "Zenith Bank",
        accountNumber: "1234567890"
    });

    console.log("Created Employee Profile");

    // 2. Run Payroll
    const runRes = await runPayroll(currentMonth, currentYear);
    console.log(`Run Payroll: ${runRes.runId}`);

    // 3. Verify Payslip
    const payslip = await db.query.payrollItems.findFirst({
        where: eq(payrollItems.userId, user.id)
    });

    if (payslip) {
        console.log("Payslip Generated:");
        console.log(` - Gross: ${payslip.grossPay}`);
        console.log(` - Pension: ${payslip.breakdown?.pension}`);
        console.log(` - Tax: ${payslip.breakdown?.tax}`);
        console.log(` - Net: ${payslip.netPay}`);
    }

    // 4. Verify GL
    const tx = await db.query.transactions.findFirst({
        where: eq(transactions.metadata, { type: "PAYROLL", payrollRunId: runRes.runId }),
        with: { entries: { with: { account: true } } }
    });

    if (tx) {
        console.log("\nGL Entries:");
        tx.entries.forEach(e => console.log(` - ${e.direction} ${e.amount} -> ${e.account.name} (Code: ${e.account.code})`));

        // Assertions
        const expense = tx.entries.find(e => e.direction === "DEBIT" && e.account.type === "EXPENSE");
        const liability = tx.entries.find(e => e.direction === "CREDIT" && e.account.type === "LIABILITY");

        if (expense && liability) {
            console.log("SUCCESS: Payroll posted to GL.");
        } else {
            console.error("FAILURE: GL Entries incomplete.");
        }
    }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
