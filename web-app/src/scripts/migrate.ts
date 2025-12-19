
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { liveDb, livePool } from "../db";

async function main() {
    console.log("Migrating database...");
    await migrate(liveDb, { migrationsFolder: "./drizzle" });
    console.log("Migration complete!");

    // Close pool to allow script to exit
    await livePool.end();
    process.exit(0);
}

main().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
});
