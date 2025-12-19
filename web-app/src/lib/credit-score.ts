
import { getDb } from "@/db";
import { customerLedgerEntries, contacts, spSales, posTransactions } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export type CreditGrade = "A" | "B" | "C" | "D" | "F";

export interface CreditScore {
    score: number; // 0-100
    grade: CreditGrade;
    totalSales: number;
    totalPayments: number;
    currentDebt: number;
    limit: number; // Mock or DB field
    utilization: number; // % of Limit
}

export async function calculateCreditScore(contactId: string): Promise<CreditScore> {
    const db = await getDb();

    // 1. Fetch Contact for Wallet Balance (Current Debt status)
    const contact = await db.query.contacts.findFirst({
        where: eq(contacts.id, contactId)
    });

    if (!contact) throw new Error("Contact not found");

    // 2. Fetch Aggregates from Ledger
    // We can do a sum query or fetch all (limit if needed).
    // For MVP, full scan of ledger for this contact is fine unless huge.
    // Optimization: Drizzle `sum`

    // Total Debits (Sales)
    // Total Credits (Payments)
    // Note: Our ledger schema has 'debit' and 'credit' columns as decimal strings.

    const entries = await db.query.customerLedgerEntries.findMany({
        where: eq(customerLedgerEntries.contactId, contactId)
    });

    let totalSales = 0;
    let totalPayments = 0;

    entries.forEach(e => {
        totalSales += Number(e.debit);
        totalPayments += Number(e.credit);
    });

    const balance = Number(contact.walletBalance);
    // If balance is negative, it means they owe us (Debt).
    // If positive, they have store credit (Prepaid).

    const currentDebt = balance < 0 ? Math.abs(balance) : 0;

    // 3. Scoring Logic
    let score = 100;

    if (balance >= 0) {
        // Prepaid / Surplus
        score = 100;
    } else {
        // Has Debt
        if (totalSales > 0) {
            const debtRatio = currentDebt / totalSales; // How much of lifetime sales is currently unpaid?
            // Determine Score Deduction
            // If they owe 10% of lifetime sales, -10 points?
            // If they owe 50%, -50 points.
            score = Math.max(0, 100 - (debtRatio * 100));
        } else {
            // Debt with no sales history? (Migration or initial balance). 
            score = 50;
        }
    }

    // Assign Grade
    let grade: CreditGrade = "F";
    if (score >= 90) grade = "A";
    else if (score >= 75) grade = "B";
    else if (score >= 50) grade = "C";
    else if (score >= 30) grade = "D";

    return {
        score: Math.round(score),
        grade,
        totalSales,
        totalPayments,
        currentDebt,
        limit: 1000000, // Hardcoded limit for now (or fetch from settings later)
        utilization: (currentDebt / 1000000) * 100
    };
}
