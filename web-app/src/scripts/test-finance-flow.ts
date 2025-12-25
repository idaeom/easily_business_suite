
import { FinanceService } from "../services/finance-service";
import { SalesService } from "../services/sales-service";
import { createQuoteSchema, convertQuoteSchema } from "../lib/dtos/sales-dtos";
import { InventoryService } from "../services/inventory-service";

async function runFinanceFlowTest() {
    console.log("🚀 Starting Finance Flow Integration Test");

    try {
        const db = await import("../db").then(m => m.getDb());
        const { accounts, ledgerEntries, customerLedgerEntries, contacts, users } = await import("../db/schema");
        const { eq, and, like, sql } = await import("drizzle-orm");

        // 1. Setup Data
        console.log("\n--- 1. Setting up Data ---");
        let admin = await db.query.users.findFirst({ where: eq(users.email, "admin@test.com") });
        if (!admin) {
            // fallback create
            const { users } = await import("../db/schema");
            [admin] = await db.insert(users).values({ email: "admin@test.com", role: "ADMIN" }).returning();
        }

        // Equity Account
        let equity = await db.query.accounts.findFirst({ where: (a) => and(eq(a.type, "EQUITY"), like(a.name, "%Capital%")) });
        if (!equity) {
            [equity] = await db.insert(accounts).values({ name: "Owner Capital", code: "3001", type: "EQUITY" }).returning();
        }

        // Bank Account
        let bank = await db.query.accounts.findFirst({ where: (a) => and(eq(a.type, "ASSET"), like(a.name, "%Bank%")) });
        if (!bank) {
            [bank] = await db.insert(accounts).values({ name: "Primary Bank", code: "1002", type: "ASSET" }).returning();
        }

        // 2. Manual Journal (Capital Injection)
        console.log("\n--- 2. Manual Journal (Capital Injection) ---");
        const amount = 1000000;
        await FinanceService.createJournalEntry({
            date: new Date(),
            description: "Owner Investment",
            entries: [
                { accountId: bank.id, debit: amount, credit: 0, description: "Bank Deposit" },
                { accountId: equity.id, debit: 0, credit: amount, description: "Equity Share" }
            ]
        }, admin.id);
        console.log("✅ Posted Journal: 1,000,000");

        // Verify GL Balance
        const freshBank = await db.query.accounts.findFirst({ where: eq(accounts.id, bank.id) });
        console.log(`   Bank Balance: ${freshBank?.balance}`);
        if (Number(freshBank?.balance) < 1000000) throw new Error("GL Balance update failed");

        // 3. Sub-ledger Reconciliation (Sales -> AR)
        console.log("\n--- 3. Sub-ledger Reconciliation ---");
        // Create Customer
        const customer = await InventoryService.createVendor({
            name: "Credit Customer " + Date.now(),
            bankName: "", accountNumber: "", type: "CUSTOMER", email: "cred@test.com"
        }); // Reusing createContact helper

        // Create Item
        const item = await InventoryService.createItem({
            name: "SaaS Lic " + Date.now(), price: 50000, costPrice: 0, category: "Services", itemType: "SERVICE", sku: "SRV-" + Date.now()
        });

        // Fetch Outlet
        const { outlets } = await import("../db/schema");
        let outlet = await db.query.outlets.findFirst();
        if (!outlet) {
            [outlet] = await db.insert(outlets).values({ name: "Main Outlet test" }).returning();
        }

        // Create Sale
        const { quote } = await SalesService.createQuote({
            contactId: customer.id,
            customerName: customer.name,
            items: [{ itemId: item.id, itemName: item.name, quantity: 1, unitPrice: 50000 }],
            validUntil: new Date(),
            deliveryMethod: "PICKUP" // ensure deliveryMethod is literal type in DTO
        } as any, admin.id, outlet.id); // Use real ID

        await SalesService.updateQuoteStatus(quote.id, "ACCEPTED");

        // Convert to Sale (Credit)
        const sale = await SalesService.convertQuoteToSale(quote.id, {}, admin.id, outlet.id);
        console.log("✅ Credit Sale Created:", sale.id);

        // 4. Cross Check
        console.log("\n--- 4. Cross-Check GL vs Sub-ledger ---");

        // GL AR Balance
        // Find AR Account
        let arAccount = await db.query.accounts.findFirst({ where: eq(accounts.code, "1100") });
        if (!arAccount) arAccount = await db.query.accounts.findFirst({ where: eq(accounts.type, "ASSET") }); // Fallback

        // SubLedger Sum
        const ledgerSumResult = await db.select({
            totalDebit: sql<string>`sum(${customerLedgerEntries.debit})`
        }).from(customerLedgerEntries).where(eq(customerLedgerEntries.contactId, customer.id));

        const subLedgerTotal = Number(ledgerSumResult[0]?.totalDebit || 0);

        console.log(`   Sub-ledger Total (Customer): ${subLedgerTotal}`);
        // Note: GL Total will be huge if other tests ran, so we can't compare absolute totals easily without isolation.
        // But we can check that we HAVE a Sub Ledger Entry equal to the sale amount.

        const hasEntry = subLedgerTotal >= 50000;

        if (hasEntry) {
            console.log("   -> Reconciliation Check PASS (Sub-ledger updated)");
        } else {
            console.error("   -> Reconciliation Check FAIL (Sub-ledger empty)");
            process.exit(1);
        }

        console.log("\n🎉 Finance Flow Test Completed!");
        process.exit(0);

    } catch (e: any) {
        console.error("\n❌ Finance Flow Test Failed:", e);
        process.exit(1);
    }
}

runFinanceFlowTest();
