
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { testDb } from "../db";

async function main() {
    console.log("Migrating Test Database...");
    try {
        await migrate(testDb, { migrationsFolder: "drizzle" });
        console.log("Test Database Migrated Successfully.");
        process.exit(0);
    } catch (error) {
        console.error("Migration Failed:", error);
        process.exit(1);
    }
}

main();
