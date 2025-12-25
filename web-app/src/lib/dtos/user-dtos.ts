import { z } from "zod";

export const createUserSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    role: z.enum(["ADMIN", "MANAGER", "ACCOUNTANT", "CASHIER", "USER"]).default("USER"),
    outletId: z.string().optional().nullable(),
});

export const updateUserRoleSchema = z.object({
    userId: z.string().uuid(),
    role: z.enum(["ADMIN", "MANAGER", "ACCOUNTANT", "CASHIER", "USER"]),
});

export const updateUserPermissionsSchema = z.object({
    userId: z.string().uuid(),
    permissions: z.array(z.string()),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserRoleDto = z.infer<typeof updateUserRoleSchema>;
export type UpdateUserPermissionsDto = z.infer<typeof updateUserPermissionsSchema>;
