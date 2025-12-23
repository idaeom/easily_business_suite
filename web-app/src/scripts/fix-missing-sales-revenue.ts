
import { getDb } from "@/db";
import { accounts, ledgerEntries, transactions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

async function main() {
    console.log("🚀 Repairing Missing Sales Revenue...");
    const db = await getDb();

    // 1. Get Sales Revenue Account
    const salesAccount = await db.query.accounts.findFirst({
        where: eq(accounts.code, "4000")
    });

    if (!salesAccount) {
        console.error("❌ Sales Revenue Account (4000) not found! Cannot proceed.");
        process.exit(1);
    }
    console.log(`✅ Using Sales Account: ${salesAccount.name} [${salesAccount.id}]`);

    // 2. Find Shift Reconciliation Transactions
    const shiftTxs = await db.query.transactions.findMany({
        where: sql`metadata->>'type' = 'SHIFT_RECONCILIATION'`,
        with: {
            entries: true
        }
    });

    console.log(`Found ${shiftTxs.length} Shift Reconciliation Transactions.`);

    let fixedCount = 0;
    let totalFixedAmount = 0;

    for (const tx of shiftTxs) {
        let debits = 0;
        let credits = 0;

        for (const entry of tx.entries) {
            if (entry.direction === "DEBIT") debits += Number(entry.amount);
            else credits += Number(entry.amount);
        }

        const variance = debits - credits;

        // If Debits > Credits, we are missing Revenue (Credit) side
        // (Assuming no Cash Shortage logic involved in this specific unbalanced state, 
        // usually Shortage is explicitly calculated. Here we assume the missing chunk is Revenue)

        if (variance > 1) { // Tolerance 1.00
            console.log(`⚠️ Unbalanced Tx: ${tx.id} | Date: ${tx.date} | Debits: ${debits}, Credits: ${credits}, Diff: ${variance}`);

            // Post Missing Credit
            await db.insert(ledgerEntries).values({
                transactionId: tx.id,
                accountId: salesAccount.id,
                amount: variance.toString(),
                direction: "CREDIT",
                description: "Repair: Missing Sales Revenue"
            });

            // Update Account Balance
            // Income acts as Credit Normal in this system? 
            // Previous scripts implied: Revenue increases with Credit.
            // But verify balance logic. 
            // In `reconcile-gl-balances`: 
            // Income Balance = Credit - Debit.
            // So adding a Credit increases Balance.

            await db.update(accounts)
                .set({ balance: sql`${accounts.balance} + ${variance}` })
                .where(eq(accounts.id, salesAccount.id));

            console.log(`   ✅ Posted Missing Credit of ₦${variance.toLocaleString()}`);
            fixedCount++;
            totalFixedAmount += variance;
        } else if (variance < -1) {
            console.warn(`   ❓ Credits > Debits by ${Math.abs(variance)}. Unusual for this issue.`);
        }
    }

    console.log(`\n✨ Repair Complete.`);
    console.log(`   Fixed ${fixedCount} transactions.`);
    console.log(`   Total Revenue Restored: ₦${totalFixedAmount.toLocaleString()}`);

    process.exit(0);
}

main().catch(console.error);
