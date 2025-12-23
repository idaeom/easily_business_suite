
import { getDb } from "@/db";
import { accounts, ledgerEntries } from "@/db/schema";
import { sql, eq } from "drizzle-orm";

async function fixUnbalanced() {
    const db = await getDb();
    console.log("🚀 Starting Unbalanced Transaction Fix...");

    // 1. Ensure Suspense Account Exists
    let suspenseAccount = await db.query.accounts.findFirst({
        where: eq(accounts.code, "9999")
    });

    if (!suspenseAccount) {
        console.log("Creating 9999 - Suspense Account...");
        const [acc] = await db.insert(accounts).values({
            code: "9999",
            name: "Suspense / Data Correction",
            type: "EQUITY", // or LIABILITY? Equity is safer for "Adjustment"
            description: "System generated balancing account for corrupt data",
            currency: "NGN",
            balance: "0"
        }).returning();
        suspenseAccount = acc;
    }

    // 2. Identify Unbalanced Transactions
    // Using simple loop logic for safety
    const allEntries = await db.query.ledgerEntries.findMany({
        with: { transaction: true }
    });

    // Group by Transaction
    const txMap = new Map<string, typeof allEntries>();
    for (const e of allEntries) {
        if (!txMap.has(e.transactionId)) txMap.set(e.transactionId, []);
        txMap.get(e.transactionId)?.push(e);
    }

    let fixedCount = 0;

    for (const [txId, entries] of txMap.entries()) {
        let debits = 0;
        let credits = 0;

        for (const e of entries) {
            if (e.direction === "DEBIT") debits += Number(e.amount);
            else credits += Number(e.amount);
        }

        const diff = debits - credits; // Positive = Needs Credit. Negative = Needs Debit.

        if (Math.abs(diff) > 0.01) {
            console.log(`Fixing Tx ${txId}. Debits: ${debits}, Credits: ${credits}, Diff: ${diff}`);

            // Create Balancing Entry
            await db.insert(ledgerEntries).values({
                transactionId: txId,
                accountId: suspenseAccount.id,
                amount: Math.abs(diff).toString(),
                direction: diff > 0 ? "CREDIT" : "DEBIT",
                description: "System Fix: Balancing Entry"
            });

            fixedCount++;
        }
    }

    console.log(`✅ Fixed ${fixedCount} unbalanced transactions.`);
    process.exit(0);
}

fixUnbalanced().catch(console.error);
