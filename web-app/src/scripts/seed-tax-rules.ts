
import { getDb } from "../db";
import { taxRules } from "../db/schema";

async function main() {
    const db = await getDb();
    console.log("Seeding Tax Rules...");

    // Rule 1: Finance Act 2020 (Default)
    await db.insert(taxRules).values({
        name: "Finance Act 2020",
        description: "Standard Nigerian PAYE (CRA + 6 Bands)",
        isDefault: true,
        rules: {
            type: "progressive",
            taxableIncomeBasis: "gross",
            cra: {
                enabled: true,
                consolidatedParams: { min: 200000, percent: 0.01 },
                percentGross: 0.20
            },
            bands: [
                { limit: 300000, rate: 0.07 },
                { limit: 300000, rate: 0.11 },
                { limit: 500000, rate: 0.15 },
                { limit: 500000, rate: 0.19 },
                { limit: 1600000, rate: 0.21 },
                { limit: 9999999999, rate: 0.24 }
            ],
            exemptions: { threshold: 360000 }
        } as any
    });

    // Rule 2: Finance Act 2025 (Proposed)
    await db.insert(taxRules).values({
        name: "Finance Act 2025 (Proposed)",
        description: "New Law: <800k Exempt, No CRA, Rent Relief, Revised Bands",
        isDefault: false,
        rules: {
            type: "progressive",
            taxableIncomeBasis: "gross",
            cra: {
                enabled: false,
                percentRent: 0.20,
                rentCap: 500000
            },
            bands: [
                { limit: 800000, rate: 0.00 },
                { limit: 2200000, rate: 0.15 }, // Next 2.2M (Total 3M)
                { limit: 9000000, rate: 0.18 }, // Next 9M (Total 12M)
                { limit: 13000000, rate: 0.21 }, // Next 13M (Total 25M)
                { limit: 25000000, rate: 0.23 }, // Next 25M (Total 50M)
                { limit: 9999999999, rate: 0.25 }
            ],
            exemptions: { threshold: 800000 }
        } as any
    });

    console.log("Tax Rules seeded.");
    process.exit(0);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
