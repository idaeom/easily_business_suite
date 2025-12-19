
import { getDb } from "../db";
import { notifications } from "../db/schema";

async function main() {
    console.log("Testing Notification Query...");
    const db = await getDb();

    try {
        const result = await db.select().from(notifications).limit(1);
        console.log("✅ Success! Found notifications:", result.length);
    } catch (error) {
        console.error("❌ Failed:", error);
    }
    process.exit(0);
}

main().catch(console.error);
