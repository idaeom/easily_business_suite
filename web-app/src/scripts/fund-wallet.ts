
import { getDb } from "../db";
import { accounts, transactions, ledgerEntries } from "../db/schema";
import { eq } from "drizzle-orm";
import { FinanceService } from "../lib/finance";

async function main() {
    const db = await getDb();

    // Find Paystack Wallet
    const paystackWallet = await db.query.accounts.findFirst({
        where: eq(accounts.code, "PAYSTACK-NGN")
    });

    if (!paystackWallet) {
        console.error("Paystack Wallet not found!");
        return;
    }

    console.log("Funding Paystack Wallet...");

    // Find or Create Equity/funding source
    let capitalAccount = await db.query.accounts.findFirst({
        where: eq(accounts.code, "3001") // Owner's Capital
    });

    if (!capitalAccount) {
        // Create it if missing (should exist from seed)
        const [newAcc] = await db.insert(accounts).values({
            name: "Owner's Capital",
            code: "3001",
            type: "EQUITY",
            currency: "NGN",
            balance: "100000000" // Infinite money for test
        }).returning();
        capitalAccount = newAcc;
    }

    // Fund it
    await FinanceService.createTransaction({
        description: "Test Funding for Paystack Wallet",
        date: new Date(),
        entries: [
            {
                accountId: capitalAccount.id,
                amount: -1000000 // Credit Capital
            },
            {
                accountId: paystackWallet.id,
                amount: 1000000 // Debit Asset (Increase)
            }
        ]
    });

    console.log("Paystack Wallet funded with NGN 1,000,000.");
}

main().catch(console.error);
