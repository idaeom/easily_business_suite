import { getDb } from "@/db";
import { posShifts, outlets, users } from "@/db/schema";
import { desc, eq, and, not } from "drizzle-orm";
import { RevenueReconciliationTable } from "@/components/finance/RevenueReconciliationTable";
import { RevenueNav } from "@/components/finance/RevenueNav";

import { getPendingRevenueCounts } from "@/lib/revenue-utils";

export default async function RevenuePage() {
    const db = await getDb();
    const { pendingShifts, pendingWallet } = await getPendingRevenueCounts();

    // Fetch shifts that are CLOSED but NOT fully reconciled
    // Assuming 'status' is CLOSED and we check an 'isReconciled' flag or similar
    // For now, we fetch ALL CLOSED shifts for the demo

    const dbShifts = await db.select({
        id: posShifts.id,
        openedAt: posShifts.startTime,
        closedAt: posShifts.endTime,
        status: posShifts.status,
        expectedCash: posShifts.expectedCash,
        expectedCard: posShifts.expectedCard,
        expectedTransfer: posShifts.expectedTransfer,
        declaredCash: posShifts.actualCash,
        declaredCard: posShifts.actualCard,
        declaredTransfer: posShifts.actualTransfer,
        outletName: outlets.name,
        cashierName: users.name,
        isReconciled: posShifts.isReconciled,
    })
        .from(posShifts)
        .leftJoin(outlets, eq(posShifts.outletId, outlets.id))
        .leftJoin(users, eq(posShifts.cashierId, users.id))
        .where(eq(posShifts.status, "CLOSED"))
        .orderBy(desc(posShifts.endTime));

    // Transform to component props
    const shifts = dbShifts.map(s => ({
        ...s,
        expectedCash: Number(s.expectedCash),
        expectedCard: Number(s.expectedCard),
        expectedTransfer: Number(s.expectedTransfer),
        declaredCash: Number(s.declaredCash),
        declaredCard: Number(s.declaredCard),
        declaredTransfer: Number(s.declaredTransfer),
        outletName: s.outletName || "Unknown Outlet",
        cashierName: s.cashierName || "Unknown User",
        isReconciled: s.isReconciled || false
    }));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Revenue Pro</h1>
                    <p className="text-muted-foreground">
                        Reconcile POS shifts and post revenue to the General Ledger.
                    </p>
                </div>
            </div>

            <RevenueNav pendingShifts={pendingShifts} pendingWallet={pendingWallet} />

            {/* List of Shifts to Reconcile */}
            <RevenueReconciliationTable shifts={shifts} />
        </div>
    );
}
