import { getDb } from "../db";
import { accounts, transactions, ledgerEntries, expenses, expenseBeneficiaries } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config();

async function resetFinance() {
    const db = await getDb();
    console.log("Starting Finance Reset...");

    try {
        // 1. Clear Ledger Entries and Transactions
        console.log("Clearing Ledger Entries...");
        await db.delete(ledgerEntries);

        console.log("Clearing Transactions...");
        await db.delete(transactions);

        // 2. Clear Expenses (Optional, but good for a clean slate)
        console.log("Clearing Expenses...");
        await db.delete(expenseBeneficiaries);
        await db.delete(expenses);

        // 3. Reset Account Balances to 0
        console.log("Resetting Account Balances...");
        await db.update(accounts).set({ balance: "0" });

        // 4. Ensure Paystack Account Exists
        console.log("Configuring Paystack Account...");
        const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
        const paystackPublicKey = process.env.PAYSTACK_PUBLIC_KEY;

        if (!paystackSecretKey) {
            console.warn("WARNING: PAYSTACK_SECRET_KEY not found in env. Paystack account will not have credentials.");
        }

        const existingPaystack = await db.query.accounts.findFirst({
            where: eq(accounts.provider, "PAYSTACK")
        });

        if (existingPaystack) {
            console.log("Updating existing Paystack account credentials...");
            await db.update(accounts)
                .set({
                    credentials: { secretKey: paystackSecretKey, publicKey: paystackPublicKey },
                    isExternal: true
                })
                .where(eq(accounts.id, existingPaystack.id));
        } else {
            console.log("Creating new Paystack account...");
            await db.insert(accounts).values({
                name: "Paystack Wallet",
                code: "PAYSTACK-NGN",
                type: "ASSET",
                currency: "NGN",
                description: "Main Paystack Integration Wallet",
                isExternal: true,
                provider: "PAYSTACK",
                credentials: { secretKey: paystackSecretKey, publicKey: paystackPublicKey },
                balance: "0"
            });
        }

        console.log("✅ Finance Data Reset & Paystack Configured Successfully!");
    } catch (error) {
        console.error("❌ Error resetting finance data:", error);
    } finally {
        process.exit();
    }
}

resetFinance();
