
import { getDb } from "../db";
import { contacts, accounts, spQuotes, spQuoteItems, spSales, spSaleItems, salesTaxes, transactions, ledgerEntries, items } from "../db/schema";
import { convertQuoteToSale, createQuote, updateQuoteStatus } from "../actions/sales";
import { eq, and } from "drizzle-orm";

async function main() {
    console.log("Starting Verification of Sales Tax GL Posting...");
    const db = await getDb();

    // 0. Ensure VAT Tax Exists
    let vatTax = await db.query.salesTaxes.findFirst({ where: eq(salesTaxes.name, "VAT") });
    if (!vatTax) {
        const [newTax] = await db.insert(salesTaxes).values({
            name: "VAT",
            rate: "7.5",
            type: "EXCLUSIVE",
            isEnabled: true
        }).returning();
        vatTax = newTax;
    }
    console.log(`Using Tax: ${vatTax.name} (${vatTax.rate}%)`);

    // 1. Create Quote with Taxable Item
    const phone = "09011223344";
    let contact = await db.query.contacts.findFirst({ where: eq(contacts.phone, phone) });
    if (!contact) {
        const [newC] = await db.insert(contacts).values([{ name: "Tax Test Customer", phone, type: "CUSTOMER" }]).returning();
        contact = newC;
    }

    // 1.5 Ensure Item Exists
    let item = await db.query.items.findFirst({ where: eq(items.name, "Taxable Service") });
    if (!item) {
        const [newItem] = await db.insert(items).values({
            name: "Taxable Service",
            price: "1000",
            costPrice: "500",
            category: "SERVICES",
            itemType: "SERVICE"
        }).returning();
        item = newItem;
    }

    // Amount = 1000. Tax = 75. Total = 1075.
    const createRes = await createQuote({
        contactId: contact.id,
        customerName: contact.name,
        items: [{ itemId: item.id, itemName: item.name, quantity: 1, unitPrice: 1000 }]
    });

    const quoteId = createRes.quoteId!;
    console.log(`Created Quote: ${quoteId}`);

    // 2. Accept Quote
    await updateQuoteStatus(quoteId, "ACCEPTED");

    // 3. Convert to Sale
    const saleRes = await convertQuoteToSale(quoteId);
    console.log(`Converted to Sale: ${saleRes.saleId}`);

    // 4. Verify GL
    const sale = await db.query.spSales.findFirst({ where: eq(spSales.id, saleRes.saleId!) });

    // Find GL Transaction
    const glTx = await db.query.transactions.findFirst({
        where: eq(transactions.metadata, { type: "SALE", saleId: sale!.id }),
        with: { entries: { with: { account: true } } }
    });

    if (glTx) {
        console.log("\nGL Entries Generated:");
        glTx.entries.forEach(e => console.log(` - ${e.direction} ${e.amount} -> ${e.account.name} (Code: ${e.account.code})`));

        const revenueEntry = glTx.entries.find(e => e.direction === "CREDIT" && e.account.type === "INCOME");
        const taxEntry = glTx.entries.find(e => e.direction === "CREDIT" && e.account.type === "LIABILITY" && (e.account.code === "2350" || e.account.name.includes("VAT")));
        const arEntry = glTx.entries.find(e => e.direction === "DEBIT");

        if (revenueEntry && taxEntry && arEntry) {
            console.log("SUCCESS: GL Split is Correct!");
            console.log(` - Revenue: ${revenueEntry.amount} (Expected 1000)`);
            console.log(` - Tax: ${taxEntry.amount} (Expected 75)`);

            if (Number(revenueEntry.amount) === 1000 && Number(taxEntry.amount) === 75) {
                console.log(" - Amounts Match Perfectly.");
            } else {
                console.error(" - Amounts Mismatch!");
            }
        } else {
            console.error("FAILURE: Missing expected GL entries.");
            if (!taxEntry) console.error(" - Missing Tax Credit Entry (VAT Output)");
        }
    } else {
        console.error("FAILURE: No GL Transaction found.");
    }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
