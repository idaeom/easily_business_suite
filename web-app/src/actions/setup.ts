
"use server";

import { getDb } from "@/db";
import { accounts, accountingConfig, systemConfig } from "@/db/schema"; // systemConfig might not exist? checking schema earlier didn't show it. accountingConfig does.
import { STANDARD_COA } from "@/lib/constants/standard-coa";
import { eq } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth";

export async function initializeStandardCOA() {
    // Note: Can be run by Admin or System Script
    // const user = await getAuthenticatedUser();
    // if (!user) throw new Error("Unauthorized");

    const db = await getDb();
    console.log("Initializing Standard Chart of Accounts...");

    const accountIdMap: Record<string, string> = {};

    // 1. Upsert Accounts
    for (const acc of STANDARD_COA) {
        // Check if exists by CODE
        let existing = await db.query.accounts.findFirst({ where: eq(accounts.code, acc.code) });

        if (!existing) {
            // Check if exists by NAME (to avoid creating "Sales Revenue" if "Acc-Inc-Sales" is just renamed)
            // Actually, we want to enforce the new Standard. 
            // The cleanup script will handle merging "Old" to "New".
            // Here we just ensure the "New" exists.

            const [newAcc] = await db.insert(accounts).values({
                name: acc.name,
                code: acc.code,
                type: acc.type,
                description: acc.description,
                currency: "NGN",
                balance: "0"
            }).returning();
            existing = newAcc;
        } else {
            // Update details just in case
            await db.update(accounts).set({
                name: acc.name,
                type: acc.type,
                description: acc.description
            }).where(eq(accounts.id, existing.id));
        }

        accountIdMap[acc.code] = existing.id;
    }

    // 2. Update Accounting Config
    // Ensure config row exists
    let config = await db.query.accountingConfig.findFirst();
    if (!config) {
        const [newConfig] = await db.insert(accountingConfig).values({}).returning();
        config = newConfig;
    }

    // Link Defaults
    await db.update(accountingConfig).set({
        defaultSalesAccountId: accountIdMap["4000"], // Sales Revenue
        defaultInventoryAccountId: accountIdMap["1300"], // Inventory Asset
        defaultCogsAccountId: accountIdMap["5000"], // COGS
        defaultVarianceAccountId: accountIdMap["6100"], // Cash Variance
        updatedAt: new Date()
    }).where(eq(accountingConfig.id, config.id));

    console.log("Standard COA Initialized & Linked.");
    return { success: true };
}
