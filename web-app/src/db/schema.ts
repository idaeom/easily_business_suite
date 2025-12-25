import { pgTable, text, timestamp, boolean, decimal, integer, jsonb, primaryKey, foreignKey, uuid, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";
import { relations, sql, type InferSelectModel, type InferInsertModel } from "drizzle-orm";
import {
    roleEnum,
    accountTypeEnum,
    taskStatusEnum,
    expenseStatusEnum,
    beneficiaryStatusEnum,
    journalEntryStatusEnum,
    transactionDirectionEnum,
    teamTypeEnum,
    employmentTypeEnum,
    leaveTypeEnum,
    leaveStatusEnum,
    appraisalStatusEnum,
    payrollStatusEnum,
    profileChangeStatusEnum,
    paymentFrequencyEnum,
    itemTypeEnum,
    salesStatusEnum,
    discountTypeEnum,
    taxTypeEnum,
    quoteStatusEnum,
    recurringOrderStatusEnum,
    recurringFrequencyEnum,
    requestOrderStatusEnum,
    dispatchStatusEnum,
    deliveryMethodEnum,
    transferStatusEnum,
    transferTypeEnum,
    adjustmentTypeEnum
} from "./enums";

// Re-export enums for convenience (server-side only)
export * from "./enums";

// =========================================
// 1. TABLE DEFINITIONS
// =========================================

// Expense Categories
export const expenseCategories = pgTable("ExpenseCategory", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull().unique(),
    description: text("description"),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
});

// Teams
export const teams = pgTable("Team", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    description: text("description"),
    type: teamTypeEnum("type").default("TEAM").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
});

// Users
export const users = pgTable("User", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name"),
    email: text("email").notNull().unique(),
    password: text("password"),
    image: text("image"),
    role: roleEnum("role").default("USER").notNull(),
    permissions: jsonb("permissions").$type<string[]>().default([]),
    teamId: text("teamId").references(() => teams.id), // HR Affiliation
    outletId: text("outletId").references(() => outlets.id), // Home/Default Branch
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
});

// Accounts (Financial)
export const accounts = pgTable("Account", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    code: text("code").notNull().unique(),
    type: accountTypeEnum("type").notNull(),
    isExternal: boolean("isExternal").default(false).notNull(),
    currency: text("currency").default("NGN").notNull(),
    description: text("description"),
    balance: decimal("balance", { precision: 65, scale: 30 }).default("0").notNull(),
    provider: text("provider"), // e.g., "PAYSTACK", "SQUADCO", "MONNIFY"
    credentials: jsonb("credentials"), // { publicKey, secretKey }
    bankName: text("bank_name"),
    accountNumber: text("account_number"),
});

// Transactions
export const transactions = pgTable("Transaction", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    date: timestamp("date", { mode: "date" }).defaultNow().notNull(),
    description: text("description").notNull(),
    reference: text("reference"),
    status: journalEntryStatusEnum("status").default("POSTED").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
});

// Ledger Entries
export const ledgerEntries = pgTable("LedgerEntry", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    transactionId: text("transactionId").notNull().references(() => transactions.id),
    accountId: text("accountId").notNull().references(() => accounts.id),
    amount: decimal("amount", { precision: 65, scale: 30 }).notNull(),
    direction: transactionDirectionEnum("direction").notNull(),
    description: text("description"),
});

// Task Stages
export const taskStages = pgTable("TaskStage", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    color: text("color").default("#808080").notNull(),
    order: integer("order").default(0).notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
});

// Tasks
export const tasks = pgTable("Task", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    uniqueNumber: text("uniqueNumber").unique().notNull(),
    title: text("title").notNull(),
    description: text("description"),
    status: taskStatusEnum("status").default("TODO").notNull(),
    assigneeId: text("assigneeId").references(() => users.id),
    parentId: text("parentId"), // Self-reference handled below
    teamId: text("teamId").references(() => teams.id),
    definitionOfDone: text("definitionOfDone"),
    isTemplate: boolean("isTemplate").default(false).notNull(),
    stageId: text("stageId").references(() => taskStages.id),
    startDate: timestamp("startDate", { mode: "date" }),
    dueDate: timestamp("dueDate", { mode: "date" }),
    originalDueDate: timestamp("originalDueDate", { mode: "date" }),
    estimatedDuration: integer("estimatedDuration"),
    recurrenceInterval: text("recurrenceInterval"),
    nextRun: timestamp("nextRun", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => {
    return {
        parentReference: foreignKey({
            columns: [table.parentId],
            foreignColumns: [table.id],
            name: "Task_parentId_fkey"
        })
    }
});

// Task Participants
export const taskParticipants = pgTable("TaskParticipant", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    taskId: text("taskId").notNull().references(() => tasks.id),
    userId: text("userId").notNull().references(() => users.id),
    role: text("role").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

// Expenses
export const expenses = pgTable("Expense", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    description: text("description").notNull(),
    amount: decimal("amount", { precision: 65, scale: 30 }).notNull(),
    status: expenseStatusEnum("status").default("PENDING").notNull(),
    category: text("category"),
    payee: text("payee"),
    payeeBankName: text("payeeBankName"),
    payeeAccountNumber: text("payeeAccountNumber"),
    incurredAt: timestamp("incurredAt", { mode: "date" }).defaultNow(),
    taskId: text("taskId").references(() => tasks.id),
    requesterId: text("requesterId").notNull().references(() => users.id),
    approverId: text("approverId").references(() => users.id),
    sourceAccountId: text("sourceAccountId").references(() => accounts.id),
    expenseAccountId: text("expenseAccountId").references(() => accounts.id), // Link to Chart of Accounts
    outletId: text("outletId").references(() => outlets.id),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
});

// Expense Beneficiaries
export const expenseBeneficiaries = pgTable("ExpenseBeneficiary", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    expenseId: text("expenseId").notNull().references(() => expenses.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    bankName: text("bankName").notNull(),
    bankCode: text("bankCode").notNull(),
    accountNumber: text("accountNumber").notNull(),
    amount: decimal("amount", { precision: 65, scale: 30 }).notNull(),
    recipientCode: text("recipientCode"),
    transferCode: text("transferCode"),
    status: beneficiaryStatusEnum("status").default("PENDING").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
});

// Comments
export const comments = pgTable("Comment", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    content: text("content").notNull(),
    taskId: text("taskId").references(() => tasks.id),
    expenseId: text("expenseId").references(() => expenses.id),
    leaveRequestId: text("leaveRequestId").references(() => leaveRequests.id),
    appraisalId: text("appraisalId").references(() => appraisals.id),
    payrollRunId: text("payrollRunId").references(() => payrollRuns.id),
    profileChangeRequestId: text("profileChangeRequestId").references(() => profileChangeRequests.id),
    userId: text("userId").notNull().references(() => users.id),
    parentId: text("parentId"), // Self-reference
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
}, (table) => {
    return {
        parentReference: foreignKey({
            columns: [table.parentId],
            foreignColumns: [table.id],
            name: "Comment_parentId_fkey"
        })
    }
});

// Notifications
export const notifications = pgTable("Notification", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("userId").notNull().references(() => users.id),
    title: text("title"),
    message: text("message").notNull(),
    read: boolean("read").default(false).notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

// Audit Logs
export const auditLogs = pgTable("AuditLog", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    action: text("action").notNull(),
    entityId: text("entityId").notNull(),
    entityType: text("entityType").notNull(),
    userId: text("userId").notNull().references(() => users.id),
    details: jsonb("details"),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

// Team Members
export const teamMembers = pgTable("TeamMember", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    teamId: text("teamId").notNull().references(() => teams.id),
    userId: text("userId").notNull().references(() => users.id),
    role: text("role").notNull(),
    joinedAt: timestamp("joinedAt", { mode: "date" }).defaultNow().notNull(),
});

// Budgets
export const budgets = pgTable("Budget", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    categoryId: text("categoryId").notNull().references(() => expenseCategories.id), // Link to Expense Category
    amount: decimal("amount", { precision: 65, scale: 30 }).notNull(),
    startDate: timestamp("startDate", { mode: "date" }).notNull(),
    endDate: timestamp("endDate", { mode: "date" }).notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
});



// Task Extensions
export const taskExtensions = pgTable("TaskExtension", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    taskId: text("taskId").notNull().references(() => tasks.id),
    previousDate: timestamp("previousDate", { mode: "date" }).notNull(),
    newDate: timestamp("newDate", { mode: "date" }).notNull(),
    reason: text("reason"),
    userId: text("userId").notNull().references(() => users.id),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

// Verification Tokens
export const verificationTokens = pgTable("VerificationToken", {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
}, (table) => {
    return {
        pk: primaryKey({ columns: [table.identifier, table.token] }),
    };
});

// =========================================
// BUSINESS SUITE - CORE
// =========================================

// =========================================
// BUSINESS SUITE - CORE
// =========================================

export const outlets = pgTable("Outlet", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    address: text("address"),
    phone: text("phone"),
    walletAccountNumber: text("walletAccountNumber"),
    bankName: text("bankName"),

    // Loyalty Settings
    loyaltyEarningRate: decimal("loyaltyEarningRate", { precision: 65, scale: 30 }).default("0.05"), // e.g. 5% cashback
    loyaltyRedemptionRate: decimal("loyaltyRedemptionRate", { precision: 65, scale: 30 }).default("1.0"), // 1 point = 1 currency unit

    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export const items = pgTable("Item", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    price: decimal("price", { precision: 65, scale: 30 }).notNull(),
    costPrice: decimal("costPrice", { precision: 65, scale: 30 }).notNull(),
    category: text("category").notNull(),
    imageUrl: text("imageUrl"),
    itemType: itemTypeEnum("itemType").notNull(),
    sku: text("sku").unique(),
    barcode: text("barcode").unique(),
    quantity: decimal("quantity", { precision: 65, scale: 30 }).default("0").notNull(),
    minStockLevel: integer("minStockLevel").default(0),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export const inventory = pgTable("Inventory", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    itemId: text("itemId").notNull().references(() => items.id, { onDelete: 'cascade' }),
    outletId: text("outletId").notNull().references(() => outlets.id, { onDelete: 'cascade' }),
    quantity: decimal("quantity", { precision: 65, scale: 30 }).default("0").notNull(),
    minStockLevel: integer("minStockLevel").default(0),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => ({
    unq: uniqueIndex("inventory_item_outlet_unique").on(t.itemId, t.outletId),
}));

export const itemOutletPrices = pgTable("ItemOutletPrice", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    itemId: text("itemId").notNull().references(() => items.id, { onDelete: 'cascade' }),
    outletId: text("outletId").notNull().references(() => outlets.id, { onDelete: 'cascade' }),
    price: decimal("price", { precision: 65, scale: 30 }).notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => ({
    unq: uniqueIndex("item_outlet_price_unique").on(t.itemId, t.outletId),
}));

// Item Categories (New)
export const itemCategories = pgTable("ItemCategory", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull().unique(),
    businessType: text("businessType"), // e.g. "RETAIL", "RESTAURANT" - just for context
    description: text("description"),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
});

// Unified Contact Base (Customers & Vendors)
export const contactTypeEnum = pgEnum("contact_type", ["CUSTOMER", "VENDOR", "BOTH"]);

export const contacts = pgTable("Contact", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    type: contactTypeEnum("type").notNull(),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),

    // Customer Specifics
    companyName: text("companyName"),
    walletBalance: decimal("walletBalance", { precision: 65, scale: 30 }).default("0"),
    creditScore: integer("creditScore").default(50),
    loyaltyPoints: decimal("loyaltyPoints", { precision: 65, scale: 30 }).default("0"),
    salesRepId: text("salesRepId").references(() => users.id),

    // Vendor Specifics
    contactPerson: text("contactPerson"),
    bankName: text("bankName"),
    accountNumber: text("accountNumber"),

    status: text("status").default("ACTIVE"),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

// =========================================
// BUSINESS SUITE - SALES PRO
// =========================================

export const spSales = pgTable("SpSale", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    contactId: text("contactId").notNull().references(() => contacts.id), // Was customerId
    customerName: text("customerName").notNull(), // Denormalized name (kept for history)
    saleDate: timestamp("saleDate", { mode: "date" }).notNull(),
    dueDate: timestamp("dueDate", { mode: "date" }),
    subtotal: decimal("subtotal", { precision: 65, scale: 30 }).notNull(),
    tax: decimal("tax", { precision: 65, scale: 30 }).default("0").notNull(),
    total: decimal("total", { precision: 65, scale: 30 }).notNull(),
    amountPaid: decimal("amountPaid", { precision: 65, scale: 30 }).default("0").notNull(),
    status: salesStatusEnum("status").notNull(),
    notes: text("notes"),
    outletId: text("outletId").references(() => outlets.id),
    deliveryMethod: deliveryMethodEnum("deliveryMethod").default("DELIVERY").notNull(),
    createdById: text("createdById").notNull().references(() => users.id),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export const spSaleItems = pgTable("SpSaleItem", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    saleId: text("saleId").notNull().references(() => spSales.id, { onDelete: 'cascade' }),
    itemId: text("itemId").notNull().references(() => items.id),
    itemName: text("itemName").notNull(),
    quantity: decimal("quantity", { precision: 65, scale: 30 }).notNull(),
    unitPrice: decimal("unitPrice", { precision: 65, scale: 30 }).notNull(),
    total: decimal("total", { precision: 65, scale: 30 }).notNull(),
});

export const spQuotes = pgTable("SpQuote", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    contactId: text("contactId").notNull().references(() => contacts.id), // Was customerId
    customerName: text("customerName").notNull(),
    quoteDate: timestamp("quoteDate", { mode: "date" }).notNull(),
    validUntil: timestamp("validUntil", { mode: "date" }),
    subtotal: decimal("subtotal", { precision: 65, scale: 30 }).notNull(),
    tax: decimal("tax", { precision: 65, scale: 30 }).default("0").notNull(),
    total: decimal("total", { precision: 65, scale: 30 }).notNull(),
    status: quoteStatusEnum("status").notNull(),
    notes: text("notes"),
    discountAmount: decimal("discountAmount", { precision: 65, scale: 30 }).default("0"),
    loyaltyPointsUsed: decimal("loyaltyPointsUsed", { precision: 65, scale: 30 }).default("0"),
    deliveryMethod: deliveryMethodEnum("deliveryMethod").default("DELIVERY").notNull(),
    createdById: text("createdById").notNull().references(() => users.id),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export const spQuoteItems = pgTable("SpQuoteItem", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    quoteId: text("quoteId").notNull().references(() => spQuotes.id, { onDelete: 'cascade' }),
    itemId: text("itemId").notNull().references(() => items.id),
    itemName: text("itemName").notNull(),
    quantity: decimal("quantity", { precision: 65, scale: 30 }).notNull(),
    unitPrice: decimal("unitPrice", { precision: 65, scale: 30 }).notNull(),
    total: decimal("total", { precision: 65, scale: 30 }).notNull(),
});

export const spRecurringOrders = pgTable("SpRecurringOrder", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    contactId: text("contactId").notNull().references(() => contacts.id), // Was customerId
    frequency: recurringFrequencyEnum("frequency").notNull(),
    nextOrderDate: timestamp("nextOrderDate", { mode: "date" }).notNull(),
    status: recurringOrderStatusEnum("status").notNull(),
    items: jsonb("items").$type<{ itemId: string; quantity: number }[]>().notNull(),
    total: decimal("total", { precision: 65, scale: 30 }).notNull(),
});

// Loyalty Logs
export const loyaltyLogTypeEnum = pgEnum("loyalty_log_type", ["EARN", "REDEEM", "ADJUSTMENT"]);

export const loyaltyLogs = pgTable("LoyaltyLog", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    contactId: text("contactId").notNull().references(() => contacts.id),
    outletId: text("outletId").references(() => outlets.id),
    points: decimal("points", { precision: 65, scale: 30 }).notNull(),
    type: loyaltyLogTypeEnum("type").notNull(),
    referenceId: text("referenceId"), // e.g. Sale ID
    description: text("description"),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

// =========================================
// BUSINESS SUITE - INVENTORY PRO
// =========================================

export const requestOrders = pgTable("RequestOrder", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    requesterName: text("requesterName").notNull(),
    requesterId: text("requesterId").notNull().references(() => users.id),
    outletId: text("outletId").notNull().references(() => outlets.id), // Source outlet requesting stock
    requestDate: timestamp("requestDate", { mode: "date" }).notNull(),
    description: text("description"),
    status: requestOrderStatusEnum("status").default("PENDING_APPROVAL").notNull(),
    approvedVendorId: text("approvedVendorId").references(() => contacts.id), // Was vendors.id
    totalEstimatedAmount: decimal("totalEstimatedAmount", { precision: 65, scale: 30 }).default("0"),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export const requestOrderItems = pgTable("RequestOrderItem", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    requestOrderId: text("requestOrderId").notNull().references(() => requestOrders.id, { onDelete: 'cascade' }),
    itemId: text("itemId").notNull().references(() => items.id),
    quantity: decimal("quantity", { precision: 65, scale: 30 }).notNull(),
    estimatedUnitPrice: decimal("estimatedUnitPrice", { precision: 65, scale: 30 }).notNull(),
    actualUnitPrice: decimal("actualUnitPrice", { precision: 65, scale: 30 }), // Filled after PO/GRN
});

// ... (Items table)

export const requestPriceSurveys = pgTable("RequestPriceSurvey", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    requestOrderId: text("requestOrderId").notNull().references(() => requestOrders.id, { onDelete: 'cascade' }),
    vendorId: text("vendorId").notNull().references(() => contacts.id), // Was vendors.id
    vendorName: text("vendorName").notNull(),
    priceQuote: decimal("priceQuote", { precision: 65, scale: 30 }).notNull(), // Total quote for the order
    notes: text("notes"),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export const requestGrns = pgTable("RequestGrn", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    requestOrderId: text("requestOrderId").references(() => requestOrders.id), // Nullable for transfers
    transferId: text("transferId").references(() => inventoryTransfers.id), // New for Transfer receipts
    receivedDate: timestamp("receivedDate", { mode: "date" }).notNull(),
    receivedById: text("receivedById").notNull().references(() => users.id),
    vendorInvoiceNumber: text("vendorInvoiceNumber"),
    itemsLogged: jsonb("itemsLogged").$type<{ itemId: string; quantityReceived: number; condition: string }[]>().notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

// Attachments (Moved here to allow referencing requestOrders)
export const attachments = pgTable("Attachment", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    url: text("url").notNull(),
    type: text("type").notNull(),
    size: integer("size").notNull(),
    taskId: text("taskId").references(() => tasks.id),
    expenseId: text("expenseId").references(() => expenses.id),
    leaveRequestId: text("leaveRequestId").references(() => leaveRequests.id),
    appraisalId: text("appraisalId").references(() => appraisals.id),
    payrollRunId: text("payrollRunId").references(() => payrollRuns.id),
    profileChangeRequestId: text("profileChangeRequestId").references(() => profileChangeRequests.id),
    requestOrderId: text("requestOrderId").references(() => requestOrders.id), // Added as requested
    uploaderId: text("uploaderId").notNull().references(() => users.id),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});


// =========================================
// BUSINESS SUITE - OPERATIONS PRO
// =========================================

export const haulage = pgTable("Haulage", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    providerName: text("providerName").notNull(),
    contactPerson: text("contactPerson"),
    phone: text("phone"),
    vehicleType: text("vehicleType"), // Truck, Van, Bike
    status: text("status").default("ACTIVE"),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export const inventoryAdjustments = pgTable("InventoryAdjustment", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    itemId: text("itemId").notNull().references(() => items.id),
    outletId: text("outletId").notNull().references(() => outlets.id),
    quantityChange: decimal("quantityChange", { precision: 65, scale: 30 }).notNull(), // Positive or Negative
    reason: adjustmentTypeEnum("reason").notNull(),
    notes: text("notes"),
    userId: text("userId").notNull().references(() => users.id),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export const inventoryTransfers = pgTable("InventoryTransfer", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    sourceOutletId: text("sourceOutletId").notNull().references(() => outlets.id),
    destinationOutletId: text("destinationOutletId").notNull().references(() => outlets.id),
    status: transferStatusEnum("status").default("PENDING").notNull(),
    type: transferTypeEnum("type").default("DISPATCH").notNull(),
    items: jsonb("items").$type<{ itemId: string; quantity: number }[]>().notNull(),
    notes: text("notes"),
    createdById: text("createdById").notNull().references(() => users.id),
    receivedById: text("receivedById").references(() => users.id), // When completed
    receivedAt: timestamp("receivedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export const dispatches = pgTable("Dispatch", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    salesId: text("salesId").references(() => spSales.id), // OPTIONAL now
    transferId: text("transferId").references(() => inventoryTransfers.id), // NEW: Link to Transfer
    contactId: text("contactId").references(() => contacts.id), // Optional if Transfer (Internal)
    outletId: text("outletId").references(() => outlets.id), // Origin
    dispatchDate: timestamp("dispatchDate", { mode: "date" }).defaultNow().notNull(),
    status: dispatchStatusEnum("status").default("PENDING").notNull(),
    deliveryMethod: deliveryMethodEnum("deliveryMethod").default("DELIVERY").notNull(),
    haulageId: text("haulageId").references(() => haulage.id),
    driverName: text("driverName"),
    vehicleNumber: text("vehicleNumber"),
    deliveryAddress: text("deliveryAddress").notNull(),
    notes: text("notes"),
    dispatchedById: text("dispatchedById").references(() => users.id),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export const dispatchGrnEntries = pgTable("DispatchGrnEntry", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    dispatchId: text("dispatchId").notNull().references(() => dispatches.id, { onDelete: 'cascade' }),
    itemId: text("itemId").notNull().references(() => items.id),
    quantityDispatched: decimal("quantityDispatched", { precision: 65, scale: 30 }).notNull(),
    quantityDelivered: decimal("quantityDelivered", { precision: 65, scale: 30 }).default("0"),
    quantityReturned: decimal("quantityReturned", { precision: 65, scale: 30 }).default("0"),
    condition: text("condition").default("GOOD"),
    comments: text("comments"),
});

// =========================================
// BUSINESS SUITE - INVOICE PRO (POS)
// =========================================

export const posShifts = pgTable("Shift", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    outletId: text("outletId").references(() => outlets.id),
    cashierId: text("cashierId").notNull().references(() => users.id),
    startTime: timestamp("startTime", { mode: "date" }).defaultNow().notNull(),
    endTime: timestamp("endTime", { mode: "date" }),
    startCash: decimal("startCash", { precision: 65, scale: 30 }).default("0"),
    status: text("status").default("OPEN"), // OPEN, CLOSED

    // Reconciliation Data (Filled at close)
    expectedCash: decimal("expectedCash", { precision: 65, scale: 30 }),
    actualCash: decimal("actualCash", { precision: 65, scale: 30 }),
    expectedCard: decimal("expectedCard", { precision: 65, scale: 30 }),
    actualCard: decimal("actualCard", { precision: 65, scale: 30 }), // POS Terminal Sum
    expectedTransfer: decimal("expectedTransfer", { precision: 65, scale: 30 }),
    actualTransfer: decimal("actualTransfer", { precision: 65, scale: 30 }), // Bank Statement Check

    verifiedCash: decimal("verifiedCash", { precision: 65, scale: 30 }),
    verifiedCard: decimal("verifiedCard", { precision: 65, scale: 30 }),
    verifiedTransfer: decimal("verifiedTransfer", { precision: 65, scale: 30 }),
    isReconciled: boolean("isReconciled").default(false),

    notes: text("notes"),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export const posTransactions = pgTable("PosTransaction", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    shiftId: text("shiftId").references(() => posShifts.id),
    saleId: text("saleId").references(() => spSales.id), // Link if it was a pre-ordered sales-pro sale payment
    contactId: text("contactId").references(() => contacts.id), // Was customerId, Link to Customer

    transactionDate: timestamp("transactionDate", { mode: "date" }).defaultNow().notNull(),
    totalAmount: decimal("totalAmount", { precision: 65, scale: 30 }).notNull(),
    status: text("status").default("COMPLETED"), // COMPLETED, VOID, SUSPENDED (Open Invoice)

    itemsSnapshot: jsonb("itemsSnapshot").$type<{ itemId: string, name: string, qty: number, price: number }[]>(), // Snapshot for receipt

    // Enhancements
    discountId: text("discountId").references(() => discounts.id),
    discountAmount: decimal("discountAmount", { precision: 65, scale: 30 }).default("0"),
    taxAmount: decimal("taxAmount", { precision: 65, scale: 30 }).default("0"),
    taxSnapshot: jsonb("taxSnapshot").$type<{ name: string, rate: number, amount: number }[]>(),

    loyaltyPointsEarned: decimal("loyaltyPointsEarned", { precision: 65, scale: 30 }).default("0"),
    loyaltyPointsRedeemed: decimal("loyaltyPointsRedeemed", { precision: 65, scale: 30 }).default("0"),

    originalTransactionId: text("originalTransactionId").references((): any => posTransactions.id), // Recursive FK
    isRefund: boolean("isRefund").default(false),

    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export const paymentMethods = pgTable("PaymentMethod", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(), // CASH, CARD, TRANSFER, CREDIT, LOYALTY
    code: text("code").unique().notNull(),
    isEnabled: boolean("isEnabled").default(true),
    glAccountId: text("glAccountId").references(() => accounts.id), // Linked GL Account
});

export const businessAccounts = pgTable("BusinessAccount", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(), // e.g. "Front Desk Register", "Access Bank Corp"
    code: text("code"), // Optional internal code
    type: text("type").notNull(), // CASH, BANK, MOMO

    // Usage tags to filter in UI: 
    // REVENUE_COLLECTION (Shift Recon), WALLET_FUNDING (Wallet Recon), EXPENSE_PAYOUT
    usage: text("usage").array(),

    glAccountId: text("glAccountId").references(() => accounts.id).notNull(), // The actual GL Account
    isEnabled: boolean("isEnabled").default(true),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export const transactionPayments = pgTable("TransactionPayment", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    transactionId: text("transactionId").notNull().references(() => posTransactions.id, { onDelete: 'cascade' }),
    paymentMethodCode: text("paymentMethodCode").notNull(), // Code from paymentMethods
    amount: decimal("amount", { precision: 65, scale: 30 }).notNull(),
    accountId: text("accountId").references(() => accounts.id), // Link to Bank Account/Terminal
    reference: text("reference"), // Tx Ref Number
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

// System Accounting Defaults
export const accountingConfig = pgTable("AccountingConfig", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    defaultSalesAccountId: text("defaultSalesAccountId").references(() => accounts.id),
    defaultInventoryAccountId: text("defaultInventoryAccountId").references(() => accounts.id),
    defaultCogsAccountId: text("defaultCogsAccountId").references(() => accounts.id),
    defaultVarianceAccountId: text("defaultVarianceAccountId").references(() => accounts.id),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export const salesTaxes = pgTable("SalesTax", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    rate: decimal("rate", { precision: 65, scale: 30 }).notNull(), // As Percentage e.g. 7.5
    type: taxTypeEnum("type").default("EXCLUSIVE").notNull(),
    isEnabled: boolean("isEnabled").default(true),
    glAccountId: text("glAccountId").references(() => accounts.id),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export const discounts = pgTable("Discount", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    type: discountTypeEnum("type").notNull(),
    value: decimal("value", { precision: 65, scale: 30 }).notNull(),
    isEnabled: boolean("isEnabled").default(true),
});

export const shiftReconciliations = pgTable("shift_reconciliations", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    shiftId: text("shiftId").notNull().references(() => posShifts.id, { onDelete: 'cascade' }),
    paymentMethodCode: text("paymentMethodCode").notNull(), // CASH, CARD, TRANSFER, etc
    accountId: text("accountId").references(() => accounts.id), // Bank/Terminal Account
    status: text("status").default("PENDING"), // PENDING, CONFIRMED
    expectedAmount: decimal("expectedAmount", { precision: 65, scale: 30 }).notNull(),
    actualAmount: decimal("actualAmount", { precision: 65, scale: 30 }).notNull(),
    difference: decimal("difference", { precision: 65, scale: 30 }).default("0"),
    notes: text("notes"),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export const shiftCashDeposits = pgTable("shift_cash_deposits", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    shiftId: text("shiftId").notNull().references(() => posShifts.id, { onDelete: 'cascade' }),
    amount: decimal("amount", { precision: 65, scale: 30 }).notNull(),
    accountId: text("accountId").references(() => accounts.id), // Bank Account Deposited To
    reference: text("reference"), // Slip Number / Ref
    notes: text("notes"),
    depositedById: text("depositedById").references(() => users.id),
    status: text("status").default("PENDING"), // PENDING, CONFIRMED
    reconciledById: text("reconciledById").references(() => users.id),
    reconciledAt: timestamp("reconciledAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export const shiftReconciliationsRelations = relations(shiftReconciliations, ({ one }) => ({
    shift: one(posShifts, {
        fields: [shiftReconciliations.shiftId],
        references: [posShifts.id],
    }),
}));

export const shiftCashDepositsRelations = relations(shiftCashDeposits, ({ one }) => ({
    shift: one(posShifts, {
        fields: [shiftCashDeposits.shiftId],
        references: [posShifts.id],
    }),
}));

export const posShiftsRelations = relations(posShifts, ({ one, many }) => ({
    cashier: one(users, {
        fields: [posShifts.cashierId],
        references: [users.id],
    }),
    outlet: one(outlets, {
        fields: [posShifts.outletId],
        references: [outlets.id],
    }),
    transactions: many(posTransactions),
    reconciliations: many(shiftReconciliations),
    cashDeposits: many(shiftCashDeposits)
}));



export const customerLedgerEntries = pgTable("CustomerLedgerEntry", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    contactId: text("contactId").notNull().references(() => contacts.id), // Was customerId
    transactionId: text("transactionId").references(() => posTransactions.id), // Link to POS Tx
    saleId: text("saleId").references(() => spSales.id), // Link to Sale
    entryDate: timestamp("entryDate", { mode: "date" }).notNull(),
    description: text("description").notNull(),
    debit: decimal("debit", { precision: 65, scale: 30 }).default("0"),  // Customer owes (Sale)
    credit: decimal("credit", { precision: 65, scale: 30 }).default("0"), // Customer pays (Payment)
    balanceAfter: decimal("balanceAfter", { precision: 65, scale: 30 }).notNull(),
    status: text("status").default("CONFIRMED"), // PENDING, CONFIRMED
    reconciledById: text("reconciledById").references(() => users.id),
    reconciledAt: timestamp("reconciledAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export const vendorLedgerEntries = pgTable("VendorLedgerEntry", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    contactId: text("contactId").notNull().references(() => contacts.id), // Contact of type VENDOR or BOTH
    requestOrderId: text("requestOrderId").references(() => requestOrders.id), // Link to Purchase
    expenseId: text("expenseId"), // Link to Expense Payment (No FK yet as expenses table is separate module)
    entryDate: timestamp("entryDate", { mode: "date" }).notNull(),
    description: text("description").notNull(),
    debit: decimal("debit", { precision: 65, scale: 30 }).default("0"),  // We pay Vendor (Reduces what we owe)
    credit: decimal("credit", { precision: 65, scale: 30 }).default("0"), // Vendor bills us (Increases what we owe)
    balanceAfter: decimal("balanceAfter", { precision: 65, scale: 30 }).notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

// Duplicates removed

// =========================================
// HR & PAYROLL TABLES
// =========================================

export const employeeProfiles = pgTable("EmployeeProfile", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("userId").notNull().references(() => users.id).unique(),
    jobTitle: text("jobTitle"),
    employmentType: employmentTypeEnum("employmentType").default("FULL_TIME").notNull(),
    basicSalary: decimal("basicSalary", { precision: 65, scale: 30 }).default("0").notNull(),
    housingAllowance: decimal("housingAllowance", { precision: 65, scale: 30 }).default("0").notNull(),
    transportAllowance: decimal("transportAllowance", { precision: 65, scale: 30 }).default("0").notNull(),
    otherAllowances: decimal("otherAllowances", { precision: 65, scale: 30 }).default("0").notNull(),
    // Tax & Deductions Config
    isPensionActive: boolean("isPensionActive").default(true),
    pensionVoluntary: decimal("pensionVoluntary", { precision: 65, scale: 30 }).default("0"),
    isNhfActive: boolean("isNhfActive").default(false), // National Housing Fund
    isNhisActive: boolean("isNhisActive").default(false), // National Health Insurance
    lifeAssurance: decimal("lifeAssurance", { precision: 65, scale: 30 }).default("0"),

    bankName: text("bankName"),
    accountNumber: text("accountNumber"),
    taxId: text("taxId"),
    pensionId: text("pensionId"), // RSA Number
    pfaName: text("pfaName"),
    pfaCode: text("pfaCode"),

    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export const profileChangeRequests = pgTable("ProfileChangeRequest", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("userId").notNull().references(() => users.id),
    requesterId: text("requesterId").notNull().references(() => users.id),
    data: jsonb("data").notNull(), // The changes
    status: profileChangeStatusEnum("status").default("PENDING_CERTIFICATION").notNull(),
    certifierId: text("certifierId").references(() => users.id),
    approverId: text("approverId").references(() => users.id),
    rejectionReason: text("rejectionReason"),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export const leaveRequests = pgTable("LeaveRequest", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("userId").notNull().references(() => users.id),
    type: leaveTypeEnum("type").notNull(),
    startDate: timestamp("startDate", { mode: "date" }).notNull(),
    endDate: timestamp("endDate", { mode: "date" }).notNull(),
    reason: text("reason"),
    status: leaveStatusEnum("status").default("DRAFT").notNull(),
    approverId: text("approverId").references(() => users.id),
    certifierId: text("certifierId").references(() => users.id),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export const appraisals = pgTable("Appraisal", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("userId").notNull().references(() => users.id),
    reviewerId: text("reviewerId").notNull().references(() => users.id), // Manager who writes it
    certifierId: text("certifierId").references(() => users.id), // HR/Certifier
    approverId: text("approverId").references(() => users.id), // Final Approver
    period: text("period").notNull(), // e.g., "Q1 2024"
    score: integer("score"), // 1-100 or 1-5 (Now likely derived from KPIs)
    // Detailed KPI breakdown
    kpis: jsonb("kpis").$type<{ name: string; score: number }[]>().default([]),
    // Objective Score (Calculated, non-editable by HR)
    objectiveScore: decimal("objectiveScore", { precision: 5, scale: 2 }), // e.g. 8.50
    // HR's editable commentary
    hrComment: text("hrComment"),
    comments: text("comments"), // Original feedback field (maybe Manager's comment?)
    status: appraisalStatusEnum("status").default("DRAFT").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export const payrollRuns = pgTable("PayrollRun", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    month: integer("month").notNull(),
    year: integer("year").notNull(),
    totalAmount: decimal("totalAmount", { precision: 65, scale: 30 }).default("0").notNull(),
    status: payrollStatusEnum("status").default("DRAFT").notNull(),
    certifierId: text("certifierId").references(() => users.id),
    approverId: text("approverId").references(() => users.id),
    expenseId: text("expenseId").references(() => expenses.id), // Legacy/Primary Link
    // Meta for split expenses
    expenseMeta: jsonb("expenseMeta").$type<{
        salaryExpenseId?: string;
        taxExpenseId?: string;
        pensionExpenseId?: string;
    }>(),
    // Snapshot of tax rules used for this run
    config: jsonb("config").$type<{
        pensionRate: number;
        taxBands: any;
        nhfRate: number;
        nhisRate: number;
    }>(),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export const payrollItems = pgTable("PayrollItem", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    payrollRunId: text("payrollRunId").notNull().references(() => payrollRuns.id, { onDelete: 'cascade' }),
    userId: text("userId").notNull().references(() => users.id),
    grossPay: decimal("grossPay", { precision: 65, scale: 30 }).notNull(),
    netPay: decimal("netPay", { precision: 65, scale: 30 }).notNull(),
    // Breakdowns
    breakdown: jsonb("breakdown").$type<{
        basic: number,
        housing: number,
        transport: number,
        tax: number,
        pension: number,
        otherDeductions: number,
        bonuses: number
    }>().default({
        basic: 0, housing: 0, transport: 0, tax: 0, pension: 0, otherDeductions: 0, bonuses: 0
    }),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

// =========================================
// 2. RELATIONS DEFINITIONS
// =========================================

export const accountsRelations = relations(accounts, ({ many }) => ({
    ledgerEntries: many(ledgerEntries),
    expensesFunded: many(expenses),
}));

export const transactionsRelations = relations(transactions, ({ many }) => ({
    entries: many(ledgerEntries),
}));

export const ledgerEntriesRelations = relations(ledgerEntries, ({ one }) => ({
    transaction: one(transactions, {
        fields: [ledgerEntries.transactionId],
        references: [transactions.id],
    }),
    account: one(accounts, {
        fields: [ledgerEntries.accountId],
        references: [accounts.id],
    }),
}));

export const taskStagesRelations = relations(taskStages, ({ many }) => ({
    tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
    assignee: one(users, {
        fields: [tasks.assigneeId],
        references: [users.id],
        relationName: "Assignee"
    }),
    parent: one(tasks, {
        fields: [tasks.parentId],
        references: [tasks.id],
        relationName: "SubTasks"
    }),
    subTasks: many(tasks, { relationName: "SubTasks" }),
    expenses: many(expenses),
    comments: many(comments),
    team: one(teams, {
        fields: [tasks.teamId],
        references: [teams.id],
    }),
    participants: many(taskParticipants),
    attachments: many(attachments),
    stage: one(taskStages, {
        fields: [tasks.stageId],
        references: [taskStages.id],
    }),
    extensions: many(taskExtensions),
}));

export const taskParticipantsRelations = relations(taskParticipants, ({ one }) => ({
    task: one(tasks, {
        fields: [taskParticipants.taskId],
        references: [tasks.id],
    }),
    user: one(users, {
        fields: [taskParticipants.userId],
        references: [users.id],
    }),
}));

export const expensesRelations = relations(expenses, ({ one, many }) => ({
    beneficiaries: many(expenseBeneficiaries),
    task: one(tasks, {
        fields: [expenses.taskId],
        references: [tasks.id],
    }),
    requester: one(users, {
        fields: [expenses.requesterId],
        references: [users.id],
        relationName: "Requester"
    }),
    approver: one(users, {
        fields: [expenses.approverId],
        references: [users.id],
        relationName: "Approver"
    }),
    sourceAccount: one(accounts, {
        fields: [expenses.sourceAccountId],
        references: [accounts.id],
    }),
    expenseAccount: one(accounts, {
        fields: [expenses.expenseAccountId],
        references: [accounts.id],
    }),
    expenseCategory: one(expenseCategories, {
        fields: [expenses.category],
        references: [expenseCategories.id],
    }),
    attachments: many(attachments),
    comments: many(comments),
    payrollRun: one(payrollRuns, {
        fields: [expenses.id],
        references: [payrollRuns.expenseId],
        relationName: "PayrollExpense" // Inverse relation
    })
}));

export const businessAccountsRelations = relations(businessAccounts, ({ one }) => ({
    glAccount: one(accounts, {
        fields: [businessAccounts.glAccountId],
        references: [accounts.id],
    }),
}));

export const expenseBeneficiariesRelations = relations(expenseBeneficiaries, ({ one }) => ({
    expense: one(expenses, {
        fields: [expenseBeneficiaries.expenseId],
        references: [expenses.id],
    }),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
    task: one(tasks, {
        fields: [comments.taskId],
        references: [tasks.id],
    }),
    expense: one(expenses, {
        fields: [comments.expenseId],
        references: [expenses.id],
    }),
    user: one(users, {
        fields: [comments.userId],
        references: [users.id],
    }),
    parent: one(comments, {
        fields: [comments.parentId],
        references: [comments.id],
        relationName: "Replies"
    }),
    replies: many(comments, { relationName: "Replies" }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
    user: one(users, {
        fields: [notifications.userId],
        references: [users.id],
    }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
    user: one(users, {
        fields: [auditLogs.userId],
        references: [users.id],
    }),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
    team: one(teams, {
        fields: [teamMembers.teamId],
        references: [teams.id],
    }),
    user: one(users, {
        fields: [teamMembers.userId],
        references: [users.id],
    }),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
    category: one(expenseCategories, {
        fields: [budgets.categoryId],
        references: [expenseCategories.id],
    }),
}));

export const expenseCategoriesRelations = relations(expenseCategories, ({ many }) => ({
    budgets: many(budgets),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
    task: one(tasks, {
        fields: [attachments.taskId],
        references: [tasks.id],
    }),
    expense: one(expenses, {
        fields: [attachments.expenseId],
        references: [expenses.id],
    }),
    uploader: one(users, {
        fields: [attachments.uploaderId],
        references: [users.id],
    }),
}));

export const taskExtensionsRelations = relations(taskExtensions, ({ one }) => ({
    task: one(tasks, {
        fields: [taskExtensions.taskId],
        references: [tasks.id],
    }),
    user: one(users, {
        fields: [taskExtensions.userId],
        references: [users.id],
    }),
}));

export const teamsRelations = relations(teams, ({ many }) => ({
    members: many(teamMembers),
    projects: many(tasks),
    employees: many(users), // Direct HR affiliation
}));

export const usersRelations = relations(users, ({ one, many }) => ({
    tasksAssigned: many(tasks, { relationName: "Assignee" }),
    expenses: many(expenses, { relationName: "Requester" }),
    approvedExpenses: many(expenses, { relationName: "Approver" }),
    comments: many(comments),
    notifications: many(notifications),
    auditLogs: many(auditLogs),
    teamMemberships: many(teamMembers),
    taskParticipations: many(taskParticipants),
    attachments: many(attachments),
    taskExtensions: many(taskExtensions),
    team: one(teams, {
        fields: [users.teamId],
        references: [teams.id],
    }),
    employeeProfile: one(employeeProfiles, {
        fields: [users.id],
        references: [employeeProfiles.userId],
        relationName: "Profile"
    }),
    leaveRequests: many(leaveRequests),
    appraisals: many(appraisals, { relationName: "Evaluatee" }),
    appraisalsGiven: many(appraisals, { relationName: "Reviewer" }),
    payrollItems: many(payrollItems),
    outlet: one(outlets, {
        fields: [users.outletId],
        references: [outlets.id],
    }),
}));

export const employeeProfilesRelations = relations(employeeProfiles, ({ one }) => ({
    user: one(users, {
        fields: [employeeProfiles.userId],
        references: [users.id],
        relationName: "Profile"
    }),
}));

export const profileChangeRequestsRelations = relations(profileChangeRequests, ({ one }) => ({
    user: one(users, {
        fields: [profileChangeRequests.userId],
        references: [users.id],
    }),
    requester: one(users, {
        fields: [profileChangeRequests.requesterId],
        references: [users.id],
    }),
    certifier: one(users, {
        fields: [profileChangeRequests.certifierId],
        references: [users.id],
    }),
    approver: one(users, {
        fields: [profileChangeRequests.approverId],
        references: [users.id],
    }),
}));

export const leaveRequestsRelations = relations(leaveRequests, ({ one }) => ({
    user: one(users, {
        fields: [leaveRequests.userId],
        references: [users.id],
    }),
    approver: one(users, {
        fields: [leaveRequests.approverId],
        references: [users.id],
    }),
}));

export const appraisalsRelations = relations(appraisals, ({ one }) => ({
    user: one(users, {
        fields: [appraisals.userId],
        references: [users.id],
        relationName: "Evaluatee"
    }),
    reviewer: one(users, {
        fields: [appraisals.reviewerId],
        references: [users.id],
        relationName: "Reviewer"
    }),
}));

export const payrollRunsRelations = relations(payrollRuns, ({ one, many }) => ({
    expense: one(expenses, {
        fields: [payrollRuns.expenseId],
        references: [expenses.id],
        relationName: "PayrollExpense"
    }),
    items: many(payrollItems),
}));

export const payrollItemsRelations = relations(payrollItems, ({ one }) => ({
    run: one(payrollRuns, {
        fields: [payrollItems.payrollRunId],
        references: [payrollRuns.id],
    }),
    user: one(users, {
        fields: [payrollItems.userId],
        references: [users.id],
    }),
}));

export const taxRules = pgTable("tax_rules", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    isActive: boolean("is_active").default(true),
    isDefault: boolean("is_default").default(false),
    rules: jsonb("rules").$type<{
        type: string;
        taxableIncomeBasis: "gross" | "basic_plus";
        cra: {
            enabled: boolean;
            fixed?: number;
            percentGross?: number;
            percentRent?: number; // 2025 rule
            rentCap?: number;    // 2025 rule
            consolidatedParams?: { min: number, percent: number }; // 2020 rule (200k + 20%)
        };
        bands: { limit: number; rate: number }[];
        exemptions: { threshold: number };
    }>().notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
});



// =========================================
// BUSINESS SUITE RELATIONS
// =========================================

export const outletsRelations = relations(outlets, ({ many }) => ({
    // will add more as we implement Inventory/Ops
    itemPrices: many(itemOutletPrices),
}));

export const itemsRelations = relations(items, ({ many }) => ({
    saleItems: many(spSaleItems),
    quoteItems: many(spQuoteItems),
    inventory: many(inventory),
    requestOrderItems: many(requestOrderItems), // Often useful
    outletPrices: many(itemOutletPrices),
}));

export const itemOutletPricesRelations = relations(itemOutletPrices, ({ one }) => ({
    item: one(items, {
        fields: [itemOutletPrices.itemId],
        references: [items.id],
    }),
    outlet: one(outlets, {
        fields: [itemOutletPrices.outletId],
        references: [outlets.id],
    }),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
    item: one(items, {
        fields: [inventory.itemId],
        references: [items.id],
    }),
    outlet: one(outlets, {
        fields: [inventory.outletId],
        references: [outlets.id],
    }),
}));

// CONTACTS (Unified)
export const contactsRelations = relations(contacts, ({ many }) => ({
    // As Customer
    sales: many(spSales),
    quotes: many(spQuotes),
    recurringOrders: many(spRecurringOrders),
    posTransactions: many(posTransactions),
    ledgerEntries: many(customerLedgerEntries),
    dispatches: many(dispatches),
    // As Vendor
    approvedRequests: many(requestOrders, { relationName: "VendorRequest" }),
    surveys: many(requestPriceSurveys),
}));

export const spSalesRelations = relations(spSales, ({ one, many }) => ({
    contact: one(contacts, {
        fields: [spSales.contactId],
        references: [contacts.id],
    }),
    createdBy: one(users, {
        fields: [spSales.createdById],
        references: [users.id],
    }),
    items: many(spSaleItems),
    dispatches: many(dispatches),
    posTransactions: many(posTransactions)
}));

export const spSaleItemsRelations = relations(spSaleItems, ({ one }) => ({
    sale: one(spSales, {
        fields: [spSaleItems.saleId],
        references: [spSales.id],
    }),
    item: one(items, {
        fields: [spSaleItems.itemId],
        references: [items.id],
    }),
}));

export const spQuotesRelations = relations(spQuotes, ({ one, many }) => ({
    contact: one(contacts, {
        fields: [spQuotes.contactId],
        references: [contacts.id],
    }),
    createdBy: one(users, {
        fields: [spQuotes.createdById],
        references: [users.id],
    }),
    items: many(spQuoteItems),
}));

export const spQuoteItemsRelations = relations(spQuoteItems, ({ one }) => ({
    quote: one(spQuotes, {
        fields: [spQuoteItems.quoteId],
        references: [spQuotes.id],
    }),
    item: one(items, {
        fields: [spQuoteItems.itemId],
        references: [items.id],
    }),
}));

export const spRecurringOrdersRelations = relations(spRecurringOrders, ({ one }) => ({
    contact: one(contacts, {
        fields: [spRecurringOrders.contactId],
        references: [contacts.id],
    }),
}));

// Inventory Relations
// vendorsRelations removed (Unified into contactsRelations)

export const requestOrdersRelations = relations(requestOrders, ({ one, many }) => ({
    requester: one(users, {
        fields: [requestOrders.requesterId],
        references: [users.id],
    }),
    outlet: one(outlets, {
        fields: [requestOrders.outletId],
        references: [outlets.id],
    }),
    approvedVendor: one(contacts, {
        fields: [requestOrders.approvedVendorId],
        references: [contacts.id],
        relationName: "VendorRequest"
    }),
    items: many(requestOrderItems),
    surveys: many(requestPriceSurveys),
    grns: many(requestGrns),
}));

export const requestOrderItemsRelations = relations(requestOrderItems, ({ one }) => ({
    requestOrder: one(requestOrders, {
        fields: [requestOrderItems.requestOrderId],
        references: [requestOrders.id],
    }),
    item: one(items, {
        fields: [requestOrderItems.itemId],
        references: [items.id],
    }),
}));

export const requestPriceSurveysRelations = relations(requestPriceSurveys, ({ one }) => ({
    requestOrder: one(requestOrders, {
        fields: [requestPriceSurveys.requestOrderId],
        references: [requestOrders.id],
    }),
    vendor: one(contacts, {
        fields: [requestPriceSurveys.vendorId],
        references: [contacts.id],
    }),
}));

export const requestGrnsRelations = relations(requestGrns, ({ one }) => ({
    requestOrder: one(requestOrders, {
        fields: [requestGrns.requestOrderId],
        references: [requestOrders.id],
    }),
    transfer: one(inventoryTransfers, {
        fields: [requestGrns.transferId],
        references: [inventoryTransfers.id],
    }),
    receivedBy: one(users, {
        fields: [requestGrns.receivedById],
        references: [users.id],
    }),
}));

// Operations Relations
export const inventoryTransfersRelations = relations(inventoryTransfers, ({ many }) => ({
    grns: many(requestGrns),
}));

export const haulageRelations = relations(haulage, ({ many }) => ({
    dispatches: many(dispatches),
}));

export const dispatchesRelations = relations(dispatches, ({ one, many }) => ({
    sale: one(spSales, {
        fields: [dispatches.salesId],
        references: [spSales.id],
    }),
    contact: one(contacts, {
        fields: [dispatches.contactId],
        references: [contacts.id],
    }),
    haulage: one(haulage, {
        fields: [dispatches.haulageId],
        references: [haulage.id],
    }),
    dispatchedBy: one(users, {
        fields: [dispatches.dispatchedById],
        references: [users.id],
    }),
    items: many(dispatchGrnEntries),
}));

export const dispatchGrnEntriesRelations = relations(dispatchGrnEntries, ({ one }) => ({
    dispatch: one(dispatches, {
        fields: [dispatchGrnEntries.dispatchId],
        references: [dispatches.id],
    }),
    item: one(items, {
        fields: [dispatchGrnEntries.itemId],
        references: [items.id],
    }),
}));

// Invoice Relations
// (Removed Duplicate)

export const posTransactionsRelations = relations(posTransactions, ({ one, many }) => ({
    shift: one(posShifts, {
        fields: [posTransactions.shiftId],
        references: [posShifts.id],
    }),
    payments: many(transactionPayments),
    // As Vendor
    approvedRequests: many(requestOrders, { relationName: "VendorRequest" }),
}));

export const transactionPaymentsRelations = relations(transactionPayments, ({ one }) => ({
    transaction: one(posTransactions, {
        fields: [transactionPayments.transactionId],
        references: [posTransactions.id],
    }),
    account: one(accounts, {
        fields: [transactionPayments.accountId],
        references: [accounts.id],
    }),
}));

// Business Suite Relations

// Duplicate Business Suite Relations Removed


// Operations Relations
// Duplicate Relations Removed

export const customerLedgerEntriesRelations = relations(customerLedgerEntries, ({ one }) => ({
    customer: one(contacts, {
        fields: [customerLedgerEntries.contactId],
        references: [contacts.id],
    }),
    sale: one(spSales, {
        fields: [customerLedgerEntries.saleId],
        references: [spSales.id],
    }),
    transaction: one(posTransactions, {
        fields: [customerLedgerEntries.transactionId],
        references: [posTransactions.id],
    }),
}));

export const vendorLedgerEntriesRelations = relations(vendorLedgerEntries, ({ one }) => ({
    contact: one(contacts, {
        fields: [vendorLedgerEntries.contactId],
        references: [contacts.id],
    }),
}));

// =========================================
// 3. TYPE EXPORTS
// =========================================

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type Account = InferSelectModel<typeof accounts>;
export type NewAccount = InferInsertModel<typeof accounts>;

export type Task = InferSelectModel<typeof tasks>;
export type NewTask = InferInsertModel<typeof tasks>;

export type TaskStage = InferSelectModel<typeof taskStages>;
export type NewTaskStage = InferInsertModel<typeof taskStages>;

export type Expense = InferSelectModel<typeof expenses>;
export type NewExpense = InferInsertModel<typeof expenses>;

export type ExpenseCategory = InferSelectModel<typeof expenseCategories>;
export type NewExpenseCategory = InferInsertModel<typeof expenseCategories>;

export type Team = InferSelectModel<typeof teams>;
export type NewTeam = InferInsertModel<typeof teams>;

export type Budget = InferSelectModel<typeof budgets>;
export type NewBudget = InferInsertModel<typeof budgets>;

export type Notification = InferSelectModel<typeof notifications>;
export type NewNotification = InferInsertModel<typeof notifications>;

export type AuditLog = InferSelectModel<typeof auditLogs>;
export type NewAuditLog = InferInsertModel<typeof auditLogs>;

// Business Suite Types
export type Outlet = InferSelectModel<typeof outlets>;
export type Item = InferSelectModel<typeof items>;
export type Contact = InferSelectModel<typeof contacts>; // Unified
export type SpSale = InferSelectModel<typeof spSales>;
export type SpQuote = InferSelectModel<typeof spQuotes>;
export type SpRecurringOrder = InferSelectModel<typeof spRecurringOrders>;
export type SalesTax = InferSelectModel<typeof salesTaxes>;

export type RequestOrder = InferSelectModel<typeof requestOrders>;
export type RequestGrn = InferSelectModel<typeof requestGrns>;

export type Haulage = InferSelectModel<typeof haulage>;
export type Dispatch = InferSelectModel<typeof dispatches>;
export type DispatchGrnEntry = InferSelectModel<typeof dispatchGrnEntries>;

export type Shift = InferSelectModel<typeof posShifts>;
export type PosTransaction = InferSelectModel<typeof posTransactions>;
export type PaymentMethod = InferSelectModel<typeof paymentMethods>;
export type TransactionPayment = InferSelectModel<typeof transactionPayments>;
export type CustomerLedgerEntry = InferSelectModel<typeof customerLedgerEntries>;
export type VendorLedgerEntry = InferSelectModel<typeof vendorLedgerEntries>;
export type ShiftCashDeposit = InferSelectModel<typeof shiftCashDeposits>;
export type BusinessAccount = InferSelectModel<typeof businessAccounts>;
