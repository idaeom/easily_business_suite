
process.env.APP_MODE = "TEST"; // Force Test Mode for this script

import { getDb } from "../db";
import { accounts, transactions } from "../db/schema";
import { eq } from "drizzle-orm";

async function verifyWebhook() {
    const db = await getDb();
    console.log("🧪 Verifying Webhook Flow...");

    // 1. Get a Test Wallet (Asset Account)
    const wallet = await db.query.accounts.findFirst({
        where: eq(accounts.type, "ASSET")
    });

    if (!wallet) {
        console.error("❌ No Asset Account found.");
        process.exit(1);
    }

    console.log(`Checking Wallet: ${wallet.name} (${wallet.id})`);
    const initialBalance = Number(wallet.balance);
    console.log(`Initial Balance: ₦${initialBalance.toLocaleString()}`);

    // 2. Simulate Webhook Payload (Paystack Transfer Success or Charge Success)
    // Let's simulate a "charge.success" which means money came IN.
    const amount = 5000; // 50.00 NGN (Paystack uses kobo, so 5000)
    const reference = `TEST-WEBHOOK-${Date.now()}`;

    const payload = {
        event: "charge.success",
        data: {
            reference: reference,
            amount: amount,
            status: "success",
            paid_at: new Date().toISOString(),
            customer: {
                email: "customer@example.com"
            },
            metadata: {
                wallet_id: wallet.id // Assuming we pass wallet_id in metadata for direct funding, or we look up by customer
            }
        }
    };

    console.log(`Sending Webhook: ${reference} for ₦${amount / 100}`);

    // 3. Send Request
    try {
        const response = await fetch("http://localhost:3000/api/webhooks/paystack", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-paystack-signature": "test-signature" // We might need to bypass signature check in test mode
            },
            body: JSON.stringify(payload)
        });

        const responseData = await response.json();
        console.log("Response Logs:", JSON.stringify(responseData.logs, null, 2));

        if (!response.ok) {
            console.error(`❌ Webhook Failed: ${response.status} ${response.statusText}`);
            console.error(responseData);
            process.exit(1);
        }

        console.log("✅ Webhook Sent Successfully");

        // 4. Verify Balance Update
        // Wait a moment for async processing if any
        await new Promise(r => setTimeout(r, 2000));

        const updatedWallet = await db.query.accounts.findFirst({
            where: eq(accounts.id, wallet.id)
        });

        if (!updatedWallet) throw new Error("Wallet not found after update");

        const newBalance = Number(updatedWallet.balance);
        console.log(`New Balance: ₦${newBalance.toLocaleString()}`);

        if (newBalance > initialBalance) {
            console.log("✅ Wallet Credited Successfully!");
        } else {
            console.error("❌ Wallet Balance did not increase.");
            // Check if transaction exists
            const tx = await db.query.transactions.findFirst({
                where: eq(transactions.reference, reference)
            });
            if (tx) {
                console.log("Transaction found but balance not updated?");
                console.log(tx);
            } else {
                console.log("No transaction found with this reference.");
            }
        }

    } catch (error) {
        console.error("❌ Error sending webhook:", error);
    }
}

verifyWebhook();
