
import { getDb } from "@/db";
import { accounts, posShifts } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

async function main() {
    console.log("🚀 Verifying Sales GL & Shift Data...");
    const db = await getDb();

    // 1. Check GL Account
    const salesAccount = await db.query.accounts.findFirst({
        where: eq(accounts.code, "ACC-INC-SALES")
    });

    if (salesAccount) {
        console.log(`✅ Found Sales Account: ${salesAccount.name} [${salesAccount.code}]`);
    } else {
        console.error("❌ Sales Account 'ACC-INC-SALES' NOT FOUND!");
        const allIncome = await db.query.accounts.findMany({ where: eq(accounts.type, "INCOME") });
        console.log("   Available Income Accounts:", allIncome.map(a => `${a.name} [${a.code}]`).join(", "));
    }

    // 2. Check Shift Outlets on Recent Large Transactions
    // We know shift IDs from previous debug: 918..., b0a..., c1f...
    // Let's fetch shifts with null outletId
    const nullOutletShifts = await db.query.posShifts.findMany({
        where: eq(posShifts.status, "RECONCILED"), // Assuming they were reconciled
        limit: 10,
        orderBy: (shifts, { desc }) => [desc(shifts.startTime)]
    });

    console.log("\nChecking Recent Reconciled Shifts:");
    nullOutletShifts.forEach(s => {
        console.log(`- Shift #${s.id.slice(0, 8)} | Outlet: ${s.outletId} | Cashier: ${s.cashierId}`);
    });

    process.exit(0);
}

main().catch(console.error);
