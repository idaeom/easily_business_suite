"use server";

import { LoyaltyService } from "@/services/loyalty-service";
import { earnPointsSchema, redeemPointsSchema } from "@/lib/dtos/loyalty-dtos";

export async function earnPoints(saleId: string, customerId: string, outletId: string, amountPaid: number) {
    const data = earnPointsSchema.parse({ saleId, customerId, outletId, amountPaid });
    await LoyaltyService.earnPoints(data);
}

export async function redeemPoints(customerId: string, outletId: string, pointsToRedeem: number, saleId?: string) {
    const data = redeemPointsSchema.parse({ customerId, outletId, pointsToRedeem, saleId });
    await LoyaltyService.redeemPoints(data);
}

export async function calculateRedemptionValue(outletId: string, points: number) {
    // This simple read util can stay or be moved. Keeping logic here if minimal.
    // Or call DB directly.
    // For consistency, let's keep it here or call a Service getter if we added one.
    // Re-implementing logic cleanly:
    const { getDb } = await import("@/db");
    const { outlets } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");

    const db = await getDb();
    const outlet = await db.query.outlets.findFirst({
        where: eq(outlets.id, outletId),
        columns: { loyaltyRedemptionRate: true }
    });
    const rate = Number(outlet?.loyaltyRedemptionRate || 0);
    return points * rate;
}

export async function getLoyaltyHistory(customerId: string) {
    return LoyaltyService.getHistory(customerId);
}
