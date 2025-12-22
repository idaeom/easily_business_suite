
"use server";

import { getDb } from "@/db";
import { employeeProfiles, users, teams } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type EmployeeInput = {
    userId: string;
    jobTitle: string;
    employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERN";
    basicSalary: number;
    housingAllowance: number;
    transportAllowance: number;
    otherAllowances: number;
    isPensionActive: boolean;
    pensionVoluntary?: number;
    bankName: string;
    accountNumber: string;
    pfaName?: string;
    pfaCode?: string;
    pensionId?: string;
    taxId?: string;
};

export async function getEmployees() {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");
    const db = await getDb();

    // Fetch Users with their Employee Profile AND Team
    const employees = await db.query.users.findMany({
        where: (users, { exists }) => exists(
            db.select().from(employeeProfiles).where(eq(employeeProfiles.userId, users.id))
        ),
        with: {
            employeeProfile: true, // The HR details
            team: true // Department
        },
        orderBy: [desc(users.createdAt)]
    });

    return employees;
}

export async function getEmployeeById(id: string) { // id is userId
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");
    const db = await getDb();

    return await db.query.users.findFirst({
        where: eq(users.id, id),
        with: {
            employeeProfile: true,
            team: true
        }
    });
}

// Ensure every "User" can be an "Employee"
// This creates the profile if it doesn't exist
export async function createEmployeeProfile(data: EmployeeInput) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");
    const db = await getDb();

    // Check if exists
    const existing = await db.query.employeeProfiles.findFirst({
        where: eq(employeeProfiles.userId, data.userId)
    });

    if (existing) {
        throw new Error("Employee profile already exists for this user.");
    }

    await db.insert(employeeProfiles).values({
        userId: data.userId,
        jobTitle: data.jobTitle,
        employmentType: data.employmentType,
        basicSalary: data.basicSalary.toString(),
        housingAllowance: data.housingAllowance.toString(),
        transportAllowance: data.transportAllowance.toString(),
        otherAllowances: data.otherAllowances.toString(),
        isPensionActive: data.isPensionActive,
        pensionVoluntary: data.pensionVoluntary ? data.pensionVoluntary.toString() : "0",
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        pfaName: data.pfaName,
        pfaCode: data.pfaCode,
        pensionId: data.pensionId,
        taxId: data.taxId,
        createdAt: new Date(),
        updatedAt: new Date()
    });

    if (process.env.IS_SCRIPT !== "true") {
        try {
            revalidatePath("/dashboard/hr/employees");
        } catch (e) {
            // Context missing, ignore in script
        }
    }
    return { success: true };
}

export async function updateEmployeeProfile(userId: string, data: Partial<EmployeeInput>) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");
    const db = await getDb();

    // Transform numbers to strings for Decimal type
    const updateData: any = { ...data, updatedAt: new Date() };
    if (data.basicSalary !== undefined) updateData.basicSalary = data.basicSalary.toString();
    if (data.housingAllowance !== undefined) updateData.housingAllowance = data.housingAllowance.toString();
    if (data.transportAllowance !== undefined) updateData.transportAllowance = data.transportAllowance.toString();
    if (data.otherAllowances !== undefined) updateData.otherAllowances = data.otherAllowances.toString();
    if (data.pensionVoluntary !== undefined) updateData.pensionVoluntary = data.pensionVoluntary.toString();

    await db.update(employeeProfiles)
        .set(updateData)
        .where(eq(employeeProfiles.userId, userId));

    revalidatePath("/dashboard/hr/employees");
    return { success: true };
}
