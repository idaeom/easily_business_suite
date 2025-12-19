import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

import { cookies } from "next/headers";

// Live Pool (Default / Public Schema)
export const livePool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Test Pool (Test Schema)
// We append options to set search_path to 'test'
// Note: This assumes Postgres. If using another DB, this might need adjustment.
const testConnectionString = process.env.DATABASE_URL_TEST ||
    (process.env.DATABASE_URL + (process.env.DATABASE_URL?.includes("?") ? "&" : "?") + "options=-c%20search_path=test");

const testPool = new Pool({
    connectionString: testConnectionString,
});
testPool.on("connect", (client) => {
    client.query("SET search_path TO test");
});

export const liveDb = drizzle(livePool, { schema });
export const testDb = drizzle(testPool, { schema });

export async function getDb() {
    // Check for explicit mode override (e.g. from scripts)
    if (process.env.APP_MODE === "TEST") return testDb;
    if (process.env.APP_MODE === "LIVE") return liveDb;

    // Check Cookies (Web Context)
    try {
        const cookieStore = await cookies();
        const mode = cookieStore.get("app_mode")?.value;
        return mode === "TEST" ? testDb : liveDb;
    } catch (error) {
        // Fallback for non-request contexts (e.g. build time or scripts without env var)
        return liveDb;
    }
}
