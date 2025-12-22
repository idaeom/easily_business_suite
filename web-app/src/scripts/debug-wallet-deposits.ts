
import { getDb } from "../db";
import { customerLedgerEntries, posTransactions, posShifts, transactionPayments, users } from "../db/schema";
import { eq, desc } from "drizzle-orm";

async function main() {
    const db = await getDb();
    console.log("Debugging Wallet Deposits...");

    const entries = await db.select({
        id: customerLedgerEntries.id,
        amount: customerLedgerEntries.credit,
        status: customerLedgerEntries.status,
        txId: posTransactions.id,
        shiftId: posTransactions.shiftId,
        desc: customerLedgerEntries.description,
        createdAt: customerLedgerEntries.entryDate,
    })
        .from(customerLedgerEntries)
        .leftJoin(posTransactions, eq(customerLedgerEntries.transactionId, posTransactions.id))
        .where(eq(customerLedgerEntries.status, "PENDING"));

    console.log(`Found ${entries.length} PENDING wallet deposits.`);

    for (const ignored of entries) { // "ignored" but actually using "entry" in loop? No, "ignored" is the variable name I chose... let's use "e"
    }

    // Better loop
    for (const e of entries) {
        console.log(`\nEntry: ${e.id}`);
        console.log(`  Amount: ${e.amount}`);
        console.log(`  Desc: ${e.desc}`);
        console.log(`  Shift ID: ${e.shiftId || "NULL (Missing Link!)"}`);

        if (e.shiftId) {
            const shift = await db.select().from(posShifts).where(eq(posShifts.id, e.shiftId)).limit(1);
            console.log(`    -> Linked to Shift: ${shift[0]?.status} (Opened: ${shift[0]?.startTime})`);
        }

        if (e.txId) {
            const payments = await db.select().from(transactionPayments).where(eq(transactionPayments.transactionId, e.txId));
            console.log(`    -> Payments: ${payments.length}`);
            payments.forEach(p => console.log(`       - ${p.paymentMethodCode}: ${p.amount}`));
        }
    }

    // Check Open Shifts
    const openShifts = await db.select().from(posShifts).where(eq(posShifts.status, "OPEN"));
    console.log(`\nTotal Open Shifts: ${openShifts.length}`);
    openShifts.forEach(s => console.log(`  Shift ${s.id}: ${s.status} (User: ${s.cashierId})`));
}

main();
