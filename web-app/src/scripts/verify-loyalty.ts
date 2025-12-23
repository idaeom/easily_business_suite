
import { getDb } from "@/db";
import { outlets, contacts, salesTaxes, items, posShifts, posTransactions, loyaltyLogs, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { saveLoyaltySettings } from "@/actions/pos-settings";
import { processTransaction } from "@/actions/pos";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
process.env.IS_SCRIPT = "true";

async function main() {
    console.log("🚀 Starting Loyalty Verification...");
    const db = await getDb();

    // 1. Setup Outlet & Config
    const outlet = await db.query.outlets.findFirst();
    if (!outlet) throw new Error("No Outlet found");
    console.log(`1️⃣  Using Outlet: ${outlet.name}`);

    // Enable Loyalty: Earn 10% (0.1), Redeem 1 Point = 1 Unit (1.0)
    await saveLoyaltySettings(outlet.id, 0.1, 1.0);
    console.log("   Updated Loyalty Config: Earn 10%, Redeem 1.0");

    // 2. Setup Customer
    let customer = await db.query.contacts.findFirst({
        where: eq(contacts.name, "Loyalty Test Customer")
    });

    if (!customer) {
        const [newC] = await db.insert(contacts).values({
            name: "Loyalty Test Customer",
            type: "CUSTOMER",
            email: "loyalty@test.com",
            loyaltyPoints: "0"
        }).returning();
        customer = newC;
    } else {
        // Reset points
        await db.update(contacts).set({ loyaltyPoints: "0" }).where(eq(contacts.id, customer.id));
        await db.delete(loyaltyLogs).where(eq(loyaltyLogs.contactId, customer.id));
        console.log("   Reset Customer Points to 0");
    }

    // 3. Create Open Shift (if needed)
    // We can just link to any open shift or create one strictly for test?
    // Let's use an existing shift or fake one.
    // processTransaction needs shiftId.
    const shift = await db.query.posShifts.findFirst({ where: eq(posShifts.status, "OPEN") });
    const shiftId = shift ? shift.id : "TEST_SHIFT_LOYALTY";
    // If we use a fake shift ID, foreign key constraints might fail if real DB.
    // Let's assume we need a real shift or we skip constraints? 
    // Best to find ANY shift or create one.
    let realShiftId = shift?.id;
    if (!realShiftId) {
        // Try to find ANY user
        let user = await db.query.users.findFirst();
        if (!user) {
            // Create a dummy user if none exist
            const [newUser] = await db.insert(users).values({
                name: "Test Cashier",
                email: "cashier@test.com",
                role: "ADMIN"
            } as any).returning(); // Cast as any if TS complains about strict type
            user = newUser;
        }

        if (user) {
            const [s] = await db.insert(posShifts).values({
                cashierId: user.id,
                outletId: outlet.id,
                startTime: new Date(),
                status: "OPEN",
                startCash: "0"
            }).returning();
            realShiftId = s.id;
        }
    }

    if (!realShiftId) throw new Error("Could not find or create a Shift");

    // 4. Test Case A: EARN POINTS
    // Buy item worth 1000. Should earn 100 points.
    console.log("\n2️⃣  Test: EARNING POINTS");
    const item = await db.query.items.findFirst({ where: eq(items.itemType, "RESALE") });
    if (!item) throw new Error("No Item found");

    const saleAmount = 1000;
    // Server adds 12.5% Tax
    const taxRate = 0.125;
    const totalWithTax = saleAmount * (1 + taxRate); // 1125

    // Create Dummy Transaction
    // processTransaction handles calculation.
    await processTransaction({
        shiftId: realShiftId,
        contactId: customer.id,
        items: [{
            itemId: item.id,
            name: "Loyalty Test Item",
            price: saleAmount,
            quantity: 1
        }],
        payments: [{ methodCode: "CASH", amount: totalWithTax }], // Full payment
        // We expect server to calculate points
    });

    // Verify
    const customerAfterEarn = await db.query.contacts.findFirst({ where: eq(contacts.id, customer!.id) });
    const points = Number(customerAfterEarn?.loyaltyPoints);
    console.log(`   Points Balance: ${points}`);

    // Expected: 10% of 1125 = 112.5 (if tax included in earnings)
    // Or 10% of 1000 = 100 (if tax excluded)
    // Current logic uses totalPaid (1125).
    if (Math.abs(points - 112.5) < 0.1) {
        console.log("   ✅ PASSED: Earned 10% of 1125 (112.5 pts)");
    } else {
        console.error(`   ❌ FAILED: Expected 112.5, got ${points}`);
    }

    // Verify Log
    const log = await db.query.loyaltyLogs.findFirst({
        where: eq(loyaltyLogs.contactId, customer!.id),
        orderBy: [desc(loyaltyLogs.createdAt)]
    });
    console.log(`   Log: ${log?.type} ${log?.points} (${log?.description})`);


    // 5. Test Case B: REDEEM POINTS
    // Balance 112.5. Value = 112.5 Currency.
    // Buy item worth 150. Tax 12.5% => 168.75.
    console.log("\n3️⃣  Test: REDEEMING POINTS");

    const itemPrice2 = 150;
    const totalSale2 = itemPrice2 * 1.125; // 168.75

    const redeemAmount = 100; // Value
    const pointsRedeemed = 100; // Rate 1.0
    const cashPay = totalSale2 - redeemAmount; // 68.75

    await processTransaction({
        shiftId: realShiftId,
        contactId: customer!.id,
        items: [{
            itemId: item.id,
            name: "Redemption Item",
            price: itemPrice2,
            quantity: 1
        }],
        payments: [
            { methodCode: "LOYALTY", amount: redeemAmount }, // 100 Value
            { methodCode: "CASH", amount: cashPay }
        ],
        loyaltyPointsRedeemed: pointsRedeemed // In UI we calculate this. Script must pass it.
    });

    const customerAfterRedeem = await db.query.contacts.findFirst({ where: eq(contacts.id, customer!.id) });
    const finalPoints = Number(customerAfterRedeem?.loyaltyPoints);
    /*
        Wait! This transaction ALSO EARNS points on the cash portion? Or Total?
        Usually you earn on the Net Customer Pay (Cash/Card), NOT on the redeemed portion.
        Our logic: `pointsEarned = Number((totalPaid * earningRate).toFixed(2));`
        `totalPaid` is sum of payments.
        Payments include "LOYALTY".
        So currently we EARN points on the Redeemed amount too? That's a double dip loop! 
        Ideally exclude LOYALTY payment method from Earning base.
        Let's see logic in pos.ts: `const totalPaid = ... reduce ... p.amount`.
        It includes all payments.
        
        If this is the logic, then:
        Total Paid = 150. Earning = 150 * 0.1 = 15 points.
        Redemption = 100 points.
        Net Change = +15 - 100 = -85.
        Expected Final = 100 - 85 = 15.
        
        Let's check if this matches current implementation.
    */
    console.log(`   Points Balance: ${finalPoints}`);

    // Verify Legacy/Double Dipping Logic? NO, we fixed it.
    // New Logic: 
    // Total Sale: 168.75
    // Paid Loyalty: 100
    // Net Cash: 68.75
    // Earned: 10% of 68.75 = 6.875 -> 6.88
    // Previous Balance: 112.5
    // Redeemed: -100
    // Final: 112.5 - 100 + 6.88 = 19.38

    console.log(`   Points Balance: ${finalPoints}`);

    if (Math.abs(finalPoints - 19.38) < 0.1) {
        console.log("   ✅ PASSED: Balance ~19.38 (Earned on Net Cash Only)");
    } else if (Math.abs(finalPoints - 29.38) < 0.1) {
        console.error("   ❌ FAILED: Balance ~29.38 (Still Double Dipping!)");
    } else {
        console.error(`   ❌ FAILED: Unexpected Balance ${finalPoints}`);
    }

    console.log("🏁 Verification Complete.");
}

main().catch(console.error);
