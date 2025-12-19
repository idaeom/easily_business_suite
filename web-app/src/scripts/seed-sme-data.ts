
import { getDb } from "../db";
import { accounts, expenseCategories } from "../db/schema";
import { eq } from "drizzle-orm";

const STANDARD_ACCOUNTS = [
    // Assets
    { name: "Cash on Hand", code: "1001", type: "ASSET", description: "Petty cash and physical currency" },
    { name: "Bank Account (Main)", code: "1002", type: "ASSET", description: "Primary operating bank account" },
    { name: "Accounts Receivable", code: "1100", type: "ASSET", description: "Money owed by customers" },
    { name: "Inventory", code: "1200", type: "ASSET", description: "Stock of goods for sale" },
    { name: "Office Equipment", code: "1500", type: "ASSET", description: "Computers, furniture, etc." },

    // Liabilities
    { name: "Accounts Payable", code: "2000", type: "LIABILITY", description: "Money owed to suppliers" },
    { name: "Credit Card", code: "2010", type: "LIABILITY", description: "Business credit card balance" },
    { name: "VAT Payable", code: "2100", type: "LIABILITY", description: "Value Added Tax collected" },
    { name: "Payroll Liabilities", code: "2200", type: "LIABILITY", description: "Wages and taxes owed" },

    // Equity
    { name: "Owner's Equity", code: "3000", type: "EQUITY", description: "Capital invested by owner" },
    { name: "Retained Earnings", code: "3100", type: "EQUITY", description: "Profits reinvested in business" },

    // Income
    { name: "Sales Revenue", code: "4000", type: "INCOME", description: "Income from goods sold" },
    { name: "Service Revenue", code: "4100", type: "INCOME", description: "Income from services rendered" },
    { name: "Other Income", code: "4900", type: "INCOME", description: "Interest, grants, etc." },

    // Expenses
    { name: "Cost of Goods Sold", code: "5000", type: "EXPENSE", description: "Direct costs of producing goods" },
    { name: "Rent Expense", code: "6000", type: "EXPENSE", description: "Office or facility rent" },
    { name: "Salaries & Wages", code: "6100", type: "EXPENSE", description: "Employee compensation" },
    { name: "Utilities", code: "6200", type: "EXPENSE", description: "Electricity, water, internet" },
    { name: "Marketing & Advertising", code: "6300", type: "EXPENSE", description: "Promotional activities" },
    { name: "Office Supplies", code: "6400", type: "EXPENSE", description: "Consumables for office" },
    { name: "Travel & Logistics", code: "6500", type: "EXPENSE", description: "Business travel and transport" },
    { name: "Maintenance & Repairs", code: "6600", type: "EXPENSE", description: "Upkeep of equipment/facility" },
    { name: "Legal & Professional Fees", code: "6700", type: "EXPENSE", description: "Consulting, legal, accounting" },
    { name: "Bank Charges", code: "6800", type: "EXPENSE", description: "Fees charged by banks" },
] as const;

const STANDARD_EXPENSE_CATEGORIES = [
    { name: "Rent", description: "Office or facility rental costs" },
    { name: "Salaries", description: "Employee wages and benefits" },
    { name: "Utilities", description: "Electricity, water, internet, etc." },
    { name: "Marketing", description: "Advertising and promotion" },
    { name: "Office Supplies", description: "Stationery and consumables" },
    { name: "Travel", description: "Business travel expenses" },
    { name: "Logistics", description: "Shipping and delivery costs" },
    { name: "Maintenance", description: "Repairs and upkeep" },
    { name: "Professional Services", description: "Legal, accounting, consulting" },
    { name: "Software", description: "Software subscriptions and licenses" },
    { name: "Meals & Entertainment", description: "Client meetings and team events" },
    { name: "Training", description: "Employee development" },
    { name: "Insurance", description: "Business insurance premiums" },
    { name: "Taxes", description: "Business taxes and levies" },
    { name: "Miscellaneous", description: "Other expenses" },
];

async function seedSmeData() {
    const db = await getDb();
    console.log("🌱 Seeding SME Data...");

    // 1. Seed Accounts
    console.log("Checking Accounts...");
    for (const acc of STANDARD_ACCOUNTS) {
        const existing = await db.query.accounts.findFirst({
            where: eq(accounts.code, acc.code)
        });

        if (!existing) {
            await db.insert(accounts).values({
                name: acc.name,
                code: acc.code,
                type: acc.type,
                description: acc.description,
                currency: "NGN",
                balance: "0",
            });
            console.log(`✅ Created Account: ${acc.name} (${acc.code})`);
        } else {
            console.log(`Standard Account ${acc.name} already exists.`);
        }
    }

    // 1b. Ensure Paystack Wallet Exists (for Webhooks)
    const paystackWallet = await db.query.accounts.findFirst({
        where: eq(accounts.provider, "PAYSTACK")
    });

    if (!paystackWallet) {
        await db.insert(accounts).values({
            name: "Paystack Wallet",
            code: "1003",
            type: "ASSET",
            description: "Default wallet for Paystack transactions",
            currency: "NGN",
            balance: "0",
            provider: "PAYSTACK",
            bankName: "Titan Bank" // Force Mock Transfer in Test Mode
        });
        console.log("✅ Created Account: Paystack Wallet (1003)");
    } else {
        console.log("Paystack Wallet already exists.");
    }

    // 2. Seed Expense Categories
    console.log("\nChecking Expense Categories...");
    for (const cat of STANDARD_EXPENSE_CATEGORIES) {
        const existing = await db.query.expenseCategories.findFirst({
            where: eq(expenseCategories.name, cat.name)
        });

        if (!existing) {
            await db.insert(expenseCategories).values({
                name: cat.name,
                description: cat.description,
            });
            console.log(`✅ Created Category: ${cat.name}`);
        } else {
            console.log(`Category ${cat.name} already exists.`);
        }
    }

    console.log("\n✨ Seeding Complete!");
    process.exit(0);
}

seedSmeData().catch((err) => {
    console.error("❌ Seeding Failed:", err);
    process.exit(1);
});
