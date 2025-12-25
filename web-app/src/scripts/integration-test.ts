
import { z } from "zod";
import { InventoryService } from "../services/inventory-service";
import { CrmService } from "../services/crm-service";
import { SalesService } from "../services/sales-service";
import { SettingsService } from "../services/settings-service";
import { FinanceService } from "../services/finance-service";
import { createItemSchema } from "../lib/dtos/inventory-dtos";
import { createContactSchema } from "../lib/dtos/crm-dtos";
import { createQuoteSchema, convertQuoteSchema } from "../lib/dtos/sales-dtos";

async function runIntegrationTest() {
    console.log("🚀 Starting Integration Test: Sales & Financials");

    try {
        // 1. Setup Data
        console.log("\n--- 1. Setting up Data ---");

        // Get Valid User
        const db = await import("../db").then(m => m.getDb());
        const { users } = await import("../db/schema");
        let user = await db.query.users.findFirst();

        if (!user) {
            console.log("Creating Test User...");
            [user] = await db.insert(users).values({
                name: "Test Admin",
                email: "admin@test.com",
                passwordHash: "mock",
                role: "ADMIN",
                createdAt: new Date()
            }).returning();
        }
        const userId = user.id;
        console.log("✅ Using User:", userId);

        // Create Outlet
        const [outlet] = await SettingsService.createOutlet({
            name: "Test Outlet " + Date.now(),
            address: "Test Address",
            loyaltyEarningRate: "0.1",
            loyaltyRedemptionRate: "1.0"
        });
        console.log("✅ Created Outlet:", outlet.name);

        // Create Item
        const itemInput = {
            name: "Test Widget " + Date.now(),
            price: 100,
            costPrice: 50,
            category: "General",
            itemType: "RESALE" as const,
            quantity: 50,
            minStockLevel: 10
        };
        const itemData = createItemSchema.parse(itemInput);
        const item = await InventoryService.createItem(itemData);
        console.log("✅ Created Item:", item.name);

        // Add Initial Stock
        await InventoryService.adjustStock({
            itemId: item.id,
            outletId: outlet.id,
            quantityChange: 50,
            reason: "OTHER",
            notes: "Initial Stock"
        }, userId);
        console.log("✅ Added Initial Stock: 50");

        // Create Customer
        const customerInput = {
            name: "Test Customer " + Date.now(),
            email: `test${Date.now()}@example.com`,
            type: "CUSTOMER" as const
        };
        const customerData = createContactSchema.parse(customerInput);
        const customer = await CrmService.createContact(customerData);
        console.log("✅ Created Customer:", customer.name);

        // 2. Create Quote
        console.log("\n--- 2. Creating Quote ---");
        const quoteInput = {
            contactId: customer.id,
            customerName: customer.name,
            items: [{
                itemId: item.id,
                itemName: item.name,
                quantity: 2,
                unitPrice: 100
            }],
            validUntil: new Date(Date.now() + 86400000), // Tomorrow
            deliveryMethod: "PICKUP" as const
        };
        const quoteData = createQuoteSchema.parse(quoteInput);

        const { quote } = await SalesService.createQuote(quoteData, userId, outlet.id);
        console.log("✅ Created Quote:", quote.id);

        // Accept Quote
        await SalesService.updateQuoteStatus(quote.id, "ACCEPTED");
        console.log("✅ Accepted Quote");

        // 3. Convert to Sale
        console.log("\n--- 3. Converting to Sale (The Big Test) ---");
        // Service only supports Wallet/Credit conversion logic currently, ignoring explicit cash params.
        const convertInput = {
            // No params needed for basic Credit/AR conversion
        };

        const conversionData = convertQuoteSchema.parse(convertInput);

        const sale = await SalesService.convertQuoteToSale(quote.id, conversionData, userId, outlet.id);
        console.log("✅ Converted to Sale:", sale.id);

        // 4. Verification
        console.log("\n--- 4. Verification ---");

        // Inventory
        const { inventory, loyaltyLogs } = await import("../db/schema");
        const { eq, desc, and } = await import("drizzle-orm");

        const stock = await db.query.inventory.findFirst({
            where: and(eq(inventory.itemId, item.id), eq(inventory.outletId, outlet.id))
        });
        console.log(`📦 Stock Level: ${stock?.quantity} (Expected: 48)`);

        // Loyalty
        const log = await db.query.loyaltyLogs.findFirst({
            where: eq(loyaltyLogs.contactId, customer.id),
            orderBy: [desc(loyaltyLogs.createdAt)]
        });
        console.log(`💎 Loyalty Points: ${log?.points} (Expected: ~20 based on 0.1 rate * 200)`);

        // GL
        const txs = await FinanceService.getTransactions(1, 1);
        const latestTx = txs.data[0];
        console.log(`💰 Latest GL Transaction: ${latestTx?.description || "None"}`);

        console.log("\n🎉 Integration Test Completed Successfully!");
        process.exit(0);

    } catch (e: any) {
        console.error("\n❌ Integration Test Failed:", e);
        process.exit(1);
    }
}

runIntegrationTest();
