
import { processTransaction, refundTransaction } from "@/actions/pos";
import { createQuote, convertQuoteToSale, updateQuoteStatus } from "@/actions/sales";
import { getDb } from "@/db";
import { salesTaxes, items, contacts, users, posShifts, outlets, posTransactions, spSales } from "@/db/schema";
import { eq } from "drizzle-orm";

async function main() {
    const db = await getDb();
    console.log("=== Starting Mega Verification: Multi-Item + Loyalty + Tax + Discount ===\n");

    const user = await db.query.users.findFirst({ where: eq(users.email, "admin@example.com") });
    if (!user) throw new Error("Admin not found");

    // 1. Setup Outlet & Settings
    let outlet = await db.query.outlets.findFirst({ where: eq(outlets.name, "Main Branch") });
    if (!outlet) {
        [outlet] = await db.insert(outlets).values({
            name: "Main Branch",
            address: "Main St",
            loyaltyEarningRate: "0.10" // 10%
        }).returning();
    } else {
        await db.update(outlets).set({ loyaltyEarningRate: "0.10" }).where(eq(outlets.id, outlet.id));
    }
    console.log(`Outlet: ${outlet.name}, Loyalty Rate: 10%`);

    // Link Admin to Outlet
    await db.update(users).set({ outletId: outlet.id }).where(eq(users.id, user.id));

    // 2. Setup Tax (5% Exclusive)
    // Create/Enable 5% Tax
    let tax = await db.query.salesTaxes.findFirst({ where: eq(salesTaxes.name, "Mega Tax") });
    if (!tax) {
        [tax] = await db.insert(salesTaxes).values({
            name: "Mega Tax",
            rate: "5", // 5%
            type: "EXCLUSIVE",
            isEnabled: true
        }).returning();
    } else {
        await db.update(salesTaxes).set({ isEnabled: true, rate: "5" }).where(eq(salesTaxes.id, tax.id));
    }
    console.log("Tax Enabled: 5%");

    // 3. Setup Customer
    let customer = await db.query.contacts.findFirst({ where: eq(contacts.phone, "MEGA-MULTI-TEST") });
    if (!customer) {
        [customer] = await db.insert(contacts).values({
            name: "Mega Multi Customer",
            phone: "MEGA-MULTI-TEST",
            type: "CUSTOMER",
            loyaltyPoints: "0"
        }).returning();
    } else {
        await db.update(contacts).set({ loyaltyPoints: "0" }).where(eq(contacts.id, customer.id));
        customer.loyaltyPoints = "0";
    }
    console.log("Customer Points Reset: 0");

    // 4. Setup Items
    // Ensure we have 2 distinct items
    // Item A: $50
    // Item B: $100
    let itemA = await db.query.items.findFirst({ where: eq(items.name, "Item A") });
    if (!itemA) {
        [itemA] = await db.insert(items).values({
            name: "Item A",
            price: "50",
            costPrice: "30",
            category: "General",
            itemType: "RESALE"
        }).returning();
    }
    let itemB = await db.query.items.findFirst({ where: eq(items.name, "Item B") });
    if (!itemB) {
        [itemB] = await db.insert(items).values({
            name: "Item B",
            price: "100",
            costPrice: "60",
            category: "General",
            itemType: "RESALE"
        }).returning();
    }

    // ==========================================
    // SCENARIO A: POS (INVOICE PRO)
    // ==========================================
    console.log("\n--- Scenario A: POS Transaction (Multi-Item) ---");
    // Open Shift
    const shift = await db.query.posShifts.findFirst({
        where: eq(posShifts.status, "OPEN"),
        with: { outlet: true }
    });
    // Ensure shift outlet is ours
    let shiftId = shift?.id;
    if (!shift || shift.outletId !== outlet.id) {
        const [newShift] = await db.insert(posShifts).values({
            cashierId: user.id,
            outletId: outlet.id,
            startCash: "100",
            status: "OPEN"
        }).returning();
        shiftId = newShift.id;
        console.log("Opened New Shift:", shiftId);
    } else {
        console.log("Using Existing Shift:", shiftId);
    }

    // Items: 2x Item A ($50 * 2 = 100) + 1x Item B ($100). Subtotal = 200.
    // Tax 5% on 200 = 10.
    // Gross = 210.
    // Discount = 20.
    // Final = 190.
    // Loyalty 10% on 190 = 19 points.

    const posDiscount = 20;
    const finalExpected = 190;

    try {
        const result = await processTransaction({
            shiftId: shiftId!,
            contactId: customer.id,
            items: [
                { itemId: itemA.id, name: itemA.name, price: 50, quantity: 2 },
                { itemId: itemB.id, name: itemB.name, price: 100, quantity: 1 }
            ],
            payments: [{ methodCode: "CASH", amount: finalExpected }],
            discountAmount: posDiscount
        });
        console.log("POS Transaction ID:", result.transactionId);

        // ==========================================
        // SCENARIO B: REFUND (REVERSAL)
        // ==========================================
        console.log("\n--- Scenario B: POS Refund (Full Reversal) ---");
        // Refund the transaction we just made
        await refundTransaction({
            shiftId: shiftId!,
            originalTransactionId: result.transactionId!,
            items: [
                { itemId: itemA.id, quantity: 2 },
                { itemId: itemB.id, quantity: 1 }
            ]
        });
        console.log("Refund Processed.");

        // Check Points - Should be 0
        let tempCustomer = await db.query.contacts.findFirst({ where: eq(contacts.id, customer.id) });
        console.log("Customer Points after Refund (Expected 0):", tempCustomer?.loyaltyPoints);
        if (Number(tempCustomer?.loyaltyPoints) !== 0) {
            throw new Error(`Refund failed to reverse points. Got ${tempCustomer?.loyaltyPoints}`);
        }

    } catch (e: any) {
        console.log("POS Transaction Failed:", e.message);
        throw e;
    }

    // ==========================================
    // SCENARIO C: SALES PRO
    // ==========================================
    console.log("\n--- Scenario C: Sales Pro Quote -> Sale (Multi-Item) ---");
    // Create Quote
    const { quoteId } = await createQuote({
        contactId: customer.id,
        customerName: "Mega Multi Customer",
        items: [
            { itemId: itemA.id, itemName: itemA.name, quantity: 2, unitPrice: 50 },
            { itemId: itemB.id, itemName: itemB.name, quantity: 1, unitPrice: 100 }
        ]
    });
    console.log("Quote Created:", quoteId);

    // Accept
    await updateQuoteStatus(quoteId!, "ACCEPTED");

    // Convert with Discount
    const salesDiscount = 20;
    const convertResult = await convertQuoteToSale(quoteId!, { discountAmount: salesDiscount });
    console.log("Sale Created:", convertResult.saleId);

    // Verify Points
    // POS Points: 19 -> Refunded -> 0
    // Sales Points: 19
    // Total: 19

    // Check Customer Points
    const updatedCustomer = await db.query.contacts.findFirst({ where: eq(contacts.id, customer.id) });
    console.log("\nFinal Customer Points:", updatedCustomer?.loyaltyPoints);

    const points = Number(updatedCustomer?.loyaltyPoints);
    if (points !== 19) {
        throw new Error(`Mismatch! Expected 19, Got ${points}`);
    }
    console.log("SUCCESS: Multi-Item Mega Verification Passed!");
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
