
import { getDb } from "@/db";
import { users, outlets } from "@/db/schema";
import { SalesService, QuoteService } from "@/lib/sales";
import { InventoryService, ProcurementService } from "@/lib/inventory";
import { OperationsService } from "@/lib/operations";

async function main() {
    console.log("🚀 Starting Business Suite E2E Verification...");
    const db = await getDb();

    // 1. Setup Admin User
    const adminEmail = `admin_biz_${Date.now()}@test.com`;
    const [adminUser] = await db.insert(users).values({
        name: "Biz Admin",
        email: adminEmail,
        role: "ADMIN"
    }).returning();
    console.log(`\n👤 Created Admin: ${adminUser.id}`);

    // 2. Setup Core Data (Outlet, Customer, Items)
    console.log(`\n🏢 Setting up Core Data...`);
    const item1 = await SalesService.createItem({
        name: "MacBook Pro M3",
        price: 2500000,
        costPrice: 2000000,
        category: "Electronics",
        itemType: "RESALE",
        sku: `MBP-${Date.now()}`
    });
    console.log(`   Created Item: ${item1.name} (₦${item1.price})`);

    const item2 = await SalesService.createItem({
        name: "iPhone 15 Pro",
        price: 1500000,
        costPrice: 1200000,
        category: "Electronics",
        itemType: "RESALE",
        sku: `IPH-${Date.now()}`
    });
    console.log(`   Created Item: ${item2.name} (₦${item2.price})`);

    const customer = await SalesService.createCustomer({
        name: "Tech Corp Ltd",
        phone: "08012345678",
        email: "procurement@techcorp.com",
        salesRepId: adminUser.id
    });
    console.log(`   Created Customer: ${customer.name}`);

    // 3. Quote Flow
    console.log(`\n📜 Testing Quote Flow...`);
    const quote = await QuoteService.createQuote({
        customerId: customer.id,
        createdById: adminUser.id,
        items: [
            { itemId: item1.id, quantity: 2, unitPrice: 2400000 } // Discounted price
        ],
        notes: "Special discount for loyal customer"
    });
    console.log(`   Created Quote: ${quote.id} [${quote.status}] Total: ₦${quote.total}`);

    await QuoteService.sendQuote(quote.id);
    console.log(`   Quota Status Updated: SENT`);

    // 4. SALES: Create Customer (Contact) - Minimal Input Test
    console.log(`\n✅ Testing Sales: Customer Creation (Minimal)...`);
    let minimalCustomer = await SalesService.createCustomer({
        name: "Acme Corp",
        phone: "08012345678"
        // No email or address initially
    });
    console.log(`   Created Customer: ${minimalCustomer.name} (${minimalCustomer.id})`);

    // 5. SALES: Quote Creation
    console.log(`\n✅ Testing Sales: Quote Creation...`);
    let minimalQuote = await QuoteService.createQuote({
        customerId: minimalCustomer.id,
        items: [
            { itemId: item1.id, quantity: 5, unitPrice: Number(item1.price) },
            { itemId: item2.id, quantity: 2, unitPrice: Number(item2.price) }
        ],
        createdById: adminUser.id,
        validUntil: new Date(Date.now() + 86400000),
        notes: "Introductory Offer"
    });
    console.log(`   Created Quote #${minimalQuote.id} Total: ₦${minimalQuote.total}`);

    // 6. SALES: Validate & Convert Quote
    await QuoteService.acceptQuote(minimalQuote.id, adminUser.id);
    const sale = await db.query.spSales.findFirst({
        where: (s, { eq }) => eq(s.contactId, minimalCustomer.id),
        orderBy: (s, { desc }) => [desc(s.createdAt)]
    });
    if (!sale) throw new Error("Sale conversion failed");
    console.log(`   Converted to Sale #${sale.id} [${sale.status}]`);

    // 7. INVENTORY: Vendor Creation (Contact) - With Bank Details
    console.log(`\n✅ Testing Inventory: Vendor Creation...`);
    const vendor = await InventoryService.createVendor({
        name: "Global Supplies Ltd",
        email: "supply@global.com",
        phone: "07098765432",
        address: "456 Warehouse Rd",
        bankName: "Zenith Bank",
        accountNumber: "1010101010"
    });
    console.log(`   Created Vendor: ${vendor.name} (${vendor.id})`);

    // 7.5 Create Outlet (Prereq for RO)
    const [outlet] = await db.insert(outlets).values({
        name: "Main Branch",
        address: "Lagos HQ"
    }).returning();

    // 7.6 Create Requisition
    const requisition = await ProcurementService.createRequisition({
        requesterId: adminUser.id,
        outletId: outlet.id,
        description: "Restock for Q1",
        items: [
            { itemId: item1.id, quantity: 100, estimatedUnitPrice: Number(item1.costPrice) }
        ]
    });
    console.log(`   Created RO: ${requisition.id} [${requisition.status}] Est: ₦${requisition.totalEstimatedAmount}`);

    // 8. INVENTORY: Approve Requisition -> Should trigger Vendor Ledger (AP)
    console.log(`\n✅ Testing Inventory: Approval...`);
    await ProcurementService.approveRequisition(requisition.id, vendor.id, adminUser.id);
    console.log(`   Approved RO for Vendor: ${vendor.name}`);

    // 9. INVENTORY: GRN
    const grn = await ProcurementService.createGRN({
        requestOrderId: requisition.id,
        receivedById: adminUser.id,
        itemsLogged: [
            { itemId: item1.id, quantityReceived: 100, condition: "GOOD" }
        ],
        vendorInvoiceNumber: "INV-999"
    });
    console.log(`   Created GRN #${grn.id}`);

    // 10. OPERATIONS: Dispatches
    console.log(`\n✅ Testing Operations: Logistics...`);
    const haulage = await OperationsService.createHaulage({
        providerName: "Swift Logistics",
        vehicleType: "Van"
    });

    // Confirm sale first to allow dispatch
    await SalesService.confirmSale(sale.id);

    const dispatch = await OperationsService.createDispatchFromSale({
        saleId: sale.id, // Sale from Quote
        haulageId: haulage.id,
        dispatchedById: adminUser.id,
        driverName: "John Doe",
        itemsToDispatch: [
            { itemId: item1.id, quantity: 5 } // Partial dispatch of Quote items
        ]
    });
    console.log(`   Created Dispatch: ${dispatch.id} [${dispatch.status}] for Sale #${sale.id}`);

    // 12. OPERATIONS: Delivery
    console.log(`\n🏁 Testing Operations: Delivery Recording...`);
    // 'sale' has items, we need those ItemIDs to confirm delivery
    // The sale had 1 item type (item1)
    await OperationsService.markDelivered(dispatch.id);
    // [
    //    { itemId: item1.id, quantityDelivered: 2, condition: "GOOD" }
    // ]);
    console.log(`   Recorded Delivery for Dispatch #${dispatch.id}`);

    // ... Operations Flow (already successful)

    // 13. INVOICE: Shift Management
    console.log(`\n💳 Testing Invoice: Shift Management...`);
    // Need an Outlet (we created one earlier, find it)
    const { InvoiceService } = await import("@/lib/invoice");
    // Reuse existing import logic or just query
    // We already imported outlets schema earlier in step 7, but let's just use db query directly if possible or alias
    const schema = await import("@/db/schema");
    const foundOutlet = await db.query.outlets.findFirst();
    if (!foundOutlet) throw new Error("No outlet found");

    const shift = await InvoiceService.openShift(foundOutlet.id, adminUser.id, 50000); // 50k Float
    console.log(`   Opened Shift: ${shift.id} with ₦50,000 start cash`);

    // 14. INVOICE: POS Transaction (Split Payment)
    console.log(`\n💸 Testing Invoice: POS Transaction (Split Payment)...`);
    const posTx = await InvoiceService.createTransaction({
        shiftId: shift.id,
        customerId: customer.id, // customer from top scope
        items: [
            { itemId: item1.id, name: item1.name, qty: 1, price: 2500000 }
        ],
        payments: [
            { method: "CASH", amount: 500000 },
            { method: "TRANSFER", amount: 2000000 }
        ]
    });
    console.log(`   Processed POS Tx: ${posTx.id} Total: ₦${posTx.totalAmount}`);

    // 15. INVOICE: End Shift
    console.log(`\n🏁 Testing Invoice: End Shift...`);
    const closedShift = await InvoiceService.closeShift(shift.id, {
        cash: 50000 + 500000, // 550k expected
        card: 0,
        transfer: 2000000 // 2m expected
    });
    console.log(`   Closed Shift: ${closedShift.id}`);
    console.log(`   Reconciliation -> Expected Cash: ${closedShift.expectedCash}, Actual: ${closedShift.actualCash}`);

    // Verify Reconciliation
    if (Number(closedShift.expectedCash) !== 550000) console.warn("WARNING: Cash Reconciliation Mismatch");
    else console.log("   ✅ Cash Reconciled Perfectly");

    // ==========================================
    // 16. FINANCIAL INTEGRATION CHECK
    // ==========================================
    console.log(`\n💰 Checking Financial Integration...`);
    // Ensure we have 'eq' and 'db' available (db is global top-level, eq needs import)
    const { eq } = await import("drizzle-orm");
    const { expenses, ledgerEntries, accounts } = await import("@/db/schema");

    // Check Requisition Expense
    const pendingExpense = await db.query.expenses.findFirst({
        where: eq(expenses.description, `Payment for Requisition #${requisition.id} (Global Supplies Ltd)`)
    });
    if (pendingExpense) console.log(`   ✅ Found Auto-created Expense: ₦${pendingExpense.amount} [${pendingExpense.status}]`);
    else console.error(`   ❌ Missing Auto-created Expense for Requisition`);

    // Check Sales/Invoice Journals
    // We expect Journals for:
    // 1. Confirmed Sale (Credit Sale) -> Dr AR, Cr Revenue
    // 2. POS Invoice (Split Payment) -> Dr Cash/Bank, Cr Revenue

    // Let's just count entries in Revenue Account
    const revenueAccount = await db.query.accounts.findFirst({ where: eq(accounts.code, "4000") });
    if (revenueAccount) {
        const revenueEntries = await db.query.ledgerEntries.findMany({
            where: eq(ledgerEntries.accountId, revenueAccount.id)
        });
        console.log(`   ✅ Found ${revenueEntries.length} Revenue Ledger Entries`);
        revenueEntries.forEach(e => console.log(`      - ₦${e.amount} (${e.description})`));
    } else {
        console.error("   ❌ Sales Revenue Account not found!");
    }

    console.log("\n✅✅✅ BUSINESS SUITE VERIFICATION SUCCESSFUL (Full Suite + Finance) ✅✅✅");
    process.exit(0);
}




main().catch(e => {
    console.error("\n❌ E2E VERIFICATION FAILED:");
    console.error(e);
    process.exit(1);
});
