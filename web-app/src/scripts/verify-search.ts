
import { getDb } from "../db";
import { items, contacts } from "../db/schema";
import { ilike, like, or } from "drizzle-orm";

async function main() {
    const db = await getDb();

    // 1. Query directly (assuming item exists or we test query syntax)
    console.log("Testing Search with query 'mac'...");

    // Test ILIKE
    const results = await db.query.items.findMany({
        where: ilike(items.name, `%mac%`),
        limit: 5
    });

    console.log(`Found ${results.length} items with ILIKE 'mac':`);
    results.forEach(r => console.log(` - ${r.name} (${r.itemType})`));

    if (results.some(r => r.name.includes("MacBook"))) {
        console.log("SUCCESS: Case-insensitive search works.");
    } else {
        console.log("FAILURE: Could not find MacBook with 'mac'.");
    }
}

main().catch(console.error).then(() => process.exit(0));
