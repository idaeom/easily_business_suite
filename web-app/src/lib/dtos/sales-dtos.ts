import { z } from "zod";

export const createQuoteSchema = z.object({
    contactId: z.string().uuid("Invalid Contact ID"),
    customerName: z.string().min(1, "Customer Name is required"),
    items: z.array(z.object({
        itemId: z.string().uuid("Invalid Item ID"),
        itemName: z.string(),
        quantity: z.coerce.number().positive("Quantity must be positive"),
        unitPrice: z.coerce.number().min(0)
    })).min(1, "At least one item is required"),
    validUntil: z.coerce.date().optional(),
    notes: z.string().optional(),
    deliveryMethod: z.enum(["DELIVERY", "PICKUP"]).optional()
});

export const updateQuoteDetailsSchema = z.object({
    notes: z.string().optional(),
    discountAmount: z.coerce.number().min(0).optional(),
    loyaltyPointsUsed: z.coerce.number().min(0).optional(),
    deliveryMethod: z.enum(["DELIVERY", "PICKUP"]).optional()
});

export const convertQuoteSchema = z.object({
    discountAmount: z.coerce.number().min(0).optional(),
    loyaltyPointsUsed: z.coerce.number().min(0).optional()
});

export type CreateQuoteDto = z.infer<typeof createQuoteSchema>;
export type UpdateQuoteDetailsDto = z.infer<typeof updateQuoteDetailsSchema>;
export type ConvertQuoteDto = z.infer<typeof convertQuoteSchema>;
