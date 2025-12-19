
import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Cleaning up Test DB Budget table schema...");

    const base = process.env.DATABASE_URL;
    if (!base) {
        console.error("DATABASE_URL not found");
        process.exit(1);
    }
    const testUrl = process.env.DATABASE_URL_TEST ||
        (base + (base.includes("?") ? "&" : "?") + "options=-c%20search_path=test");

    const pool = new Pool({ connectionString: testUrl });
    const db = drizzle(pool);

    try {
        // 1. Drop teamId column if it exists
        console.log("Dropping teamId column...");
        await db.execute(sql`
            ALTER TABLE "Budget" DROP COLUMN IF EXISTS "teamId";
        `);

        // 2. Enforce NOT NULL on categoryId
        console.log("Checking for null categoryId...");
        const nulls = await db.execute(sql`SELECT count(*) as count FROM "Budget" WHERE "categoryId" IS NULL`);
        if (Number(nulls.rows[0].count) > 0) {
            console.log(`Found ${nulls.rows[0].count} budgets with null categoryId. Deleting them...`);
            await db.execute(sql`DELETE FROM "Budget" WHERE "categoryId" IS NULL`);
        }

        console.log("Setting categoryId to NOT NULL...");
        await db.execute(sql`
            ALTER TABLE "Budget" ALTER COLUMN "categoryId" SET NOT NULL;
        `);

        console.log("Test DB Schema cleanup complete!");

    } catch (error) {
        console.error("Error cleaning up test schema:", error);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

main();
