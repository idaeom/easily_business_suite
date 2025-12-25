import { z } from "zod";

export const earnPointsSchema = z.object({
    saleId: z.string().uuid(),
    customerId: z.string().uuid(),
    outletId: z.string().uuid(),
    amountPaid: z.coerce.number().positive("Amount must be positive")
});

export const redeemPointsSchema = z.object({
    customerId: z.string().uuid(),
    outletId: z.string().uuid(),
    pointsToRedeem: z.coerce.number().positive("Points must be positive"),
    saleId: z.string().uuid().optional()
});

export type EarnPointsDto = z.infer<typeof earnPointsSchema>;
export type RedeemPointsDto = z.infer<typeof redeemPointsSchema>;
