
"use server";

import { getDb } from "@/db";
import { contacts, loyaltyLogs, outlets, spSales } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * Earn Loyalty Points based on Sale Amount
 */
export async function earnPoints(saleId: string, customerId: string, outletId: string, amountPaid: number) {
    const db = await getDb();

    // 1. Get Outlet Config
    const outlet = await db.query.outlets.findFirst({
        where: eq(outlets.id, outletId),
        columns: { loyaltyEarningRate: true, isLoyaltyEnabled: true }
    });

    if (!outlet || !outlet.isLoyaltyEnabled || !outlet.loyaltyEarningRate) return;

    // 2. Calculate Points
    // Rate: X points per Currency Unit? Or X currency per Point? 
    // Usually Earning Rate = "Points per 1.00 Spent" e.g., 0.1 (1 pt per 10 spent) or 1 (1 pt per 1 spent).
    // Let's assume Rate is a Multiplier. Points = Amount * Rate.
    const earningRate = Number(outlet.loyaltyEarningRate);
    if (earningRate <= 0) return;

    const pointsEarned = amountPaid * earningRate;
    if (pointsEarned <= 0) return;

    // 3. Update Customer Balance & Log
    await db.transaction(async (tx) => {
        // Update Balance
        await tx.update(contacts)
            .set({
                loyaltyPoints: sql`${contacts.loyaltyPoints} + ${pointsEarned}`
            })
            .where(eq(contacts.id, customerId));

        // Create Log
        await tx.insert(loyaltyLogs).values({
            contactId: customerId,
            outletId,
            points: pointsEarned.toString(),
            type: "EARN",
            referenceId: saleId,
            description: `Earned points from Sale #${saleId ? saleId.slice(0, 8) : 'Unknown'}`
        });
    });
}

/**
 * Redeem Loyalty Points
 */
export async function redeemPoints(customerId: string, outletId: string, pointsToRedeem: number, saleId?: string) {
    const db = await getDb();

    if (pointsToRedeem <= 0) throw new Error("Points to redeem must be greater than 0");

    // 1. Check Balance
    const customer = await db.query.contacts.findFirst({
        where: eq(contacts.id, customerId),
        columns: { loyaltyPoints: true }
    });

    if (!customer) throw new Error("Customer not found");
    const balance = Number(customer.loyaltyPoints);

    if (balance < pointsToRedeem) {
        throw new Error(`Insufficient loyalty balance. Available: ${balance}, Required: ${pointsToRedeem}`);
    }

    // 2. Deduct & Log
    await db.transaction(async (tx) => {
        await tx.update(contacts)
            .set({
                loyaltyPoints: sql`${contacts.loyaltyPoints} - ${pointsToRedeem}`
            })
            .where(eq(contacts.id, customerId));

        await tx.insert(loyaltyLogs).values({
            contactId: customerId,
            outletId,
            points: (-pointsToRedeem).toString(), // Negative for redemption log visual? Or Type handles direction.
            // Usually logs store absolute value and Type indicates direction, OR signed value.
            // My schema comment said "positive for earn, negative for redeem". Let's use negative.
            type: "REDEEM",
            referenceId: saleId,
            description: `Redeemed points for Sale #${saleId ? saleId.slice(0, 8) : 'New'}`
        });
    });
}

/**
 * Calculate Monetary Value of Points
 */
export async function calculateRedemptionValue(outletId: string, points: number) {
    const db = await getDb();
    const outlet = await db.query.outlets.findFirst({
        where: eq(outlets.id, outletId),
        columns: { loyaltyRedemptionRate: true }
    });

    // Redemption Rate: Currency Value per Point.
    // e.g. 1 Point = ₦1. Rate = 1.
    // e.g. 10 Points = ₦1. Rate = 0.1.
    const rate = Number(outlet?.loyaltyRedemptionRate || 0);
    return points * rate;
}

export async function getLoyaltyHistory(customerId: string) {
    const db = await getDb();
    return db.query.loyaltyLogs.findMany({
        where: eq(loyaltyLogs.contactId, customerId),
        orderBy: [desc(loyaltyLogs.createdAt)]
    });
}
