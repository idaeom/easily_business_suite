CREATE TYPE "public"."loyalty_log_type" AS ENUM('EARN', 'REDEEM', 'ADJUSTMENT');--> statement-breakpoint
CREATE TYPE "public"."AdjustmentType" AS ENUM('DAMAGE', 'THEFT', 'EXPIRED', 'CORRECTION', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."DeliveryMethod" AS ENUM('DELIVERY', 'PICKUP');--> statement-breakpoint
CREATE TYPE "public"."TransferStatus" AS ENUM('PENDING', 'IN_TRANSIT', 'PARTIALLY_COMPLETED', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."TransferType" AS ENUM('PICKUP', 'DISPATCH');--> statement-breakpoint
ALTER TYPE "public"."DispatchStatus" ADD VALUE 'PARTIALLY_DELIVERED' BEFORE 'DELIVERED';--> statement-breakpoint
ALTER TYPE "public"."RequestOrderStatus" ADD VALUE 'PARTIALLY_RECEIVED' BEFORE 'GOODS_RECEIVED';--> statement-breakpoint
ALTER TYPE "public"."Role" ADD VALUE 'MANAGER' BEFORE 'USER';--> statement-breakpoint
ALTER TYPE "public"."Role" ADD VALUE 'ACCOUNTANT' BEFORE 'USER';--> statement-breakpoint
ALTER TYPE "public"."Role" ADD VALUE 'CASHIER' BEFORE 'USER';--> statement-breakpoint
CREATE TABLE "AccountingConfig" (
	"id" text PRIMARY KEY NOT NULL,
	"defaultSalesAccountId" text,
	"defaultInventoryAccountId" text,
	"defaultCogsAccountId" text,
	"defaultVarianceAccountId" text,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "BusinessAccount" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"type" text NOT NULL,
	"usage" text[],
	"glAccountId" text NOT NULL,
	"isEnabled" boolean DEFAULT true,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Inventory" (
	"id" text PRIMARY KEY NOT NULL,
	"itemId" text NOT NULL,
	"outletId" text NOT NULL,
	"quantity" numeric(65, 30) DEFAULT '0' NOT NULL,
	"minStockLevel" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "InventoryAdjustment" (
	"id" text PRIMARY KEY NOT NULL,
	"itemId" text NOT NULL,
	"outletId" text NOT NULL,
	"quantityChange" numeric(65, 30) NOT NULL,
	"reason" "AdjustmentType" NOT NULL,
	"notes" text,
	"userId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "InventoryTransfer" (
	"id" text PRIMARY KEY NOT NULL,
	"sourceOutletId" text NOT NULL,
	"destinationOutletId" text NOT NULL,
	"status" "TransferStatus" DEFAULT 'PENDING' NOT NULL,
	"type" "TransferType" DEFAULT 'DISPATCH' NOT NULL,
	"items" jsonb NOT NULL,
	"notes" text,
	"createdById" text NOT NULL,
	"receivedById" text,
	"receivedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ItemCategory" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"businessType" text,
	"description" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ItemCategory_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "ItemOutletPrice" (
	"id" text PRIMARY KEY NOT NULL,
	"itemId" text NOT NULL,
	"outletId" text NOT NULL,
	"price" numeric(65, 30) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "LoyaltyLog" (
	"id" text PRIMARY KEY NOT NULL,
	"contactId" text NOT NULL,
	"outletId" text,
	"points" numeric(65, 30) NOT NULL,
	"type" "loyalty_log_type" NOT NULL,
	"referenceId" text,
	"description" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Dispatch" ALTER COLUMN "salesId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "Dispatch" ALTER COLUMN "contactId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "RequestGrn" ALTER COLUMN "requestOrderId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "Dispatch" ADD COLUMN "transferId" text;--> statement-breakpoint
ALTER TABLE "Dispatch" ADD COLUMN "deliveryMethod" "DeliveryMethod" DEFAULT 'DELIVERY' NOT NULL;--> statement-breakpoint
ALTER TABLE "Expense" ADD COLUMN "outletId" text;--> statement-breakpoint
ALTER TABLE "PaymentMethod" ADD COLUMN "glAccountId" text;--> statement-breakpoint
ALTER TABLE "RequestGrn" ADD COLUMN "transferId" text;--> statement-breakpoint
ALTER TABLE "SalesTax" ADD COLUMN "glAccountId" text;--> statement-breakpoint
ALTER TABLE "SalesTax" ADD COLUMN "createdAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "SalesTax" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "Shift" ADD COLUMN "verifiedCash" numeric(65, 30);--> statement-breakpoint
ALTER TABLE "Shift" ADD COLUMN "verifiedCard" numeric(65, 30);--> statement-breakpoint
ALTER TABLE "Shift" ADD COLUMN "isReconciled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "SpQuote" ADD COLUMN "discountAmount" numeric(65, 30) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "SpQuote" ADD COLUMN "loyaltyPointsUsed" numeric(65, 30) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "SpQuote" ADD COLUMN "deliveryMethod" "DeliveryMethod" DEFAULT 'DELIVERY' NOT NULL;--> statement-breakpoint
ALTER TABLE "SpSale" ADD COLUMN "outletId" text;--> statement-breakpoint
ALTER TABLE "SpSale" ADD COLUMN "deliveryMethod" "DeliveryMethod" DEFAULT 'DELIVERY' NOT NULL;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "outletId" text;--> statement-breakpoint
ALTER TABLE "AccountingConfig" ADD CONSTRAINT "AccountingConfig_defaultSalesAccountId_Account_id_fk" FOREIGN KEY ("defaultSalesAccountId") REFERENCES "public"."Account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AccountingConfig" ADD CONSTRAINT "AccountingConfig_defaultInventoryAccountId_Account_id_fk" FOREIGN KEY ("defaultInventoryAccountId") REFERENCES "public"."Account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AccountingConfig" ADD CONSTRAINT "AccountingConfig_defaultCogsAccountId_Account_id_fk" FOREIGN KEY ("defaultCogsAccountId") REFERENCES "public"."Account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AccountingConfig" ADD CONSTRAINT "AccountingConfig_defaultVarianceAccountId_Account_id_fk" FOREIGN KEY ("defaultVarianceAccountId") REFERENCES "public"."Account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "BusinessAccount" ADD CONSTRAINT "BusinessAccount_glAccountId_Account_id_fk" FOREIGN KEY ("glAccountId") REFERENCES "public"."Account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_itemId_Item_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_outletId_Outlet_id_fk" FOREIGN KEY ("outletId") REFERENCES "public"."Outlet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_itemId_Item_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_outletId_Outlet_id_fk" FOREIGN KEY ("outletId") REFERENCES "public"."Outlet"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_sourceOutletId_Outlet_id_fk" FOREIGN KEY ("sourceOutletId") REFERENCES "public"."Outlet"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_destinationOutletId_Outlet_id_fk" FOREIGN KEY ("destinationOutletId") REFERENCES "public"."Outlet"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_createdById_User_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_receivedById_User_id_fk" FOREIGN KEY ("receivedById") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ItemOutletPrice" ADD CONSTRAINT "ItemOutletPrice_itemId_Item_id_fk" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ItemOutletPrice" ADD CONSTRAINT "ItemOutletPrice_outletId_Outlet_id_fk" FOREIGN KEY ("outletId") REFERENCES "public"."Outlet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "LoyaltyLog" ADD CONSTRAINT "LoyaltyLog_contactId_Contact_id_fk" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "LoyaltyLog" ADD CONSTRAINT "LoyaltyLog_outletId_Outlet_id_fk" FOREIGN KEY ("outletId") REFERENCES "public"."Outlet"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_item_outlet_unique" ON "Inventory" USING btree ("itemId","outletId");--> statement-breakpoint
CREATE UNIQUE INDEX "item_outlet_price_unique" ON "ItemOutletPrice" USING btree ("itemId","outletId");--> statement-breakpoint
ALTER TABLE "Dispatch" ADD CONSTRAINT "Dispatch_transferId_InventoryTransfer_id_fk" FOREIGN KEY ("transferId") REFERENCES "public"."InventoryTransfer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_outletId_Outlet_id_fk" FOREIGN KEY ("outletId") REFERENCES "public"."Outlet"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_glAccountId_Account_id_fk" FOREIGN KEY ("glAccountId") REFERENCES "public"."Account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "RequestGrn" ADD CONSTRAINT "RequestGrn_transferId_InventoryTransfer_id_fk" FOREIGN KEY ("transferId") REFERENCES "public"."InventoryTransfer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "SalesTax" ADD CONSTRAINT "SalesTax_glAccountId_Account_id_fk" FOREIGN KEY ("glAccountId") REFERENCES "public"."Account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "SpSale" ADD CONSTRAINT "SpSale_outletId_Outlet_id_fk" FOREIGN KEY ("outletId") REFERENCES "public"."Outlet"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "User" ADD CONSTRAINT "User_outletId_Outlet_id_fk" FOREIGN KEY ("outletId") REFERENCES "public"."Outlet"("id") ON DELETE no action ON UPDATE no action;