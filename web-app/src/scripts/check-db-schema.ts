
import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Checking Test DB Budget table schema...");

    // Construct Test DB connection string
    const testConnectionString = process.env.DATABASE_URL_TEST ||
        (process.env.DATABASE_URL + (process.env.DATABASE_URL?.includes("?") ? "&" : "?") + "options=-c%20search_path=test");

    const pool = new Pool({ connectionString: testConnectionString });
    const db = drizzle(pool);

    try {
        // Query information_schema to get columns for 'test' schema
        const result = await db.execute(sql`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'Budget' AND table_schema = 'test';
        `);

        console.log("Columns in Test DB Budget table:", result.rows);

        if (result.rows.length === 0) {
            console.log("Table 'Budget' not found in 'test' schema.");
        }

    } catch (error) {
        console.error("Error checking test schema:", error);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

main();
