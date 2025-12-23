
import { processTransactionCore, openShift, closeShift, reconcileShift, getActiveShift } from "@/actions/pos";
import { getBusinessAccounts } from "@/actions/finance";
import { createQuickCustomer } from "@/actions/sales";
import { getDb } from "@/db";
import { items, posShifts, businessAccounts, accounts, salesTaxes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth";


async function main() {
    console.log("🚀 Starting Sales Simulation...");
    process.env.IS_SCRIPT = "true";

    const db = await getDb();

    // 1. Setup Data
    console.log("📦 Setting up Prerequisite Data...");

    // A. Dummy Customer
    let customerId = "";
    const existingCus = await db.query.contacts.findFirst({ where: eq(contacts => contacts.phone, "0000000000") });
    if (existingCus) {
        customerId = existingCus.id;
    } else {
        const { contact } = await createQuickCustomer({ name: "Simulation Customer", phone: "0000000000" });
        if (contact) customerId = contact.id;
    }

    // B. Dummy Item (High Value)
    let itemId = "";
    const existingItem = await db.query.items.findFirst({ where: eq(items => items.name, "Consulting Service") });
    if (existingItem) {
        itemId = existingItem.id;
    } else {
        const [newItem] = await db.insert(items).values({
            name: "Consulting Service",
            price: "10000000", // 10 Million
            costPrice: "0",
            category: "Services",
            itemType: "SERVICE" // No stock tracking
        }).returning();
        itemId = newItem.id;
    }

    // C. Business Accounts
    const businessList = await getBusinessAccounts();
    console.log(`Found ${businessList.length} Business Accounts.`);

    if (businessList.length === 0) {
        console.error("❌ No business accounts found!");
        return;
    }

    // 2. Execution Loop
    for (const account of businessList) {
        if (!account.glAccount) {
            console.log(`⚠️ Account ${account.name} has no Linked GL. Skipping.`);
            continue;
        }

        console.log(`\n💳 Processing ₦10M Revenue for Account: ${account.name} (${account.type})...`);
        const TARGET_AMOUNT = 10000000;

        // Ensure no open shift blocks us
        const active = await getActiveShift();
        if (active) {
            console.log("   found active shift, closing forced.");
            await db.update(posShifts).set({ status: "CLOSED", endTime: new Date() }).where(eq(posShifts.id, active.id));
        }

        // A. Open Shift
        const { shift } = await openShift(0);
        if (!shift) throw new Error("Failed to open shift");
        console.log(`   ✅ Shift Opened: #${shift.id.slice(0, 8)}`);

        // B. Process Transaction (Payment Method based on Account Type)
        // Bank/MoMo -> TRANSFER, Cash -> CASH
        let methodCode = "TRANSFER";
        if (account.type === "CASH") methodCode = "CASH";

        // Calculate Tax
        const taxes = await db.select().from(salesTaxes).where(eq(salesTaxes.isEnabled, true));
        let taxTotal = 0;
        for (const tax of taxes) {
            taxTotal += TARGET_AMOUNT * (Number(tax.rate) / 100);
        }
        const FINAL_TOTAL = TARGET_AMOUNT + taxTotal;
        console.log(`   🧮 Subtotal: ₦${TARGET_AMOUNT}, Tax: ₦${taxTotal}, Total: ₦${FINAL_TOTAL}`);

        await processTransactionCore({
            shiftId: shift.id,
            contactId: customerId,
            items: [{
                itemId: itemId,
                name: "Consulting Service",
                price: TARGET_AMOUNT, // Subtotal
                quantity: 1
            }],
            payments: [{
                methodCode: methodCode,
                amount: FINAL_TOTAL
            }],
        }, { id: "user-script-runner" }, db, true);

        console.log(`   ✅ Transaction of ₦${FINAL_TOTAL.toLocaleString()} Processed.`);

        // C. Close Shift
        const actuals: any = {};
        actuals[methodCode] = FINAL_TOTAL; // Perfect match
        await closeShift(shift.id, actuals);
        console.log("   ✅ Shift Closed.");

        // D. Reconcile Shift (GL Posting)
        const reconData: any = {
            verifiedCash: 0,
            verifiedCard: 0,
            verifiedTransfer: 0
        };

        if (methodCode === "CASH") {
            reconData.verifiedCash = FINAL_TOTAL;
            reconData.cashAccountId = account.id; // <--- The Magic Link
        } else {
            reconData.verifiedTransfer = FINAL_TOTAL;
            reconData.transferAccountId = account.id; // <--- The Magic Link
        }

        await reconcileShift(shift.id, reconData);
        console.log(`   ✅ Shift Reconciled! GL Posted.`);

        // Verify Balance Update
        const [updatedAccount] = await db.select().from(businessAccounts).where(eq(businessAccounts.id, account.id));
        // Note: BusinessAccount doesn't have balance, the linked GL Account does.
        const [updatedGL] = await db.select().from(accounts).where(eq(accounts.id, account.glAccountId));

        console.log(`   💰 New Balance for ${account.name}: ₦${Number(updatedGL.balance).toLocaleString()}`);
    }

    console.log("\n✨ Simulation Complete!");
    process.exit(0);
}

main().catch(console.error);
