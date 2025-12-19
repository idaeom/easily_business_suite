import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

async function main() {
    console.log("Verifying Database Separation...");

    // 1. Test Mode
    process.env.APP_MODE = "TEST";
    console.log("\n--- Switching to TEST Mode ---");
    const testDb = await getDb();

    const testEmail = `test-separation-${Date.now()}@example.com`;
    console.log(`Inserting user in TEST mode: ${testEmail}`);

    await testDb.insert(users).values({
        email: testEmail,
        name: "Test Separation User",
        password: "password"
    });

    const testUser = await testDb.query.users.findFirst({
        where: eq(users.email, testEmail)
    });

    if (testUser) {
        console.log("✅ User found in TEST DB.");
    } else {
        console.error("❌ User NOT found in TEST DB.");
        process.exit(1);
    }

    // 2. Live Mode
    process.env.APP_MODE = "LIVE";
    console.log("\n--- Switching to LIVE Mode ---");
    const liveDb = await getDb();

    const liveUser = await liveDb.query.users.findFirst({
        where: eq(users.email, testEmail)
    });

    if (!liveUser) {
        console.log("✅ User NOT found in LIVE DB (Correct Separation).");
    } else {
        console.error("❌ User FOUND in LIVE DB (Separation Failed!).");
        console.error("This means both modes are connecting to the same database.");
        process.exit(1);
    }

    console.log("\n✅ Database Separation Verified Successfully!");
}

main()
    .catch(console.error)
    .finally(() => process.exit(0));
