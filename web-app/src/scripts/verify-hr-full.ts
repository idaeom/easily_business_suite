
import { getDb } from "../db";
import { users, employeeProfiles, leaveRequests, appraisals } from "../db/schema";
import { eq, count } from "drizzle-orm";
import { LeaveService } from "../lib/leave";
import { AppraisalService } from "../lib/appraisal";

async function main() {
    console.log("Running Full HR Verification...");
    const db = await getDb();

    // 1. Verify Users
    const allUsers = await db.select({ count: count() }).from(users);
    const profiles = await db.select({ count: count() }).from(employeeProfiles);
    console.log(`Users: ${allUsers[0].count} (Expected ~9 including admin)`);
    console.log(`Profiles: ${profiles[0].count} (Expected ~5 seeded employees)`);

    // 2. Simulate Leave Request
    const alice = await db.query.users.findFirst({ where: eq(users.email, "alice@test.com") });
    if (!alice) throw new Error("Alice not found");

    console.log(`Creating Leave Request for ${alice.name}...`);
    const leave = await LeaveService.createRequest({
        userId: alice.id,
        type: "ANNUAL",
        startDate: new Date("2024-12-20"),
        endDate: new Date("2024-12-25"),
        reason: "Christmas Break"
    });
    console.log(`✅ Leave Request Created: ${leave.id} (${leave.status})`);

    // 3. Approve Leave
    const admin = await db.query.users.findFirst({ where: eq(users.email, "hr@test.com") });
    if (!admin) throw new Error("HR Admin not found");

    const approved = await LeaveService.approveRequest(leave.id, admin.id);
    console.log(`✅ Leave Request Approved: ${approved.status} by ${admin.email}`);

    // 4. Submit Appraisal
    console.log(`Submitting Appraisal for ${alice.name}...`);
    const appraisal = await AppraisalService.createAppraisal({
        userId: alice.id,
        reviewerId: admin.id,
        rating: 5,
        feedback: "Excellent performance this year.",
        period: "Q4 2024"
    });
    console.log(`✅ Appraisal Submitted: ID ${appraisal.id} - Score: ${appraisal.score}`);

    console.log("Full HR Verification Complete.");
    process.exit(0);
}

main().catch(console.error);
