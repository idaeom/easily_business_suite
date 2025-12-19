
import { liveDb } from "../db";
import { sql } from "drizzle-orm";
import {
    createItem,
    createRequisition,
    updateRequisitionStatus,
    createGrn,
    getRequisitions,
    getItems,
    getOutlets
} from "../actions/inventory";
import { items } from "../db/schema";
import { eq } from "drizzle-orm";

async function main() {
    console.log("📦 Verifying Inventory Flow...");

    // 1. Setup Data
    console.log("- Creating Test Item...");
    await createItem({
        name: "Test Widget " + Date.now(),
        price: 100,
        costPrice: 50,
        category: "Test",
        itemType: "RESALE",
        minStockLevel: 10
    });

    const [item] = await getItems("RESALE");
    console.log(`  Created Item: ${item.name} (Qty: ${item.quantity})`);

    const outlets = await getOutlets();
    const outletId = outlets[0].id; // Default created by action if missing

    // 2. Create Requisition
    console.log("- Creating Requisition...");
    const reqResult = await createRequisition({
        outletId,
        description: "Test Restock",
        items: [{ itemId: item.id, quantity: 50, estimatedPrice: 50 }]
    });

    if (!reqResult.success) throw new Error("Failed to create requisition");
    const reqId = (reqResult as any).id;
    console.log(`  Req ID: ${reqId}`);

    // 3. Approve
    console.log("- Approving Requisition...");
    await updateRequisitionStatus(reqId, "APPROVED_FOR_PAYMENT");

    // 4. Create GRN (Receive Goods)
    console.log("- Processing GRN...");
    await createGrn({
        requestOrderId: reqId,
        vendorInvoiceNumber: "INV-123",
        items: [{ itemId: item.id, quantityReceived: 50, condition: "GOOD" }]
    });

    // 5. Verify Stock
    console.log("- Verifying Stock Update...");
    const [updatedItem] = await liveDb.select().from(items).where(eq(items.id, item.id));

    console.log(`  Old Qty: ${item.quantity}`);
    console.log(`  New Qty: ${updatedItem.quantity}`);

    if (updatedItem.quantity === item.quantity + 50) {
        console.log("✅ Stock Updated Successfully!");
    } else {
        console.error("❌ Stock Mismatch!");
        process.exit(1);
    }

    process.exit(0);
}

main();
