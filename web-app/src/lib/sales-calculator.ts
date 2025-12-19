
import { DiscountType, TaxType } from "@/db/enums";

// Data interfaces matching DB or App models
export interface CartItem {
    price: number;
    qty: number;
    // Potentially item specific tax overrides in future
}

export interface DiscountRule {
    type: "PERCENTAGE" | "FIXED";
    value: number;
}

export interface TaxRule {
    name: string;
    rate: number; // Percentage e.g. 7.5
    type: "INCLUSIVE" | "EXCLUSIVE";
    isEnabled: boolean;
}

export interface CalculationResult {
    subtotal: number;
    discountAmount: number;
    totalAfterDiscount: number;
    taxAmount: number;
    pointsEarned: number;
    total: number;
    taxesApplied: { name: string; amount: number; rate: number; type: "INCLUSIVE" | "EXCLUSIVE" }[];
}

export class SalesCalculator {
    static calculate(
        items: CartItem[],
        discount: DiscountRule | null,
        taxRules: TaxRule[],
        loyaltyEarningRate: number = 0 // 0.05 = 5%
    ): CalculationResult {
        // 1. Subtotal
        const subtotal = items.reduce((acc, item) => acc + (item.price * item.qty), 0);

        // 2. Discount
        let discountAmount = 0;
        if (discount) {
            if (discount.type === "FIXED") {
                discountAmount = discount.value;
            } else if (discount.type === "PERCENTAGE") {
                discountAmount = subtotal * (discount.value / 100);
            }
        }
        // Cap discount at subtotal
        if (discountAmount > subtotal) discountAmount = subtotal;
        if (discountAmount < 0) discountAmount = 0;

        const totalAfterDiscount = subtotal - discountAmount;

        // 3. Taxes
        // Strategy: Apply all enabled tax rules
        // Inclusive taxes are extracted from price. Exclusive are added.
        // Usually taxes apply to the discounted amount? Yes.

        let totalTaxAmount = 0;
        const taxesApplied: { name: string; amount: number; rate: number; type: "INCLUSIVE" | "EXCLUSIVE" }[] = [];

        for (const rule of taxRules) {
            if (!rule.isEnabled) continue;

            let ruleAmount = 0;
            if (rule.type === "EXCLUSIVE") {
                // Added on top
                ruleAmount = totalAfterDiscount * (rule.rate / 100);
            } else {
                // Inclusive: Extracted
                // Price = Base + Tax
                // Base = Price / (1 + rate/100)
                // Tax = Price - Base
                const base = totalAfterDiscount / (1 + (rule.rate / 100));
                ruleAmount = totalAfterDiscount - base;
            }

            taxesApplied.push({
                name: rule.name,
                rate: rule.rate,
                type: rule.type,
                amount: SalesCalculator.round(ruleAmount)
            });

            // If Exclusive, it adds to the final total. 
            // If Inclusive, it's already in the totalBeforeTax (which is totalAfterDiscount).
            // We need to track totalTaxAmount separate from "Added Tax".
            // The "Total To Pay" = TotalAfterDiscount + ExclusiveTaxes.
            if (rule.type === "EXCLUSIVE") {
                totalTaxAmount += ruleAmount;
            }
            // For inclusive, the tax amount is informational part of the revenue, not added to customer bill.
        }

        // 4. Final Total
        // Sum of Exclusive Taxes + TotalAfterDiscount
        let exclusiveTaxSum = taxesApplied.filter(t => t.type === "EXCLUSIVE").reduce((acc, t) => acc + t.amount, 0);
        const finalTotal = totalAfterDiscount + exclusiveTaxSum;

        // 5. Loyalty Points
        // Earned on Final Total? Or Subtotal? 
        // Typically Final Total (Total Spend).
        const pointsEarned = finalTotal * loyaltyEarningRate;

        return {
            subtotal: SalesCalculator.round(subtotal),
            discountAmount: SalesCalculator.round(discountAmount),
            totalAfterDiscount: SalesCalculator.round(totalAfterDiscount),
            taxAmount: SalesCalculator.round(taxesApplied.reduce((acc, t) => acc + t.amount, 0)), // Total Tax (Inc + Exc)
            pointsEarned: SalesCalculator.round(pointsEarned),
            total: SalesCalculator.round(finalTotal),
            taxesApplied
        };
    }

    // Helper for 2 decimal places
    static round(num: number): number {
        return Math.round((num + Number.EPSILON) * 100) / 100;
    }
}
