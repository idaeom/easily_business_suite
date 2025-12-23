
import { getDb } from "@/db";
import { accounts, ledgerEntries } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

async function main() {
    console.log("🚀 Starting GL Balance Reconciliation...");

    const db = await getDb();

    // Fetch all accounts
    const allAccounts = await db.query.accounts.findMany();
    console.log(`Found ${allAccounts.length} accounts to reconcile.`);

    for (const acc of allAccounts) {
        // Calculate balance from ledger
        const result = await db
            .select({
                debits: sql<number>`SUM(CASE WHEN ${ledgerEntries.direction} = 'DEBIT' THEN ${ledgerEntries.amount} ELSE 0 END)`,
                credits: sql<number>`SUM(CASE WHEN ${ledgerEntries.direction} = 'CREDIT' THEN ${ledgerEntries.amount} ELSE 0 END)`,
            })
            .from(ledgerEntries)
            .where(eq(ledgerEntries.accountId, acc.id));

        const debits = Number(result[0].debits || 0);
        const credits = Number(result[0].credits || 0);

        let newBalance = 0;

        // Normal Balance Logic
        if (["ASSET", "EXPENSE"].includes(acc.type)) {
            newBalance = debits - credits; // Normal Debit
        } else {
            newBalance = credits - debits; // Normal Credit (Liability, Equity, Income)
        }

        // Check for discrepancy
        const currentBalance = Number(acc.balance);
        if (Math.abs(newBalance - currentBalance) > 0.01) {
            console.log(`⚠️ MISMATCH [${acc.name}]: DB ${currentBalance} != Calc ${newBalance}. Updating...`);

            await db.update(accounts)
                .set({ balance: newBalance.toString() })
                .where(eq(accounts.id, acc.id));

            console.log(`   ✅ Updated ${acc.name} to ${newBalance}`);
        } else {
            // console.log(`   OK ${acc.name}`);
        }
    }

    console.log("\nReconciliation Complete.");
    process.exit(0);
}

main().catch(console.error);
