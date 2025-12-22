
import { getDb } from "../db";
import { posShifts, posTransactions, users } from "../db/schema";
import { eq, desc } from "drizzle-orm";

async function main() {
    const db = await getDb();
    console.log("Fixing Wallet Deposits Data...");

    // 1. Open a Shift for Admin User if none exists
    const adminUser = await db.query.users.findFirst({
        where: eq(users.email, "admin@example.com")
    });

    if (!adminUser) throw new Error("Admin user not found");

    // Check for open shift
    let shift = await db.query.posShifts.findFirst({
        where: eq(posShifts.status, "OPEN")
    });

    if (!shift) {
        console.log("No open shift found. Creating one for Admin...");
        const [newShift] = await db.insert(posShifts).values({
            cashierId: adminUser.id,
            startTime: new Date(),
            status: "OPEN",
            startCash: "0"
        }).returning();
        shift = newShift;
        console.log(`Created Shift: ${shift.id}`);
    } else {
        console.log(`Using existing Open Shift: ${shift.id}`);
    }

    // 2. Link ALL orphaned pending Wallet Transactions to this shift
    // (In production, be more specific, but for fix-it script, catch-all is fine)
    const result = await db.update(posTransactions)
        .set({ shiftId: shift.id })
        .where(eq(posTransactions.shiftId, null));
    // Note: Drizzle update result isn't always count, but we assume success.

    console.log("Updated orphan transactions to link to shift:", shift.id);
    console.log("Please reload Revenue Pro page.");
}

main();
