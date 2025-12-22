
import { processTransaction } from "@/actions/pos";
import { createQuote, convertQuoteToSale, updateQuoteStatus } from "@/actions/sales";
import { getDb } from "@/db";
import { salesTaxes, items, contacts, users, posShifts, outlets, posTransactions, spSales } from "@/db/schema";
import { eq } from "drizzle-orm";

async function main() {
    const db = await getDb();
    console.log("=== Starting Mega Verification: Loyalty + Tax + Discount ===\n");

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
    console.log("Linked Admin to Outlet");

    // Ensure user is linked to Outlet (for Sales Pro)
    // We can't easily update user if it's external auth, assuming it works or we bypass
    // But sales.ts uses `user.outletId`. Let's mock or hope it's set. 
    // Actually, getAuthenticatedUser returns mock user in scripts usually?
    // Let's check `auth.ts` bypass. It returns a fixed object. 
    // We should ensure that object has `outletId`.
    // If not, we might fail Sales Pro earning.
    // Let's inspect `auth.ts` bypass user later if it fails.

    // 2. Setup Tax (5% Exclusive)
    await db.update(salesTaxes).set({ isEnabled: false }); // Reset
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
    let customer = await db.query.contacts.findFirst({ where: eq(contacts.phone, "MEGA-TEST") });
    if (!customer) {
        [customer] = await db.insert(contacts).values({
            name: "Mega Customer",
            phone: "MEGA-TEST",
            type: "CUSTOMER",
            loyaltyPoints: "0"
        }).returning();
    } else {
        await db.update(contacts).set({ loyaltyPoints: "0" }).where(eq(contacts.id, customer.id));
        customer.loyaltyPoints = "0";
    }
    console.log("Customer Points Reset: 0");

    // 4. Setup Item
    const item = await db.query.items.findFirst();
    if (!item) throw new Error("No items found");


    // ==========================================
    // SCENARIO A: POS (INVOICE PRO)
    // ==========================================
    console.log("\n--- Scenario A: POS Transaction ---");
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

    // Process Transaction: Item $100. Tax 5%. Discount $10. Total Should be (100+5) - 10 = 95? 
    // Or (100 - 10) * 1.05 = 94.5?
    // Current logic in `tax-utils.ts` expects `subtotal`. Discounts are separate.
    // In `pos.ts`: `subtotal = items`. `calculateTax(subtotal)`. `expectedTotal = taxResult.finalTotal`.
    // It does NOT handle discount logic in `pos.ts` calculation verification lines 301-330.
    // It accepts `discountAmount`. 
    // Wait, verification script should check if POS logic handles discount correctly.
    // `processTransactionCore` logic: 
    // `const totalPaid = ...`
    // `const expectedTotal = taxResult.finalTotal;` (Calculated on Subtotal).
    // It ignores discount? 
    // Ideally `expectedTotal` should be `taxResult.finalTotal - discountAmount`.
    // Let's test if it fails. If so, I need to fix `pos.ts` to subtract discount from expected total.

    // Actually, let's run a simple NO discount first to confirm baseline, OR just run with dicount and fix if verified.
    // User requested "Discount and Tax". So I must include Discount.

    const posDiscount = 10;

    try {
        const result = await processTransaction({
            shiftId: shiftId!,
            contactId: customer.id,
            items: [{ itemId: item.id, name: item.name, price: 100, quantity: 1 }],
            payments: [{ methodCode: "CASH", amount: 95 }], // Guessing: 100 + 5 Tax - 10 Discount = 95
            discountAmount: posDiscount
        });
        console.log("POS Transaction ID:", result.transactionId);
    } catch (e: any) {
        console.log("POS Transaction Failed (Expected if logic missing):", e.message);
        // We will fix this.
    }

    // ==========================================
    // SCENARIO B: SALES PRO
    // ==========================================
    console.log("\n--- Scenario B: Sales Pro Quote -> Sale ---");
    // Create Quote
    const { quoteId } = await createQuote({
        contactId: customer.id,
        customerName: "Mega Customer",
        items: [{ itemId: item.id, itemName: item.name, quantity: 1, unitPrice: 100 }]
    });
    console.log("Quote Created:", quoteId);

    // Accept
    await updateQuoteStatus(quoteId!, "ACCEPTED");

    // Convert with Discount
    const salesDiscount = 10;
    const convertResult = await convertQuoteToSale(quoteId!, { discountAmount: salesDiscount });
    console.log("Sale Created:", convertResult.saleId);

    // Verify Points
    // POS Points: 95 * 10% = 9.5? or 100 * 10% = 10?
    // Sales Points: (105 - 10) = 95 * 10% = 9.5?

    // Check Customer Points
    const updatedCustomer = await db.query.contacts.findFirst({ where: eq(contacts.id, customer.id) });
    console.log("\nFinal Customer Points:", updatedCustomer?.loyaltyPoints);
}

main().catch(console.error);
