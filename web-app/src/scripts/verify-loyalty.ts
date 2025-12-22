
import { processTransaction } from "@/actions/pos";
import { getDb } from "@/db";
import { salesTaxes, items, contacts, users, posShifts, outlets, posTransactions } from "@/db/schema";
import { eq } from "drizzle-orm";

async function main() {
    const db = await getDb();
    console.log("=== Starting Loyalty Verification ===\n");

    // 1. Setup Data
    const user = await db.query.users.findFirst({ where: eq(users.email, "admin@example.com") });
    if (!user) throw new Error("Admin not found");

    // Get Outlet
    let outlet = await db.query.outlets.findFirst({ where: eq(outlets.name, "Main Branch") });
    if (!outlet) {
        // Try any
        outlet = await db.query.outlets.findFirst();
        if (!outlet) {
            // Create one
            [outlet] = await db.insert(outlets).values({
                name: "Main Branch",
                address: "Test Address",
                loyaltyEarningRate: "0.05",
                loyaltyRedemptionRate: "1.0"
            }).returning();
        }
    }
    console.log("Using Outlet:", outlet.name);

    // Disable Taxes for Clean Test
    await db.update(salesTaxes).set({ isEnabled: false });
    console.log("Disabled all taxes.");

    // Update Loyalty Settings (10% Earning)
    await db.update(outlets).set({ loyaltyEarningRate: "0.10" }).where(eq(outlets.id, outlet.id));
    console.log("Updated Loyalty Rate to 0.10 (10%)");

    // Create Shift
    const [shift] = await db.insert(posShifts).values({
        cashierId: user.id,
        outletId: outlet.id,
        startCash: "100",
        status: "OPEN"
    }).returning();
    console.log("Opened Shift:", shift.id);

    // Get Customer
    let customer = await db.query.contacts.findFirst({ where: eq(contacts.phone, "LOYALTY-TEST") });
    if (!customer) {
        [customer] = await db.insert(contacts).values({
            name: "Loyalty Customer",
            phone: "LOYALTY-TEST",
            type: "CUSTOMER",
            loyaltyPoints: "0"
        }).returning();
    } else {
        // Reset points
        await db.update(contacts).set({ loyaltyPoints: "0" }).where(eq(contacts.id, customer.id));
        customer.loyaltyPoints = "0";
    }
    console.log("Customer Initial Points:", customer.loyaltyPoints);

    // Get Item
    const item = await db.query.items.findFirst();
    if (!item) throw new Error("No items found");

    // 2. Process Transaction ($100)
    console.log("\nProcessing Transaction of $100...");

    // We mock the items/payments. 1 Item @ 100.
    const result = await processTransaction({
        shiftId: shift.id,
        contactId: customer.id,
        items: [{ itemId: item.id, name: item.name, price: 100, quantity: 1 }],
        payments: [{ methodCode: "CASH", amount: 100 }],
        // We do NOT send loyaltyPointsEarned, checking if server calculates it.
        // Or if we send 0, it should override.
        loyaltyPointsEarned: 0
    });

    if (!result.success) throw new Error("Transaction Failed");
    console.log("Transaction ID:", result.transactionId);

    // 3. Verify
    const tx = await db.query.posTransactions.findFirst({ where: eq(posTransactions.id, result.transactionId!) });
    console.log("Transaction Points Earned:", tx?.loyaltyPointsEarned);

    if (Number(tx?.loyaltyPointsEarned) !== 10) {
        throw new Error(`Mismatch! Expected 10, Got ${tx?.loyaltyPointsEarned}`);
    }

    const updatedCustomer = await db.query.contacts.findFirst({ where: eq(contacts.id, customer.id) });
    console.log("Customer Updated Points:", updatedCustomer?.loyaltyPoints);

    if (Number(updatedCustomer?.loyaltyPoints) !== 10) {
        throw new Error(`Customer Points Mismatch! Expected 10, Got ${updatedCustomer?.loyaltyPoints}`);
    }

    console.log("\nSUCCESS: Loyalty verification passed!");
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
