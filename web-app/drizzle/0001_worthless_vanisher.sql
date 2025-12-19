DO $$ BEGIN
    CREATE TYPE "public"."contact_type" AS ENUM('CUSTOMER', 'VENDOR', 'BOTH');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    CREATE TYPE "public"."DispatchStatus" AS ENUM('PENDING', 'DISPATCHED', 'DELIVERED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    CREATE TYPE "public"."HaulagePaymentStatus" AS ENUM('PENDING', 'PAID');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    CREATE TYPE "public"."ItemType" AS ENUM('RESALE', 'INTERNAL_USE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    CREATE TYPE "public"."ProfileChangeStatus" AS ENUM('PENDING_CERTIFICATION', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    CREATE TYPE "public"."QuoteStatus" AS ENUM('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    CREATE TYPE "public"."RecurringFrequency" AS ENUM('WEEKLY', 'MONTHLY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    CREATE TYPE "public"."RecurringOrderStatus" AS ENUM('ACTIVE', 'PAUSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    CREATE TYPE "public"."RequestOrderStatus" AS ENUM('PENDING_APPROVAL', 'APPROVED_FOR_PAYMENT', 'DISBURSED', 'GOODS_RECEIVED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    CREATE TYPE "public"."SalesStatus" AS ENUM('AWAITING_CONFIRMATION', 'CONFIRMED', 'PAID', 'OVERDUE', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TYPE "public"."PayrollStatus" ADD VALUE IF NOT EXISTS 'PENDING_CERTIFICATION' BEFORE 'APPROVED';--> statement-breakpoint
ALTER TYPE "public"."PayrollStatus" ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL' BEFORE 'APPROVED';--> statement-breakpoint
CREATE TABLE "Contact" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "contact_type" NOT NULL,
	"phone" text,
	"email" text,
	"address" text,
	"companyName" text,
	"walletBalance" numeric(65, 30) DEFAULT '0',
	"creditScore" integer DEFAULT 50,
	"loyaltyPoints" integer DEFAULT 0,
	"salesRepId" text,
	"contactPerson" text,
	"bankName" text,
	"accountNumber" text,
	"status" text DEFAULT 'ACTIVE',
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CustomerLedgerEntry" (
	"id" text PRIMARY KEY NOT NULL,
	"contactId" text NOT NULL,
	"transactionId" text,
	"saleId" text,
	"entryDate" timestamp NOT NULL,
	"description" text NOT NULL,
	"debit" numeric(65, 30) DEFAULT '0',
	"credit" numeric(65, 30) DEFAULT '0',
	"balanceAfter" numeric(65, 30) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "DispatchGrnEntry" (
	"id" text PRIMARY KEY NOT NULL,
	"dispatchId" text NOT NULL,
	"itemId" text NOT NULL,
	"quantityDispatched" integer NOT NULL,
	"quantityDelivered" integer DEFAULT 0,
	"quantityReturned" integer DEFAULT 0,
	"condition" text DEFAULT 'GOOD',
	"comments" text
);
--> statement-breakpoint
CREATE TABLE "Dispatch" (
	"id" text PRIMARY KEY NOT NULL,
	"salesId" text NOT NULL,
	"contactId" text NOT NULL,
	"outletId" text,
	"dispatchDate" timestamp DEFAULT now() NOT NULL,
	"status" "DispatchStatus" DEFAULT 'PENDING' NOT NULL,
	"haulageId" text,
	"driverName" text,
	"vehicleNumber" text,
	"deliveryAddress" text NOT NULL,
	"notes" text,
	"dispatchedById" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Haulage" (
	"id" text PRIMARY KEY NOT NULL,
	"providerName" text NOT NULL,
	"contactPerson" text,
	"phone" text,
	"vehicleType" text,
	"status" text DEFAULT 'ACTIVE',
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Item" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"price" numeric(65, 30) NOT NULL,
	"costPrice" numeric(65, 30) NOT NULL,
	"category" text NOT NULL,
	"imageUrl" text,
	"itemType" "ItemType" NOT NULL,
	"sku" text,
	"barcode" text,
	"minStockLevel" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Item_sku_unique" UNIQUE("sku"),
	CONSTRAINT "Item_barcode_unique" UNIQUE("barcode")
);
--> statement-breakpoint
CREATE TABLE "Outlet" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"phone" text,
	"walletAccountNumber" text,
	"bankName" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "PaymentMethod" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"isEnabled" boolean DEFAULT true,
	CONSTRAINT "PaymentMethod_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "PosTransaction" (
	"id" text PRIMARY KEY NOT NULL,
	"shiftId" text,
	"saleId" text,
	"contactId" text,
	"transactionDate" timestamp DEFAULT now() NOT NULL,
	"totalAmount" numeric(65, 30) NOT NULL,
	"status" text DEFAULT 'COMPLETED',
	"itemsSnapshot" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ProfileChangeRequest" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"requesterId" text NOT NULL,
	"data" jsonb NOT NULL,
	"status" "ProfileChangeStatus" DEFAULT 'PENDING_CERTIFICATION' NOT NULL,
	"certifierId" text,
	"approverId" text,
	"rejectionReason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "RequestGrn" (
	"id" text PRIMARY KEY NOT NULL,
	"requestOrderId" text NOT NULL,
	"receivedDate" timestamp NOT NULL,
	"receivedById" text NOT NULL,
	"vendorInvoiceNumber" text,
	"itemsLogged" jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "RequestOrderItem" (
	"id" text PRIMARY KEY NOT NULL,
	"requestOrderId" text NOT NULL,
	"itemId" text NOT NULL,
	"quantity" integer NOT NULL,
	"estimatedUnitPrice" numeric(65, 30) NOT NULL,
	"actualUnitPrice" numeric(65, 30)
);
--> statement-breakpoint
CREATE TABLE "RequestOrder" (
	"id" text PRIMARY KEY NOT NULL,
	"requesterName" text NOT NULL,
	"requesterId" text NOT NULL,
	"outletId" text NOT NULL,
	"requestDate" timestamp NOT NULL,
	"description" text,
	"status" "RequestOrderStatus" DEFAULT 'PENDING_APPROVAL' NOT NULL,
	"approvedVendorId" text,
	"totalEstimatedAmount" numeric(65, 30) DEFAULT '0',
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "RequestPriceSurvey" (
	"id" text PRIMARY KEY NOT NULL,
	"requestOrderId" text NOT NULL,
	"vendorId" text NOT NULL,
	"vendorName" text NOT NULL,
	"priceQuote" numeric(65, 30) NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Shift" (
	"id" text PRIMARY KEY NOT NULL,
	"outletId" text,
	"cashierId" text NOT NULL,
	"startTime" timestamp DEFAULT now() NOT NULL,
	"endTime" timestamp,
	"startCash" numeric(65, 30) DEFAULT '0',
	"status" text DEFAULT 'OPEN',
	"expectedCash" numeric(65, 30),
	"actualCash" numeric(65, 30),
	"expectedCard" numeric(65, 30),
	"actualCard" numeric(65, 30),
	"expectedTransfer" numeric(65, 30),
	"actualTransfer" numeric(65, 30),
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SpQuoteItem" (
	"id" text PRIMARY KEY NOT NULL,
	"quoteId" text NOT NULL,
	"itemId" text NOT NULL,
	"itemName" text NOT NULL,
	"quantity" integer NOT NULL,
	"unitPrice" numeric(65, 30) NOT NULL,
	"total" numeric(65, 30) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SpQuote" (
	"id" text PRIMARY KEY NOT NULL,
	"contactId" text NOT NULL,
	"customerName" text NOT NULL,
	"quoteDate" timestamp NOT NULL,
	"validUntil" timestamp,
	"subtotal" numeric(65, 30) NOT NULL,
	"tax" numeric(65, 30) DEFAULT '0' NOT NULL,
	"total" numeric(65, 30) NOT NULL,
	"status" "QuoteStatus" NOT NULL,
	"notes" text,
	"createdById" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SpRecurringOrder" (
	"id" text PRIMARY KEY NOT NULL,
	"contactId" text NOT NULL,
	"frequency" "RecurringFrequency" NOT NULL,
	"nextOrderDate" timestamp NOT NULL,
	"status" "RecurringOrderStatus" NOT NULL,
	"items" jsonb NOT NULL,
	"total" numeric(65, 30) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SpSaleItem" (
	"id" text PRIMARY KEY NOT NULL,
	"saleId" text NOT NULL,
	"itemId" text NOT NULL,
	"itemName" text NOT NULL,
	"quantity" integer NOT NULL,
	"unitPrice" numeric(65, 30) NOT NULL,
	"total" numeric(65, 30) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SpSale" (
	"id" text PRIMARY KEY NOT NULL,
	"contactId" text NOT NULL,
	"customerName" text NOT NULL,
	"saleDate" timestamp NOT NULL,
	"dueDate" timestamp,
	"subtotal" numeric(65, 30) NOT NULL,
	"tax" numeric(65, 30) DEFAULT '0' NOT NULL,
	"total" numeric(65, 30) NOT NULL,
	"amountPaid" numeric(65, 30) DEFAULT '0' NOT NULL,
	"status" "SalesStatus" NOT NULL,
	"notes" text,
	"createdById" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"is_default" boolean DEFAULT false,
	"rules" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "TransactionPayment" (
	"id" text PRIMARY KEY NOT NULL,
	"transactionId" text NOT NULL,
	"paymentMethodCode" text NOT NULL,
	"amount" numeric(65, 30) NOT NULL,
	"reference" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "VendorLedgerEntry" (
	"id" text PRIMARY KEY NOT NULL,
	"contactId" text NOT NULL,
	"requestOrderId" text,
	"expenseId" text,
	"entryDate" timestamp NOT NULL,
	"description" text NOT NULL,
	"debit" numeric(65, 30) DEFAULT '0',
	"credit" numeric(65, 30) DEFAULT '0',
	"balanceAfter" numeric(65, 30) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Appraisal" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "Appraisal" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::text;--> statement-breakpoint
-- DROP TYPE "public"."AppraisalStatus";--> statement-breakpoint
DO $$ BEGIN
    CREATE TYPE "public"."AppraisalStatus" AS ENUM('DRAFT', 'PENDING_CERTIFICATION', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TABLE "Appraisal" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::"public"."AppraisalStatus";--> statement-breakpoint
ALTER TABLE "Appraisal" ALTER COLUMN "status" SET DATA TYPE "public"."AppraisalStatus" USING "status"::"public"."AppraisalStatus";--> statement-breakpoint
ALTER TABLE "LeaveRequest" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "LeaveRequest" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::text;--> statement-breakpoint
-- DROP TYPE "public"."LeaveStatus";--> statement-breakpoint
DO $$ BEGIN
    CREATE TYPE "public"."LeaveStatus" AS ENUM('DRAFT', 'PENDING_CERTIFICATION', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TABLE "LeaveRequest" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::"public"."LeaveStatus";--> statement-breakpoint
ALTER TABLE "LeaveRequest" ALTER COLUMN "status" SET DATA TYPE "public"."LeaveStatus" USING "status"::"public"."LeaveStatus";--> statement-breakpoint
ALTER TABLE "Appraisal" ADD COLUMN "certifierId" text;--> statement-breakpoint
ALTER TABLE "Appraisal" ADD COLUMN "approverId" text;--> statement-breakpoint
ALTER TABLE "Appraisal" ADD COLUMN "kpis" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "Appraisal" ADD COLUMN "objectiveScore" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "Appraisal" ADD COLUMN "hrComment" text;--> statement-breakpoint
ALTER TABLE "Attachment" ADD COLUMN "leaveRequestId" text;--> statement-breakpoint
ALTER TABLE "Attachment" ADD COLUMN "appraisalId" text;--> statement-breakpoint
ALTER TABLE "Attachment" ADD COLUMN "payrollRunId" text;--> statement-breakpoint
ALTER TABLE "Attachment" ADD COLUMN "profileChangeRequestId" text;--> statement-breakpoint
ALTER TABLE "Comment" ADD COLUMN "leaveRequestId" text;--> statement-breakpoint
ALTER TABLE "Comment" ADD COLUMN "appraisalId" text;--> statement-breakpoint
ALTER TABLE "Comment" ADD COLUMN "payrollRunId" text;--> statement-breakpoint
ALTER TABLE "Comment" ADD COLUMN "profileChangeRequestId" text;--> statement-breakpoint
ALTER TABLE "EmployeeProfile" ADD COLUMN "isPensionActive" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "EmployeeProfile" ADD COLUMN "pensionVoluntary" numeric(65, 30) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "EmployeeProfile" ADD COLUMN "isNhfActive" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "EmployeeProfile" ADD COLUMN "isNhisActive" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "EmployeeProfile" ADD COLUMN "lifeAssurance" numeric(65, 30) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "EmployeeProfile" ADD COLUMN "pfaName" text;--> statement-breakpoint
ALTER TABLE "EmployeeProfile" ADD COLUMN "pfaCode" text;--> statement-breakpoint
ALTER TABLE "LeaveRequest" ADD COLUMN "certifierId" text;--> statement-breakpoint
ALTER TABLE "PayrollRun" ADD COLUMN "certifierId" text;--> statement-breakpoint
ALTER TABLE "PayrollRun" ADD COLUMN "approverId" text;--> statement-breakpoint
ALTER TABLE "PayrollRun" ADD COLUMN "expenseMeta" jsonb;--> statement-breakpoint
ALTER TABLE "PayrollRun" ADD COLUMN "config" jsonb;--> statement-breakpoint
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_salesRepId_User_id_fk" FOREIGN KEY ("salesRepId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CustomerLedgerEntry" ADD CONSTRAINT "CustomerLedgerEntry_contactId_Contact_id_fk" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CustomerLedgerEntry" ADD CONSTRAINT "CustomerLedgerEntry_transactionId_PosTransaction_id_fk" FOREIGN KEY ("transactionId") REFERENCES "public"."PosTransaction"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CustomerLedgerEntry" ADD CONSTRAINT "CustomerLedgerEntry_saleId_SpSale_id_fk" FOREIGN KEY ("saleId") REFERENCES "public"."SpSale"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DispatchGrnEntry" ADD CONSTRAINT "DispatchGrnEntry_dispatchId_Dispatch_id_fk" FOREIGN KEY ("dispatchId") REFERENCES "public"."Dispatch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DispatchGrnEntry" ADD CONSTRAINT "DispatchGrnEntry_itemId_Item_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Dispatch" ADD CONSTRAINT "Dispatch_salesId_SpSale_id_fk" FOREIGN KEY ("salesId") REFERENCES "public"."SpSale"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Dispatch" ADD CONSTRAINT "Dispatch_contactId_Contact_id_fk" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Dispatch" ADD CONSTRAINT "Dispatch_outletId_Outlet_id_fk" FOREIGN KEY ("outletId") REFERENCES "public"."Outlet"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Dispatch" ADD CONSTRAINT "Dispatch_haulageId_Haulage_id_fk" FOREIGN KEY ("haulageId") REFERENCES "public"."Haulage"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Dispatch" ADD CONSTRAINT "Dispatch_dispatchedById_User_id_fk" FOREIGN KEY ("dispatchedById") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PosTransaction" ADD CONSTRAINT "PosTransaction_shiftId_Shift_id_fk" FOREIGN KEY ("shiftId") REFERENCES "public"."Shift"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PosTransaction" ADD CONSTRAINT "PosTransaction_saleId_SpSale_id_fk" FOREIGN KEY ("saleId") REFERENCES "public"."SpSale"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PosTransaction" ADD CONSTRAINT "PosTransaction_contactId_Contact_id_fk" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ProfileChangeRequest" ADD CONSTRAINT "ProfileChangeRequest_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ProfileChangeRequest" ADD CONSTRAINT "ProfileChangeRequest_requesterId_User_id_fk" FOREIGN KEY ("requesterId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ProfileChangeRequest" ADD CONSTRAINT "ProfileChangeRequest_certifierId_User_id_fk" FOREIGN KEY ("certifierId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ProfileChangeRequest" ADD CONSTRAINT "ProfileChangeRequest_approverId_User_id_fk" FOREIGN KEY ("approverId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "RequestGrn" ADD CONSTRAINT "RequestGrn_requestOrderId_RequestOrder_id_fk" FOREIGN KEY ("requestOrderId") REFERENCES "public"."RequestOrder"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "RequestGrn" ADD CONSTRAINT "RequestGrn_receivedById_User_id_fk" FOREIGN KEY ("receivedById") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "RequestOrderItem" ADD CONSTRAINT "RequestOrderItem_requestOrderId_RequestOrder_id_fk" FOREIGN KEY ("requestOrderId") REFERENCES "public"."RequestOrder"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "RequestOrderItem" ADD CONSTRAINT "RequestOrderItem_itemId_Item_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "RequestOrder" ADD CONSTRAINT "RequestOrder_requesterId_User_id_fk" FOREIGN KEY ("requesterId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "RequestOrder" ADD CONSTRAINT "RequestOrder_outletId_Outlet_id_fk" FOREIGN KEY ("outletId") REFERENCES "public"."Outlet"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "RequestOrder" ADD CONSTRAINT "RequestOrder_approvedVendorId_Contact_id_fk" FOREIGN KEY ("approvedVendorId") REFERENCES "public"."Contact"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "RequestPriceSurvey" ADD CONSTRAINT "RequestPriceSurvey_requestOrderId_RequestOrder_id_fk" FOREIGN KEY ("requestOrderId") REFERENCES "public"."RequestOrder"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "RequestPriceSurvey" ADD CONSTRAINT "RequestPriceSurvey_vendorId_Contact_id_fk" FOREIGN KEY ("vendorId") REFERENCES "public"."Contact"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_outletId_Outlet_id_fk" FOREIGN KEY ("outletId") REFERENCES "public"."Outlet"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_cashierId_User_id_fk" FOREIGN KEY ("cashierId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "SpQuoteItem" ADD CONSTRAINT "SpQuoteItem_quoteId_SpQuote_id_fk" FOREIGN KEY ("quoteId") REFERENCES "public"."SpQuote"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "SpQuoteItem" ADD CONSTRAINT "SpQuoteItem_itemId_Item_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "SpQuote" ADD CONSTRAINT "SpQuote_contactId_Contact_id_fk" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "SpQuote" ADD CONSTRAINT "SpQuote_createdById_User_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "SpRecurringOrder" ADD CONSTRAINT "SpRecurringOrder_contactId_Contact_id_fk" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "SpSaleItem" ADD CONSTRAINT "SpSaleItem_saleId_SpSale_id_fk" FOREIGN KEY ("saleId") REFERENCES "public"."SpSale"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "SpSaleItem" ADD CONSTRAINT "SpSaleItem_itemId_Item_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "SpSale" ADD CONSTRAINT "SpSale_contactId_Contact_id_fk" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "SpSale" ADD CONSTRAINT "SpSale_createdById_User_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TransactionPayment" ADD CONSTRAINT "TransactionPayment_transactionId_PosTransaction_id_fk" FOREIGN KEY ("transactionId") REFERENCES "public"."PosTransaction"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "VendorLedgerEntry" ADD CONSTRAINT "VendorLedgerEntry_contactId_Contact_id_fk" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "VendorLedgerEntry" ADD CONSTRAINT "VendorLedgerEntry_requestOrderId_RequestOrder_id_fk" FOREIGN KEY ("requestOrderId") REFERENCES "public"."RequestOrder"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Appraisal" ADD CONSTRAINT "Appraisal_certifierId_User_id_fk" FOREIGN KEY ("certifierId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Appraisal" ADD CONSTRAINT "Appraisal_approverId_User_id_fk" FOREIGN KEY ("approverId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_leaveRequestId_LeaveRequest_id_fk" FOREIGN KEY ("leaveRequestId") REFERENCES "public"."LeaveRequest"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_appraisalId_Appraisal_id_fk" FOREIGN KEY ("appraisalId") REFERENCES "public"."Appraisal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_payrollRunId_PayrollRun_id_fk" FOREIGN KEY ("payrollRunId") REFERENCES "public"."PayrollRun"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_profileChangeRequestId_ProfileChangeRequest_id_fk" FOREIGN KEY ("profileChangeRequestId") REFERENCES "public"."ProfileChangeRequest"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_leaveRequestId_LeaveRequest_id_fk" FOREIGN KEY ("leaveRequestId") REFERENCES "public"."LeaveRequest"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_appraisalId_Appraisal_id_fk" FOREIGN KEY ("appraisalId") REFERENCES "public"."Appraisal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_payrollRunId_PayrollRun_id_fk" FOREIGN KEY ("payrollRunId") REFERENCES "public"."PayrollRun"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_profileChangeRequestId_ProfileChangeRequest_id_fk" FOREIGN KEY ("profileChangeRequestId") REFERENCES "public"."ProfileChangeRequest"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_certifierId_User_id_fk" FOREIGN KEY ("certifierId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_certifierId_User_id_fk" FOREIGN KEY ("certifierId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_approverId_User_id_fk" FOREIGN KEY ("approverId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;