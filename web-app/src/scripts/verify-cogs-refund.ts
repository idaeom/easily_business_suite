
import { getDb } from "@/db";
import { accounts, transactions, ledgerEntries, items, posShifts, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { processTransactionCore, refundTransactionCore } from "@/actions/pos";

async function main() {
    console.log("🚀 Starting COGS Refund Verification...");
    const db = await getDb();

    // 1. Setup Product
    const TEST_SKU = `REFUND-COGS-${Math.floor(Math.random() * 1000)}`;
    const COST_PRICE = 400;
    const SELLING_PRICE = 800;

    const [product] = await db.insert(items).values({
        name: "Refund Test Item",
        sku: TEST_SKU,
        price: SELLING_PRICE.toString(),
        costPrice: COST_PRICE.toString(),
        category: "General",
        itemType: "RESALE",
        quantity: "100"
    }).returning();

    // 2. Setup Context
    const shift = (await db.query.posShifts.findFirst({ orderBy: [desc(posShifts.startTime)] }));
    const cashier = (await db.query.users.findFirst({ orderBy: [desc(users.createdAt)] }));

    if (!shift || !cashier) {
        console.warn("⚠️ No active shift/user.");
        process.exit(0);
    }

    // 3. Process Sale
    console.log("Processing Sale...");
    const saleResult = await processTransactionCore({
        items: [{
            quantity: 1,
            price: SELLING_PRICE,
            itemId: product.id,
            name: product.name
        }],
        payments: [{
            methodCode: "CASH",
            amount: 900, // 800 + Tax buffer
            reference: "Refund-Test-Sale"
        }],
        subtotal: SELLING_PRICE,
        tax: 0,
        totalAmount: SELLING_PRICE,
        shiftId: shift.id,
        contactId: null
    }, { id: cashier.id }, db, true);

    console.log(`Sale Processed: ${saleResult.transactionId}`);

    // 4. Process Refund
    console.log("Processing Refund...");
    const refundResult = await refundTransactionCore({
        shiftId: shift.id,
        originalTransactionId: saleResult.transactionId as string,
        reason: "Defective"
    }, { id: cashier.id }, db, true);

    console.log(`Refund Processed: ${refundResult.refundId}`);

    // 5. Verify Ledger
    // Wait slightly? DB is same connection usually.

    const recentTx = await db.query.transactions.findMany({
        orderBy: [desc(transactions.date)],
        limit: 50,
        with: { entries: { with: { account: true } } }
    });

    const reversalTx = recentTx.find(tx => (tx.metadata as any)?.type === "COGS_REVERSAL" && (tx.metadata as any)?.refundTransactionId === refundResult.refundId);

    if (!reversalTx) {
        console.error("❌ FAILURE: No COGS Reversal Transaction found.");
        process.exit(1);
    }

    console.log(`Found Reversal Journal: ${reversalTx.id}`);

    const inventoryDebit = reversalTx.entries.find(e => e.account.code === "1300" && e.direction === "DEBIT");
    const cogsCredit = reversalTx.entries.find(e => e.account.code === "5000" && e.direction === "CREDIT");

    if (!inventoryDebit) {
        console.error("❌ FAILURE: No Inventory Debit (Restock) found.");
    } else {
        console.log(`✅ SUCCESS: Inventory Debit found: ${inventoryDebit.amount}`);
    }

    if (!cogsCredit) {
        console.error("❌ FAILURE: No COGS Credit (Expense Reversal) found.");
    } else {
        console.log(`✅ SUCCESS: COGS Credit found: ${cogsCredit.amount}`);
    }

    // Cleanup
    await db.delete(items).where(eq(items.id, product.id));
    process.exit(0);
}

main().catch(console.error);
