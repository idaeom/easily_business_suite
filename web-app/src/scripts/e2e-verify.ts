
import { getDb } from "@/db";
import { users, leaveRequests, appraisals, payrollRuns, expenses } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
    createLeaveRequest,
    certifyLeaveRequest,
    approveLeaveRequest
} from "@/app/actions";
import { AppraisalService } from "@/lib/appraisal";
import { PayrollService } from "@/lib/payroll";
import { ExpenseService } from "@/lib/expenses";

async function main() {
    console.log("🚀 Starting End-to-End Verification...");
    const db = await getDb();

    // 1. Setup Test Users
    const timestamp = Date.now();
    const adminEmail = `admin_${timestamp}@test.com`;
    const employeeEmail = `emp_${timestamp}@test.com`;

    console.log(`\n👤 Creating Test Users...`);
    // Create Admin
    const [adminUser] = await db.insert(users).values({
        name: "Test Admin",
        email: adminEmail,
        role: "ADMIN",
        permissions: ["HR_CERTIFIER", "HR_APPROVER", "EXPENSE_PAY"]
    }).returning();

    // Create Employee
    const [employeeUser] = await db.insert(users).values({
        name: "Test Employee",
        email: employeeEmail,
        role: "USER"
    }).returning();

    console.log(`   ✅ Admin: ${adminUser.id}`);
    console.log(`   ✅ Employee: ${employeeUser.id}`);

    // Mock Authentication (We'll assume functions use passed IDs or we'd need to mock the session)
    // Note: Server Actions usually call `getAuthenticatedUser()`. checking logic...
    // Since we can't easily mock `getServerSession` in a standalone script without more setup,
    // we will DIRECTLY call the Service layer where possible, or mock the context if we use Actions.

    // For this script, to be robust, let's assume we invoke Service methods directly where possible
    // or we'd need to modify Actions to accept an "actor" override (bad practice for security).
    // Let's rely on Service layers. 
    // Checking `LeaveService`...

    const { LeaveService } = await import("@/lib/leave");

    // 2. Leave Request Flow
    console.log(`\n🏝️  Testing Leave Request Flow...`);
    const leaveRequest = await LeaveService.createRequest({
        userId: employeeUser.id,
        type: "ANNUAL",
        startDate: new Date(),
        endDate: new Date(),
        reason: "E2E Test Leave"
    });
    console.log(`   Created Request: ${leaveRequest.id} [${leaveRequest.status}]`);

    // Certify
    await LeaveService.certifyRequest(leaveRequest.id, adminUser.id);
    console.log(`   Certified Request: ${leaveRequest.id}`);

    // Approve
    await LeaveService.approveRequest(leaveRequest.id, adminUser.id);
    console.log(`   Approved Request: ${leaveRequest.id}`);

    // 3. Appraisal Flow
    console.log(`\n📈 Testing Appraisal Flow...`);
    const appraisal = await AppraisalService.createAppraisal({
        userId: employeeUser.id,
        reviewerId: adminUser.id,
        period: "2025-Q1",
        feedback: "End-to-End Test Feedback", // Added missing required field
        rating: 8, // Added missing field
        kpis: []
    });
    console.log(`   Created Appraisal: ${appraisal.id} [${appraisal.status}]`);

    // Certify
    await AppraisalService.certifyAppraisal(appraisal.id, adminUser.id);
    console.log(`   Certified Appraisal`);

    // Approve
    await AppraisalService.approveAppraisal(appraisal.id, adminUser.id);
    console.log(`   Approved Appraisal`);

    // 4. Profile Change Flow
    console.log(`\n👤 Testing Profile Change Flow...`);
    const { ProfileChangeService } = await import("@/lib/hr");

    // Request
    const profileRequest = await ProfileChangeService.requestChange(adminUser.id, employeeUser.id, {
        jobTitle: "Senior Product Manager"
    });
    console.log(`   Created Profile Change Request: ${profileRequest.id} [${profileRequest.status}]`);

    // Certify
    await ProfileChangeService.certifyRequest(profileRequest.id, adminUser.id);
    console.log(`   Certified Profile Change`);

    // Approve
    await ProfileChangeService.approveRequest(profileRequest.id, adminUser.id);
    console.log(`   Approved Profile Change`);

    // Verify Profile Updated
    const { HrService } = await import("@/lib/hr");
    const updatedProfile = await HrService.getProfile(employeeUser.id);
    if (updatedProfile?.jobTitle !== "Senior Product Manager") {
        throw new Error("Profile Job Title update failed!");
    }
    console.log(`   ✅ Profile Updated: Job Title is now "${updatedProfile.jobTitle}"`);

    // 5. Payroll Flow
    console.log(`\n💸 Testing Payroll Flow...`);
    // We need to make sure the employee has a profile for Payroll to pick them up
    // Check if profile exists, if not create
    const { employeeProfiles } = await import("@/db/schema");

    // Upsert Profile (it might exist from the Profile Change above, or not if we changed flow order)
    const existingProfile = await HrService.getProfile(employeeUser.id);
    if (!existingProfile) {
        await db.insert(employeeProfiles).values({
            userId: employeeUser.id,
            basicSalary: "500000", // 500k
        });
        console.log(`   Created Employee Profile with 500k Salary`);
    } else {
        // Ensure salary is set
        await db.update(employeeProfiles).set({ basicSalary: "500000" }).where(eq(employeeProfiles.id, existingProfile.id));
        console.log(`   Updated Employee Profile with 500k Salary`);
    }

    // Generate Run
    const month = 12; // December
    const year = 2026; // Future date to avoid conflict (2026 now)
    const run = await PayrollService.createPayrollRun(month, year, adminUser.id);
    console.log(`   Generated Payroll Run: ${run.id}`);

    // Check items count by querying DB
    const { payrollItems } = await import("@/db/schema");
    const items = await db.query.payrollItems.findMany({ where: eq(payrollItems.payrollRunId, run.id) });
    console.log(`   Generated ${items.length} Payroll Items`);

    if (items.length === 0) {
        throw new Error("Payroll Run generated 0 items! verification failed.");
    }

    // Submit
    await PayrollService.submitForCertification(run.id);
    console.log(`   Submitted for Certification`);

    // Certify
    await PayrollService.certifyPayrollRun(run.id, adminUser.id);
    console.log(`   Certified Payroll Run`);

    // Approve
    const approvalResult = await PayrollService.approvePayrollRun(run.id, adminUser.id);
    console.log(`   Approved Payroll Run`);

    // Verify Expenses Created
    const salaryExpenseId = (approvalResult.expenseIds as any)?.salaryExpenseId;

    if (!salaryExpenseId) throw new Error("Salary Expense not created!");

    const expense = await db.query.expenses.findFirst({
        where: eq(expenses.id, salaryExpenseId)
    });

    if (!expense) throw new Error("Expense record not found in DB!");
    console.log(`   ✅ Salary Expense Created: ${expense.id} for ₦${expense.amount}`);

    console.log("\n✅✅✅ E2E VERIFICATION SUCCESSFUL ✅✅✅");
    process.exit(0);
}

main().catch(e => {
    console.error("\n❌ E2E VERIFICATION FAILED:");
    console.error(e);
    process.exit(1);
});
