
import { getDb } from "../db";
import { businessAccounts, accounts } from "../db/schema";
import { eq, or } from "drizzle-orm";

async function main() {
    const db = await getDb();
    console.log("Seeding Business Accounts...");

    // 1. Ensure GL Accounts Exist 
    let cashGL = await db.query.accounts.findFirst({
        where: eq(accounts.code, "10-1002-00") // Cash on Hand
    });
    if (!cashGL) {
        console.log("Creating Cash GL...");
        const [newAcc] = await db.insert(accounts).values({
            code: "10-1002-00", name: "Cash on Hand", type: "ASSET", balance: "0"
        }).returning();
        cashGL = newAcc;
    }

    let bankGL = await db.query.accounts.findFirst({
        where: eq(accounts.code, "10-1001-00") // Main Bank
    });
    if (!bankGL) {
        console.log("Creating Bank GL...");
        const [newAcc] = await db.insert(accounts).values({
            code: "10-1001-00", name: "Main Bank Account", type: "ASSET", balance: "0"
        }).returning();
        bankGL = newAcc;
    }

    // New: Revenue Account
    let revenueGL = await db.query.accounts.findFirst({
        where: eq(accounts.code, "ACC-INC-SALES")
    });
    if (!revenueGL) {
        console.log("Creating Revenue GL...");
        await db.insert(accounts).values({
            code: "ACC-INC-SALES", name: "Sales Revenue", type: "INCOME", balance: "0"
        });
    }

    // New: Variance Account
    let varianceGL = await db.query.accounts.findFirst({
        where: eq(accounts.name, "Cash Over/Short")
    });
    if (!varianceGL) {
        console.log("Creating Variance GL...");
        await db.insert(accounts).values({
            code: "60-9999-00", name: "Cash Over/Short", type: "EXPENSE", balance: "0" // 6xxx for Expense
        });
    }

    // 2. Create Business Profiles
    const profiles = [
        {
            name: "Main Register",
            type: "CASH",
            usage: ["REVENUE_COLLECTION"],
            glAccountId: cashGL.id
        },
        {
            name: "Access Bank Corporate",
            type: "BANK",
            usage: ["REVENUE_COLLECTION", "WALLET_FUNDING", "EXPENSE_PAYOUT"],
            glAccountId: bankGL.id
        },
        {
            name: "GTBank Operations",
            type: "BANK",
            usage: ["WALLET_FUNDING"], // Example: Only used for receiving wallet funds
            glAccountId: bankGL.id // Can reuse same GL or different
        }
    ];

    for (const p of profiles) {
        const existing = await db.query.businessAccounts.findFirst({
            where: eq(businessAccounts.name, p.name)
        });

        if (!existing) {
            await db.insert(businessAccounts).values({
                ...p,
                createdAt: new Date()
            });
            console.log(`Created Profile: ${p.name}`);
        } else {
            console.log(`Profile Exists: ${p.name}`);
        }
    }
}

main();
