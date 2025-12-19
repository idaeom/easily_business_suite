
import { getDb } from "../src/db";
import { accounts } from "../src/db/schema";
import { like } from "drizzle-orm";

async function resetTitanAccounts() {
    const db = await getDb();
    console.log("Searching for Titan Bank accounts...");
    const titanAccounts = await db.select().from(accounts).where(like(accounts.bankName, "%Titan%"));

    if (titanAccounts.length === 0) {
        console.log("No Titan Bank accounts found.");
        process.exit(0);
    }

    console.log(`Found ${titanAccounts.length} account(s). Resetting...`);

    for (const acc of titanAccounts) {
        await db.update(accounts)
            .set({
                bankName: null,
                accountNumber: null,
            })
            .where(like(accounts.id, acc.id));
        console.log(`Reset account: ${acc.name} (${acc.id})`);
    }

    console.log("Done!");
    process.exit(0);
}

resetTitanAccounts().catch(err => {
    console.error(err);
    process.exit(1);
});
