
process.env.APP_MODE = "TEST";

import { getDb } from "../db";
import { accounts } from "../db/schema";
import { eq } from "drizzle-orm";

async function updateWallet() {
    const db = await getDb();
    console.log("Updating Paystack Wallet Bank Name...");

    const wallet = await db.query.accounts.findFirst({
        where: eq(accounts.provider, "PAYSTACK")
    });

    if (!wallet) {
        console.error("Wallet not found");
        process.exit(1);
    }

    await db.update(accounts)
        .set({ bankName: "Titan Bank" })
        .where(eq(accounts.id, wallet.id));

    console.log("✅ Wallet Updated to Titan Bank");
    process.exit(0);
}

updateWallet().catch(console.error);
