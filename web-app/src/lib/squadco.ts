export interface ResolvedAccount {
    account_number: string;
    account_name: string;
    bank_code: string;
}

export class SquadcoService {
    private static getBaseUrl(secretKey: string) {
        return secretKey.startsWith("sandbox_")
            ? "https://sandbox-api-d.squadco.com"
            : "https://api-d.squadco.com";
    }

    static async resolveAccount(accountNumber: string, bankCode: string, secretKey: string): Promise<ResolvedAccount | null> {
        if (!secretKey) {
            console.error("Squadco Secret Key is missing");
            return null;
        }

        try {
            const response = await fetch(`${this.getBaseUrl(secretKey)}/payout/account/lookup`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${secretKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    bank_code: bankCode,
                    account_number: accountNumber,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Squadco resolution error:", errorData);
                return null;
            }

            const data = await response.json();
            if (data.status === 200 && data.data) {
                return {
                    account_number: data.data.account_number,
                    account_name: data.data.account_name,
                    bank_code: bankCode,
                };
            }
            return null;
        } catch (error) {
            console.error("Error resolving Squadco account:", error);
            return null;
        }
    }

    static async initiateTransfer(
        data: { amount: number; recipientName: string; bankCode: string; accountNumber: string; reason: string },
        secretKey: string
    ): Promise<string | null> {
        if (!secretKey) {
            console.error("Squadco Secret Key is missing");
            return null;
        }

        const transactionReference = `SQ_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        try {
            const response = await fetch(`${this.getBaseUrl(secretKey)}/payout/transfer`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${secretKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    transaction_reference: transactionReference,
                    amount: Math.round(data.amount * 100).toString(), // Kobo as string
                    bank_code: data.bankCode,
                    account_number: data.accountNumber,
                    account_name: data.recipientName,
                    currency_id: "NGN",
                    remark: data.reason,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Squadco initiate transfer error:", errorData);
                return null;
            }

            const resData = await response.json();
            if (resData.status === 200) {
                return transactionReference; // Squadco uses the ref we sent
            }
            return null;
        } catch (error) {
            console.error("Error initiating Squadco transfer:", error);
            return null;
        }
    }

    static async getBalance(secretKey: string): Promise<number> {
        if (!secretKey) {
            console.error("Squadco Secret Key is missing");
            return 0;
        }

        try {
            const response = await fetch(`${this.getBaseUrl(secretKey)}/merchant/balance?currency_id=NGN`, {
                headers: {
                    Authorization: `Bearer ${secretKey}`,
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Squadco get balance error:", errorData);
                return 0;
            }

            const data = await response.json();
            if (data.status === 200 && data.data) {
                // data.data.balance is in Kobo
                return Number(data.data.balance);
            }
            return 0;
        } catch (error) {
            console.error("Error getting Squadco balance:", error);
            return 0;
        }
    }
    static async createVirtualAccount(
        data: { firstName: string; lastName: string; middleName?: string; mobileNum: string; dob: string; email: string; bvn: string; gender: "1" | "2" },
        secretKey: string
    ): Promise<any | null> {
        if (!secretKey) return null;

        try {
            const response = await fetch(`${this.getBaseUrl(secretKey)}/virtual-account`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${secretKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    first_name: data.firstName,
                    last_name: data.lastName,
                    middle_name: data.middleName,
                    mobile_num: data.mobileNum,
                    dob: data.dob, // MM/DD/YYYY
                    email: data.email,
                    bvn: data.bvn,
                    gender: data.gender, // 1 = Male, 2 = Female
                    customer_identifier: data.email,
                }),
            });

            const resData = await response.json();
            return resData.status === 200 ? resData.data : null;
        } catch (error) {
            console.error("Error creating Squadco virtual account:", error);
            return null;
        }
    }

    static async createPaymentLink(
        data: { name: string; amount: number; email: string; currency: string },
        secretKey: string
    ): Promise<string | null> {
        if (!secretKey) return null;

        try {
            const response = await fetch(`${this.getBaseUrl(secretKey)}/payment/link`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${secretKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: data.name,
                    hash: data.name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now(),
                    link_status: 1,
                    amounts: [
                        {
                            amount: data.amount * 100, // Kobo
                            currency_id: data.currency,
                        },
                    ],
                    description: data.name,
                    redirect_link: "https://google.com", // TODO: Update with real redirect
                    return_msg: "Payment Successful",
                }),
            });

            const resData = await response.json();
            return resData.status === 200 ? resData.data.link_url : null;
        } catch (error) {
            console.error("Error creating Squadco payment link:", error);
            return null;
        }
    }
    static async getBanks(): Promise<{ name: string; code: string }[]> {
        // Static list from Squadco Documentation
        return [
            { name: "TEST BANK", code: "001" },
            { name: "GTBank Plc", code: "000013" },
            { name: "Zenith Bank Plc", code: "000015" },
            { name: "First Bank of Nigeria", code: "000016" },
            { name: "Access Bank", code: "000014" },
            { name: "United Bank for Africa", code: "000004" },
            { name: "Sterling Bank", code: "000001" },
            { name: "Keystone Bank", code: "000002" },
            { name: "FCMB", code: "000003" },
            { name: "Fidelity Bank", code: "000007" },
            { name: "Polaris Bank", code: "000008" },
            { name: "Ecobank Bank", code: "000010" },
            { name: "StanbicIBTC Bank", code: "000012" },
            { name: "Wema Bank", code: "000017" },
            { name: "Union Bank", code: "000018" },
            { name: "Heritage", code: "000020" },
            { name: "Standard Chartered", code: "000021" },
            { name: "Suntrust Bank", code: "000022" },
            { name: "Providus Bank", code: "000023" },
            { name: "Jaiz Bank", code: "000006" },
            { name: "Unity Bank", code: "000011" },
            { name: "Citi Bank", code: "000009" },
            { name: "Titan Trust Bank", code: "000025" },
            { name: "Globus Bank", code: "000027" },
            { name: "Kuda Microfinance Bank", code: "090267" },
            { name: "Moniepoint MFB", code: "090405" },
            { name: "Opay Digital Services", code: "100004" },
            { name: "Palmpay", code: "100033" },
            { name: "VFD MFB", code: "090110" }
        ].sort((a, b) => a.name.localeCompare(b.name));
    }
}
