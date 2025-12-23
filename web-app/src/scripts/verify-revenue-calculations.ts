
import { getFinancialStatements } from "@/actions/reports";
import { getDb } from "@/db";
import { accounts, ledgerEntries } from "@/db/schema";
import { eq, and } from "drizzle-orm";

async function main() {
    console.log("🚀 Starting Revenue Calculation Verification...");

    const db = await getDb();

    // 1. Get Report Output
    console.log("\n--- Report Output ---");
    const reports = await getFinancialStatements();
    const incomeAccounts = reports.profitAndLoss.income;
    console.log("Reported Income Accounts:", incomeAccounts);
    console.log("Reported Total Income:", reports.profitAndLoss.totalIncome);

    // 2. Deep Dive into Sales Revenue Accounts
    console.log("\n--- Raw Ledger Verification ---");

    // Find accounts implicated in Income
    for (const incAcc of incomeAccounts) {
        const accountDef = await db.query.accounts.findFirst({
            where: eq(accounts.name, incAcc.name)
        });

        if (!accountDef) {
            console.error(`❌ Account not found in DB: ${incAcc.name}`);
            continue;
        }

        console.log(`\nAnalyzing Account: ${accountDef.name} [${accountDef.code}] (Type: ${accountDef.type})`);

        // Fetch all ledger entries
        const entries = await db.query.ledgerEntries.findMany({
            where: eq(ledgerEntries.accountId, accountDef.id),
            with: {
                transaction: true
            }
        });

        let calculatedBalance = 0;
        let debitSum = 0;
        let creditSum = 0;

        console.log(`   Found ${entries.length} Ledger Entries`);

        for (const entry of entries) {
            const amount = Number(entry.amount);
            if (entry.direction === "CREDIT") {
                creditSum += amount;
                calculatedBalance -= amount; // Income is Credit normal (negative in system usually, or positive if liability-like? Check system convention)
                // In this system: Assets/Expenses = DEBIT (+), Liab/Equity/Income = CREDIT (-)
                // But report displays absolute values.
            } else {
                debitSum += amount;
                calculatedBalance += amount;
            }

            // Log large entries to spot potential bad data
            if (amount > 1000000) {
                console.log(`   - Large Entry: ${entry.direction} ₦${amount.toLocaleString()} | Tx: ${entry.transactionId} | Desc: ${entry.transaction?.description}`);
            }
        }

        console.log(`   > Sum Debits: ₦${debitSum.toLocaleString()}`);
        console.log(`   > Sum Credits: ₦${creditSum.toLocaleString()}`);
        console.log(`   > Net Balance (Raw): ₦${calculatedBalance.toLocaleString()}`);
        console.log(`   > Absolute Value (for Report): ₦${Math.abs(calculatedBalance).toLocaleString()}`);
        console.log(`   > Report Value: ₦${incAcc.amount.toLocaleString()}`);

        if (Math.abs(Math.abs(calculatedBalance) - incAcc.amount) > 1) {
            console.error(`   ❌ MISMATCH: Calculated ₦${Math.abs(calculatedBalance)} vs Reported ₦${incAcc.amount}`);
            console.log("   Potential Cause: account.balance column out of sync with ledger_entries?");
            console.log(`   DB Account Balance Column: ${accountDef.balance}`);
        } else {
            console.log(`   ✅ MATCH: Ledger Sum matches Report Output`);
        }
    }

    console.log("\nDone.");
    process.exit(0);
}

main().catch(console.error);
