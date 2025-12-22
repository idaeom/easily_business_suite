
export const STANDARD_COA = [
    // ASSETS (1000 - 1999)
    { code: "1000", name: "Cash on Hand", type: "ASSET", description: "Physical cash in register/safe" },
    { code: "1010", name: "Main Bank Account", type: "ASSET", description: "Primary operating bank account" },
    { code: "1100", name: "Accounts Receivable", type: "ASSET", description: "Money owed by customers" },
    { code: "1200", name: "Staff Advances", type: "ASSET", description: "Prepayments to staff" },
    { code: "1300", name: "Inventory Asset", type: "ASSET", description: "Value of stock on hand" },
    { code: "1400", name: "VAT Input", type: "ASSET", description: "VAT paid on purchases (claimable)" },
    { code: "1500", name: "Fixed Assets - Equipment", type: "ASSET", description: "Computers, Machinery, etc." },

    // LIABILITIES (2000 - 2999)
    { code: "2000", name: "Accounts Payable", type: "LIABILITY", description: "Money owed to vendors" },
    { code: "2100", name: "Accrued Expenses", type: "LIABILITY", description: "Expenses incurred but not paid" },
    { code: "2300", name: "Customer Deposits", type: "LIABILITY", description: "Prepayments/Wallet Balances from Customers" },
    { code: "2350", name: "VAT Output", type: "LIABILITY", description: "VAT collected on sales (payable to FIRS)" },
    { code: "2360", name: "WHT Payable", type: "LIABILITY", description: "Withholding Tax deductions payable" },
    { code: "2400", name: "Payroll Payable", type: "LIABILITY", description: "Salaries pending payment" },

    // EQUITY (3000 - 3999)
    { code: "3000", name: "Owner's Equity", type: "EQUITY", description: "Capital invested" },
    { code: "3100", name: "Retained Earnings", type: "EQUITY", description: "Accumulated profits" },

    // REVENUE (4000 - 4999)
    { code: "4000", name: "Sales Revenue", type: "INCOME", description: "Income from sales of goods/services" },
    { code: "4100", name: "Service Revenue", type: "INCOME", description: "Income from services" },
    { code: "4200", name: "Other Income", type: "INCOME", description: "Miscellaneous income" },

    // EXPENSES (Direct Costs 5000-5999)
    { code: "5000", name: "Cost of Goods Sold", type: "EXPENSE", description: "Direct cost of items sold" },
    { code: "5100", name: "Logistics & Delivery", type: "EXPENSE", description: "Cost of delivery" },

    // EXPENSES (Operating 6000-8999)
    { code: "6000", name: "Salaries & Wages", type: "EXPENSE", description: "Staff payroll cost" },
    { code: "6010", name: "Utility Bills", type: "EXPENSE", description: "Electricity, Water, Waste" },
    { code: "6020", name: "Rent & Rates", type: "EXPENSE", description: "Office/Shop Rent" },
    { code: "6030", name: "Internet & Data", type: "EXPENSE", description: "ISP and Data subscriptions" },
    { code: "6040", name: "Repairs & Maintenance", type: "EXPENSE", description: "Upkeep of assets" },
    { code: "6050", name: "Marketing & Ads", type: "EXPENSE", description: "Promotion costs" },
    { code: "6060", name: "Bank Charges", type: "EXPENSE", description: "Fees charged by banks" },
    { code: "6100", name: "Cash Variance / Loss", type: "EXPENSE", description: "Shortages from reconciliation" },
] as const;
