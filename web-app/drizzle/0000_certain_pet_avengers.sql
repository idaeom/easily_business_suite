CREATE TYPE "public"."AccountType" AS ENUM('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE');--> statement-breakpoint
CREATE TYPE "public"."BeneficiaryStatus" AS ENUM('PENDING', 'PAID');--> statement-breakpoint
CREATE TYPE "public"."ExpenseStatus" AS ENUM('PENDING', 'CERTIFIED', 'APPROVED', 'DISBURSED', 'REJECTED', 'PROCESSING_PAYMENT', 'PAYMENT_FAILED', 'PARTIALLY_PAID');--> statement-breakpoint
CREATE TYPE "public"."JournalEntryStatus" AS ENUM('DRAFT', 'POSTED');--> statement-breakpoint
CREATE TYPE "public"."Role" AS ENUM('ADMIN', 'USER');--> statement-breakpoint
CREATE TYPE "public"."TaskStatus" AS ENUM('TODO', 'IN_PROGRESS', 'DONE', 'CERTIFIED', 'APPROVED');--> statement-breakpoint
CREATE TYPE "public"."TeamType" AS ENUM('TEAM', 'DEPARTMENT', 'UNIT');--> statement-breakpoint
CREATE TYPE "public"."TransactionDirection" AS ENUM('DEBIT', 'CREDIT');--> statement-breakpoint
CREATE TYPE "public"."AppraisalStatus" AS ENUM('DRAFT', 'SUBMITTED', 'REVIEWED', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."EmploymentType" AS ENUM('FULL_TIME', 'CONTRACT', 'INTERN');--> statement-breakpoint
CREATE TYPE "public"."LeaveStatus" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."LeaveType" AS ENUM('ANNUAL', 'SICK', 'MATERNITY', 'PATERNITY', 'UNPAID', 'CASUAL');--> statement-breakpoint
CREATE TYPE "public"."PaymentFrequency" AS ENUM('MONTHLY', 'WEEKLY', 'BI_WEEKLY');--> statement-breakpoint
CREATE TYPE "public"."PayrollStatus" AS ENUM('DRAFT', 'APPROVED', 'PAID');--> statement-breakpoint
CREATE TABLE "Account" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"type" "AccountType" NOT NULL,
	"isExternal" boolean DEFAULT false NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"description" text,
	"balance" numeric(65, 30) DEFAULT '0' NOT NULL,
	"provider" text,
	"credentials" jsonb,
	"bank_name" text,
	"account_number" text,
	CONSTRAINT "Account_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "Appraisal" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"reviewerId" text NOT NULL,
	"period" text NOT NULL,
	"score" integer,
	"comments" text,
	"status" "AppraisalStatus" DEFAULT 'DRAFT' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Attachment" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"type" text NOT NULL,
	"size" integer NOT NULL,
	"taskId" text,
	"expenseId" text,
	"uploaderId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AuditLog" (
	"id" text PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"entityId" text NOT NULL,
	"entityType" text NOT NULL,
	"userId" text NOT NULL,
	"details" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Budget" (
	"id" text PRIMARY KEY NOT NULL,
	"categoryId" text NOT NULL,
	"amount" numeric(65, 30) NOT NULL,
	"startDate" timestamp NOT NULL,
	"endDate" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Comment" (
	"id" text PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"taskId" text,
	"expenseId" text,
	"userId" text NOT NULL,
	"parentId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "EmployeeProfile" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"jobTitle" text,
	"employmentType" "EmploymentType" DEFAULT 'FULL_TIME' NOT NULL,
	"basicSalary" numeric(65, 30) DEFAULT '0' NOT NULL,
	"housingAllowance" numeric(65, 30) DEFAULT '0' NOT NULL,
	"transportAllowance" numeric(65, 30) DEFAULT '0' NOT NULL,
	"otherAllowances" numeric(65, 30) DEFAULT '0' NOT NULL,
	"bankName" text,
	"accountNumber" text,
	"taxId" text,
	"pensionId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "EmployeeProfile_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "ExpenseBeneficiary" (
	"id" text PRIMARY KEY NOT NULL,
	"expenseId" text NOT NULL,
	"name" text NOT NULL,
	"bankName" text NOT NULL,
	"bankCode" text NOT NULL,
	"accountNumber" text NOT NULL,
	"amount" numeric(65, 30) NOT NULL,
	"recipientCode" text,
	"transferCode" text,
	"status" "BeneficiaryStatus" DEFAULT 'PENDING' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ExpenseCategory" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ExpenseCategory_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "Expense" (
	"id" text PRIMARY KEY NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(65, 30) NOT NULL,
	"status" "ExpenseStatus" DEFAULT 'PENDING' NOT NULL,
	"category" text,
	"payee" text,
	"payeeBankName" text,
	"payeeAccountNumber" text,
	"incurredAt" timestamp DEFAULT now(),
	"taskId" text,
	"requesterId" text NOT NULL,
	"approverId" text,
	"sourceAccountId" text,
	"expenseAccountId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "LeaveRequest" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"type" "LeaveType" NOT NULL,
	"startDate" timestamp NOT NULL,
	"endDate" timestamp NOT NULL,
	"reason" text,
	"status" "LeaveStatus" DEFAULT 'PENDING' NOT NULL,
	"approverId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "LedgerEntry" (
	"id" text PRIMARY KEY NOT NULL,
	"transactionId" text NOT NULL,
	"accountId" text NOT NULL,
	"amount" numeric(65, 30) NOT NULL,
	"direction" "TransactionDirection" NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "Notification" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"title" text,
	"message" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "PayrollItem" (
	"id" text PRIMARY KEY NOT NULL,
	"payrollRunId" text NOT NULL,
	"userId" text NOT NULL,
	"grossPay" numeric(65, 30) NOT NULL,
	"netPay" numeric(65, 30) NOT NULL,
	"breakdown" jsonb DEFAULT '{"basic":0,"housing":0,"transport":0,"tax":0,"pension":0,"otherDeductions":0,"bonuses":0}'::jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "PayrollRun" (
	"id" text PRIMARY KEY NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"totalAmount" numeric(65, 30) DEFAULT '0' NOT NULL,
	"status" "PayrollStatus" DEFAULT 'DRAFT' NOT NULL,
	"expenseId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "TaskExtension" (
	"id" text PRIMARY KEY NOT NULL,
	"taskId" text NOT NULL,
	"previousDate" timestamp NOT NULL,
	"newDate" timestamp NOT NULL,
	"reason" text,
	"userId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "TaskParticipant" (
	"id" text PRIMARY KEY NOT NULL,
	"taskId" text NOT NULL,
	"userId" text NOT NULL,
	"role" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "TaskStage" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#808080' NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Task" (
	"id" text PRIMARY KEY NOT NULL,
	"uniqueNumber" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "TaskStatus" DEFAULT 'TODO' NOT NULL,
	"assigneeId" text,
	"parentId" text,
	"teamId" text,
	"definitionOfDone" text,
	"isTemplate" boolean DEFAULT false NOT NULL,
	"stageId" text,
	"startDate" timestamp,
	"dueDate" timestamp,
	"originalDueDate" timestamp,
	"estimatedDuration" integer,
	"recurrenceInterval" text,
	"nextRun" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Task_uniqueNumber_unique" UNIQUE("uniqueNumber")
);
--> statement-breakpoint
CREATE TABLE "TeamMember" (
	"id" text PRIMARY KEY NOT NULL,
	"teamId" text NOT NULL,
	"userId" text NOT NULL,
	"role" text NOT NULL,
	"joinedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Team" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" "TeamType" DEFAULT 'TEAM' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Transaction" (
	"id" text PRIMARY KEY NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"description" text NOT NULL,
	"reference" text,
	"status" "JournalEntryStatus" DEFAULT 'POSTED' NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"password" text,
	"image" text,
	"role" "Role" DEFAULT 'USER' NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb,
	"teamId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "User_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "VerificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "VerificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "Appraisal" ADD CONSTRAINT "Appraisal_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Appraisal" ADD CONSTRAINT "Appraisal_reviewerId_User_id_fk" FOREIGN KEY ("reviewerId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_taskId_Task_id_fk" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_expenseId_Expense_id_fk" FOREIGN KEY ("expenseId") REFERENCES "public"."Expense"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploaderId_User_id_fk" FOREIGN KEY ("uploaderId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_categoryId_ExpenseCategory_id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."ExpenseCategory"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_taskId_Task_id_fk" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_expenseId_Expense_id_fk" FOREIGN KEY ("expenseId") REFERENCES "public"."Expense"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."Comment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ExpenseBeneficiary" ADD CONSTRAINT "ExpenseBeneficiary_expenseId_Expense_id_fk" FOREIGN KEY ("expenseId") REFERENCES "public"."Expense"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_taskId_Task_id_fk" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_requesterId_User_id_fk" FOREIGN KEY ("requesterId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_approverId_User_id_fk" FOREIGN KEY ("approverId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_sourceAccountId_Account_id_fk" FOREIGN KEY ("sourceAccountId") REFERENCES "public"."Account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_expenseAccountId_Account_id_fk" FOREIGN KEY ("expenseAccountId") REFERENCES "public"."Account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_approverId_User_id_fk" FOREIGN KEY ("approverId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_transactionId_Transaction_id_fk" FOREIGN KEY ("transactionId") REFERENCES "public"."Transaction"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_accountId_Account_id_fk" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_payrollRunId_PayrollRun_id_fk" FOREIGN KEY ("payrollRunId") REFERENCES "public"."PayrollRun"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_expenseId_Expense_id_fk" FOREIGN KEY ("expenseId") REFERENCES "public"."Expense"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TaskExtension" ADD CONSTRAINT "TaskExtension_taskId_Task_id_fk" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TaskExtension" ADD CONSTRAINT "TaskExtension_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TaskParticipant" ADD CONSTRAINT "TaskParticipant_taskId_Task_id_fk" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TaskParticipant" ADD CONSTRAINT "TaskParticipant_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_User_id_fk" FOREIGN KEY ("assigneeId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Task" ADD CONSTRAINT "Task_teamId_Team_id_fk" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Task" ADD CONSTRAINT "Task_stageId_TaskStage_id_fk" FOREIGN KEY ("stageId") REFERENCES "public"."TaskStage"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Task" ADD CONSTRAINT "Task_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."Task"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_Team_id_fk" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "User" ADD CONSTRAINT "User_teamId_Team_id_fk" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE no action ON UPDATE no action;