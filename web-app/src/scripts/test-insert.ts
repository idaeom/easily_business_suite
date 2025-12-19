
process.env.APP_MODE = "TEST";
import { getDb } from "../db";
import { expenses, users, accounts } from "../db/schema";
import { eq } from "drizzle-orm";

async function testInsert() {
    const db = await getDb();
    console.log("Testing Insert...");

    const admin = await db.query.users.findFirst({ where: eq(users.email, "admin@example.com") });
    if (!admin) throw new Error("Admin not found");

    const wallet = await db.query.accounts.findFirst({ where: eq(accounts.provider, "PAYSTACK") });
    if (!wallet) throw new Error("Wallet not found");

    // Find ANY expense account to test with
    const expenseAccount = await db.query.accounts.findFirst({ where: eq(accounts.type, "EXPENSE") });
    if (!expenseAccount) throw new Error("No Expense Account found");

    const [expense] = await db.transaction(async (tx) => {
        const [e] = await tx.insert(expenses).values({
            description: "Test Insert with Category",
            amount: "100",
            status: "PENDING",
            requesterId: admin.id,
            sourceAccountId: wallet.id,
            expenseAccountId: expenseAccount.id,
            incurredAt: new Date(),
        }).returning();
        return [e];
    });

    console.log("Inserted:", expense.id);
    process.exit(0);
}

testInsert().catch(console.error);
