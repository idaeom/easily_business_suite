
import {
    employeeProfiles,
    payrollRuns,
    leaveRequests,
    appraisals
} from "../db/schema";
import { type InferSelectModel } from "drizzle-orm";

// Type Checks (Testing compilation of types)
type EmployeeProfile = InferSelectModel<typeof employeeProfiles>;
type PayrollRun = InferSelectModel<typeof payrollRuns>;
type LeaveRequest = InferSelectModel<typeof leaveRequests>;
type Appraisal = InferSelectModel<typeof appraisals>;

console.log("Types validated successfully");
