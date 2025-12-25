import { getDb } from "@/db";
import { outlets, salesTaxes, discounts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { CreateOutletDto, UpdateOutletDto, SaveSalesTaxDto, SaveDiscountDto } from "@/lib/dtos/settings-dtos";

export class SettingsService {

    // OUTLETS
    static async getOutlets() {
        const db = await getDb();
        return await db.query.outlets.findMany({
            orderBy: [desc(outlets.createdAt)]
        });
    }

    static async createOutlet(data: CreateOutletDto) {
        const db = await getDb();
        return await db.insert(outlets).values({
            name: data.name,
            address: data.address,
            phone: data.phone,
            loyaltyEarningRate: data.loyaltyEarningRate,
            loyaltyRedemptionRate: data.loyaltyRedemptionRate,
            createdAt: new Date()
        }).returning();
    }

    static async updateOutlet(id: string, data: UpdateOutletDto) {
        const db = await getDb();
        await db.update(outlets).set(data).where(eq(outlets.id, id));
    }

    // TAXES
    static async getSalesTaxes() {
        const db = await getDb();
        return await db.query.salesTaxes.findMany({ orderBy: [desc(salesTaxes.name)] });
    }

    static async saveSalesTax(data: SaveSalesTaxDto) {
        const db = await getDb();
        if (data.id) {
            await db.update(salesTaxes).set({
                name: data.name,
                rate: data.rate.toString(),
                type: data.type,
                isEnabled: data.isEnabled
            }).where(eq(salesTaxes.id, data.id));
        } else {
            await db.insert(salesTaxes).values({
                name: data.name,
                rate: data.rate.toString(),
                type: data.type,
                isEnabled: data.isEnabled
            });
        }
    }

    static async deleteSalesTax(id: string) {
        const db = await getDb();
        await db.delete(salesTaxes).where(eq(salesTaxes.id, id));
    }

    // DISCOUNTS
    static async getDiscounts() {
        const db = await getDb();
        return await db.query.discounts.findMany({ orderBy: [desc(discounts.name)] });
    }

    static async saveDiscount(data: SaveDiscountDto) {
        const db = await getDb();
        if (data.id) {
            await db.update(discounts).set({
                name: data.name,
                type: data.type,
                value: data.value.toString(),
                isEnabled: data.isEnabled
            }).where(eq(discounts.id, data.id));
        } else {
            await db.insert(discounts).values({
                name: data.name,
                type: data.type,
                value: data.value.toString(),
                isEnabled: data.isEnabled
            });
        }
    }

    static async deleteDiscount(id: string) {
        const db = await getDb();
        await db.delete(discounts).where(eq(discounts.id, id));
    }
}
