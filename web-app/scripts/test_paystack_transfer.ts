
import { PaystackService } from "../src/lib/paystack";
import * as dotenv from "dotenv";
dotenv.config();

async function testTransfer() {
    console.log("🚀 Starting Paystack API Test Transfer...");

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
        console.error("❌ PAYSTACK_SECRET_KEY is missing!");
        process.exit(1);
    }

    const accountNumber = "1230001644"; // The Demo Bank Account Number
    const banks = ["057", "035", "058", "001"];

    for (const code of banks) {
        try {
            console.log(`\n🔍 Probing ${accountNumber} @ Bank ${code}...`);
            const account = await PaystackService.resolveAccount(accountNumber, code, secretKey);
            if (account) {
                console.log(`✅ MATCH FOUND! Bank: ${code}, Name: ${account.account_name}`);

                // Try Transfer
                console.log(`💸 Attempting Transfer of ₦100 to ${code}...`);
                const transferCode = await PaystackService.initiateTransfer({
                    amount: 100,
                    recipientName: account.account_name,
                    bankCode: code,
                    accountNumber: accountNumber,
                    reason: "Test Transfer Probe"
                }, undefined, undefined, secretKey);
                console.log(`🎉 SUCCESS! Transfer Code: ${transferCode}`);
                process.exit(0);
            }
        } catch (e: any) {
            console.log(`❌ Failed: ${e.message}`);
        }
    }
    console.log("❌ All probes failed.");
    process.exit(1);
}

testTransfer();
