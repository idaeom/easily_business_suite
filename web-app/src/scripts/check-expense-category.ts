
import "dotenv/config";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Checking ExpenseCategory table schema and data...");
    const db = await getDb();

    try {
        // 1. Check Schema
        console.log("--- Schema ---");
        const columns = await db.execute(sql`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'ExpenseCategory';
        `);
        console.log("Columns:", columns.rows);

        if (columns.rows.length === 0) {
            console.error("CRITICAL: Table 'ExpenseCategory' does not exist!");
            return;
        }

        // 2. Check Data
        console.log("\n--- Data ---");
        const categories = await db.execute(sql`SELECT * FROM "ExpenseCategory" LIMIT 5`);
        console.log("Sample Categories:", categories.rows);

        const categoryCount = await db.execute(sql`SELECT count(*) as count FROM "ExpenseCategory"`);
        console.log("Total Categories:", categoryCount.rows[0].count);

        // 3. Check Integrity with Budgets
        console.log("\n--- Integrity ---");
        const budgets = await db.execute(sql`SELECT "id", "categoryId" FROM "Budget"`);
        console.log(`Checking ${budgets.rows.length} budgets...`);

        for (const budget of budgets.rows) {
            const catId = budget.categoryId;
            const cat = await db.execute(sql`SELECT "id" FROM "ExpenseCategory" WHERE "id" = ${catId}`);
            if (cat.rows.length === 0) {
                console.error(`ORPHAN DETECTED: Budget ${budget.id} points to non-existent Category ${catId}`);
            } else {
                console.log(`Budget ${budget.id} linked to Category ${catId} (OK)`);
            }
        }

    } catch (error) {
        console.error("Error checking ExpenseCategory:", error);
    } finally {
        process.exit(0);
    }
}

main();
