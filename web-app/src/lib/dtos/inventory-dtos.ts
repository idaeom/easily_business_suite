import { z } from "zod";

export const itemTypeEnum = z.enum(["RESALE", "INTERNAL_USE", "SERVICE", "MANUFACTURED", "RAW_MATERIAL"]);

export const createItemSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    price: z.coerce.number().min(0, "Price cannot be negative"),
    costPrice: z.coerce.number().min(0, "Cost Price cannot be negative"),
    category: z.string().min(1, "Category is required"),
    itemType: itemTypeEnum,
    sku: z.string().optional(),
    minStockLevel: z.coerce.number().min(0).optional().default(0),
});

export const updateItemSchema = createItemSchema.extend({
    outletPrices: z.array(z.object({
        outletId: z.string(),
        price: z.coerce.number().min(0)
    })).optional()
});

export const createRequisitionSchema = z.object({
    outletId: z.string().uuid("Invalid Outlet ID"),
    items: z.array(z.object({
        itemId: z.string().uuid("Invalid Item ID"),
        quantity: z.coerce.number().positive("Quantity must be positive"),
        estimatedPrice: z.coerce.number().min(0)
    })).min(1, "At least one item is required"),
    description: z.string().optional(),
});

export const createGrnSchema = z.object({
    requestOrderId: z.string().uuid("Invalid Request Order ID"),
    vendorInvoiceNumber: z.string().optional(),
    items: z.array(z.object({
        itemId: z.string().uuid(),
        quantityReceived: z.coerce.number().min(0),
        condition: z.string().default("GOOD")
    })).min(1, "At least one item is required"),
});

export const transferItemsSchema = z.object({
    sourceOutletId: z.string().uuid(),
    destinationOutletId: z.string().uuid(),
    items: z.array(z.object({
        itemId: z.string().uuid(),
        quantity: z.coerce.number().positive()
    })).min(1),
    type: z.enum(["PICKUP", "DISPATCH"]),
    notes: z.string().optional()
});

export type CreateItemDto = z.infer<typeof createItemSchema>;
export type UpdateItemDto = z.infer<typeof updateItemSchema>;
export type CreateRequisitionDto = z.infer<typeof createRequisitionSchema>;
export type CreateGrnDto = z.infer<typeof createGrnSchema>;
export type CreateTransferDto = z.infer<typeof transferItemsSchema>;
