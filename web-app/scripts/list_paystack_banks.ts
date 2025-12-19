
import { PaystackService } from "../src/lib/paystack";
import * as dotenv from "dotenv";
dotenv.config();

async function listBanks() {
    console.log("🚀 Listing Paystack Banks...");
    const banks = await PaystackService.getBanks();
    console.log(`Found ${banks.length} banks.`);

    // Filter for likely test banks or just list first 10
    console.log("First 10 Banks:");
    banks.slice(0, 10).forEach(b => console.log(`${b.name} (${b.code}) - Active: ${b.active}`));

    // Search for "Test" or "Zenith"
    const zenith = banks.find(b => b.name.includes("Zenith"));
    console.log("\nZenith Bank:", zenith);

    const test = banks.find(b => b.name.includes("Test"));
    console.log("Test Bank:", test);
}

listBanks();
