import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { liveDb, testDb } from "@/db";
import { accounts, transactions, ledgerEntries, expenses, expenseBeneficiaries } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { FinanceService } from "@/lib/finance";

export async function POST(req: NextRequest) {
    const liveSecret = process.env.PAYSTACK_SECRET_KEY;
    const testSecret = process.env.PAYSTACK_SECRET_KEY_TEST;

    if (!liveSecret && !testSecret) {
        return NextResponse.json({ message: "Secrets not configured" }, { status: 500 });
    }

    const body = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    if (!signature) {
        return NextResponse.json({ message: "No signature provided" }, { status: 401 });
    }

    let dbToUse = null;
    let mode = "";

    // 1. Try Live Secret
    if (liveSecret) {
        const hash = crypto.createHmac("sha512", liveSecret).update(body).digest("hex");
        if (hash === signature) {
            dbToUse = liveDb;
            mode = "LIVE";
        }
    }

    // 2. Try Test Secret (if not already matched)
    if (!dbToUse && testSecret) {
        const hash = crypto.createHmac("sha512", testSecret).update(body).digest("hex");
        if (hash === signature) {
            dbToUse = testDb;
            mode = "TEST";
        }
    }

    // 3. Allow "test-signature" for local verification
    if (!dbToUse && signature === "test-signature") {
        console.warn("⚠️ Using Test Signature bypass for Webhook");
        dbToUse = testDb;
        mode = "TEST";
    }

    if (!dbToUse) {
        return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(body);
    const { event: eventType, data } = event;

    console.log(`[Paystack Webhook] Received ${mode} event: ${eventType}`, data.reference);

    const debugLogs: string[] = [];
    const log = (msg: string) => {
        console.log(msg);
        debugLogs.push(msg);
    };

    try {
        if (eventType === "charge.success") {
            // INFLOW: Money received via Virtual Account or Payment Page
            await handleInflow(data, dbToUse, log);
        } else if (eventType === "transfer.success") {
            // OUTFLOW: Transfer successful
            await handleTransferSuccess(data, dbToUse, log);
        } else if (eventType === "transfer.failed" || eventType === "transfer.reversed") {
            // OUTFLOW: Transfer failed
            await handleTransferFailed(data, dbToUse, log);
        }
    } catch (error) {
        log(`[Paystack Webhook] Error processing event: ${error}`);
        return NextResponse.json({ message: "Error processing event", logs: debugLogs, error: String(error) }, { status: 500 });
    }

    return NextResponse.json({ message: "Event received", logs: debugLogs }, { status: 200 });
}

async function handleInflow(data: any, db: any, log: (msg: string) => void) {
    // 1. Identify the Wallet Account
    let walletAccount;

    // Check if it's a transfer to a dedicated account (NUBAN)
    const receiverNuban = data.authorization?.receiver_bank_account_number;

    if (receiverNuban) {
        walletAccount = await db.query.accounts.findFirst({
            where: eq(accounts.accountNumber, receiverNuban)
        });
        if (walletAccount) {
            log(`[Inflow] Matched dedicated account NUBAN: ${receiverNuban} to Account: ${walletAccount.name}`);
        }
    }

    // Fallback: Find default Paystack wallet
    if (!walletAccount) {
        walletAccount = await db.query.accounts.findFirst({
            where: eq(accounts.provider, "PAYSTACK")
        });
    }

    if (!walletAccount) {
        log("❌ Wallet Account not found in DB (No match for NUBAN or Default Paystack).");
        // We don't throw here, just log and return, so the webhook acknowledges receipt (idempotency/robustness)
        // But for debugging, we want to know.
        return;
    }

    log(`[Inflow] Found Wallet: ${walletAccount.name} (${walletAccount.id})`);

    // 2. Check if transaction already exists to prevent duplicates
    const existingTx = await db.query.transactions.findFirst({
        where: eq(transactions.reference, data.reference)
    });

    if (existingTx) {
        log(`⚠️ Transaction already processed: ${data.reference}`);
        return;
    }

    log(`[Inflow] Processing new transaction: ${data.reference}`);

    // 3. Credit Paystack Wallet (Asset) & Credit Revenue (Income) or Customer Liability
    // For simplicity, we assume all inflows are "Revenue" for now, unless we track customer balances.
    // Let's find a default "General Revenue" account or create one.
    let revenueAccount = await db.query.accounts.findFirst({
        where: eq(accounts.code, "REV-001")
    });

    if (!revenueAccount) {
        log("[Inflow] Creating new Revenue Account...");
        const [newAccount] = await db.insert(accounts).values({
            name: "General Revenue",
            code: "REV-001",
            type: "INCOME",
            description: "Default revenue account for inflows",
            currency: "NGN",
            balance: "0",
        }).returning();
        revenueAccount = newAccount;
    }

    const amount = data.amount / 100; // Convert kobo to main currency
    log(`[Inflow] Amount: ₦${amount}`);

    try {
        // Use FinanceService but pass the correct DB as 'tx'
        await FinanceService.createTransaction({
            description: `Inflow from ${data.customer.email}`,
            reference: data.reference,
            date: new Date(data.paid_at),
            entries: [
                {
                    accountId: walletAccount.id,
                    amount: amount, // Debit Asset (Increase)
                    description: "Paystack Wallet Funding"
                },
                {
                    accountId: revenueAccount.id,
                    amount: -amount, // Credit Income (Increase)
                    description: `Payment from ${data.customer.email}`
                }
            ]
        }, db);

        log(`✅ [Inflow] Successfully Credited ₦${amount} to Paystack Wallet.`);
    } catch (err) {
        log(`❌ [Inflow] Error creating transaction: ${err}`);
        throw err; // Re-throw to be caught by the main try-catch
    }
}

async function handleTransferSuccess(data: any, db: any, log: (msg: string) => void) {
    // Update Expense Beneficiary Status if applicable
    const transferCode = data.transfer_code;

    // Find beneficiary with this transfer code
    const beneficiary = await db.query.expenseBeneficiaries.findFirst({
        where: eq(expenseBeneficiaries.transferCode, transferCode)
    });

    if (beneficiary) {
        // Already marked as PAID usually, but good to confirm
        log(`[Transfer Success] Confirmed transfer for beneficiary ${beneficiary.name}`);
    }
}

async function handleTransferFailed(data: any, db: any, log: (msg: string) => void) {
    const transferCode = data.transfer_code;

    const beneficiary = await db.query.expenseBeneficiaries.findFirst({
        where: eq(expenseBeneficiaries.transferCode, transferCode)
    });

    if (beneficiary) {
        log(`[Transfer Failed] Reversing transaction for ${beneficiary.name}`);
        // TODO: Implement Reversal Logic (Credit Source, Debit Expense/Liability)
        // For now, just log it.
    }
}
