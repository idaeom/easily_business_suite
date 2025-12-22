"use server";

import { getDb } from "@/db";
import { customerLedgerEntries, spSales, posTransactions, contacts, transactionPayments, ledgerEntries, accounts, transactions, posShifts, businessAccounts } from "@/db/schema";
import { eq, desc, asc, and, gte, lte, lt } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth";
// shifts import removed

// =========================================
// TYPES
// =========================================
export type LedgerEntry = {
    id: string;
    date: Date;
    description: string;
    debit: number;
    credit: number;
    reference?: string;
    balanceAfter?: number; // Calculated on fly or stored
};

export async function getCustomerLedger(contactId: string, startDate?: Date, endDate?: Date) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const db = await getDb();

    // Fetch Entries
    const entries = await db.query.customerLedgerEntries.findMany({
        where: and(
            eq(customerLedgerEntries.contactId, contactId),
            startDate ? gte(customerLedgerEntries.entryDate, startDate) : undefined,
            endDate ? lte(customerLedgerEntries.entryDate, endDate) : undefined
        ),
        orderBy: [asc(customerLedgerEntries.entryDate)], // Ascending to calculate running balance
        with: {
            sale: true,
            transaction: true
        }
    });

    // Calculate Running Balance
    let runningBalance = 0; // Or fetch opening balance if paginated
    // If not paginated, we assume start from 0 or fetch contact's initial state?
    // For now, let's assume we fetch all history or just show period movement. 
    // Ideally, we need "Opening Balance" if date filter is applied.

    // Quick Fix: If date filter, calculate opening balance from sum of prior entries.
    if (startDate) {
        const priors = await db.query.customerLedgerEntries.findMany({
            where: and(
                eq(customerLedgerEntries.contactId, contactId),
                lt(customerLedgerEntries.entryDate, startDate)
            )
        });
        priors.forEach(e => {
            runningBalance += (Number(e.debit) - Number(e.credit)); // Debit increases Debt (if Asset) or...
            // Wait. Customer Ledger:
            // Debit = We billed them (Receivable increases)
            // Credit = They paid us (Receivable decreases)
            // Balance > 0 means they OWE us.
            // Balance < 0 means we OWE them (Prepayment).
            // This is "Accounts Receivable" perspective.
        });
    }

    const report: LedgerEntry[] = entries.map(e => {
        const debit = Number(e.debit);
        const credit = Number(e.credit);
        runningBalance += (debit - credit);

        return {
            id: e.id,
            date: e.entryDate,
            description: e.description || (e.sale ? `Invoice #${e.sale.id.slice(0, 8)}` : e.transaction ? `Payment/POS` : "Adjustment"),
            debit,
            credit,
            balanceAfter: runningBalance,
            reference: e.saleId ? `INV-${e.saleId.slice(0, 6)}` : e.transactionId ? `TX-${e.transactionId.slice(0, 6)}` : "-"
        };
    });

    return report.reverse(); // Show newest first for UI? Or keep chronological? Usually ledger is chronological.
    // User requested "Sales report", but for Ledger, chronological is best.
    // Let's return chronological (oldest to newest) to track balance evolution.
}

export async function addCustomerBalance(contactId: string, amount: number, notes?: string, method: "CASH" | "TRANSFER" | "CARD" = "CASH") {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");
    const db = await getDb();

    // 0. Find Active Shift (to link transaction)
    // We query directly to avoid circular dependency with pos.ts
    const shift = await db.query.posShifts.findFirst({
        where: and(eq(posShifts.cashierId, user.id), eq(posShifts.status, "OPEN"))
    });

    // 1. Create Transaction (Container for the event)
    const [tx] = await db.insert(posTransactions).values([{
        shiftId: shift?.id, // Link to Shift
        contactId: contactId,
        totalAmount: amount.toString(),
        status: "COMPLETED", // The "Event" is recorded, but financial impact is Pending
        itemsSnapshot: [{ itemId: "WALLET", name: "Wallet Deposit", qty: 1, price: amount }],
        transactionDate: new Date(),
    }]).returning();

    // 2. Record Payment Details (Source/Dest)
    if (method) {
        await db.insert(transactionPayments).values([{
            transactionId: tx.id,
            paymentMethodCode: method,
            amount: amount.toString(),
            // accountId is removed here as it will be determined during Reconciliation
            reference: notes // Use notes as reference for now
        }]);
    }

    // 3. Ledger Entry (Pending Confirmation)
    // We snapshot "current" balance but it won't be applied yet.
    const contact = await db.query.contacts.findFirst({ where: eq(contacts.id, contactId) });
    const currentBalance = Number(contact?.walletBalance || 0);

    await db.insert(customerLedgerEntries).values([{
        contactId,
        transactionId: tx.id,
        entryDate: new Date(),
        description: notes || "Wallet Deposit (Pending)",
        debit: "0",
        credit: amount.toString(),
        balanceAfter: currentBalance.toString(), // Placeholder until Confirmed
        status: "PENDING"
    }]);

    // Note: We DO NOT update contact.walletBalance yet. 
    // This happens upon Reconciliation/Confirmation.

    return { success: true, pending: true };
}

import { calculateCreditScore } from "@/lib/credit-score";

export async function getCustomerCreditScore(contactId: string) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");
    return calculateCreditScore(contactId);
}



export async function confirmWalletDeposit(ledgerId: string, businessAccountId: string) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");
    const db = await getDb();

    // 1. Fetch Ledger Entry
    const entry = await db.query.customerLedgerEntries.findFirst({
        where: eq(customerLedgerEntries.id, ledgerId),
        with: {
            transaction: {
                with: { payments: true }
            }
        }
    });

    if (!entry) throw new Error("Entry not found");
    // if (entry.status === "CONFIRMED") throw new Error("Already confirmed"); // Allow re-confirming/updating? No.

    const amount = Number(entry.credit);
    if (amount <= 0) throw new Error("Invalid amount");

    // 2. Fetch Business Account to get GL Target
    const businessAccount = await db.query.businessAccounts.findFirst({
        where: eq(businessAccounts.id, businessAccountId)
    });
    if (!businessAccount) throw new Error("Invalid Business Account");

    const targetGlAccountId = businessAccount.glAccountId;

    // 3. Update Contact Wallet (if not already done? Logic assumes it's augmenting balance)
    // Actually, confirmWalletDeposit usually finalized the pending balance. 
    // In this system, entries are PENDING until confirmed.

    // Check if we need to update wallet balance. 
    // If the entry is PENDING, it usually means the money isn't available yet? 
    // Or is it "Available but not reconciled"?
    // "Funds received that have not yet been applied to customer wallets" -> Implies balance update happens here.

    const contact = await db.query.contacts.findFirst({ where: eq(contacts.id, entry.contactId) });
    const currentBalance = Number(contact?.walletBalance || 0);
    const newBalance = currentBalance + amount;

    await db.update(contacts)
        .set({ walletBalance: newBalance.toString() })
        .where(eq(contacts.id, entry.contactId));

    // 4. Update Ledger Entry
    await db.update(customerLedgerEntries).set({
        status: "CONFIRMED",
        balanceAfter: newBalance.toString(),
        reconciledById: user.id,
        reconciledAt: new Date()
    }).where(eq(customerLedgerEntries.id, ledgerId));

    // 5. Post to General Ledger (Smart Split)
    // Debit: Target Asset Account (e.g., Bank) - FULL AMOUNT
    // Credit: Split between "Accounts Receivable" (Clearing debt) and "Customer Deposits" (Creating Liability)

    if (targetGlAccountId) {
        // Create GL Transaction for Wallet Funding
        const [glTx] = await db.insert(transactions).values({
            description: `Wallet Funding - ${contact?.name}`,
            status: "POSTED",
            date: new Date(),
            metadata: { type: "WALLET_FUND", transactionId: entry.transactionId }
        }).returning();

        // 5a. DEBIT Selected Asset (Bank/Cash) - Full Amount
        await db.insert(ledgerEntries).values({
            transactionId: glTx.id,
            accountId: targetGlAccountId,
            amount: amount.toString(),
            direction: "DEBIT",
            description: `Wallet Funding - ${contact?.name}`
        });
        await updateAccountBalance(db, targetGlAccountId, amount, "DEBIT");

        // 5b. CREDIT Logic (Smart Split)
        let remainingAmountToCredit = amount;

        // Step A: Clear Accounts Receivable (if balance was negative)
        if (currentBalance < 0) {
            // Amount needed to reach zero (absolute value of negative balance)
            const arDebt = Math.abs(currentBalance);

            // Allow allocating up to the payment amount or the debt amount, whichever is smaller
            const amountForAR = Math.min(arDebt, remainingAmountToCredit);

            if (amountForAR > 0) {
                // Find AR Account
                const arAccount = await db.query.accounts.findFirst({ where: eq(accounts.code, "1100") });
                const creditAccount = arAccount || await db.query.accounts.findFirst({ where: eq(accounts.type, "ASSET") });

                if (creditAccount) {
                    await db.insert(ledgerEntries).values({
                        transactionId: glTx.id,
                        accountId: creditAccount.id,
                        amount: amountForAR.toString(),
                        direction: "CREDIT",
                        description: `Payment Applied to AR`
                    });
                    // Credit Asset = DECREASE Balance
                    await updateAccountBalance(db, creditAccount.id, amountForAR, "CREDIT");
                }

                remainingAmountToCredit -= amountForAR;
            }
        }

        // Step B: Credit Customer Deposits (Liability) with remaining surplus
        if (remainingAmountToCredit > 0) {
            // Find "Customer Deposits" Liability Account (2300)
            let walletLiabilityAccount = await db.query.accounts.findFirst({ where: eq(accounts.code, "2300") });
            if (!walletLiabilityAccount) {
                // Fallback search
                walletLiabilityAccount = await db.query.accounts.findFirst({
                    where: and(eq(accounts.type, "LIABILITY"), like(accounts.name, "%Deposit%"))
                });
            }
            // Ultimate fallback
            if (!walletLiabilityAccount) {
                walletLiabilityAccount = await db.query.accounts.findFirst({
                    where: eq(accounts.type, "LIABILITY")
                });
            }

            if (walletLiabilityAccount) {
                await db.insert(ledgerEntries).values({
                    transactionId: glTx.id,
                    accountId: walletLiabilityAccount.id,
                    amount: remainingAmountToCredit.toString(),
                    direction: "CREDIT",
                    description: `Wallet Deposit (Prepayment)`
                });
                // Credit Liability = INCREASE Balance
                await updateAccountBalance(db, walletLiabilityAccount.id, remainingAmountToCredit, "CREDIT");
            }
        }
    }

    return { success: true };
}

// Helper for Balance Update (Quick implementation)
async function updateAccountBalance(db: any, accountId: string, amount: number, direction: "DEBIT" | "CREDIT") {
    const account = await db.query.accounts.findFirst({ where: eq(accounts.id, accountId) });
    if (!account) return;

    let newBalance = Number(account.balance);
    const isAssetExpense = ["ASSET", "EXPENSE"].includes(account.type);

    if (isAssetExpense) {
        newBalance += direction === "DEBIT" ? amount : -amount;
    } else {
        newBalance += direction === "CREDIT" ? amount : -amount;
    }

    await db.update(accounts)
        .set({ balance: newBalance.toString() })
        .where(eq(accounts.id, accountId));
}
