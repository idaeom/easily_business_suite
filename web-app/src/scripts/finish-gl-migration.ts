
import { getDb } from "@/db";
import { accounts, ledgerEntries, transactions } from "@/db/schema";
import { eq, like } from "drizzle-orm";

async function main() {
    console.log("🚀 Finishing GL Migration...");
    const db = await getDb();

    // 1. Find Accounts
    const gtGL = await db.query.accounts.findFirst({ where: eq(accounts.code, "1011") });
    const accessGL = await db.query.accounts.findFirst({ where: eq(accounts.code, "1012") });
    const mainGL = await db.query.accounts.findFirst({ where: eq(accounts.code, "1010") }); // OR whatever the shared one was

    if (!gtGL || !accessGL || !mainGL) {
        console.error("❌ Could not find all GL Accounts.");
        return;
    }

    console.log(`GTBank (1011) Balance: ${gtGL.balance}`);
    console.log(`Access (1012) Balance: ${accessGL.balance}`);
    console.log(`Main (1010) Balance: ${mainGL.balance}`);

    // 2. Perform Transfer (Correction Journal)
    const TARGET_AMOUNT = 11250000;

    // Check if already corrected?
    if (Number(gtGL.balance) > 0 || Number(accessGL.balance) > 0) {
        console.log("⚠️ Balances already look positive. Checking if we need to proceed.");
        // If they are > 0, maybe we don't need to do anything.
        // But verifying script said 0.
    }

    if (Number(gtGL.balance) === 0) {
        console.log("🛠️ Fixing GTBank Balance...");
        // Debit GTBank, Credit Main
        const txId = crypto.randomUUID();
        await db.insert(transactions).values({
            id: txId,
            description: "GL Correction: Transfer from Main to GTBank",
            date: new Date(),
            status: "POSTED"
        });

        await db.insert(ledgerEntries).values([
            {
                transactionId: txId,
                accountId: gtGL.id,
                direction: "DEBIT",
                amount: TARGET_AMOUNT.toString(),
                description: "Correction Transfer"
            },
            {
                transactionId: txId,
                accountId: mainGL.id,
                direction: "CREDIT",
                amount: TARGET_AMOUNT.toString(),
                description: "Correction Transfer"
            }
        ]);

        // Update Balances
        await db.update(accounts)
            .set({ balance: (Number(gtGL.balance) + TARGET_AMOUNT).toString() })
            .where(eq(accounts.id, gtGL.id));

        await db.update(accounts)
            .set({ balance: (Number(mainGL.balance) - TARGET_AMOUNT).toString() })
            .where(eq(accounts.id, mainGL.id));

        console.log("   ✅ GTBank Fixed.");
    }

    if (Number(accessGL.balance) === 0) {
        console.log("🛠️ Fixing Access Bank Balance...");
        // Debit Access, Credit Main
        const txId = crypto.randomUUID();
        await db.insert(transactions).values({
            id: txId,
            description: "GL Correction: Transfer from Main to Access",
            date: new Date(),
            status: "POSTED"
        });

        await db.insert(ledgerEntries).values([
            {
                transactionId: txId,
                accountId: accessGL.id,
                direction: "DEBIT",
                amount: TARGET_AMOUNT.toString(),
                description: "Correction Transfer"
            },
            {
                transactionId: txId,
                accountId: mainGL.id,
                direction: "CREDIT",
                amount: TARGET_AMOUNT.toString(),
                description: "Correction Transfer"
            }
        ]);

        // Update Balances 
        // Note: mainGL balance changed in previous block, fetching fresh or creating delta? 
        // Just SQL update it safely if concurrent, but here sequential.

        await db.update(accounts)
            .set({ balance: (Number(accessGL.balance) + TARGET_AMOUNT).toString() })
            .where(eq(accounts.id, accessGL.id));

        // Decrement Main AGAIN
        // We need to fetch latest main balance or use SQL decrement
        const freshMain = await db.query.accounts.findFirst({ where: eq(accounts.code, "1010") });
        if (freshMain) {
            await db.update(accounts)
                .set({ balance: (Number(freshMain.balance) - TARGET_AMOUNT).toString() })
                .where(eq(accounts.id, mainGL.id));
        }

        console.log("   ✅ Access Bank Fixed.");
    }

    console.log("✨ Migration Complete.");
}

main().catch(console.error);
