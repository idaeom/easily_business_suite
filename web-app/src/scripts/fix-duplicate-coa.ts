
import { getDb } from "../db";
import { accounts, ledgerEntries, businessAccounts, paymentMethods, transactions, shiftReconciliations, shiftCashDeposits, spSales, transactionPayments, salesTaxes } from "../db/schema";
import { eq, ne } from "drizzle-orm";
import { initializeStandardCOA } from "../actions/setup";
import { STANDARD_COA } from "../lib/constants/standard-coa";

async function main() {
    console.log("Starting COA Cleanup & Deduplication...");

    // 1. Ensure Standard Accounts Exist
    await initializeStandardCOA();

    const db = await getDb();

    // 2. Fetch All Accounts
    const allAccounts = await db.query.accounts.findMany();

    // Helper to find ID by Code
    const getStandardId = (code: string) => {
        const acc = allAccounts.find(a => a.code === code);
        return acc ? acc.id : null;
    };

    // Define Merge Strategy: "Bad Name/Code" -> "Good Standard Code"
    const MERGE_MAP: Record<string, string> = {
        // "Legacy Name or Code" : "Standard Code"

        // Bank
        "10-1001-00": "1010", // Main Bank
        "Main Bank Account": "1010", // In case duplicate name, different code? 

        // Cash
        "10-1002-00": "1000",
        "Cash on Hand": "1000",

        // Sales
        "ACC-INC-SALES": "4000",
        "Sales Revenue": "4000",

        // Receivables
        "Accounts Receivable": "1100", // Will merge duplicates into the one with code 1100

        // Deposits
        "Customer Deposits": "2300",

        // Tax
        "2200": "2350", // VAT Output 7.5% -> VAT Output
        "VAT Output (7.5%)": "2350",
        "2205": "1400", // VAT Input -> VAT Input
        "2210": "2360", // WHT Payable -> WHT Payable

        // Expenses
        "6110": "6060", // Bank Charges -> Bank Charges
        "6130": "6040", // Repairs -> Repairs

    };

    let totalMigrated = 0;
    let deletedAccounts = 0;

    for (const [legacyIdentifier, targetCode] of Object.entries(MERGE_MAP)) {
        const targetId = getStandardId(targetCode);
        if (!targetId) {
            console.error(`Target Account Code ${targetCode} not found! Skipping merge for ${legacyIdentifier}.`);
            continue;
        }

        // Find "Bad" accounts (Matches identifier by Code OR Name, but IS NOT the Target ID)
        // Note: Identify by Code first, then Name.
        const badAccounts = allAccounts.filter(a =>
            (a.code === legacyIdentifier || a.name === legacyIdentifier) &&
            a.id !== targetId &&
            a.code !== targetCode // Ensure we don't pick the good one
        );

        for (const badAcc of badAccounts) {
            console.log(`Merging Account: [${badAcc.code}] ${badAcc.name} -> Target: ${targetCode}`);

            // 3. Migrate Relations
            // Ledger Entries
            const ledgerRes = await db.update(ledgerEntries)
                .set({ accountId: targetId })
                .where(eq(ledgerEntries.accountId, badAcc.id))
                .returning();

            // Business Accounts (e.g. terminals linked to old GL)
            await db.update(businessAccounts)
                .set({ glAccountId: targetId })
                .where(eq(businessAccounts.glAccountId, badAcc.id));

            // Payment Methods
            await db.update(paymentMethods)
                .set({ glAccountId: targetId })
                .where(eq(paymentMethods.glAccountId, badAcc.id));

            // Transaction Payments (The missing piece)
            await db.update(transactionPayments)
                .set({ accountId: targetId })
                .where(eq(transactionPayments.accountId, badAcc.id));

            // Shift Reconciliations
            await db.update(shiftReconciliations)
                .set({ accountId: targetId })
                .where(eq(shiftReconciliations.accountId, badAcc.id));

            // Shift Cash Deposits
            await db.update(shiftCashDeposits)
                .set({ accountId: targetId })
                .where(eq(shiftCashDeposits.accountId, badAcc.id));

            // Sales Taxes
            await db.update(salesTaxes)
                .set({ glAccountId: targetId })
                .where(eq(salesTaxes.glAccountId, badAcc.id));

            totalMigrated += ledgerRes.length;

            // 4. Update Balances (Transfer bad balance to Good)
            const balanceToMove = Number(badAcc.balance);
            if (balanceToMove !== 0) {
                // Check target type to handle Debit/Credit sign logic if needed? 
                // Usually balance is absolute in DB or signed? 
                // In schema: decimal("balance")
                // Assuming raw addition is safe if they are same type.
                // If types differ (Asset -> Liability), this might be tricky, but assuming same type.
                await db.execute(require("drizzle-orm").sql`UPDATE "Account" SET balance = balance + ${balanceToMove} WHERE id = ${targetId}`);
            }

            // 5. Delete Bad Account
            try {
                await db.delete(accounts).where(eq(accounts.id, badAcc.id));
                console.log(` - Deleted ${badAcc.id}`);
                deletedAccounts++;
            } catch (e) {
                console.error(` - Failed to delete ${badAcc.id} (Constraint?):`, e);
            }
        }
    }

    console.log(`\nCleanup Complete.`);
    console.log(` - Ledger Entries Migrated: ${totalMigrated}`);
    console.log(` - Duplicate Accounts Deleted: ${deletedAccounts}`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
