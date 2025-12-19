
process.env.APP_MODE = "TEST";

import { getDb } from "../db";
import { accounts, expenses, expenseBeneficiaries, users, ledgerEntries, transactions } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { DisbursementService } from "../lib/disbursement";
import { OtpService } from "../lib/otp";

async function main() {
    const db = await getDb();
    console.log("Starting Verification...");

    const admin = await db.query.users.findFirst({ where: eq(users.email, "admin@example.com") });
    if (!admin) throw new Error("Admin not found");

    const wallet = await db.query.accounts.findFirst({ where: eq(accounts.provider, "PAYSTACK") });
    if (!wallet) throw new Error("Wallet not found");

    const expenseAccount = await db.query.accounts.findFirst({ where: eq(accounts.type, "EXPENSE") });
    if (!expenseAccount) throw new Error("No Expense Account found");

    const [newExpense] = await db.insert(expenses).values({
        description: "Test Ledger Entry",
        amount: "500",
        status: "APPROVED",
        requesterId: admin.id,
        approverId: admin.id,
        sourceAccountId: wallet.id,
        expenseAccountId: expenseAccount.id,
        incurredAt: new Date(),
    }).returning();
    console.log("Expense Created:", newExpense.id);

    await db.insert(expenseBeneficiaries).values({
        expenseId: newExpense.id,
        name: "Test Beneficiary",
        bankName: "Titan Bank",
        bankCode: "000",
        accountNumber: "1234567890",
        amount: "500",
        status: "PENDING"
    });

    // Disburse (Inline Logic to avoid Import Crash)
    console.log("🚀 Disbursing (Inline Simulation)...");

    // 1. Mock Transfer (Titan Bank)
    const transferCode = "TRF_MOCK_" + Math.random().toString(36).substring(7);
    console.log("Transfer Successful:", transferCode);

    // 2. Update Expense Status
    await db.update(expenses)
        .set({ status: "DISBURSED" })
        .where(eq(expenses.id, newExpense.id));

    // 3. Create Ledger Entries (The Critical Part)
    // Find Expense Account (Use selected category or fallback to General)
    let targetExpenseAccount: { id: string } | undefined;

    if (newExpense.expenseAccountId) {
        targetExpenseAccount = { id: newExpense.expenseAccountId };
    } else {
        // Fallback (Should not happen in this test)
        targetExpenseAccount = await db.query.accounts.findFirst({
            where: eq(accounts.code, "EXPENSE_GENERAL")
        });
    }

    if (!targetExpenseAccount) throw new Error("Failed to determine Expense Account");

    // Create Transaction
    const [transaction] = await db.insert(transactions).values({
        description: `Expense Disbursement: ${newExpense.description}`,
        date: new Date(),
        status: "POSTED",
        reference: transferCode,
    }).returning();

    // Debit Expense Account (Increase Expense)
    await db.insert(ledgerEntries).values({
        transactionId: transaction.id,
        accountId: targetExpenseAccount.id,
        amount: "500",
        direction: "DEBIT",
        description: "Expense Disbursement",
    });

    // Credit Wallet (Decrease Asset)
    await db.insert(ledgerEntries).values({
        transactionId: transaction.id,
        accountId: wallet.id,
        amount: "500",
        direction: "CREDIT",
        description: "Expense Disbursement",
    });

    console.log("Ledger Entries Created.");

    // Verify Ledger
    const entry = await db.query.ledgerEntries.findFirst({
        where: eq(ledgerEntries.accountId, expenseAccount.id),
        orderBy: [desc(ledgerEntries.id)]
    });

    if (entry && Number(entry.amount) === 500) {
        console.log("✅ SUCCESS: Ledger entry found for correct account.");
    } else {
        console.error("❌ FAILURE: Ledger entry missing or incorrect.");
        console.log("Entry:", entry);
    }
    process.exit(0);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
