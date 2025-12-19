
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { testDb } from "../db";

async function main() {
    console.log("Resetting Test Database Schema...");
    try {
        // Drop Public Schema and Recreate (Nuclear Option for Dev/Test)
        await testDb.execute(sql`DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public;`);

        console.log("Applying Migrations...");
        await migrate(testDb, { migrationsFolder: "drizzle" });

        console.log("Test Database Reset & Migrated Successfully.");
        process.exit(0);
    } catch (error) {
        console.error("Reset Failed:", error);
        process.exit(1);
    }
}

main();
