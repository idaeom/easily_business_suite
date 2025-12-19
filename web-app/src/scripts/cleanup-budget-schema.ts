
import "dotenv/config";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Cleaning up Budget table schema...");
    const db = await getDb();

    try {
        // 1. Drop teamId column if it exists
        console.log("Dropping teamId column...");
        await db.execute(sql`
            ALTER TABLE "Budget" DROP COLUMN IF EXISTS "teamId";
        `);

        // 2. Enforce NOT NULL on categoryId
        // First, ensure no nulls exist (delete or update them)
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

        console.log("Schema cleanup complete!");

    } catch (error) {
        console.error("Error cleaning up schema:", error);
    } finally {
        process.exit(0);
    }
}

main();
