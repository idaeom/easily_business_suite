import { getDb } from "@/db";
import { accounts } from "@/db/schema";
import { eq } from "drizzle-orm";

async function main() {
    const db = await getDb();
    console.log("Seeding Chart of Accounts...");

    const accountList = [
        // Assets
        { code: "1000", name: "Main Wallet", type: "ASSET", description: "System Wallet" },
        { code: "1001", name: "External Bank (GTBank)", type: "ASSET", isExternal: true, description: "External Disbursement Source" },

        // Liabilities
        { code: "2000", name: "Accounts Payable", type: "LIABILITY" },

        // Equity
        { code: "3000", name: "Opening Balance Equity", type: "EQUITY" },

        // Income
        { code: "4000", name: "Service Revenue", type: "INCOME" },

        // Expenses
        { code: "5000", name: "General Expenses", type: "EXPENSE" },
        { code: "5001", name: "Project Expenses", type: "EXPENSE" },
    ];

    for (const acc of accountList) {
        // Upsert logic: Try to find, if not found, insert.
        // Drizzle doesn't have a simple upsert for all drivers yet, but we can check existence.
        // Or use onConflictDoUpdate if supported (Postgres). Assuming Postgres for now as per schema usually.
        // But to be safe and simple:

        const existing = await db.query.accounts.findFirst({
            where: eq(accounts.code, acc.code)
        });

        if (existing) {
            console.log(`Account already exists: ${acc.name} (${acc.code})`);
        } else {
            await db.insert(accounts).values({
                ...acc,
                type: acc.type as any, // Cast string to enum type if needed, or schema handles it
                balance: "0", // Default balance
                currency: "NGN",
            });
            console.log(`Created account: ${acc.name} (${acc.code})`);
        }
    }

    console.log("Seeding complete.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => {
        process.exit(0);
    });
