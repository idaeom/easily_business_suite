import { z } from "zod";

export const createContactSchema = z.object({
    name: z.string().min(2, "Name is required"),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional(),
    address: z.string().optional(),
    type: z.enum(["CUSTOMER", "VENDOR", "BOTH"]).default("CUSTOMER")
});

export const addCustomerBalanceSchema = z.object({
    contactId: z.string().uuid(),
    amount: z.coerce.number().positive("Amount must be positive"),
    notes: z.string().optional(),
    method: z.enum(["CASH", "TRANSFER", "CARD"]).default("CASH")
});

export type CreateContactDto = z.infer<typeof createContactSchema>;
export type AddCustomerBalanceDto = z.infer<typeof addCustomerBalanceSchema>;
