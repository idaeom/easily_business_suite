
/**
 * Test Mode Configuration Service
 * Centralizes all logic related to Test Mode behaviors, mock accounts, and API overrides.
 */
export class TestConfig {
    // Environment Flag (can be extended to check process.env.NEXT_PUBLIC_APP_MODE)
    static isTestMode = true;

    // Bank Names that trigger Test Mode behavior
    private static TEST_BANK_KEYWORDS = ["Test", "Demo", "Titan"];

    /**
     * Checks if a Source Account is a Test Account.
     * Test Accounts:
     * - Allow "Fund 50k" simulation.
     * - Skip external provider balance checks.
     * - Use Mock Transfer logic (unless it's "Demo Bank" which uses Real API).
     */
    static isTestAccount(bankName: string | null | undefined, isTestMode: boolean = true): boolean {
        // If NOT in Test Mode, treat everything as Real (unless we want to strictly hide test accounts)
        // For now, let's say if isTestMode is FALSE, we disable "Fund 50k" and Mock Transfers.
        if (!isTestMode) return false;

        if (!bankName) return false;
        return this.TEST_BANK_KEYWORDS.some(keyword => bankName.includes(keyword));
    }

    /**
     * Checks if a Beneficiary is a Test Beneficiary.
     * Test Beneficiaries:
     * - Trigger "Skip Resolution" logic.
     * - Trigger "Force Bank Code" logic.
     */
    static isTestBeneficiary(bankName: string | null | undefined, isTestMode: boolean = true): boolean {
        if (!isTestMode) return false;

        if (!bankName) return false;
        return this.TEST_BANK_KEYWORDS.some(keyword => bankName.includes(keyword));
    }

    /**
     * Returns the Forced Bank Code for Test Transfers.
     * Currently mapped to Zenith Bank (057) to ensure API acceptance.
     */
    static getTestBankCode(): string {
        return "057"; // Zenith Bank
    }

    /**
     * Determines if Account Resolution should be skipped.
     * Skipped for Test Beneficiaries to avoid Paystack "Daily Limit Exceeded" error.
     */
    static shouldSkipResolution(bankName: string | null | undefined, isTestMode: boolean = true): boolean {
        return this.isTestBeneficiary(bankName, isTestMode);
    }

    /**
     * Determines if the Real API should be called for a Test Account.
     * "Demo Bank" is special: It is a Test Account but we want to test the Real API with it.
     * "Titan Bank" uses Mock Transfer.
     */
    static shouldCallRealApi(bankName: string | null | undefined, isTestMode: boolean = true): boolean {
        // If we are NOT in Test Mode, we ALWAYS call the Real API (assuming it's a real account).
        // If it's a Test Account but we are in Live Mode, we probably shouldn't be using it, 
        // but if we do, we should try Real API (which will fail for Titan, succeed for Demo if valid).
        if (!isTestMode) return true;

        if (!bankName) return true; // Default to Real API for non-test accounts
        if (bankName.includes("Demo")) return true; // Demo Bank -> Real API
        if (bankName.includes("Titan")) return false; // Titan Bank -> Mock Transfer
        return false; // Default Test Account -> Mock Transfer
    }

    /**
     * Retrieves the appropriate Paystack Secret Key based on the current mode.
     */
    static getPaystackKey(isTestMode: boolean = true): string | undefined {
        if (isTestMode) {
            return process.env.PAYSTACK_SECRET_KEY_TEST || process.env.PAYSTACK_SECRET_KEY;
        }
        return process.env.PAYSTACK_SECRET_KEY;
    }

    /**
     * Retrieves the appropriate Squadco Secret Key based on the current mode.
     */
    static getSquadcoKey(isTestMode: boolean = true): string | undefined {
        if (isTestMode) {
            return process.env.SQUADCO_SECRET_KEY_TEST || process.env.SQUADCO_SECRET_KEY;
        }
        return process.env.SQUADCO_SECRET_KEY;
    }
}
