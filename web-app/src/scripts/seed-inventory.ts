
import { liveDb } from "../db";
import { items, contacts, outlets, requestOrders, requestOrderItems } from "../db/schema";
import { eq } from "drizzle-orm";

async function main() {
    console.log("🌱 Seeding Inventory Data...");

    // 1. Create Default Outlet
    let [outlet] = await liveDb.select().from(outlets).limit(1);
    if (!outlet) {
        console.log("- Creating Main Warehouse Outlet...");
        [outlet] = await liveDb.insert(outlets).values({
            name: "Main Warehouse",
            address: "123 Business Park, Lagos",
            phone: "080-123-4567"
        }).returning();
    } else {
        console.log("- Outlet exists.");
    }

    // 2. Create Vendors
    const vendorData = [
        { name: "Global Suppliers Ltd", bank: "GTBank", acct: "0123456789" },
        { name: "Tech Distro Inc", bank: "Zenith Bank", acct: "9876543210" }
    ];

    for (const v of vendorData) {
        // Simple check by name to avoid dupes in seed
        // (Real app uses ID, but for seed name is fine)
        // Actually, contacts table doesn't enforce unique name, so let's just insert if we want.
        // Or check count using SQL (simplified).
        console.log(`- Ensuring Vendor: ${v.name}`);
        const existing = await liveDb.query.contacts.findFirst({ where: (c, { eq }) => eq(c.name, v.name) });

        if (!existing) {
            await liveDb.insert(contacts).values({
                name: v.name,
                type: "VENDOR",
                bankName: v.bank,
                accountNumber: v.acct,
                status: "ACTIVE"
            });
        }
    }

    // 3. Create Items
    const itemData = [
        { name: "MacBook Pro M3", price: 2500000, cost: 2200000, type: "RESALE", cat: "Electronics", qty: 5 },
        { name: "Office Desk Chair", price: 150000, cost: 85000, type: "INTERNAL_USE", cat: "Furniture", qty: 10 },
        { name: "iPhone 15 Pro", price: 1800000, cost: 1600000, type: "RESALE", cat: "Electronics", qty: 2 }
    ];

    for (const i of itemData) {
        console.log(`- Ensuring Item: ${i.name}`);
        const existing = await liveDb.query.items.findFirst({ where: (t, { eq }) => eq(t.name, i.name) });

        if (!existing) {
            await liveDb.insert(items).values({
                name: i.name,
                price: i.price.toString(),
                costPrice: i.cost.toString(),
                itemType: i.type as any,
                category: i.cat,
                quantity: i.qty.toString(),
                sku: `SKU-${Math.floor(Math.random() * 10000)}`
            });
        }
    }

    console.log("✅ Seeding Complete. Inventory ready for testing.");
    process.exit(0);
}

main();
