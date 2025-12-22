
import { getDb } from "../db";
import { contacts, items, spQuotes, spQuoteItems, spSales, transactions, ledgerEntries, accounts } from "../db/schema";
import { convertQuoteToSale } from "../actions/sales";
import { eq, desc } from "drizzle-orm";

async function main() {
    console.log("Starting Verification of Split GL Logic...");
    const db = await getDb();

    // 0. Fetch a Valid User for FKs
    const user = await db.query.users.findFirst();
    if (!user) {
        console.error("No users found in DB. Cannot run test.");
        process.exit(1);
    }
    const userId = user.id;

    // 0.5. Ensure Customer Deposits Account (2300) Exists
    let depositAccount = await db.query.accounts.findFirst({ where: eq(accounts.code, "2300") });
    if (!depositAccount) {
        console.log("Creating missing Customer Deposits account...");
        const [acc] = await db.insert(accounts).values([{
            code: "2300",
            name: "Customer Deposits",
            type: "LIABILITY",
            description: "Prepaid funds from customers",
            currency: "NGN",
            balance: "0"
        }]).returning();
        depositAccount = acc;
    }

    // 1. Setup Test Customer with specific Wallet Balance
    const phone = "09988776655";
    let contact = await db.query.contacts.findFirst({ where: eq(contacts.phone, phone) });

    if (!contact) {
        // Create
        const [newContact] = await db.insert(contacts).values([{
            name: "Split GL Test Customer",
            phone: phone,
            type: "CUSTOMER",
            walletBalance: "500", // PRE-FUNDED 500
            salesRepId: userId // Valid User ID
        }]).returning();
        contact = newContact;
    } else {
        // Reset Wallet to 500
        await db.update(contacts)
            .set({ walletBalance: "500" })
            .where(eq(contacts.id, contact.id));
        contact = await db.query.contacts.findFirst({ where: eq(contacts.id, contact.id) });
    }

    console.log(`Customer Prepared: ${contact!.name}, Wallet Balance: ${contact!.walletBalance}`);

    // 2. Setup Item (Price 1000)
    let item = await db.query.items.findFirst({ where: eq(items.name, "Split Test Item") });
    if (!item) {
        const [newItem] = await db.insert(items).values([{
            name: "Split Test Item",
            price: "1000",
            costPrice: "800",
            category: "General",
            itemType: "RESALE",
            stockQuantity: "100"
        }]).returning();
        item = newItem;
    }

    // 3. Create Quote for 1000
    const [quote] = await db.insert(spQuotes).values([{
        contactId: contact!.id,
        customerName: contact!.name,
        quoteDate: new Date(),
        subtotal: "1000",
        total: "1000",
        status: "ACCEPTED",
        createdById: userId // Valid User ID
    }]).returning();

    // Insert Item
    await db.insert(spQuoteItems).values([{
        quoteId: quote.id,
        itemId: item!.id,
        itemName: item!.name,
        quantity: "1",
        unitPrice: "1000",
        total: "1000"
    }]);

    console.log(`Quote Created: ${quote.id}. Total: 1000. Customer Balance: 500.`);
    console.log("EXPECTATION: \n - Debit Customer Deposits (Liability): 500\n - Debit Accounts Receivable (Asset): 500\n - Credit Revenue: 1000");

    // 4. Convert
    // Note: This relies on IS_SCRIPT=true bypassing auth middleware in other parts of app, but here we just call helper?
    // Actually the helper uses getAuthenticatedUser.

    try {
        const result = await convertQuoteToSale(quote.id);
        console.log("Conversion Result:", result);

        // 5. Verify GL
        const saleId = result.saleId;
        const tx = await db.query.transactions.findFirst({
            where: eq(transactions.reference, saleId),
            with: { entries: { with: { account: true } } }
        });

        if (tx) {
            console.log("GL Entries:");
            tx.entries.forEach(e => {
                console.log(` - ${e.direction} ${e.amount} -> ${e.account.name} (${e.account.type})`);
            });

            // Assertions
            const liabilityDebit = tx.entries.find(e => e.direction === "DEBIT" && e.account.type === "LIABILITY");
            const assetDebit = tx.entries.find(e => e.direction === "DEBIT" && e.account.type === "ASSET");

            if (liabilityDebit && assetDebit) {
                console.log("SUCCESS: Transaction Split Correctly!");
                console.log(` - Liability Debit Amount: ${liabilityDebit.amount}`);
                console.log(` - Asset Debit Amount: ${assetDebit.amount}`);
            } else {
                console.error("FAILURE: Transaction NOT Split correctly.");
            }

        } else {
            console.error("No Transaction Found");
        }

    } catch (e) {
        console.error("Execution failed:", e);
    }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
