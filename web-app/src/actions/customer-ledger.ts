
"use server";

import { getDb } from "@/db";
import { customerLedgerEntries, spSales, posTransactions, contacts, transactionPayments, ledgerEntries, accounts, transactions } from "@/db/schema";
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

export async function addCustomerBalance(contactId: string, amount: number, notes?: string, method: "CASH" | "TRANSFER" = "CASH", accountId?: string) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");
    const db = await getDb();

    // 1. Create Transaction (Container for the event)
    const [tx] = await db.insert(posTransactions).values([{
        contactId: contactId,
        totalAmount: amount.toString(),
        status: "COMPLETED", // The "Event" is recorded, but financial impact is Pending
        itemsSnapshot: [{ itemId: "WALLET", name: "Wallet Deposit", qty: 1, price: amount }],
        transactionDate: new Date(),
    }]).returning();

    // 2. Record Payment Details (Source/Dest)
    if (accountId || method) {
        // Find payment method code? default to param
        // In real app, we should validate method exists in `paymentMethods` table.
        // For now, simple insert.
        await db.insert(transactionPayments).values([{
            transactionId: tx.id,
            paymentMethodCode: method,
            amount: amount.toString(),
            accountId: accountId,
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


export async function confirmWalletDeposit(ledgerId: string) {
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
    if (entry.status === "CONFIRMED") throw new Error("Already confirmed");

    const amount = Number(entry.credit);
    if (amount <= 0) throw new Error("Invalid amount");

    // 2. Update Contact Wallet
    const contact = await db.query.contacts.findFirst({ where: eq(contacts.id, entry.contactId) });
    const currentBalance = Number(contact?.walletBalance || 0);
    const newBalance = currentBalance + amount;

    await db.update(contacts)
        .set({ walletBalance: newBalance.toString() })
        .where(eq(contacts.id, entry.contactId));

    // 3. Update Ledger Entry
    await db.update(customerLedgerEntries).set({
        status: "CONFIRMED",
        balanceAfter: newBalance.toString(),
        reconciledById: user.id,
        reconciledAt: new Date()
    }).where(eq(customerLedgerEntries.id, ledgerId));

    // 4. Post to General Ledger (Financial Accounting)
    // Debit: Bank/Cash (Asset)
    // Credit: Customer Wallet (Liability)

    // Find Target Accounts
    const payment = entry.transaction?.payments?.[0];
    const bankAccountId = payment?.accountId;

    // Find "Customer Wallets" Liability Account
    const walletLiabilityAccount = await db.query.accounts.findFirst({
        where: and(eq(accounts.type, "LIABILITY"), eq(accounts.name, "Customer Wallets"))
    });

    if (walletLiabilityAccount && bankAccountId) {
        // Create GL Transaction for Wallet Funding
        const [glTx] = await db.insert(transactions).values({
            description: `Wallet Funding - ${contact?.name}`,
            status: "POSTED",
            date: new Date(),
            metadata: { type: "WALLET_FUND", transactionId: entry.transactionId }
        }).returning();

        // Debit Bank
        await db.insert(ledgerEntries).values({
            transactionId: glTx.id, // Use GL Header ID
            accountId: bankAccountId,
            amount: amount.toString(),
            direction: "DEBIT",
            description: `Wallet Funding - ${contact?.name}`
        });

        // Credit Liability
        await db.insert(ledgerEntries).values({
            transactionId: glTx.id, // Use GL Header ID
            accountId: walletLiabilityAccount.id,
            amount: amount.toString(),
            direction: "CREDIT",
            description: `Wallet Funding - ${contact?.name}`
        });

        // Update Balances
        await updateAccountBalance(db, bankAccountId, amount, "DEBIT");
        await updateAccountBalance(db, walletLiabilityAccount.id, amount, "CREDIT");
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
