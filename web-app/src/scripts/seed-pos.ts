
import { liveDb } from "../db";
import { items, users } from "../db/schema";
import { eq } from "drizzle-orm";

async function main() {
    console.log("🧾 Seeding POS Data...");

    // 1. Ensure Items (Resale)
    const products = [
        { name: "Wireless Mouse", price: "5000", cost: "3000", qty: 20 },
        { name: "Mechanical Keyboard", price: "25000", cost: "18000", qty: 10 },
        { name: "USB-C Cable", price: "2000", cost: "800", qty: 50 },
        { name: "Monitor 24 inch", price: "85000", cost: "70000", qty: 5 },
        { name: "Laptop Stand", price: "12000", cost: "8000", qty: 0 } // Sold out item
    ];

    for (const p of products) {
        const existing = await liveDb.query.items.findFirst({
            where: (t, { eq }) => eq(t.name, p.name)
        });

        if (!existing) {
            await liveDb.insert(items).values([{
                name: p.name,
                itemType: "RESALE",
                price: p.price,
                costPrice: p.cost, // Assuming p.costPrice should be p.cost based on products array
                category: "Electronics", // Assuming p.category should be "Electronics" as it's not in products array
                sku: `POS-${Math.floor(Math.random() * 1000)}` // Assuming p.sku should be generated as it's not in products array
            }]);
            console.log(`Created: ${p.name}`);
        } else {
            // Ensure it's RESALE for the grid
            if (existing.itemType !== "RESALE") {
                await liveDb.update(items).set({ itemType: "RESALE" }).where(eq(items.id, existing.id));
                console.log(`~ Updated ${p.name} to RESALE type`);
            }
        }
    }

    console.log("✅ POS Data Seeded. Ready for Grid Test.");
    process.exit(0);
}

main();
