
import { createQuote, convertQuoteToSale } from "@/actions/sales";
import { getDb } from "@/db";
import { salesTaxes, items, contacts, users, spQuotes, spSales, expenseCategories, dispatches } from "@/db/schema";
import { eq, ne, or } from "drizzle-orm";

async function main() {
    const db = await getDb();
    console.log("=== Starting Extended Sales Verification ===\n");

    // ==========================================
    // 0. PRE-REQUISITES & CLEANUP
    // ==========================================

    // Ensure Admin
    const user = await db.query.users.findFirst({ where: eq(users.email, "admin@example.com") });
    if (!user) { console.error("Admin missing"); process.exit(1); }

    // Ensure Category
    let category = await db.query.expenseCategories.findFirst({ where: eq(expenseCategories.name, "Extended Test Cat") });
    if (!category) {
        [category] = await db.insert(expenseCategories).values({ name: "Extended Test Cat", type: "OPERATING" }).returning();
    }

    // Ensure Item
    let item = await db.query.items.findFirst({ where: eq(items.name, "Extended Widget") });
    if (!item) {
        [item] = await db.insert(items).values({
            name: "Extended Widget",
            price: "100.00",
            costPrice: "50.00",
            itemType: "RESALE",
            minStockLevel: 50,
            category: category.id
        }).returning();
    }

    // Ensure Customer
    let customer = await db.query.contacts.findFirst({ where: eq(contacts.phone, "EXT-002") });
    if (!customer) {
        [customer] = await db.insert(contacts).values({
            name: "Extended Test Customer",
            phone: "EXT-002",
            type: "CUSTOMER",
            address: "999 Delivery Lane, Web City"
        }).returning();
    }

    // Ensure Taxes Exist
    // Tax A: VAT 5% (Exclusive)
    let taxA = await db.query.salesTaxes.findFirst({ where: eq(salesTaxes.name, "Test Tax A (5%)") });
    if (!taxA) {
        [taxA] = await db.insert(salesTaxes).values({ name: "Test Tax A (5%)", rate: "5.00", type: "EXCLUSIVE", isEnabled: false }).returning();
    }
    // Tax B: Levy 2% (Exclusive)
    let taxB = await db.query.salesTaxes.findFirst({ where: eq(salesTaxes.name, "Test Tax B (2%)") });
    if (!taxB) {
        [taxB] = await db.insert(salesTaxes).values({ name: "Test Tax B (2%)", rate: "2.00", type: "EXCLUSIVE", isEnabled: false }).returning();
    }

    // Disable ALL other taxes to ensure clean test environment
    await db.update(salesTaxes).set({ isEnabled: false }).where(ne(salesTaxes.id, "placeholder")); // Disable all

    console.log("Setup complete. Taxes reset.\n");


    // ==========================================
    // SCENARIO 1: Self Collection, Fixed Discount, 1 Tax
    // ==========================================
    console.log("--- SCENARIO 1: Self Collection, Fixed Discount ($10), 1 Tax (5%) ---");

    // 1. Enable ONLY Tax A
    await db.update(salesTaxes).set({ isEnabled: true }).where(eq(salesTaxes.id, taxA.id));

    console.log("1. Creating Quote (Pickup)...");
    const q1 = await createQuote({
        contactId: customer.id,
        customerName: customer.name,
        items: [{ itemId: item.id, itemName: item.name, quantity: 1, unitPrice: 100 }], // Subtotal 100
        deliveryMethod: "PICKUP"
    });

    if (!q1.success || !q1.quoteId) throw new Error("Quote 1 Failed");

    // 2. Validate Quote 1
    let quote1 = await db.query.spQuotes.findFirst({ where: eq(spQuotes.id, q1.quoteId) });
    // Subtotal: 100
    // Tax: 5% of 100 = 5
    // Total: 105
    if (Number(quote1?.tax) !== 5.00) throw new Error(`S1 Tax Mismatch. Got ${quote1?.tax}, Expected 5.00`);
    console.log("   Quote Tax Verified: 5.00");

    // 3. Convert with Fixed Discount
    console.log("2. Converting to Sale with $10 Discount...");
    // Manually accept
    await db.update(spQuotes).set({ status: "ACCEPTED" }).where(eq(spQuotes.id, q1.quoteId));

    const s1 = await convertQuoteToSale(q1.quoteId, { discountAmount: 10.00 });

    // 4. Validate Sale 1
    const sale1 = await db.query.spSales.findFirst({ where: eq(spSales.id, s1.saleId) });
    // Expected Total: (100 + 5) - 10 = 95.00
    // OR does discount apply before tax? 
    // Logic in convertQuoteToSale: 
    //   total = taxResult.finalTotal - discountAmount - loyaltyValue;
    //   taxResult.finalTotal = subtotal + tax = 105.
    //   total = 105 - 10 = 95.
    if (Math.abs(Number(sale1?.total) - 95.00) > 0.01) throw new Error(`S1 Total Mismatch. Got ${sale1?.total}, Expected 95.00`);
    console.log("   Sale Total Verified: 95.00");

    // 5. Validate Dispatch (Pickup)
    const d1 = await db.query.dispatches.findFirst({ where: eq(dispatches.salesId, s1.saleId) });
    if (d1?.deliveryMethod !== "PICKUP") throw new Error(`S1 Delivery Method Mismatch. Got ${d1?.deliveryMethod}`);
    console.log("   Dispatch Method Verified: PICKUP");


    // ==========================================
    // SCENARIO 2: Delivery, % Discount, 2 Taxes
    // ==========================================
    console.log("\n--- SCENARIO 2: Delivery, 10% Discount, 2 Taxes (5% + 2%) ---");

    // 1. Enable Tax A AND Tax B
    await db.update(salesTaxes).set({ isEnabled: true }).where(or(eq(salesTaxes.id, taxA.id), eq(salesTaxes.id, taxB.id)));

    console.log("1. Creating Quote (Delivery)...");
    const q2 = await createQuote({
        contactId: customer.id,
        customerName: customer.name,
        items: [{ itemId: item.id, itemName: item.name, quantity: 2, unitPrice: 100 }], // Subtotal 200
        deliveryMethod: "DELIVERY"
    });

    if (!q2.success || !q2.quoteId) throw new Error("Quote 2 Failed");

    // 2. Validate Quote 2
    let quote2 = await db.query.spQuotes.findFirst({ where: eq(spQuotes.id, q2.quoteId) });
    // Subtotal: 200
    // Tax A (5%): 10
    // Tax B (2%): 4
    // Total Tax: 14
    // Total: 214
    if (Number(quote2?.tax) !== 14.00) throw new Error(`S2 Tax Mismatch. Got ${quote2?.tax}, Expected 14.00`);
    console.log("   Quote Tax Verified: 14.00 (5% + 2%)");

    // 3. Convert with 10% Discount
    console.log("2. Converting to Sale with 10% Discount...");
    // Calculate 10% of Subtotal (200 * 0.10 = 20)
    const discountVal = 200 * 0.10;

    await db.update(spQuotes).set({ status: "ACCEPTED" }).where(eq(spQuotes.id, q2.quoteId));

    // Pass calculate amount
    const s2 = await convertQuoteToSale(q2.quoteId, { discountAmount: discountVal });

    // 4. Validate Sale 2
    const sale2 = await db.query.spSales.findFirst({ where: eq(spSales.id, s2.saleId) });
    // Expected Total: (200 + 14) - 20 = 194.00
    if (Math.abs(Number(sale2?.total) - 194.00) > 0.01) throw new Error(`S2 Total Mismatch. Got ${sale2?.total}, Expected 194.00`);
    console.log("   Sale Total Verified: 194.00");

    // 5. Validate Dispatch (Delivery)
    const d2 = await db.query.dispatches.findFirst({ where: eq(dispatches.salesId, s2.saleId) });
    if (d2?.deliveryMethod !== "DELIVERY") throw new Error(`S2 Delivery Method Mismatch. Got ${d2?.deliveryMethod}`);
    if (d2?.deliveryAddress !== "999 Delivery Lane, Web City") throw new Error(`S2 Address Mismatch. Got ${d2?.deliveryAddress}`);
    console.log("   Dispatch Method & Address Verified: DELIVERY -> 999 Delivery Lane, Web City");

    console.log("\n=== ALL SCENARIOS PASSED ===");
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
