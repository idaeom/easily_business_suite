import { db } from "@/db";
import { accounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { FinanceService } from "../lib/finance";

async function main() {
    const amount = Number(process.argv[2]) || 5000000; // Default 5M

    console.log(`Funding account with ${amount}...`);

    // 1. Find Bank Account (Target)
    const banks = await db.query.businessAccounts.findMany({
        where: eq(accounts.type, "BANK")
    });

    if (banks.length === 0) {
        console.error("No BANK accounts found!");
        return;
    }
    const bank = banks[0];

    // 2. Find/Create Equity Account (Source)
    let equity = await db.query.accounts.findFirst({
        where: eq(accounts.code, "3000") // Standard Equity Code
    });

    if (!equity) {
        console.log("Creating Owner's Equity Account...");
        equity = await FinanceService.createAccount({
            name: "Owner's Capital",
            code: "3000",
            type: "EQUITY",
            description: "Capital injection by owners",
            isExternal: false
        });
    }

    if (!equity) throw new Error("Failed to resolve Equity Account");

    // 3. Create Transaction
    // Debit Bank (Increase Asset), Credit Equity (Increase Equity)
    console.log(`Creating Transaction: Debit ${bank.name}, Credit ${equity.name}`);

    await FinanceService.createTransaction({
        description: "Capital Injection (Test Funding)",
        date: new Date(),
        reference: `FUND_${Date.now()}`,
        entries: [
            {
                accountId: bank.id,
                amount: amount, // Debit (+)
                description: "Test Funding Deposit"
            },
            {
                accountId: equity.id,
                amount: -amount, // Credit (-)
                description: "Owner's Capital Injection"
            }
        ]
    });

    console.log("Funding Complete via FinanceService.");
}

main().catch(console.error).finally(() => process.exit());
