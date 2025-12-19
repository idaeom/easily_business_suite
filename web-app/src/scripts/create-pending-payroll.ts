
import { getDb } from "../db";
import { users, payrollRuns } from "../db/schema";
import { eq } from "drizzle-orm";
import { PayrollService } from "../lib/payroll";

async function main() {
    console.log("Creating Pending Payroll Run...");
    const db = await getDb();

    // 1. Get Admin User
    const admin = await db.query.users.findFirst({ where: eq(users.email, "hr@test.com") });
    if (!admin) throw new Error("HR Admin not found");

    // 2. Create Payroll Run for Feb 2025
    const month = 2;
    const year = 2025;

    // Cleanup if exists
    const existing = await db.query.payrollRuns.findFirst({
        where: (runs, { and, eq }) => and(eq(runs.month, month), eq(runs.year, year))
    });

    if (existing) {
        console.log("Cleaning up existing test run...");
        await db.delete(payrollRuns).where(eq(payrollRuns.id, existing.id));
    }

    console.log(`Creating Payroll Run for ${month}/${year}...`);
    const run = await PayrollService.createPayrollRun(month, year, admin.id);
    console.log(`✅ Run Created: ${run.id}`);
    console.log(`Status: ${run.status}`);
    console.log("This run is now pending approval in the dashboard.");

    process.exit(0);
}

main().catch(console.error);
