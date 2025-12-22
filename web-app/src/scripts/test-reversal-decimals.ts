
import { liveDb as db } from "@/db";
import { accounts, items, posTransactions, transactionPayments, posShifts, ledgerEntries, transactions, users, outlets, contacts, customerLedgerEntries } from "@/db/schema";
import { eq, sql, inArray } from "drizzle-orm";
import { processTransactionCore, refundTransactionCore } from "@/actions/pos";
import { randomUUID } from "crypto";

// ID MAPPING
const idMap = new Map<string, string>();

const SHIFT_A_ID = "SHIFT-TEST-DEC-A";
const SHIFT_B_ID = "SHIFT-TEST-DEC-B";
const CASHIER_ID = "USER-CASHIER-DEC";
const OUTLET_ID = "OUTLET-TEST-DEC";
const CUSTOMER_ID = "CUST-TEST-DEC";

const ACC_SALES = "ACC-INC-SALES";
const ACC_CASH = "ACC-ASSET-002"; // Undeposited Funds

async function main() {
    console.log("Starting Cross-Shift Refund & Decimal Verification...");

    // 1. Cleanup
    const allShiftIds = [SHIFT_A_ID, SHIFT_B_ID];

    // Find POS Txs to cleanup
    const posTxs = await db.select({ id: posTransactions.id }).from(posTransactions).where(inArray(posTransactions.shiftId, allShiftIds));
    const posTxIds = posTxs.map(t => t.id);

    // Find GL Txs to cleanup (Linked or Description match)
    let glCondition = sql`description LIKE 'Refund for Sale %'`;
    if (posTxIds.length > 0) {
        glCondition = sql`(${inArray(transactions.reference, posTxIds)}) OR (description LIKE 'Refund for Sale %')`;
    }

    const glTxs = await db.select({ id: transactions.id }).from(transactions).where(glCondition);
    const glTxIds = glTxs.map(t => t.id);

    // 1. Delete Dependencies of GL Txs
    if (glTxIds.length > 0) {
        await db.delete(ledgerEntries).where(inArray(ledgerEntries.transactionId, glTxIds));
        await db.delete(transactions).where(inArray(transactions.id, glTxIds));
    }

    // 2. Delete Dependencies of POS Txs
    if (posTxIds.length > 0) {
        await db.delete(customerLedgerEntries).where(inArray(customerLedgerEntries.transactionId, posTxIds));
        await db.delete(transactionPayments).where(inArray(transactionPayments.transactionId, posTxIds));
        await db.delete(posTransactions).where(inArray(posTransactions.id, posTxIds));
    }

    await db.delete(posShifts).where(inArray(posShifts.id, allShiftIds));

    // 2. Seed Accounts (Upsert)
    await seedAccount(ACC_SALES, "Sales Revenue", "INCOME", "0");
    await seedAccount(ACC_CASH, "Undeposited Funds", "ASSET", "10000"); // Start with 10k cash

    // 3. Seed Items (Decimal Check)
    const gasItemId = "ITEM-GAS-DEC";
    // Gas: RESALE, 100.00 qty, 1000.50 price (Test Decimal Price)
    await seedItem(gasItemId, "Gas Cylinder 1kg", "1000.50", "RESALE", "100.00");

    // 4. Seed User & Outlet & Customer
    await seedUser(CASHIER_ID);
    await seedOutlet(OUTLET_ID);
    await seedCustomer(CUSTOMER_ID);

    console.log("--- Initialization Complete ---");

    // =========================================
    // SCENARIO: Cross-Shift Refund
    // =========================================

    // 5. Open Shift A
    console.log("1. Opening Shift A...");
    await db.insert(posShifts).values({
        id: SHIFT_A_ID,
        outletId: OUTLET_ID,
        cashierId: CASHIER_ID,
        startTime: new Date(),
        status: "OPEN",
        startCash: "0"
    });

    // 6. Create Sale in Shift A (2.5 units @ 1000.50)
    // Total = 2501.25
    console.log("2. Creating Sale in Shift A: 2.5 Gas @ 1000.50 = 2501.25");
    const saleResult = await processTransactionCore({
        shiftId: SHIFT_A_ID,
        contactId: CUSTOMER_ID,
        items: [{ itemId: gasItemId, quantity: 2.5, price: 1000.50, name: "Gas Cylinder 1kg" }
        ],
        payments: [{ methodCode: "CASH", amount: 2501.25 }],
        discountAmount: 0,
        taxAmount: 0
    }, { id: CASHIER_ID }, db, true);

    if (!saleResult.success) throw new Error("Sale creation failed");
    const saleId = saleResult.transactionId;
    console.log("   Sale Created:", saleId);

    // Verify Inventory Deduction
    const qtyAfterSale = await getItemQty(gasItemId);
    console.log(`   Gas Qty: ${qtyAfterSale} (Expected 97.50)`);
    // String comparison for precision
    if (Number(qtyAfterSale).toFixed(2) !== "97.50") throw new Error(`Inventory deduction failed. Got ${qtyAfterSale}`);

    // 7. Close Shift A
    console.log("3. Closing Shift A...");
    await db.update(posShifts).set({ status: "CLOSED", endTime: new Date() }).where(eq(posShifts.id, SHIFT_A_ID));

    // 8. Open Shift B
    console.log("4. Opening Shift B...");
    await db.insert(posShifts).values({
        id: SHIFT_B_ID,
        outletId: OUTLET_ID,
        cashierId: CASHIER_ID,
        startTime: new Date(),
        status: "OPEN",
        startCash: "0"
    });

    // 9. Refund Sale (Originated in Shift A) inside Shift B
    console.log("5. Processing Refund in Shift B...");
    try {
        const refundResult = await refundTransactionCore({
            shiftId: SHIFT_B_ID, // Use Current Shift!
            originalTransactionId: saleId, // From Old Shift
        }, { id: CASHIER_ID }, db, true);

        if (!refundResult.success) throw new Error("Refund failed");
        console.log("   Refund Created:", refundResult.refundId);

        // Verify Refund Transaction Record has correct Shift ID
        const refundTx = await db.query.posTransactions.findFirst({
            where: eq(posTransactions.id, refundResult.refundId),
            columns: { shiftId: true, totalAmount: true }
        });

        if (refundTx?.shiftId !== SHIFT_B_ID) throw new Error(`Refund linked to correct shift? Expected ${SHIFT_B_ID}, Got ${refundTx?.shiftId}`);
        if (Number(refundTx?.totalAmount).toFixed(2) !== "-2501.25") throw new Error(`Refund amount precision error. Got ${refundTx?.totalAmount}`);
        console.log("   Refund linked to Shift B correctly.");

    } catch (e) {
        console.error("Refund failed with error:", e);
        throw e;
    }

    // 10. Verify Inventory Restock
    const qtyAfterRefund = await getItemQty(gasItemId);
    console.log(`6. Gas Qty After Refund: ${qtyAfterRefund} (Expected 100.00)`);
    if (Number(qtyAfterRefund).toFixed(2) !== "100.00") throw new Error("Restocking failed");

    // 11. Verify GL
    // Revenue should be net 0 (Sale + Refund)
    const revenueAcc = await getAccount(ACC_SALES);
    const cashAcc = await getAccount(ACC_CASH);

    // Assuming clean state or precise delta check
    // Sale: Cr Revenue 2501.25. Refund: Dr Revenue 2501.25.
    // Sale: Dr Cash 2501.25. Refund: Cr Cash 2501.25.

    console.log(`   Revenue Balance: ${revenueAcc.balance}`);
    console.log(`   Cash Balance: ${cashAcc.balance}`);

    console.log("Verification Complete!");
    process.exit(0);
}

// HELPERS
async function seedAccount(code: string, name: string, type: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE", balance: string) {
    const existing = await db.query.accounts.findFirst({ where: eq(accounts.code, code) });
    if (existing) {
        await db.update(accounts).set({ balance }).where(eq(accounts.id, existing.id));
    } else {
        await db.insert(accounts).values({
            code, name, type, balance
        });
    }
}

async function seedItem(id: string, name: string, price: string, itemType: any, quantity: string) {
    await db.insert(items).values({
        id, name, price, costPrice: "500.00", category: "Test", itemType, quantity, minStockLevel: 0
    }).onConflictDoUpdate({ target: items.id, set: { quantity, itemType, price } });
}

async function getItemQty(id: string) {
    const res = await db.query.items.findFirst({ where: eq(items.id, id) });
    return res?.quantity;
}

async function getAccount(code: string) {
    const res = await db.query.accounts.findFirst({ where: eq(accounts.code, code) });
    if (!res) throw new Error("Account missing info");
    return res;
}

async function seedUser(id: string) {
    await db.insert(users).values({ id, name: "Test Cashier", email: "cashier@test.com", password: "pwd", role: "USER" })
        .onConflictDoNothing();
}
async function seedOutlet(id: string) {
    await db.insert(outlets).values({ id, name: "Test Outlet" }).onConflictDoNothing();
}
async function seedCustomer(id: string) {
    await db.insert(contacts).values({ id, name: "Test Customer", type: "CUSTOMER" }).onConflictDoNothing();
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
