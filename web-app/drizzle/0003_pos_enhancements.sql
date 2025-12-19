CREATE TYPE "public"."DiscountType" AS ENUM('PERCENTAGE', 'FIXED');--> statement-breakpoint
CREATE TYPE "public"."TaxType" AS ENUM('INCLUSIVE', 'EXCLUSIVE');--> statement-breakpoint
CREATE TABLE "Discount" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "DiscountType" NOT NULL,
	"value" numeric(65, 30) NOT NULL,
	"isEnabled" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "SalesTax" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"rate" numeric(65, 30) NOT NULL,
	"type" "TaxType" DEFAULT 'EXCLUSIVE' NOT NULL,
	"isEnabled" boolean DEFAULT true
);
--> statement-breakpoint
ALTER TABLE "Contact" ALTER COLUMN "loyaltyPoints" SET DATA TYPE numeric(65, 30);--> statement-breakpoint
ALTER TABLE "Contact" ALTER COLUMN "loyaltyPoints" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "Outlet" ADD COLUMN "loyaltyEarningRate" numeric(65, 30) DEFAULT '0.05';--> statement-breakpoint
ALTER TABLE "Outlet" ADD COLUMN "loyaltyRedemptionRate" numeric(65, 30) DEFAULT '1.0';--> statement-breakpoint
ALTER TABLE "PosTransaction" ADD COLUMN "discountId" text;--> statement-breakpoint
ALTER TABLE "PosTransaction" ADD COLUMN "discountAmount" numeric(65, 30) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "PosTransaction" ADD COLUMN "taxAmount" numeric(65, 30) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "PosTransaction" ADD COLUMN "taxSnapshot" jsonb;--> statement-breakpoint
ALTER TABLE "PosTransaction" ADD COLUMN "loyaltyPointsEarned" numeric(65, 30) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "PosTransaction" ADD COLUMN "loyaltyPointsRedeemed" numeric(65, 30) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "PosTransaction" ADD COLUMN "originalTransactionId" text;--> statement-breakpoint
ALTER TABLE "PosTransaction" ADD COLUMN "isRefund" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "PosTransaction" ADD CONSTRAINT "PosTransaction_discountId_Discount_id_fk" FOREIGN KEY ("discountId") REFERENCES "public"."Discount"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PosTransaction" ADD CONSTRAINT "PosTransaction_originalTransactionId_PosTransaction_id_fk" FOREIGN KEY ("originalTransactionId") REFERENCES "public"."PosTransaction"("id") ON DELETE no action ON UPDATE no action;