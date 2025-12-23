
import { getTransfers } from "@/actions/inventory";

async function main() {
    console.log("Verifying getTransfers()...");
    try {
        const transfers = await getTransfers();
        console.log(`✅ Success! Fetched ${transfers.length} transfers.`);
        if (transfers.length > 0 && transfers[0].grns) {
            console.log("✅ specific transfer has grns loaded.");
        }
    } catch (error) {
        console.error("❌ Failed to fetch transfers:", error);
        process.exit(1);
    }
    process.exit(0);
}

main();
