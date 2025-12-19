import { getDb } from "@/db";
import { accounts } from "@/db/schema";
import { eq } from "drizzle-orm";

async function main() {
    const db = await getDb();
    const secretKey = "sandbox_sk_30c8d96bd053d9001c09640c9b4081a2b0a668a3c798";
    const publicKey = "sandbox_pk_30c8d96bd053d9001c091f739e369fc2aad167a9dcf4";

    console.log("Configuring Squadco Account...");

    // Check if Squadco account exists
    const existingAccount = await db.query.accounts.findFirst({
        where: eq(accounts.provider, "SQUADCO")
    });

    if (existingAccount) {
        console.log("Updating existing Squadco account...");
        await db.update(accounts)
            .set({
                credentials: { secretKey, publicKey }
            })
            .where(eq(accounts.id, existingAccount.id));
    } else {
        console.log("Creating new Squadco account...");
        await db.insert(accounts).values({
            name: "Squadco Wallet",
            code: "SQ-001",
            type: "ASSET",
            provider: "SQUADCO",
            balance: "0",
            currency: "NGN",
            credentials: { secretKey, publicKey }
        });
    }

    console.log("Squadco configuration complete! 🚀");
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
