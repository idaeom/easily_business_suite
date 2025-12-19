
import { PaystackService } from "../lib/paystack";
import { SquadcoService } from "../lib/squadco";
import { TestConfig } from "../lib/test-config";

async function main() {
    console.log("Checking Paystack Banks...");
    // Simulate what the UI Component does: getBanks("PAYSTACK") which calls PaystackService.getBanks(TestConfig.getPaystackKey())
    const paystackKey = TestConfig.getPaystackKey(TestConfig.isTestMode);
    console.log("Paystack Key being used:", paystackKey);

    // Note: In browser context, actions.ts imports TestConfig and runs on server. Here we run in node.
    // Ensure we are mocking the environment for this script if needed or just checking the logic.
    // The current TestConfig relies on process.env.

    const banks = await PaystackService.getBanks(paystackKey);
    console.log(`Fetched ${banks.length} banks from Paystack.`);

    const codes = banks.map(b => b.code);
    const duplicates = codes.filter((item, index) => codes.indexOf(item) !== index);

    if (duplicates.length > 0) {
        console.error("Duplicate Paystack Codes found:", duplicates);
        // Find the banks with these codes
        duplicates.forEach(d => {
            const matches = banks.filter(b => b.code === d);
            console.log(`Banks with code ${d}:`, matches.map(b => b.name));
        });
    } else {
        console.log("No duplicates in Paystack Codes.");
    }

    console.log("Checking Squadco Banks...");
    const squadcoBanks = await SquadcoService.getBanks();
    const squadCodes = squadcoBanks.map(b => b.code);
    const squadDuplicates = squadCodes.filter((item, index) => squadCodes.indexOf(item) !== index);

    if (squadDuplicates.length > 0) {
        console.error("Duplicate Squadco Codes found:", squadDuplicates);
    } else {
        console.log("No duplicates in Squadco Codes.");
    }
}

main().catch(console.error);
