import { z } from "zod";

export const createEmployeeProfileSchema = z.object({
    userId: z.string().uuid("Invalid User ID"),
    jobTitle: z.string().min(2, "Job Title is required"),
    employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"]),
    basicSalary: z.coerce.number().min(0),
    housingAllowance: z.coerce.number().min(0),
    transportAllowance: z.coerce.number().min(0),
    otherAllowances: z.coerce.number().min(0),
    isPensionActive: z.boolean(),
    pensionVoluntary: z.coerce.number().optional(),
    bankName: z.string().min(2),
    accountNumber: z.string().min(10),
    pfaName: z.string().optional(),
    pfaCode: z.string().optional(),
    pensionId: z.string().optional(),
    taxId: z.string().optional()
});

export const updateEmployeeProfileSchema = createEmployeeProfileSchema.partial();

export type CreateEmployeeProfileDto = z.infer<typeof createEmployeeProfileSchema>;
export type UpdateEmployeeProfileDto = z.infer<typeof updateEmployeeProfileSchema>;
