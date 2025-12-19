
process.env.APP_MODE = "TEST";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

async function checkSchema() {
    const db = await getDb();
    console.log("🔍 Checking Schema...");

    try {
        const result = await db.execute(sql`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'Expense' AND column_name = 'expenseAccountId';
        `);

        console.log("Result:", result);

        if ((result as any).length > 0 || (result as any).rowCount > 0) {
            console.log("✅ Column 'expenseAccountId' exists!");
        } else {
            console.error("❌ Column 'expenseAccountId' MISSING!");
        }
    } catch (err) {
        console.error("Error querying schema:", err);
    }
    process.exit(0);
}

checkSchema();
