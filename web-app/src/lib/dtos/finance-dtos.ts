import { z } from "zod";

export const createBusinessAccountSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    type: z.enum(["CASH", "BANK", "MOMO"]),
    usage: z.array(z.string()),
    glAccountId: z.string().uuid("Invalid GL Account ID"),
    isEnabled: z.boolean(),
    openingBalance: z.coerce.number().optional()
});

export const updateBusinessAccountSchema = createBusinessAccountSchema.partial();

export const createJournalEntrySchema = z.object({
    description: z.string().min(3, "Description is required"),
    date: z.coerce.date(),
    entries: z.array(z.object({
        accountId: z.string().uuid("Invalid Account ID"),
        debit: z.coerce.number().min(0),
        credit: z.coerce.number().min(0),
        description: z.string().optional()
    })).min(2, "Journal entry must have at least 2 lines")
        .refine((entries) => {
            const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
            const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);
            return Math.abs(totalDebit - totalCredit) < 0.01;
        }, "Total Debits must equal Total Credits")
});

export type CreateBusinessAccountDto = z.infer<typeof createBusinessAccountSchema>;
export type UpdateBusinessAccountDto = z.infer<typeof updateBusinessAccountSchema>;
export type CreateJournalEntryDto = z.infer<typeof createJournalEntrySchema>;
