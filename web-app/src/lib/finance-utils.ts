import { getDb } from "@/db";
import { accounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { FinanceService } from "@/lib/finance";

export const DEFAULT_ACCOUNTS = {
    SALES_REVENUE: { name: "Sales Revenue", code: "4000", type: "INCOME" },
    COST_OF_GOODS_SOLD: { name: "Cost of Goods Sold", code: "5000", type: "EXPENSE" },
    INVENTORY_ASSET: { name: "Inventory Asset", code: "1200", type: "ASSET" },
    ACCOUNTS_RECEIVABLE: { name: "Accounts Receivable", code: "1100", type: "ASSET" },
    ACCOUNTS_PAYABLE: { name: "Accounts Payable", code: "2100", type: "LIABILITY" },
    CASH_DRAWER: { name: "Cash Drawer (POS)", code: "1010", type: "ASSET" },
    BANK_TRANSFER: { name: "Bank Transfer Clearing", code: "1020", type: "ASSET" },
    EXPENSE_GENERAL: { name: "General Expenses", code: "6000", type: "EXPENSE" },
} as const;

export class FinanceUtils {
    static async ensureAccount(key: keyof typeof DEFAULT_ACCOUNTS) {
        const db = await getDb();
        const def = DEFAULT_ACCOUNTS[key];

        // 1. Try finding by code
        const existing = await db.query.accounts.findFirst({
            where: eq(accounts.code, def.code)
        });

        if (existing) return existing;

        // 2. Create if missing
        return await FinanceService.createAccount({
            name: def.name,
            code: def.code,
            type: def.type as any,
            description: "System generated default account"
        });
    }

    /**
     * Helper to get multiple accounts at once
     */
    static async getSystemAccounts() {
        return {
            revenue: await this.ensureAccount("SALES_REVENUE"),
            cogs: await this.ensureAccount("COST_OF_GOODS_SOLD"),
            inventory: await this.ensureAccount("INVENTORY_ASSET"),
            ar: await this.ensureAccount("ACCOUNTS_RECEIVABLE"),
            ap: await this.ensureAccount("ACCOUNTS_PAYABLE"),
            cash: await this.ensureAccount("CASH_DRAWER"),
            bank: await this.ensureAccount("BANK_TRANSFER"),
            expense: await this.ensureAccount("EXPENSE_GENERAL"),
        };
    }
}
