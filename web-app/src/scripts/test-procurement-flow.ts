
import { InventoryService } from "../services/inventory-service";
import { FinanceService } from "../services/finance-service";
import { createItemSchema } from "../lib/dtos/inventory-dtos";

async function runProcurementTest() {
    console.log("🚀 Starting Procurement Flow Integration Test");

    try {
        const db = await import("../db").then(m => m.getDb());
        const { users, accounts } = await import("../db/schema");
        const { eq, like, and } = await import("drizzle-orm");

        // 1. Setup User (Admin)
        console.log("\n--- 1. Setting up Test Admin ---");
        let admin = await db.query.users.findFirst({ where: eq(users.email, "admin@test.com") });
        if (!admin) {
            // Should exist from previous test, but safe guard
            throw new Error("Admin user not found. Run HR test first or ensure admin exists.");
        }

        // 2. Setup Accounts (if missing)
        let invAccount = await db.query.accounts.findFirst({ where: (a) => and(eq(a.type, "ASSET"), like(a.name, "%Inventory%")) });
        if (!invAccount) {
            [invAccount] = await db.insert(accounts).values({
                name: "Inventory Asset",
                code: "1200",
                type: "ASSET"
            }).returning();
        }

        let apAccount = await db.query.accounts.findFirst({ where: (a) => and(eq(a.type, "LIABILITY"), like(a.name, "%Payable%")) });
        if (!apAccount) {
            [apAccount] = await db.insert(accounts).values({
                name: "Accounts Payable",
                code: "2100",
                type: "LIABILITY"
            }).returning();
        }

        // 3. Create Vendor
        console.log("\n--- 3. Create Vendor ---");
        const vendor = await InventoryService.createVendor({
            name: "Best Supplies Ltd " + Date.now(),
            bankName: "Vendor Bank",
            accountNumber: "9988776655",
            email: "vendor@supplies.com",
            type: "VENDOR"
        });
        console.log("✅ Vendor Created:", vendor.name);

        // 4. Create Item to Buy
        console.log("\n--- 4. Create Item ---");
        const item = await InventoryService.createItem({
            name: "Raw Material X " + Date.now(),
            price: 5000,
            costPrice: 3000, // Estimated
            category: "Materials",
            itemType: "RAW_MATERIAL",
            sku: "RAW-" + Date.now()
        });
        console.log("✅ Item Created:", item.name);

        // 5. Create Requisition
        console.log("\n--- 5. Create Requisition ---");
        const outlets = await InventoryService.getOutlets();
        const mainOutlet = outlets[0];

        const req = await InventoryService.createRequisition({
            outletId: mainOutlet.id,
            description: "Monthly Restock",
            items: [{ itemId: item.id, quantity: 100, estimatedPrice: 3000 }]
        }, admin.id, admin.name || "Admin");
        console.log("✅ Requisition Created:", req.id);

        // 6. Approve Requisition
        console.log("\n--- 6. Approve Requisition ---");
        await InventoryService.updateRequisitionStatus(req.id, "APPROVED_FOR_PAYMENT", admin.id, vendor.id);
        console.log("✅ Requisition Approved for Vendor:", vendor.name);

        // 7. Receive GRN
        console.log("\n--- 7. Create GRN (Receive Goods) ---");
        const grnResult = await InventoryService.createGrn({
            requestOrderId: req.id,
            vendorInvoiceNumber: "INV-999",
            items: [{ itemId: item.id, quantityReceived: 100, condition: "GOOD" }]
        }, admin.id);

        console.log(`✅ GRN Created. Total Value: ${grnResult.totalValue}`);

        // 8. Verify Stock
        console.log("\n--- 8. Verify Stock ---");
        const [updatedItem] = await InventoryService.getItems("RAW_MATERIAL", mainOutlet.id);
        const stock = updatedItem ? Number(updatedItem.quantity) : 0;
        console.log(`   Stock Level: ${stock} (Expected 100)`);

        if (stock !== 100) throw new Error("Stock update failed");

        // 9. Verify GL
        console.log("\n--- 9. Verify GL ---");
        const txs = await FinanceService.getTransactions(1, 1);
        const lastTx = txs.data[0];
        console.log(`💰 Last Transaction: ${lastTx.description}`);
        console.log(`   Expected Amount: ${grnResult.totalValue}`);

        const entry = lastTx.entries.find(e => Number(e.amount) === grnResult.totalValue);

        if (lastTx.description.includes("GRN") && entry) {
            console.log("   -> GL Check PASS");
        } else {
            console.error("   -> GL Check FAIL");
            process.exit(1);
        }

        console.log("\n🎉 Procurement Flow Test Completed!");
        process.exit(0);

    } catch (e: any) {
        console.error("\n❌ Procurement Flow Test Failed:", e);
        process.exit(1);
    }
}

runProcurementTest();
