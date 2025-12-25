import { getDb } from "@/db";
import { contacts, loyaltyLogs, outlets } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { EarnPointsDto, RedeemPointsDto } from "@/lib/dtos/loyalty-dtos";

export class LoyaltyService {

    static async earnPoints(data: EarnPointsDto) {
        const db = await getDb();

        const outlet = await db.query.outlets.findFirst({
            where: eq(outlets.id, data.outletId),
        });

        if (!outlet || !outlet.loyaltyEarningRate) return;

        const earningRate = Number(outlet.loyaltyEarningRate);
        if (earningRate <= 0) return;

        const pointsEarned = data.amountPaid * earningRate;
        if (pointsEarned <= 0) return;

        await db.transaction(async (tx) => {
            await tx.update(contacts)
                .set({
                    loyaltyPoints: sql`${contacts.loyaltyPoints} + ${pointsEarned}`
                })
                .where(eq(contacts.id, data.customerId));

            await tx.insert(loyaltyLogs).values({
                contactId: data.customerId,
                outletId: data.outletId,
                points: pointsEarned.toString(),
                type: "EARN",
                referenceId: data.saleId,
                description: `Earned points from Sale #${data.saleId.slice(0, 8)}`
            });
        });
    }

    static async redeemPoints(data: RedeemPointsDto) {
        const db = await getDb();

        if (data.pointsToRedeem <= 0) throw new Error("Points to redeem must be greater than 0");

        const customer = await db.query.contacts.findFirst({
            where: eq(contacts.id, data.customerId),
            columns: { loyaltyPoints: true }
        });

        if (!customer) throw new Error("Customer not found");
        const balance = Number(customer.loyaltyPoints);

        if (balance < data.pointsToRedeem) {
            throw new Error(`Insufficient loyalty balance. Available: ${balance}, Required: ${data.pointsToRedeem}`);
        }

        await db.transaction(async (tx) => {
            await tx.update(contacts)
                .set({
                    loyaltyPoints: sql`${contacts.loyaltyPoints} - ${data.pointsToRedeem}`
                })
                .where(eq(contacts.id, data.customerId));

            await tx.insert(loyaltyLogs).values({
                contactId: data.customerId,
                outletId: data.outletId,
                points: (-data.pointsToRedeem).toString(),
                type: "REDEEM",
                referenceId: data.saleId,
                description: `Redeemed points for Sale #${data.saleId ? data.saleId.slice(0, 8) : 'New'}`
            });
        });
    }

    static async getHistory(customerId: string) {
        const db = await getDb();
        return await db.query.loyaltyLogs.findMany({
            where: eq(loyaltyLogs.contactId, customerId),
            orderBy: [desc(loyaltyLogs.createdAt)]
        });
    }
}
