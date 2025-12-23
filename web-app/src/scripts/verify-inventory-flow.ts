
import { createVendor, createRequisition, updateRequisitionStatus, createGrn, createItem } from "@/actions/inventory";
import { getDb } from "@/db";
import { accounts, expenses, inventory, items, contacts, requestOrders, ledgerEntries, transactions } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

// Helper to ignore Next.js context errors (revalidatePath) specific to CLI usage
async function safeAction<T>(action: () => Promise<T>): Promise<T | { success: true }> {
    try {
        return await action();
    } catch (e: any) {
        if (e.message && (e.message.includes("static generation store") || e.message.includes("revalidatePath"))) {
            console.log(`Ignoring Next.js revalidate error: ${e.message.substring(0, 50)}...`);
            return { success: true } as any;
        }
        throw e;
    }
}

async function main() {
    console.log("=== STARTING INVENTORY FLOW VERIFICATION ===");
    const db = await getDb();

    // 1. Setup: Create Item
    const timestamp = Date.now();
    const itemName = `Test Item ${timestamp}`;
    console.log(`Creating Item: ${itemName}`);

    await safeAction(() => createItem({
        name: itemName,
        price: 1500,
        costPrice: 1000,
        category: "Test",
        itemType: "RESALE",
        sku: `SKU-${timestamp}`
    }));

    const item = await db.query.items.findFirst({
        where: eq(items.name, itemName)
    });

    if (!item) throw new Error("Item creation failed");
    console.log(`Item Created ID: ${item.id}`);

    // 2. Setup: Create Vendor
    const vendorName = `Test Vendor ${timestamp}`;
    console.log(`Creating Vendor: ${vendorName}`);

    await safeAction(() => createVendor({
        name: vendorName,
        bankName: "Test Bank",
        accountNumber: "1234567890",
        email: "test@vendor.com"
    }));

    // Refetch vendor to get ID since safeAction swallows return
    const vendor = await db.query.contacts.findFirst({
        where: and(eq(contacts.name, vendorName), eq(contacts.type, "VENDOR"))
    });

    if (!vendor) throw new Error("Vendor creation failed");
    const vendorId = vendor.id;
    console.log(`Vendor Created ID: ${vendorId}`);

    // 3. Create Requisition
    console.log("Creating Requisition...");
    const outlets = await db.query.outlets.findMany();
    const outletId = outlets[0].id; // Main Outlet

    await safeAction(() => createRequisition({
        outletId: outletId,
        items: [{ itemId: item.id, quantity: 10, estimatedPrice: 1000 }],
        description: "Test Stock Replenishment"
    }));

    const req = await db.query.requestOrders.findFirst({
        orderBy: [desc(requestOrders.createdAt)]
    });

    if (!req) throw new Error("Requisition failed");
    console.log(`Requisition Created ID: ${req.id}`);

    // 4. Approve Requisition
    console.log("Approving Requisition...");
    await safeAction(() => updateRequisitionStatus(req.id, "APPROVED_FOR_PAYMENT", vendorId));

    // B. Expense Check (Should exist NOW)
    const expense = await db.query.expenses.findFirst({
        where: eq(expenses.payee, vendorName),
        orderBy: [desc(expenses.incurredAt)]
    });
    console.log(`Expense Record: ${expense ? "FOUND" : "MISSING"}`);
    if (expense) console.log(`Expense Amount: ${expense.amount} (Expected: 10000)`);

    if (!expense || Number(expense.amount) !== 10000) throw new Error("Expense record missing or incorrect after Approval");

    // 5. Execute GRN (Receive Goods)
    console.log("Executing GRN (Receiving 10 items)...");
    await safeAction(() => createGrn({
        requestOrderId: req.id,
        vendorInvoiceNumber: `INV-${timestamp}`,
        items: [{ itemId: item.id, quantityReceived: 10, condition: "GOOD" }]
    }));

    // === VERIFICATION ===
    console.log("... Verifying Results ...");

    // A. Inventory Check
    const updatedItem = await db.query.items.findFirst({ where: eq(items.id, item.id) });
    console.log(`Item Master Quantity: ${updatedItem?.quantity} (Expected: 10)`);

    const outletStock = await db.query.inventory.findFirst({
        where: and(eq(inventory.itemId, item.id), eq(inventory.outletId, outletId))
    });
    console.log(`Outlet Inventory: ${outletStock?.quantity} (Expected: 10)`);

    if (Number(outletStock?.quantity) !== 10) throw new Error("Inventory not updated correctly");

    // C. GL Accounts Check
    const invAccount = await db.query.accounts.findFirst({ where: eq(accounts.name, "Inventory Asset") });
    // CHANGED: Expect Generic "Accounts Payable"
    const apAccount = await db.query.accounts.findFirst({ where: eq(accounts.name, "Accounts Payable") });

    console.log(`GL Inventory Account: ${invAccount ? "FOUND" : "MISSING"}`);
    console.log(`GL AP Account: ${apAccount ? "FOUND" : "MISSING"}`);

    if (!invAccount || !apAccount) throw new Error("GL Accounts not created");

    // D. Ledger Check
    const tx = await db.query.transactions.findFirst({
        orderBy: [desc(transactions.date)],
        with: { entries: true }
    });

    console.log(`Latest Transaction: ${tx?.description}`);

    const debitEntry = tx?.entries.find(e => e.accountId === invAccount.id);
    const creditEntry = tx?.entries.find(e => e.accountId === apAccount.id);

    console.log(`Debit (Inventory): ${debitEntry?.amount}`);
    console.log(`Credit (AP): ${creditEntry?.amount}`);

    if (Number(debitEntry?.amount) !== 10000 || Number(creditEntry?.amount) !== 10000) {
        throw new Error("Ledger entries incorrect balances");
    }

    console.log("=== VERIFICATION SUCCESSFUL ===");
}

main().catch(console.error);
