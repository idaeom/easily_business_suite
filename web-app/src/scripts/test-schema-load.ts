
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../db/schema";

async function main() {
    console.log("Testing schema loading...");
    try {
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
        });
        const db = drizzle(pool, { schema });

        // Try to query to trigger relation initialization
        await db.query.users.findFirst({
            with: {
                team: true,
                tasksAssigned: true
            }
        });

        console.log("Schema loaded successfully!");
    } catch (error) {
        console.error("Schema load failed:", error);
    } finally {
        process.exit(0);
    }
}

main();
