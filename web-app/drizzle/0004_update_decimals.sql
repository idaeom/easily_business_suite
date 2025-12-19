DO $$ BEGIN
    ALTER TYPE "public"."ItemType" ADD VALUE 'SERVICE';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    ALTER TYPE "public"."ItemType" ADD VALUE 'MANUFACTURED';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    ALTER TYPE "public"."ItemType" ADD VALUE 'RAW_MATERIAL';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shift_cash_deposits" (
	"id" text PRIMARY KEY NOT NULL,
	"shiftId" text NOT NULL,
	"amount" numeric(65, 30) NOT NULL,
	"accountId" text,
	"reference" text,
	"notes" text,
	"depositedById" text,
	"status" text DEFAULT 'PENDING',
	"reconciledById" text,
	"reconciledAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shift_reconciliations" (
	"id" text PRIMARY KEY NOT NULL,
	"shiftId" text NOT NULL,
	"paymentMethodCode" text NOT NULL,
	"accountId" text,
	"status" text DEFAULT 'PENDING',
	"expectedAmount" numeric(65, 30) NOT NULL,
	"actualAmount" numeric(65, 30) NOT NULL,
	"difference" numeric(65, 30) DEFAULT '0',
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "DispatchGrnEntry" ALTER COLUMN "quantityDispatched" SET DATA TYPE numeric(65, 30);--> statement-breakpoint
ALTER TABLE "DispatchGrnEntry" ALTER COLUMN "quantityDelivered" SET DATA TYPE numeric(65, 30);--> statement-breakpoint
ALTER TABLE "DispatchGrnEntry" ALTER COLUMN "quantityDelivered" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "DispatchGrnEntry" ALTER COLUMN "quantityReturned" SET DATA TYPE numeric(65, 30);--> statement-breakpoint
ALTER TABLE "DispatchGrnEntry" ALTER COLUMN "quantityReturned" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "Item" ALTER COLUMN "quantity" SET DATA TYPE numeric(65, 30);--> statement-breakpoint
ALTER TABLE "Item" ALTER COLUMN "quantity" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "RequestOrderItem" ALTER COLUMN "quantity" SET DATA TYPE numeric(65, 30);--> statement-breakpoint
ALTER TABLE "SpQuoteItem" ALTER COLUMN "quantity" SET DATA TYPE numeric(65, 30);--> statement-breakpoint
ALTER TABLE "SpSaleItem" ALTER COLUMN "quantity" SET DATA TYPE numeric(65, 30);--> statement-breakpoint
ALTER TABLE "CustomerLedgerEntry" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'CONFIRMED';--> statement-breakpoint
ALTER TABLE "CustomerLedgerEntry" ADD COLUMN IF NOT EXISTS "reconciledById" text;--> statement-breakpoint
ALTER TABLE "CustomerLedgerEntry" ADD COLUMN IF NOT EXISTS "reconciledAt" timestamp;--> statement-breakpoint
ALTER TABLE "shift_cash_deposits" ADD CONSTRAINT "shift_cash_deposits_shiftId_Shift_id_fk" FOREIGN KEY ("shiftId") REFERENCES "public"."Shift"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_cash_deposits" ADD CONSTRAINT "shift_cash_deposits_accountId_Account_id_fk" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_cash_deposits" ADD CONSTRAINT "shift_cash_deposits_depositedById_User_id_fk" FOREIGN KEY ("depositedById") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_cash_deposits" ADD CONSTRAINT "shift_cash_deposits_reconciledById_User_id_fk" FOREIGN KEY ("reconciledById") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_reconciliations" ADD CONSTRAINT "shift_reconciliations_shiftId_Shift_id_fk" FOREIGN KEY ("shiftId") REFERENCES "public"."Shift"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_reconciliations" ADD CONSTRAINT "shift_reconciliations_accountId_Account_id_fk" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CustomerLedgerEntry" ADD CONSTRAINT "CustomerLedgerEntry_reconciledById_User_id_fk" FOREIGN KEY ("reconciledById") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;