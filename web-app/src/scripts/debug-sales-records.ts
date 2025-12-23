
import { getDb } from "@/db";
import { posTransactions } from "@/db/schema";
import { desc, gt } from "drizzle-orm";

async function main() {
    console.log("🚀 Debugging Sales Records...");

    const db = await getDb();

    // 1. Search for High Value Transactions
    const largeTxs = await db.query.posTransactions.findMany({
        where: gt(posTransactions.totalAmount, "1000000"),
        orderBy: [desc(posTransactions.transactionDate)],
        limit: 10
    });

    console.log(`\nFound ${largeTxs.length} transactions > 1,000,000:`);
    largeTxs.forEach(tx => {
        console.log(`- ID: ${tx.id} | Date: ${tx.transactionDate} | Amount: ₦${Number(tx.totalAmount).toLocaleString()} | Status: ${tx.status} | Shift: ${tx.shiftId}`);
    });

    if (largeTxs.length === 0) {
        console.warn("\n⚠️ No large transactions found in 'PosTransaction' table.");
        console.log("   This implies 'simulate-sales-revenue.ts' did NOT persist the data.");
    } else {
        console.log("\n✅ Transactions exist in 'PosTransaction' table.");
        console.log("   Investigation shifts to:");
        console.log("   1. Why they aren't in GL? (Reconciliation failure?)");
        console.log("   2. Why Report Page filters might hide them?");
    }

    process.exit(0);
}

main().catch(console.error);
