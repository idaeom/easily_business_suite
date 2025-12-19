
import { getDb } from "../db";
import { users, employeeProfiles, payrollRuns, payrollItems, expenses, expenseBeneficiaries, expenseCategories } from "../db/schema";
import { eq } from "drizzle-orm";
import { HrService } from "../lib/hr";
import { PayrollService } from "../lib/payroll";
import crypto from "crypto";

async function main() {
    console.log("Starting HR & Payroll Verification...");
    const db = await getDb();

    // 1. Clean previous test data
    console.log("Cleaning up...");
    await db.delete(payrollRuns);
    // await db.delete(employeeProfiles); // Keep standard users if possible, or create fresh

    // 2. Create/Update Admin User
    const adminEmail = "admin-hr@test.com";
    let admin = await db.query.users.findFirst({ where: eq(users.email, adminEmail) });
    if (!admin) {
        const [newAdmin] = await db.insert(users).values({
            name: "HR Admin",
            email: adminEmail,
            role: "ADMIN",
            password: "password" // Should be hashed in real app
        }).returning();
        admin = newAdmin;
    }

    // 3. Create Employee with Profile
    const empEmail = "employee-hr@test.com";
    let emp = await db.query.users.findFirst({ where: eq(users.email, empEmail) });
    if (!emp) {
        const [newEmp] = await db.insert(users).values({
            name: "John Doe",
            email: empEmail,
            role: "USER"
        }).returning();
        emp = newEmp;
    }

    console.log(`Setting up profile for ${emp.name}...`);
    await HrService.createOrUpdateProfile({
        userId: emp.id,
        basicSalary: 500000,
        housingAllowance: 100000,
        transportAllowance: 50000,
        otherAllowances: 20000,
        bankName: "Test Bank",
        accountNumber: "1234567890",
        taxId: "TIN-123",
        pensionId: "PEN-456"
    });

    // 4. Run Payroll
    console.log("Creating Payroll Run...");
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();

    // Ensure "Salaries & Wages" category exists (needed for Expense creation)
    const catName = "Salaries & Wages";
    let cat = await db.query.expenseCategories.findFirst({ where: eq(expenseCategories.name, catName) });
    if (!cat) {
        await db.insert(expenseCategories).values({ name: catName });
    }

    const run = await PayrollService.createPayrollRun(month, year, admin.id);
    console.log(`Run Created: ID=${run.id}, Status=${run.status}`);

    // 5. Verify Calculation
    // Total Gross = 670,000. 
    // Pension (8% Basic) = 40,000.  Taxable = 630,000. Tax (10%) = 63,000.
    // Net = 670k - 40k - 63k = 567,000.

    const items = await db.query.payrollItems.findMany({ where: eq(payrollItems.payrollRunId, run.id) });
    const item = items.find(i => i.userId === emp!.id);
    console.log(`Employee Net Pay: ${item?.netPay}`);

    if (Number(item?.netPay) !== 567000) {
        console.error("❌ Calculation Mismatch!");
    } else {
        console.log("✅ Calculation Verified.");
    }

    // 6. Approve Run
    console.log("Approving Payroll Run...");
    await PayrollService.approvePayrollRun(run.id, admin.id);

    // 7. Verify Expense Creation
    const updatedRun = await db.query.payrollRuns.findFirst({
        where: eq(payrollRuns.id, run.id),
        with: { expense: { with: { beneficiaries: true } } }
    });

    if (updatedRun?.status !== "APPROVED") console.error("❌ Run Status not APPROVED");
    if (!updatedRun?.expenseId) console.error("❌ No Expense ID linked");

    console.log(`Linked Expense ID: ${updatedRun?.expenseId}`);
    console.log(`Total Expense Amount: ${updatedRun?.expense?.amount}`);

    // Total Expense should be Net + Tax + Pension = Gross = 670,000 (roughly, assuming full remittance)
    // Beneficiaries: Employee (567k), Tax (63k), Pension (40k). Sum = 670k.

    const beneficiaries = updatedRun?.expense?.beneficiaries || [];
    console.log(`Beneficiaries Count: ${beneficiaries.length}`);
    beneficiaries.forEach(b => console.log(` - ${b.name}: ${b.amount}`));

    if (Math.abs(Number(updatedRun?.expense?.amount) - 670000) < 1) {
        console.log("✅ Expense Total Verified (Matches Gross).");
    } else {
        console.error(`❌ Expense Total Mismatch. Expected 670000, Got ${updatedRun?.expense?.amount}`);
    }

    console.log("Verification Complete.");
    process.exit(0);
}

main().catch(console.error);
