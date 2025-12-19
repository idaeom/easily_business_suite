
import { getDb } from "../db";
import { accounts } from "../db/schema";
import { eq } from "drizzle-orm";

async function main() {
    const db = await getDb();
    const allAccounts = await db.query.accounts.findMany();

    console.log("--- Account Balances ---");
    allAccounts.forEach(acc => {
        console.log(`[${acc.type}] ${acc.name} (${acc.provider || 'No Provider'}): ₦${acc.balance} (Code: ${acc.code})`);
    });
}

main().catch(console.error);
