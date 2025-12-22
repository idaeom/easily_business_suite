
import { config } from "dotenv";
config({ path: ".env.local" });
import { getDb } from "@/db";

async function check() {
    console.log("Checking DB Connection...");
    try {
        const db = await getDb();
        console.log("DB Connected!");
        // minimal query
        const res = await db.query.users.findMany({ limit: 1 });
        console.log("Users found:", res.length);
        process.exit(0);
    } catch (e) {
        console.error("DB Error:", e);
        process.exit(1);
    }
}
check();
