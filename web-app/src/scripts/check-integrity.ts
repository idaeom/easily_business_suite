
import { getDb } from "@/db";
import { accounts, ledgerEntries } from "@/db/schema";
import { notInArray, sql } from "drizzle-orm";

async function checkIntegrity() {
    const db = await getDb();

    // 1. Get All Valid Account IDs
    const allAccounts = await db.select({ id: accounts.id }).from(accounts);
    const accountIds = allAccounts.map(a => a.id);

    // 2. Find Ledger Entries with invalid Account IDs
    const orphans = await db.select({
        count: sql<number>`count(*)`,
        totalAmount: sql<number>`sum(${ledgerEntries.amount})`,
        accountId: ledgerEntries.accountId
    })
        .from(ledgerEntries)
        .where(notInArray(ledgerEntries.accountId, accountIds))
        .groupBy(ledgerEntries.accountId);

    if (orphans.length > 0) {
        console.error("❌ FOUND ORPHANED ENTRIES:");
        orphans.forEach(o => {
            console.log(`  Account ID: ${o.accountId}, Count: ${o.count}, Volume: ${o.totalAmount}`);
        });
    } else {
        console.log("✅ No orphaned ledger entries found.");
    }

    // 3. Check for Unbalanced Transactions
    // Sum of Debits vs Credits per Transaction
    console.log("\nChecking Transaction Balance...");
    // 3. Check for Unbalanced Transactions
    console.log("\nChecking Transaction Balance...");
    // We cannot easily do HAVING with Drizzle builder for calculated fields unless we use sql
    // So distinct query for this.
    const unbalanced = await db.select({
        transactionId: ledgerEntries.transactionId,
        diff: sql<number>`ABS(SUM(CASE WHEN ${ledgerEntries.direction} = 'DEBIT' THEN ${ledgerEntries.amount} ELSE -${ledgerEntries.amount} END))`
    })
        .from(ledgerEntries)
        .groupBy(ledgerEntries.transactionId)
        .having(sql`ABS(SUM(CASE WHEN ${ledgerEntries.direction} = 'DEBIT' THEN ${ledgerEntries.amount} ELSE -${ledgerEntries.amount} END)) > 0.01`);

    if (unbalanced.length > 0) {
        console.error(`❌ FOUND ${unbalanced.length} UNBALANCED TRANSACTIONS!`);
        console.log("First 5:", unbalanced.slice(0, 5));
    } else {
        console.log("✅ All transactions are balanced.");
    }

    // ... (Keep Account Type Checks) ...

    // 7. Global Sum Check
    console.log("\nChecking Global Ledger Sum...");
    const globalSum = await db.select({
        totalDebit: sql<number>`SUM(CASE WHEN ${ledgerEntries.direction} = 'DEBIT' THEN ${ledgerEntries.amount} ELSE 0 END)`,
        totalCredit: sql<number>`SUM(CASE WHEN ${ledgerEntries.direction} = 'CREDIT' THEN ${ledgerEntries.amount} ELSE 0 END)`
    }).from(ledgerEntries);

    const gDr = Number(globalSum[0]?.totalDebit || 0);
    const gCr = Number(globalSum[0]?.totalCredit || 0);

    console.log(`Global Debits: ${gDr.toLocaleString()}`);
    console.log(`Global Credits: ${gCr.toLocaleString()}`);
    console.log(`Difference: ${(gDr - gCr).toLocaleString()}`);

    process.exit(0);
}

checkIntegrity().catch(console.error);
