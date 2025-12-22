
import { getDb } from "@/db";
import { posShifts, customerLedgerEntries } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";

export async function getPendingRevenueCounts() {
    const db = await getDb();

    // Count Pending Shifts (Closed but not Reconciled)
    const [shiftCount] = await db.select({
        count: sql<number>`count(*)`
    })
        .from(posShifts)
        .where(and(
            eq(posShifts.status, "CLOSED"),
            // Check for null or false. Drizzle boolean usually handles false correctly, 
            // but let's be safe and check for not true.
            sql`(${posShifts.isReconciled} IS NULL OR ${posShifts.isReconciled} = false)`
        ));

    // Count Pending Wallet Deposits
    const [walletCount] = await db.select({
        count: sql<number>`count(*)`
    })
        .from(customerLedgerEntries)
        .where(eq(customerLedgerEntries.status, "PENDING"));

    return {
        pendingShifts: Number(shiftCount.count),
        pendingWallet: Number(walletCount.count)
    };
}
