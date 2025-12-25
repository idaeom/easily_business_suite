
import { HrService } from "../services/hr-service";
import { FinanceService } from "../services/finance-service";
import { createEmployeeProfileSchema } from "../lib/dtos/hr-dtos";

async function runHrFlowTest() {
    console.log("🚀 Starting HR Flow Integration Test");

    try {
        const db = await import("../db").then(m => m.getDb());
        const { users, employeeProfiles, payrollRuns } = await import("../db/schema");
        const { eq } = await import("drizzle-orm");

        // 1. Setup User (Admin & Employee)
        console.log("\n--- 1. Setting up Test Users ---");

        // Mock Admin (reusing or creating)
        let admin = await db.query.users.findFirst({ where: eq(users.email, "admin@test.com") });
        if (!admin) {
            [admin] = await db.insert(users).values({
                name: "Test Admin",
                email: "admin@test.com",
                role: "ADMIN",
                createdAt: new Date()
            }).returning();
        }

        // Create Test Employee User
        let empUser = await db.query.users.findFirst({ where: eq(users.email, "worker@test.com") });
        if (!empUser) {
            [empUser] = await db.insert(users).values({
                name: "Test Worker",
                email: "worker@test.com",
                role: "USER",
                createdAt: new Date()
            }).returning();
        }

        // 2. Create Employee Profile
        console.log("\n--- 2. Creating Employee Profile ---");
        // Ensure no existing profile
        await db.delete(employeeProfiles).where(eq(employeeProfiles.userId, empUser.id));

        const profileData = createEmployeeProfileSchema.parse({
            userId: empUser.id,
            jobTitle: "Senior Developer",
            employmentType: "FULL_TIME",
            basicSalary: 500000,
            housingAllowance: 200000,
            transportAllowance: 100000,
            otherAllowances: 50000,
            isPensionActive: true,
            bankName: "Test Bank",
            accountNumber: "1234567890"
        });

        await HrService.createEmployeeProfile(profileData);
        console.log("✅ Employee Profile Created");

        // 3. Run Payroll
        console.log("\n--- 3. Running Payroll (Month 1/2025) ---");
        // Clean up previous test run for this month
        await db.delete(payrollRuns).where(eq(payrollRuns.month, 1));

        let wagesAccount = await db.query.accounts.findFirst({ where: (a, { eq, and, like }) => and(eq(a.type, "EXPENSE"), like(a.name, "%Wages%")) });

        // Ensure accounts exist (Test specific setup)
        if (!wagesAccount) {
            const { accounts } = await import("../db/schema");
            [wagesAccount] = await db.insert(accounts).values({
                name: "Wages Expense",
                code: "6001",
                type: "EXPENSE"
            }).returning();
        }

        const run = await HrService.runPayroll(1, 2025, admin.id);
        console.log(`✅ Payroll Run Created: ID ${run.id}, Total: ${run.totalAmount}`);

        // 4. Verify GL
        console.log("\n--- 4. Verify GL Transaction ---");
        const txs = await FinanceService.getTransactions(1, 1);
        const lastTx = txs.data[0];
        console.log(`💰 Last Transaction: ${lastTx.description}`);

        const isMatch = lastTx.description.includes("Payroll Run 1/2025");

        if (isMatch) console.log("   -> GL Check PASS");
        else console.error("   -> GL Check FAIL");

        console.log("\n🎉 HR Flow Test Completed!");
        process.exit(0);

    } catch (e: any) {
        console.error("\n❌ HR Flow Test Failed:", e);
        process.exit(1);
    }
}

runHrFlowTest();
