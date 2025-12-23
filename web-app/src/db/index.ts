import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

import { cookies } from "next/headers";

// Singleton function to prevent multiple pools in development
const globalForDb = globalThis as unknown as {
    livePool: Pool | undefined;
    testPool: Pool | undefined;
};

// Live Pool (Default / Public Schema)
const liveConnString = process.env.DATABASE_URL;
export const livePool = globalForDb.livePool || new Pool({
    connectionString: liveConnString,
    max: 10, // Max DB connections
});

if (process.env.NODE_ENV !== "production") globalForDb.livePool = livePool;

// Test Pool (Test Schema)
const testConnectionString = process.env.DATABASE_URL_TEST ||
    (process.env.DATABASE_URL + (process.env.DATABASE_URL?.includes("?") ? "&" : "?") + "options=-c%20search_path=test");

export const testPool = globalForDb.testPool || new Pool({
    connectionString: testConnectionString,
    max: 5,
});
testPool.on("connect", (client) => {
    client.query("SET search_path TO test");
});

if (process.env.NODE_ENV !== "production") globalForDb.testPool = testPool;

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
