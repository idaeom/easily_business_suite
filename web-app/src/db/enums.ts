import { pgEnum } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("Role", ["ADMIN", "MANAGER", "ACCOUNTANT", "CASHIER", "USER"]);
export const accountTypeEnum = pgEnum("AccountType", ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"]);
export const taskStatusEnum = pgEnum("TaskStatus", ["TODO", "IN_PROGRESS", "DONE", "CERTIFIED", "APPROVED"]);
export const expenseStatusEnum = pgEnum("ExpenseStatus", ["PENDING", "CERTIFIED", "APPROVED", "DISBURSED", "REJECTED", "PROCESSING_PAYMENT", "PAYMENT_FAILED", "PARTIALLY_PAID"]);
export const beneficiaryStatusEnum = pgEnum("BeneficiaryStatus", ["PENDING", "PAID"]);
export const journalEntryStatusEnum = pgEnum("JournalEntryStatus", ["DRAFT", "POSTED"]);
export const transactionDirectionEnum = pgEnum("TransactionDirection", ["DEBIT", "CREDIT"]);
export const teamTypeEnum = pgEnum("TeamType", ["TEAM", "DEPARTMENT", "UNIT"]);

export const employmentTypeEnum = pgEnum("EmploymentType", ["FULL_TIME", "CONTRACT", "INTERN"]);
export const leaveTypeEnum = pgEnum("LeaveType", ["ANNUAL", "SICK", "MATERNITY", "PATERNITY", "UNPAID", "CASUAL"]);
export const leaveStatusEnum = pgEnum("LeaveStatus", ["DRAFT", "PENDING_CERTIFICATION", "PENDING_APPROVAL", "APPROVED", "REJECTED"]);
export const appraisalStatusEnum = pgEnum("AppraisalStatus", ["DRAFT", "PENDING_CERTIFICATION", "PENDING_APPROVAL", "APPROVED", "REJECTED"]);
export const payrollStatusEnum = pgEnum("PayrollStatus", ["DRAFT", "PENDING_CERTIFICATION", "PENDING_APPROVAL", "APPROVED", "PAID"]);
export const profileChangeStatusEnum = pgEnum("ProfileChangeStatus", ["PENDING_CERTIFICATION", "PENDING_APPROVAL", "APPROVED", "REJECTED"]);
export const paymentFrequencyEnum = pgEnum("PaymentFrequency", ["MONTHLY", "WEEKLY", "BI_WEEKLY"]);

// Business Suite Enums
export const itemTypeEnum = pgEnum("ItemType", ["RESALE", "INTERNAL_USE", "SERVICE", "MANUFACTURED", "RAW_MATERIAL"]);
export const salesStatusEnum = pgEnum("SalesStatus", ["AWAITING_CONFIRMATION", "CONFIRMED", "PAID", "OVERDUE", "CANCELLED"]);
export const quoteStatusEnum = pgEnum("QuoteStatus", ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "CONVERTED", "EXPIRED"]);
export const recurringOrderStatusEnum = pgEnum("RecurringOrderStatus", ["ACTIVE", "PAUSED"]);
export const recurringFrequencyEnum = pgEnum("RecurringFrequency", ["WEEKLY", "MONTHLY"]);
export const requestOrderStatusEnum = pgEnum("RequestOrderStatus", ["PENDING_APPROVAL", "APPROVED_FOR_PAYMENT", "DISBURSED", "PARTIALLY_RECEIVED", "GOODS_RECEIVED", "CANCELLED"]);
export const dispatchStatusEnum = pgEnum("DispatchStatus", ["PENDING", "DISPATCHED", "PARTIALLY_DELIVERED", "DELIVERED", "CANCELLED"]);
export const haulagePaymentStatusEnum = pgEnum("HaulagePaymentStatus", ["PENDING", "PAID"]);
export const deliveryMethodEnum = pgEnum("DeliveryMethod", ["DELIVERY", "PICKUP"]);

export const transferStatusEnum = pgEnum("TransferStatus", ["PENDING", "IN_TRANSIT", "PARTIALLY_COMPLETED", "COMPLETED", "CANCELLED"]);
export const transferTypeEnum = pgEnum("TransferType", ["PICKUP", "DISPATCH"]);
export const adjustmentTypeEnum = pgEnum("AdjustmentType", ["DAMAGE", "THEFT", "EXPIRED", "CORRECTION", "OTHER"]);

// POS Enhancements
export const discountTypeEnum = pgEnum("DiscountType", ["PERCENTAGE", "FIXED"]);
export const taxTypeEnum = pgEnum("TaxType", ["INCLUSIVE", "EXCLUSIVE"]);

export type DiscountType = (typeof discountTypeEnum.enumValues)[number];
export type TaxType = (typeof taxTypeEnum.enumValues)[number];
export type AccountType = (typeof accountTypeEnum.enumValues)[number];
