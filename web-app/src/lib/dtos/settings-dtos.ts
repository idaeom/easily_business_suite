import { z } from "zod";

// Outlet DTOs
export const createOutletSchema = z.object({
    name: z.string().min(2, "Name is required"),
    address: z.string().optional(),
    phone: z.string().optional(),
    loyaltyEarningRate: z.string().optional().default("0.05"),
    loyaltyRedemptionRate: z.string().optional().default("1.0")
});

export const updateOutletSchema = createOutletSchema.partial();

// Tax DTOs
export const saveSalesTaxSchema = z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(2),
    rate: z.coerce.number().min(0),
    type: z.enum(["INCLUSIVE", "EXCLUSIVE"]),
    isEnabled: z.boolean()
});

// Discount DTOs
export const saveDiscountSchema = z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(2),
    type: z.enum(["PERCENTAGE", "FIXED"]),
    value: z.coerce.number().min(0),
    isEnabled: z.boolean()
});

export type CreateOutletDto = z.infer<typeof createOutletSchema>;
export type UpdateOutletDto = z.infer<typeof updateOutletSchema>;
export type SaveSalesTaxDto = z.infer<typeof saveSalesTaxSchema>;
export type SaveDiscountDto = z.infer<typeof saveDiscountSchema>;
