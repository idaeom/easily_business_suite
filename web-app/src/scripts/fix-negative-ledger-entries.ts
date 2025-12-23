
import { getDb } from "@/db";
import { ledgerEntries } from "@/db/schema";
import { sql, eq } from "drizzle-orm";

async function fixNegativeEntries() {
    const db = await getDb();
    console.log("🚀 Starting Negative Ledger Entry Fix...");

    // 1. Fetch Negative Entries
    const negs = await db.select().from(ledgerEntries).where(sql`${ledgerEntries.amount} < 0`);
    console.log(`Found ${negs.length} negative entries.`);

    if (negs.length === 0) {
        console.log("No negative entries to fix.");
        process.exit(0);
    }

    let fixedCount = 0;

    for (const entry of negs) {
        // Logic: specific Credit -100 === Debit 100.
        // So we take ABS(amount) and FLIP direction.

        const newAmount = Math.abs(Number(entry.amount));
        const newDirection = entry.direction === "CREDIT" ? "DEBIT" : "CREDIT";

        console.log(`Fixing Entry ${entry.id}: ${entry.direction} ${entry.amount} -> ${newDirection} ${newAmount}`);

        await db.update(ledgerEntries).set({
            amount: newAmount.toString(),
            direction: newDirection
        }).where(eq(ledgerEntries.id, entry.id));

        fixedCount++;
    }

    console.log(`✅ Successfully fixed ${fixedCount} entries.`);
    process.exit(0);
}

fixNegativeEntries().catch(console.error);
