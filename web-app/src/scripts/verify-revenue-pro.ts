
import { getDb } from "../db";
import { posShifts, posTransactions, accountingConfig, accounts } from "../db/schema";
import { eq } from "drizzle-orm";
import { reconcileShift } from "../actions/pos";
import { initializeStandardCOA } from "../actions/setup";

// Mock next/cache
// Mocking removed for tsx execution. 
// Uses IS_SCRIPT=true env var to bypass auth.

async function main() {
    console.log("Starting Revenue Pro Verification...");
    const db = await getDb();

    // 1. Ensure COA is loaded (to get Variance Account)
    console.log("Initializing Standard COA...");
    await initializeStandardCOA("SERVICE");

    // 2. Check if Variance Account is linked
    const config = await db.query.accountingConfig.findFirst();
    if (!config || !config.defaultVarianceAccountId) {
        console.error("FAILED: Default Variance Account is NOT linked in AccountingConfig.");
    } else {
        console.log("PASSED: Default Variance Account is linked:", config.defaultVarianceAccountId);
    }

    // 3. Create a Mock Closed Shift
    console.log("Creating Mock Closed Shift...");
    const [shift] = await db.insert(posShifts).values({
        outletId: "mock-outlet",
        cashierId: "mock-user-id",
        startTime: new Date(),
        endTime: new Date(),
        status: "CLOSED",
        expectedCash: "1000",
        expectedCard: "5000",
        declaredCash: "900", // Short 100
        declaredCard: "5000", // Match
    }).returning();

    console.log("Shift Created:", shift.id);

    // 4. Run Reconciliation
    console.log("Running Reconciliation (Verified Cash: 950 - Still Short 50)...");
    await reconcileShift(shift.id, {
        verifiedCash: 950,
        verifiedCard: 5000
    });

    // 5. Verify Shift Status
    const updatedShift = await db.query.posShifts.findFirst({
        where: eq(posShifts.id, shift.id)
    });

    if (updatedShift?.status === "RECONCILED" && updatedShift?.isReconciled) {
        console.log("PASSED: Shift is marked as RECONCILED.");
    } else {
        console.error("FAILED: Shift status is", updatedShift?.status);
    }

    if (updatedShift?.verifiedCash === "950.000000000000000000000000000000") {
        console.log("PASSED: Verified Cash is saved correctly.");
    } else {
        console.log("WARNING: Verified Cash mismatch or formatting:", updatedShift?.verifiedCash);
    }

    // Cleanup
    await db.delete(posShifts).where(eq(posShifts.id, shift.id));
    console.log("Verification Complete.");
}

main().catch(console.error);
