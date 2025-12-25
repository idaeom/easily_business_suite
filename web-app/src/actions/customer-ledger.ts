"use server";

import { getAuthenticatedUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { CrmService } from "@/services/crm-service";
import { addCustomerBalanceSchema } from "@/lib/dtos/crm-dtos";

export async function getCustomerLedger(contactId: string, startDate?: Date, endDate?: Date) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");
    return CrmService.getCustomerLedger(contactId, startDate, endDate);
}

export async function addCustomerBalance(contactId: string, amount: number, notes?: string, method: "CASH" | "TRANSFER" | "CARD" = "CASH") {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    // Manually construct raw object for DTO to keep signature backward compatible if needed
    // OR change signature. For Actions called by Client components, better to keep signature simpler or accept object.
    // Given the original had separate args, I will wrap them.
    const rawData = { contactId, amount, notes, method };
    const data = addCustomerBalanceSchema.parse(rawData);

    await CrmService.addCustomerBalance(data, user.id);

    // Note: Revalidate paths handled by Client usually or we do it here
    return { success: true, pending: true };
}

export async function confirmWalletDeposit(ledgerId: string, businessAccountId: string) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    await CrmService.confirmWalletDeposit(ledgerId, businessAccountId, user.id);

    revalidatePath("/dashboard/business/crm");
    return { success: true };
}

// Helper getter
export async function getCustomerCreditScore(contactId: string) {
    const { calculateCreditScore } = await import("@/lib/credit-score");
    return calculateCreditScore(contactId);
}
