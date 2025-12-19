
import "dotenv/config";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Checking Expenses category format...");
    const db = await getDb();

    const expenses = await db.execute(sql`SELECT id, description, category, amount FROM "Expense" LIMIT 10`);
    console.log("Sample Expenses:", expenses.rows);

    process.exit(0);
}

main();
