
import { SalesTax } from "@/db/schema";
import { roundToTwo } from "./math"; // Assuming this exists, based on pos.ts usage. If not I'll define it or inline it.

// Helper for rounding if math.ts doesn't export it globally or I can't find it easily.
// I'll assume I can import it, but to be safe and avoid import errors if the path is wrong, I will define a local helper
// or check if pos.ts imports it from "@/lib/utils/math". Yes it does: import { roundToTwo } from "@/lib/utils/math";

// Re-implementing a simple rounder to avoid dependency issues if that file is moved/missing, 
// OR I will try to import it. Let's try to import it for consistency.
// Actually, to be 100% safe and self-contained, I'll add the helper here.

function safeRound(num: number): number {
    return Math.round((num + Number.EPSILON) * 100) / 100;
}

export interface TaxCalculationResult {
    inclusiveTaxAmount: number;
    exclusiveTaxAmount: number;
    totalTax: number;
    subtotal: number; // Gross input
    netSubtotal: number; // Subtotal minus inclusive tax
    finalTotal: number; // Final payable
    breakdown: {
        id: string;
        name: string;
        rate: number;
        amount: number;
        type: "INCLUSIVE" | "EXCLUSIVE";
    }[];
}

export function calculateTax(
    subtotal: number,
    taxes: SalesTax[]
): TaxCalculationResult {
    let inclusiveTaxAmount = 0;
    let exclusiveTaxAmount = 0;
    const breakdown: TaxCalculationResult['breakdown'] = [];

    // Filter enabled taxes just in case, though caller should usually do this
    const activeTaxes = taxes.filter(t => t.isEnabled);

    // 1. Calculate Inclusive Taxes
    // Formula: Inclusive Tax = Total - (Total / (1 + Sum(Rates)))
    const inclusiveRatesSum = activeTaxes
        .filter(t => t.type === "INCLUSIVE")
        .reduce((sum, t) => sum + Number(t.rate), 0);

    const inclusiveRateDecimal = inclusiveRatesSum / 100;

    // Total = Base * (1 + Rate)
    // Base = Total / (1 + Rate)
    // Tax = Total - Base

    // Net Subtotal is the "real" price before any tax
    // Use safeRound for currency
    const netBaseFromInclusive = subtotal / (1 + inclusiveRateDecimal);
    inclusiveTaxAmount = safeRound(subtotal - netBaseFromInclusive);

    // We can attribute this amount proportionally to each inclusive tax if needed
    // For now, we just need total inclusive amount for the breakdown logic
    if (inclusiveRatesSum > 0) {
        activeTaxes.filter(t => t.type === "INCLUSIVE").forEach(t => {
            // Pro-rata share of the total inclusive tax
            // share = (rate / totalInclusiveRates) * totalInclusiveTax
            const share = (Number(t.rate) / inclusiveRatesSum) * inclusiveTaxAmount;
            breakdown.push({
                id: t.id,
                name: t.name,
                rate: Number(t.rate),
                amount: safeRound(share),
                type: "INCLUSIVE"
            });
        });
    }

    const netSubtotal = safeRound(subtotal - inclusiveTaxAmount);

    // 2. Calculate Exclusive Taxes
    // Base is the Net Subtotal
    activeTaxes.filter(t => t.type === "EXCLUSIVE").forEach(t => {
        const amount = safeRound(netSubtotal * (Number(t.rate) / 100));
        exclusiveTaxAmount += amount;
        breakdown.push({
            id: t.id,
            name: t.name,
            rate: Number(t.rate),
            amount: amount,
            type: "EXCLUSIVE"
        });
    });

    // Final Totals
    const totalTax = safeRound(inclusiveTaxAmount + exclusiveTaxAmount);

    // Final Total = original subtotal (which includes inclusive) + exclusive tax
    // OR Final Total = netSubtotal + inclusiveTaxAmount + exclusiveTaxAmount
    // Both should be same.
    const finalTotal = safeRound(subtotal + exclusiveTaxAmount);

    return {
        inclusiveTaxAmount,
        exclusiveTaxAmount,
        totalTax,
        subtotal,
        netSubtotal,
        finalTotal,
        breakdown
    };
}
