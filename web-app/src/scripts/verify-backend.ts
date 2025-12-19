
import { getDb } from "../db";
import { users, expenses, accounts, expenseCategories } from "../db/schema";
import { eq, desc, sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import { ExpenseService } from "../lib/expenses";

async function verify() {
    console.log("🔍 Starting Backend Verification (Test Mode)...\n");
    const db = await getDb();

    // 1. Verify Authentication (Simulated)
    console.log("1️⃣  Verifying Authentication...");
    const admin = await db.query.users.findFirst({
        where: eq(users.email, "admin@example.com")
    });
    if (!admin || !admin.password) {
        console.error("❌ Admin user not found or has no password.");
        process.exit(1);
    }
    const isPasswordValid = await bcrypt.compare("password", admin.password);
    if (isPasswordValid) {
        console.log("✅ Admin Login Simulated: Success");
    } else {
        console.error("❌ Admin Login Simulated: Failed (Invalid Password)");
    }

    // 2. Verify Financial Accounts
    console.log("\n2️⃣  Verifying Financial Accounts...");
    const wallet = await db.query.accounts.findFirst({
        where: eq(accounts.provider, "PAYSTACK")
    });
    if (wallet) {
        console.log(`✅ Paystack Wallet Found: ${wallet.name} (Balance: NGN ${wallet.balance})`);
    } else {
        console.error("❌ Paystack Wallet NOT Found");
    }

    // 3. Verify Expense Creation & Category Display
    console.log("\n3️⃣  Verifying Expense & Category Logic...");
    // Create a new expense
    const testCategory = "Travel"; // Should resolve to Category ID internally
    console.log(`   Creating Test Expense with Category: '${testCategory}'...`);

    // We need to bypass the server action (which needs auth) and use Service directly
    // But ExpenseService.createExpense needs a 'requesterId'.
    try {
        const newExpense = await ExpenseService.createExpense({
            description: "Terminal Verification Expense",
            amount: 5000,
            requesterId: admin.id,
            category: testCategory, // Passing name, service should handle or save as is
            incurredAt: new Date()
        });
        console.log(`✅ Expense Created: ID ${newExpense.id}`);

        // Verify Fetching (Simulate what ExpenseDetailsPage does)
        const fetchedExpense = await db.query.expenses.findFirst({
            where: eq(expenses.id, newExpense.id),
            with: { expenseCategory: true }
        });

        if (!fetchedExpense) {
            console.error("❌ Failed to fetch created expense.");
        } else {
            console.log(`   Expense Stored Category Field: '${fetchedExpense.category}'`);
            console.log(`   Expense Linked Category Name: '${fetchedExpense.expenseCategory?.name}'`);

            const displayCategory = fetchedExpense.expenseCategory?.name || fetchedExpense.category;
            if (displayCategory === testCategory || fetchedExpense.expenseCategory?.name === testCategory) {
                console.log(`✅ Category Display Verification: Success (Shows '${displayCategory}')`);
            } else {
                console.log(`❌ Category Display Verification: Failed. Expected '${testCategory}', got '${displayCategory}'`);
            }
        }

    } catch (e) {
        console.error("❌ Expense Creation Failed:", e);
    }

    // 4. Verify Dashboard Metrics (Basic)
    console.log("\n4️⃣  Verifying Dashboard Metrics...");
    const expenseCount = (await db.select({ count: sql<number>`count(*)` }).from(expenses))[0].count;
    console.log(`✅ Total Expenses in DB: ${expenseCount}`);

    console.log("\n✨ Verification Complete.");
    process.exit(0);
}

verify().catch(console.error);
