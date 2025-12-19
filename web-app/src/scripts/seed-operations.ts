
import { liveDb } from "../db";
import { contacts, spSales, spSaleItems, users, items, dispatches, haulage } from "../db/schema";
import { eq } from "drizzle-orm";

async function main() {
    console.log("🚚 Seeding Operations Data...");

    // 1. Get Admin User for tracking
    const admin = await liveDb.query.users.findFirst();
    if (!admin) throw new Error("No user found. Seed users first.");

    // 2. Get a Customer (create if missing)
    let customer = await liveDb.query.contacts.findFirst({ where: (c, { eq }) => eq(c.type, "CUSTOMER") });
    if (!customer) {
        console.log("- Creating Default Customer");
        [customer] = await liveDb.insert(contacts).values({
            name: "Logistics Client Ltd",
            phone: "080-LOGISTICS",
            type: "CUSTOMER"
        }).returning();
    }

    // 3. Get Items
    const itemList = await liveDb.query.items.findMany({ limit: 2 });
    if (itemList.length === 0) throw new Error("No items found. Seed inventory first.");

    // 4. Create a Confirmed Sale (Simulate conversion)
    console.log(`- Creating Verified Sale for ${customer.name}`);
    const [sale] = await liveDb.insert(spSales).values({
        contactId: customer.id,
        customerName: customer.name, // Denormalized field required
        saleDate: new Date(),
        subtotal: "50000",
        total: "50000",
        status: "CONFIRMED",
        createdById: admin.id,
        notes: "Urgent Delivery Required"
    }).returning();

    // 5. Create Dispatch Entry (Simulate Auto-Creation)
    console.log(`- Creating Pending Dispatch for Sale #${sale.id}`);
    await liveDb.insert(dispatches).values({
        salesId: sale.id,
        contactId: customer.id,
        deliveryAddress: "42 Marina Road, Lagos Island",
        status: "PENDING",
        dispatchDate: new Date(),
        notes: "Fragile items, handle with care."
    });

    // 6. Create Haulage Provider
    console.log("- Ensuring Haulage Provider exists");
    const providerName = "Red Star Logistics";
    const existingProvider = await liveDb.query.haulage.findFirst({ where: (h, { eq }) => eq(h.providerName, providerName) });

    if (!existingProvider) {
        await liveDb.insert(haulage).values({
            providerName: "Red Star Logistics",
            contactPerson: "Mr. Driver",
            phone: "080-TRUCK-01",
            vehicleType: "Van",
            status: "ACTIVE"
        });
    }

    console.log("✅ Operations Data Seeded. Check '/dashboard/business/operations'.");
    process.exit(0);
}

main();
