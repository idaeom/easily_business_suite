
import { getDb } from "../db";
import { sql } from "drizzle-orm";

async function main() {
    const db = await getDb();
    console.log("Running manual migration...");

    try {
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS shift_cash_deposits (
                id text PRIMARY KEY,
                "shiftId" text NOT NULL REFERENCES "Shift"(id) ON DELETE CASCADE,
                amount decimal NOT NULL,
                "accountId" text REFERENCES "Account"(id),
                reference text,
                notes text,
                "depositedById" text REFERENCES "User"(id),
                "createdAt" timestamp DEFAULT now() NOT NULL
            );
        `);
        console.log("Created shift_cash_deposits table.");
    } catch (e) {
        console.error("Error creating table:", e);
    }

    process.exit(0);
}

main();
