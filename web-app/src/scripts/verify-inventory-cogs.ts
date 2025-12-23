
import { getDb } from "@/db";
import { accounts, transactions, ledgerEntries, items, posShifts, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { processTransactionCore } from "@/actions/pos";

async function main() {
    console.log("🚀 Starting Inventory COGS Verification...");
    const db = await getDb();

    // 1. Setup Product with Cost Price
    const TEST_SKU = `COGS-TEST-${Math.floor(Math.random() * 1000)}`;
    const COST_PRICE = 500;
    const SELLING_PRICE = 1000;

    const [product] = await db.insert(items).values({
        name: "COGS Test Item",
        sku: TEST_SKU,
        price: SELLING_PRICE.toString(),
        costPrice: COST_PRICE.toString(),
        category: "General",
        itemType: "RESALE", // Was PRODUCT, which failed validation
        stock: 100, // Note: Schema calls it 'quantity' on items? Let's check schema. 
        // Schema line 333: quantity: decimal...
        quantity: "100"
        // outletId? Items table doesn't have outletId, Inventory table does. 
        // But for simulation we rely on item existing.
    }).returning();

    console.log(`Test Product Created: ${product.name} | Cost: ${product.costPrice} | Price: ${product.price}`);

    // 2. Simulate Sale
    const shift = (await db.query.posShifts.findFirst({ orderBy: [desc(posShifts.startTime)] }));
    const cashier = (await db.query.users.findFirst({ orderBy: [desc(users.createdAt)] }));

    if (!shift || !cashier) {
        console.warn("⚠️ No active shift/user. Skipping Sale simulation (System not seeded for this).");
        process.exit(0);
    }

    console.log("Processing Sale...");

    const result = await processTransactionCore({
        items: [{
            quantity: 1,
            price: SELLING_PRICE,
            itemId: product.id,
            name: product.name
        }],
        payments: [{
            methodCode: "CASH",
            amount: 1125, // 1000 + 12.5% Tax
            reference: "Simulated-Verify-COGS"
        }],
        // paymentMethod: "CASH", // Removed
        // amountPaid: SELLING_PRICE, // Removed
        subtotal: SELLING_PRICE,
        tax: 0,
        // taxAmount? Interface has taxAmount optional
        subtotal: SELLING_PRICE,
        tax: 0,
        totalAmount: SELLING_PRICE,
        shiftId: shift.id,
        contactId: null
    }, { id: cashier.id }, db, true);

    console.log(`Transaction Processed: ${result.transactionId}`);

    // 3. Verify Ledger Entries via Transaction Link
    const recentTx = await db.query.transactions.findMany({
        orderBy: [desc(transactions.date)],
        limit: 50,
        with: { entries: { with: { account: true } } }
    });

    // Find the COGS Transaction where metadata.posTransactionId matches result.transactionId
    const cogsTx = recentTx.find(tx => (tx.metadata as any)?.posTransactionId === result.transactionId && (tx.metadata as any)?.type === "COGS");

    if (!cogsTx) {
        console.error("❌ FAILURE: No COGS Journal Transaction found.");
        // Log recent Metas
        console.log("Recent Tx Metas:", recentTx.map(t => t.metadata));
        // Don't exit yet to cleanup
    } else {
        console.log(`Found COGS Journal: ${cogsTx.id}`);
    }

    // If cogsTx is undefined, these will default undefined
    const cogsEntry = cogsTx?.entries.find(e => e.account.code === "5000" && e.direction === "DEBIT");
    const inventoryEntry = cogsTx?.entries.find(e => e.account.code === "1300" && e.direction === "CREDIT");

    if (!cogsEntry) {
        console.error("❌ FAILURE: No COGS (5000) Debit found.");
    } else {
        console.log(`✅ SUCCESS: COGS Debit found: ${cogsEntry.amount}`);
    }

    if (!inventoryEntry) {
        console.error("❌ FAILURE: No Inventory Asset (1300) Credit found.");
    } else {
        console.log(`✅ SUCCESS: Inventory Credit found: ${inventoryEntry.amount}`);
    }

    // Clean up item
    await db.delete(items).where(eq(items.id, product.id));

    process.exit(0);
}

main().catch(console.error);
