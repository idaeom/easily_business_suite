import { DisbursementService } from "@/lib/disbursement";
import { OtpService } from "@/lib/otp";
import { getDb } from "@/db";
import { users, expenses, accounts } from "@/db/schema";
import { eq } from "drizzle-orm";

async function main() {
    const db = await getDb();
    console.log("Testing Disbursement Service...");

    // 1. Setup: Create User and Expense
    const [user] = await db.insert(users).values({
        email: `test-${Date.now()}@example.com`,
        name: "Test User",
        password: "password", // Dummy
    }).returning();

    const [expense] = await db.insert(expenses).values({
        description: "Team Lunch",
        amount: "15000",
        requesterId: user.id,
        status: "APPROVED",
    }).returning();

    console.log(`Created Approved Expense: ${expense.id} for ${expense.amount}`);

    // 2. Get External Account (GTBank)
    const externalAccount = await db.query.accounts.findFirst({
        where: eq(accounts.isExternal, true),
    });

    if (!externalAccount) throw new Error("External Account not found. Run seed script.");

    console.log(`Disbursing from: ${externalAccount.name} (${externalAccount.code})`);

    // 3. Disburse
    // Generate OTP first using EMAIL
    const otpCode = await OtpService.generateOtp(user.email);
    console.log(`Generated OTP for test: ${otpCode}`);

    const result = await DisbursementService.disburseExpense(
        expense.id,
        externalAccount.id,
        user.id,
        otpCode
    );

    console.log("Disbursement Result:", result);

    // 4. Verify Expense Status
    const updatedExpense = await db.query.expenses.findFirst({
        where: eq(expenses.id, expense.id),
    });

    if (updatedExpense?.status === "DISBURSED") {
        console.log("SUCCESS: Expense status updated to DISBURSED.");
    } else {
        console.error("FAILURE: Expense status not updated.");
        process.exit(1);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => {
        process.exit(0);
    });
