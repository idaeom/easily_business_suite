
import { PaystackService } from "../src/lib/paystack";
import * as dotenv from "dotenv";
dotenv.config();

async function testTransferSkipResolve() {
    console.log("🚀 Starting Paystack API Test Transfer (Skipping Resolution)...");

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
        console.error("❌ PAYSTACK_SECRET_KEY is missing!");
        process.exit(1);
    }

    // Test Data: Zenith Bank (057) + User Provided Account
    const bankCode = "057";
    const accountNumber = "2080921844";
    const recipientName = "Test User (Skipped Resolve)"; // We provide a name since we skipped resolution
    const amount = 100; // ₦100

    try {
        // Directly Initiate Transfer
        console.log(`\n💸 Initiating Transfer of ₦${amount} to Zenith Bank (${bankCode}) / Account ${accountNumber}...`);

        // Note: initiateTransfer calls createTransferRecipient internally. 
        // We need to ensure createTransferRecipient doesn't fail if we provide the name manually.
        const transferCode = await PaystackService.initiateTransfer({
            amount: amount,
            recipientName: recipientName,
            bankCode: bankCode,
            accountNumber: accountNumber,
            reason: "Test Transfer Skip Resolve"
        }, undefined, undefined, secretKey);

        console.log(`✅ Transfer Successful! Transfer Code: ${transferCode}`);

    } catch (error: any) {
        console.error("\n❌ Transfer Failed:");
        console.error(error.message || error);
        if (error.response) {
            console.error("Response Data:", error.response.data);
        }
    }
}

testTransferSkipResolve();
