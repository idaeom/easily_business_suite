
import { testDb, liveDb } from "../db";
import { users } from "../db/schema";
import { sql } from "drizzle-orm";

async function main() {
    console.log("🔄 Syncing ALL Users from Live (Public) to Test Schema...");

    // 1. Fetch all Live Users
    // We use raw SQL or Query Builder. Raw is safer for bulk export.
    const liveUsers = await liveDb.select().from(users);
    console.log(`Found ${liveUsers.length} users in Live DB.`);

    if (liveUsers.length === 0) {
        console.log("No users to sync.");
        process.exit(0);
    }

    // 2. Upsert into Test DB
    let synced = 0;
    for (const u of liveUsers) {
        try {
            await testDb.execute(sql`
                INSERT INTO test."User" (id, name, email, password, role, image, permissions, "createdAt", "updatedAt")
                VALUES (${u.id}, ${u.name}, ${u.email}, ${u.password}, ${u.role}, ${u.image}, ${JSON.stringify(u.permissions)}, ${u.createdAt}, ${u.updatedAt})
                ON CONFLICT (email) 
                DO UPDATE SET 
                    password = EXCLUDED.password,
                    role = EXCLUDED.role,
                    name = EXCLUDED.name,
                    "updatedAt" = now();
            `);
            synced++;
        } catch (e: any) {
            console.error(`Failed to sync user ${u.email}:`, e.message);
        }
    }

    console.log(`✅ Successfully synced ${synced} users to Test Mode.`);
    console.log("You can now log in to Test Mode with your Live credentials.");
    process.exit(0);
}
main();
