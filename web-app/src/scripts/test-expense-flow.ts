
import { ExpenseService } from "../services/expense-service";
import { FinanceService } from "../services/finance-service";

async function runExpenseFlowTest() {
    console.log("🚀 Starting Expense Flow Integration Test");

    try {
        const db = await import("../db").then(m => m.getDb());
        const { users, accounts } = await import("../db/schema");
        const { eq, like, and } = await import("drizzle-orm");

        // 1. Setup User (Admin)
        console.log("\n--- 1. Setting up Test Admin ---");
        let admin = await db.query.users.findFirst({ where: eq(users.email, "admin@test.com") });
        if (!admin) {
            throw new Error("Admin user not found. Run previous tests first.");
        }

        // 2. Setup Accounts (Bank Account for Payment)
        let bankAccount = await db.query.accounts.findFirst({ where: (a) => and(eq(a.type, "ASSET"), like(a.name, "%Bank%")) });
        if (!bankAccount) {
            [bankAccount] = await db.insert(accounts).values({
                name: "Main Bank Account",
                code: "1001",
                type: "ASSET"
            }).returning();
        }

        // 3. Create Expense Category
        console.log("\n--- 3. Create Expense Category ---");
        const category = await ExpenseService.createCategory("Office Supplies " + Date.now(), "General office materials");
        console.log("✅ Category Created:", category.name);

        // 4. Create Expense
        console.log("\n--- 4. Record Expense ---");
        const expense = await ExpenseService.createExpense({
            description: "Printer Paper",
            amount: 5000,
            categoryId: category.id,
            payee: "Paper World Ltd"
        }, admin.id);
        console.log("✅ Expense Recorded:", expense.id);

        // 5. Approve Expense
        console.log("\n--- 5. Approve Expense ---");
        await ExpenseService.approveExpense(expense.id, admin.id);
        console.log("✅ Expense Approved");

        // 6. Process Payment
        console.log("\n--- 6. Process Payment ---");
        await ExpenseService.processPayment(expense.id, bankAccount.id, admin.id);
        console.log("✅ Payment Processed");

        // 7. Verify GL
        console.log("\n--- 7. Verify GL ---");
        const txs = await FinanceService.getTransactions(1, 1);
        const lastTx = txs.data[0];
        console.log(`💰 Last Transaction: ${lastTx.description}`);

        const entry = lastTx.entries.find(e => Number(e.amount) === 5000);

        if (lastTx.description.includes("Expense Payment") && entry) {
            console.log("   -> GL Check PASS");
        } else {
            console.error("   -> GL Check FAIL");
            process.exit(1);
        }

        console.log("\n🎉 Expense Flow Test Completed!");
        process.exit(0);

    } catch (e: any) {
        console.error("\n❌ Expense Flow Test Failed:", e);
        process.exit(1);
    }
}

runExpenseFlowTest();
