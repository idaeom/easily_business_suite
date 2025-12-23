
import { getDb } from "@/db";
import { businessAccounts, accounts, ledgerEntries } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { createBusinessAccount, createJournalEntry } from "@/actions/finance";
import { payExpense } from "@/lib/disbursement";
import { approveExpense, createExpense } from "@/actions/expenses";

async function main() {
    console.log("🚀 Starting Business Account Flow Verification...");
    const db = await getDb();
    const TEST_ACC_NAME = `Flow Test - ${Math.floor(Math.random() * 1000)}`;

    // 1. SETUP: Create a fresh Business Account (Debit/Inflow Test via Opening Balance)
    console.log("\n1. Testing Creation & Opening Balance (Inflow via Capital)...");
    const OPENING_BALANCE = 50000;

    await createBusinessAccount({
        name: TEST_ACC_NAME,
        type: "BANK",
        usage: ["EXPENSE_PAYOUT"],
        glAccountId: "mock-id-will-be-replaced", // Logic will replace this
        isEnabled: true,
        openingBalance: OPENING_BALANCE
    });

    const bizAcc = await db.query.businessAccounts.findFirst({
        where: eq(businessAccounts.name, TEST_ACC_NAME),
        with: { glAccount: true }
    });

    if (!bizAcc || !bizAcc.glAccount) throw new Error("Setup Failed");
    const glId = bizAcc.glAccountId;

    console.log(`   Account Created: ${bizAcc.name}`);
    console.log(`   GL Account: ${bizAcc.glAccount.name} [${glId}]`);
    console.log(`   Initial Balance: ₦${Number(bizAcc.glAccount.balance).toLocaleString()}`);

    if (Number(bizAcc.glAccount.balance) !== OPENING_BALANCE) {
        console.error(`❌ FAILURE: Opening Balance mismatch. Expected ${OPENING_BALANCE}, got ${bizAcc.glAccount.balance}`);
    } else {
        console.log("✅ SUCCESS: Opening Balance credited correctly.");
    }

    // 2. TEST OUTFLOW: Expense Payment
    console.log("\n2. Testing Expense Payment (Outflow)...");
    const EXPENSE_AMOUNT = 15000;

    // Create & Approve Expense
    const { expense: newExpense } = await createExpense({
        payee: "Test Vendor",
        description: "Flow Verification Expense",
        amount: EXPENSE_AMOUNT,
        expenseDate: new Date(),
        categoryId: (await db.query.expenseCategories.findFirst())?.id || "",
        status: "PENDING"
    });

    if (!newExpense) throw new Error("Expense creation failed");
    await approveExpense(newExpense.id);

    // Disburse via Business Account
    await payExpense(newExpense.id, bizAcc.id, "TRANSFER", "REF-TEST-001");

    // Check Balance
    const glAfterExpense = await db.query.accounts.findFirst({ where: eq(accounts.id, glId) });
    const expectedAfterExpense = OPENING_BALANCE - EXPENSE_AMOUNT;

    console.log(`   Balance after Expense: ₦${Number(glAfterExpense?.balance).toLocaleString()}`);

    if (Number(glAfterExpense?.balance) !== expectedAfterExpense) {
        console.error(`❌ FAILURE: Balance mismatch after Expense. Expected ${expectedAfterExpense}, got ${glAfterExpense?.balance}`);
    } else {
        console.log("✅ SUCCESS: Expense debited account correctly.");
    }

    // 3. TEST INFLOW: Manual Journal
    console.log("\n3. Testing Manual Journal (Inflow/Funding)...");
    const FUNDING_AMOUNT = 20000;

    // We Debit Asset (Increase) and Credit Equity (Owner Funding)
    const equityAcc = await db.query.accounts.findFirst({ where: eq(accounts.type, "EQUITY") });
    if (!equityAcc) throw new Error("No Equity account found");

    await createJournalEntry({
        description: "Manual Funding Test",
        date: new Date(),
        entries: [
            { accountId: glId, debit: FUNDING_AMOUNT, credit: 0, description: "Add Funds" },
            { accountId: equityAcc.id, debit: 0, credit: FUNDING_AMOUNT, description: "Capital Add" }
        ]
    });

    const glFinal = await db.query.accounts.findFirst({ where: eq(accounts.id, glId) });
    const expectedFinal = expectedAfterExpense + FUNDING_AMOUNT;

    console.log(`   Balance after Funding: ₦${Number(glFinal?.balance).toLocaleString()}`);

    if (Number(glFinal?.balance) !== expectedFinal) {
        console.error(`❌ FAILURE: Balance mismatch after Jounal. Expected ${expectedFinal}, got ${glFinal?.balance}`);
    } else {
        console.log("✅ SUCCESS: Journal Entry credited account correctly.");
    }

    // cleanup
    console.log("\nCleaning up test account...");
    await db.delete(businessAccounts).where(eq(businessAccounts.id, bizAcc.id));
    // Note: GL account remains as per accounting history retention, but for test hygiene in dev this is fine.

    console.log("\nDone.");
    process.exit(0);
}

main().catch(console.error);
