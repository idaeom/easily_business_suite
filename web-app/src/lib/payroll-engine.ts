
/**
 * Nigeria Payroll Engine
 * Implements Finance Act 2020/2023 PAYE Calculation
 */

export type PayrollInput = {
    earnings: {
        basic: number;
        housing: number;
        transport: number;
        others: number;
        bonuses: number; // Taxable
    };
    settings: {
        isPensionActive: boolean;
        pensionVoluntary: number; // Additional voluntary
        isNhfActive: boolean; // National Housing Fund (2.5%)
        isNhisActive: boolean; // NHIS (5% usually, or fixed)
        lifeAssurance: number; // Direct relief
        // Attendance
        totalDays: number;
        absentDays: number;
        // Ad-hoc
        otherDeductions: number; // Post-tax or Pre-tax? Usually Post-tax unless specific scheme. Assuming Post.
    };
};

export type PayrollResult = {
    gross: number;
    taxableIncome: number;
    allowances: {
        consolidatedRelief: number;
        pension: number;
        nhf: number;
        nhis: number;
        lifeAssurance: number;
        totalReliefs: number;
    };
    earnings: {
        basic: number;
        housing: number;
        transport: number;
        others: number;
        bonuses: number;
    };
    tax: {
        paye: number;
        breakdown: { band: string; amount: number; rate: number }[];
    };
    deductions: {
        pension: number;
        nhf: number;
        nhis: number;
        other: number;
        total: number;
    };
    employerContribution: {
        pension: number;
    };
    netPay: number;
    proRataFactor: number;
};

export class PayrollEngine {
    // Statutory Rates
    static readonly PENSION_RATE = 0.08;
    static readonly NHF_RATE = 0.025;
    // NHIS is often flat or % of basic. We'll use input or default.

    static calculate(input: PayrollInput, rule?: any): PayrollResult {
        // Default Rule: Finance Act 2020 (Simplistic fallback if no rule provided)
        const activeRule = rule || {
            type: "progressive",
            taxableIncomeBasis: "gross",
            cra: { enabled: true, consolidatedParams: { min: 200000, percent: 0.01 }, percentGross: 0.20 },
            bands: [
                { limit: 300000, rate: 0.07 },
                { limit: 300000, rate: 0.11 },
                { limit: 500000, rate: 0.15 },
                { limit: 500000, rate: 0.19 },
                { limit: 1600000, rate: 0.21 },
                { limit: Infinity, rate: 0.24 }
            ],
            exemptions: { threshold: 360000 } // 30k min wage
        };

        // 1. Pro-Rata Adjustment
        const effectiveDays = Math.max(0, input.settings.totalDays - input.settings.absentDays);
        const proRataFactor = input.settings.totalDays > 0 ? (effectiveDays / input.settings.totalDays) : 1;

        const basic = input.earnings.basic * proRataFactor;
        const housing = input.earnings.housing * proRataFactor;
        const transport = input.earnings.transport * proRataFactor;
        const others = input.earnings.others * proRataFactor;
        const bonuses = input.earnings.bonuses;

        const gross = basic + housing + transport + others + bonuses;

        // 2. Statutory Deductions
        let pension = 0;
        if (input.settings.isPensionActive) {
            pension = (basic + housing + transport) * this.PENSION_RATE;
        }
        pension += input.settings.pensionVoluntary;

        let nhf = 0;
        if (input.settings.isNhfActive) {
            nhf = basic * this.NHF_RATE;
        }
        const nhis = 0; // Placeholder
        const lifeAssurance = input.settings.lifeAssurance;

        // 3. Consolidated Relief Allowance (CRA) / Exemptions
        const annualGross = gross * 12;
        const annualPension = pension * 12;
        const annualNhf = nhf * 12;
        const annualNhis = nhis * 12;
        const annualLife = lifeAssurance * 12;

        const annualTaxExempt = annualPension + annualNhf + annualNhis + annualLife;
        const annualGrossForRelief = Math.max(0, annualGross - annualTaxExempt);

        let annualReliefValue = 0;

        if (activeRule.cra.enabled) {
            // Finance Act 2020 Logic
            const params = activeRule.cra.consolidatedParams || { min: 200000, percent: 0.01 };
            const fixedPart = Math.max(params.min, annualGrossForRelief * params.percent);
            const variablePart = annualGrossForRelief * (activeRule.cra.percentGross || 0.20);
            annualReliefValue = fixedPart + variablePart;
        } else if (activeRule.cra.percentRent) {
            // Finance Act 2025 Logic (Rent Relief)
            // Using Housing Allowance as proxy for Rent Paid
            const annualRentPaid = housing * 12;
            const rentCap = activeRule.cra.rentCap || 500000;
            annualReliefValue = Math.min(rentCap, annualRentPaid * activeRule.cra.percentRent);
        }

        const annualTotalReliefs = annualTaxExempt + annualReliefValue;
        const annualTaxableIncome = Math.max(0, annualGross - annualTotalReliefs);

        // Check Exemption Threshold (e.g. < 800k total income?)
        // Usually applied to Gross Income or Taxable? Law says "earning national minimum wage or less" -> Gross.
        // 2025 says "annual income up to 800k". Assuming Gross.
        const exemptionThreshold = activeRule.exemptions?.threshold || 0;
        const isExempt = annualGross <= exemptionThreshold;

        // 4. Calculate Tax
        let tax = 0;
        const breakdown = [];

        if (!isExempt) {
            let remaining = annualTaxableIncome;
            const bands = activeRule.bands || [];

            for (const band of bands) {
                if (remaining <= 0) break;
                // band.limit is the WIDTH of the band, or the UPPER LIMIT?
                // My seed data used WIDTHs for most, except the last which is Infinity.
                // Wait, standard definition:
                // 1st 300k @ 7% -> limit = 300k
                // Next 300k @ 11% -> limit = 300k
                // So 'limit' means 'width'.

                // My 2025 Seed:
                // < 800k @ 0% -> limit = 800k
                // next 2.2M @ 15% -> limit = 2.2M
                // So yes, 'limit' = Width.

                // However, I used 'limit' = Infinity for max.
                // Ensure logic handles 'Infinity' correctly as width.

                const bandWidth = band.limit;
                const taxable = Math.min(remaining, bandWidth);
                const bandTax = taxable * band.rate;
                tax += bandTax;
                remaining -= taxable;
                breakdown.push({ band: `Rate ${(band.rate * 100).toFixed(0)}%`, amount: bandTax / 12, rate: band.rate });
            }
        }

        const monthlyTax = tax / 12;
        const monthlyRelief = annualReliefValue / 12;
        const totalDeductions = pension + nhf + nhis + monthlyTax + input.settings.otherDeductions;
        const netPay = gross - totalDeductions;

        return {
            gross,
            taxableIncome: annualTaxableIncome / 12,
            allowances: {
                consolidatedRelief: monthlyRelief,
                pension,
                nhf,
                nhis,
                lifeAssurance,
                totalReliefs: annualTotalReliefs / 12
            },
            earnings: {
                basic, housing, transport, others, bonuses
            },
            tax: {
                paye: monthlyTax,
                breakdown
            },
            deductions: {
                pension,
                nhf,
                nhis,
                other: input.settings.otherDeductions,
                total: totalDeductions
            },
            employerContribution: {
                pension: (basic + housing + transport) * 0.10 // 10% Employer Contribution
            },
            netPay,
            proRataFactor
        };
    }
}
