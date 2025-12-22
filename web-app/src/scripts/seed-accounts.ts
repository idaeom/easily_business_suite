import { getDb } from "@/db";
import { initializeStandardCOA } from "@/actions/setup";

async function main() {
    const db = await getDb();
    console.log("Seeding Chart of Accounts (Standard Nigeria)...");

    // We'll default to SME for the seed script, but in real app user chooses via Wizard
    const res = await initializeStandardCOA("SERVICE");

    if (res.success) {
        console.log(`Successfully initialized COA. New accounts created: ${res.count}`);
    } else {
        console.error("Failed to initialize COA.");
    }

    console.log("Seeding complete.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => {
        process.exit(0);
    });
