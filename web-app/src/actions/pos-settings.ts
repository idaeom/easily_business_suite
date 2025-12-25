"use server";

import { revalidatePath } from "next/cache";
import { SettingsService } from "@/services/settings-service";
import { saveSalesTaxSchema, saveDiscountSchema } from "@/lib/dtos/settings-dtos";

// TAXES
export async function getSalesTaxes() {
    return SettingsService.getSalesTaxes();
}

export async function saveSalesTax(rawData: any) {
    const data = saveSalesTaxSchema.parse(rawData);
    await SettingsService.saveSalesTax(data);
    revalidatePath("/dashboard/settings/taxes");
    return { success: true };
}

export async function deleteSalesTax(id: string) {
    await SettingsService.deleteSalesTax(id);
    revalidatePath("/dashboard/settings/taxes");
    return { success: true };
}

// DISCOUNTS
export async function getDiscounts() {
    return SettingsService.getDiscounts();
}

export async function saveDiscount(rawData: any) {
    const data = saveDiscountSchema.parse(rawData);
    await SettingsService.saveDiscount(data);
    revalidatePath("/dashboard/settings/discounts");
    return { success: true };
}

export async function deleteDiscount(id: string) {
    await SettingsService.deleteDiscount(id);
    revalidatePath("/dashboard/settings/discounts");
    return { success: true };
}

// LOYALTY SETTINGS
export async function getLoyaltySettings(outletId: string) {
    // Keeping getter simple
    const { getOutlet } = await import("@/actions/settings");
    const outlet = await getOutlet(outletId);
    return outlet ? {
        loyaltyEarningRate: outlet.loyaltyEarningRate,
        loyaltyRedemptionRate: outlet.loyaltyRedemptionRate
    } : null;
}

export async function saveLoyaltySettings(outletId: string, earningRate: number, redemptionRate: number) {
    // Reusing updateOutlet logic or distinct? 
    // Distinct DB call in original, but effectively just updating rates.
    // Let's use UpdateOutlet logic via Service to reuse code.
    await SettingsService.updateOutlet(outletId, {
        loyaltyEarningRate: earningRate.toString(),
        loyaltyRedemptionRate: redemptionRate.toString()
    });

    if (process.env.IS_SCRIPT !== "true") {
        revalidatePath("/dashboard/settings/loyalty");
    }
    return { success: true };
}
