import { z } from "zod";



export interface Bank {
    name: string;
    slug: string;
    code: string;
    longcode: string;
    gateway: string | null;
    pay_with_bank: boolean;
    active: boolean;
    is_deleted: boolean;
    country: string;
    currency: string;
    type: string;
    id: number;
    createdAt: string;
    updatedAt: string;
}

export interface ResolvedAccount {
    account_number: string;
    account_name: string;
    bank_id: number;
}

export class PaystackService {
    private static baseUrl = "https://api.paystack.co";

    static async getBanks(secretKey?: string): Promise<Bank[]> {
        const key = secretKey || process.env.PAYSTACK_SECRET_KEY;
        if (!key) {
            console.warn("PAYSTACK_SECRET_KEY is not set. Returning mock banks.");
            return [
                { name: "Guaranty Trust Bank", code: "058", slug: "gtbank", longcode: "", gateway: null, pay_with_bank: true, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "commercial", id: 1, createdAt: "", updatedAt: "" },
                { name: "Zenith Bank", code: "057", slug: "zenith-bank", longcode: "", gateway: null, pay_with_bank: true, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "commercial", id: 2, createdAt: "", updatedAt: "" },
                { name: "First Bank of Nigeria", code: "011", slug: "first-bank-of-nigeria", longcode: "", gateway: null, pay_with_bank: true, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "commercial", id: 3, createdAt: "", updatedAt: "" },
                { name: "United Bank For Africa", code: "033", slug: "uba", longcode: "", gateway: null, pay_with_bank: true, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "commercial", id: 4, createdAt: "", updatedAt: "" },
                { name: "Access Bank", code: "044", slug: "access-bank", longcode: "", gateway: null, pay_with_bank: true, active: true, is_deleted: false, country: "Nigeria", currency: "NGN", type: "commercial", id: 5, createdAt: "", updatedAt: "" },
            ];
        }

        try {
            const response = await fetch(`${this.baseUrl}/bank`, {
                headers: {
                    Authorization: `Bearer ${key}`,
                },
                next: { revalidate: 86400 }, // Cache for 24 hours
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch banks: ${response.statusText}`);
            }

            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error("Error fetching banks:", error);
            return [];
        }
    }

    static async resolveAccount(accountNumber: string, bankCode: string, secretKey?: string): Promise<ResolvedAccount | null> {
        const key = secretKey || process.env.PAYSTACK_SECRET_KEY;
        if (!key) {
            console.warn("PAYSTACK_SECRET_KEY is not set. Returning mock resolved account.");
            // Mock resolution logic
            if (accountNumber.length === 10) {
                return {
                    account_number: accountNumber,
                    account_name: "MOCK ACCOUNT NAME",
                    bank_id: 1,
                };
            }
            return null;
        }

        try {
            const response = await fetch(`${this.baseUrl}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`, {
                headers: {
                    Authorization: `Bearer ${key}`,
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Paystack resolution error:", errorData);
                return null;
            }

            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error("Error resolving account:", error);
            return null;
        }
    }
    static async createTransferRecipient(name: string, accountNumber: string, bankCode: string, secretKey?: string): Promise<string | null> {
        const key = secretKey || process.env.PAYSTACK_SECRET_KEY;
        if (!key) {
            console.warn("PAYSTACK_SECRET_KEY is not set. Returning mock recipient code.");
            return `RCP_${Math.random().toString(36).substring(7)}`;
        }

        try {
            const response = await fetch(`${this.baseUrl}/transferrecipient`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${key}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    type: "nuban",
                    name,
                    account_number: accountNumber,
                    bank_code: bankCode,
                    currency: "NGN",
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Paystack create recipient error:", errorData);
                return null;
            }

            const data = await response.json();
            return data.data.recipient_code;
        } catch (error) {
            console.error("Error creating transfer recipient:", error);
            return null;
        }
    }

    static async initiateTransfer(
        amountOrData: number | { amount: number; recipientName: string; bankCode: string; accountNumber: string; reason: string },
        recipientCode?: string,
        reason?: string,
        secretKey?: string
    ): Promise<string | null> {
        let amount: number;
        let finalRecipientCode: string;
        let finalReason: string;

        if (typeof amountOrData === "object") {
            amount = amountOrData.amount;
            finalReason = amountOrData.reason;
            // Auto-create recipient
            const code = await this.createTransferRecipient(amountOrData.recipientName, amountOrData.accountNumber, amountOrData.bankCode, secretKey);
            if (!code) throw new Error("Failed to create transfer recipient");
            finalRecipientCode = code;
        } else {
            amount = amountOrData;
            finalRecipientCode = recipientCode!;
            finalReason = reason!;
        }

        const key = secretKey || process.env.PAYSTACK_SECRET_KEY;
        if (!key) {
            console.warn("PAYSTACK_SECRET_KEY is not set. Returning mock transfer code.");
            return `TRF_${Math.random().toString(36).substring(7)}`;
        }

        try {
            const response = await fetch(`${this.baseUrl}/transfer`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${key}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    source: "balance",
                    amount: Math.round(amount * 100), // Convert to kobo
                    recipient: finalRecipientCode,
                    reason: finalReason,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Paystack initiate transfer error:", errorData);
                return null;
            }

            const data = await response.json();
            return data.data.transfer_code;
        } catch (error) {
            console.error("Error initiating transfer:", error);
            return null;
        }
    }

    static async verifyTransfer(transferCode: string, secretKey?: string): Promise<string | null> {
        const key = secretKey || process.env.PAYSTACK_SECRET_KEY;
        if (!key) {
            console.warn("PAYSTACK_SECRET_KEY is not set. Returning mock verification status.");
            return "success";
        }

        try {
            const response = await fetch(`${this.baseUrl}/transfer/verify/${transferCode}`, {
                headers: {
                    Authorization: `Bearer ${key}`,
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Paystack verify transfer error:", errorData);
                return null;
            }

            const data = await response.json();
            return data.data.status;
        } catch (error) {
            console.error("Error verifying transfer:", error);
            return null;
        }
    }

    static async getBalance(secretKey?: string): Promise<number> {
        const key = secretKey || process.env.PAYSTACK_SECRET_KEY;
        if (!key) {
            console.warn("PAYSTACK_SECRET_KEY is not set. Returning mock balance.");
            return 100000000; // 1 Million Naira in kobo
        }

        try {
            const response = await fetch(`${this.baseUrl}/balance`, {
                headers: {
                    Authorization: `Bearer ${key}`,
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Paystack get balance error:", errorData);
                return 0;
            }

            const data = await response.json();
            // Paystack returns an array of balances per currency. We assume NGN.
            const ngnBalance = data.data.find((b: any) => b.currency === "NGN");
            return ngnBalance ? ngnBalance.balance : 0;
        } catch (error) {
            console.error("Error getting balance:", error);
            return 0;
        }
    }
    static async createDedicatedAccount(
        customer: { email: string; first_name: string; last_name: string; phone: string },
        secretKey?: string
    ): Promise<any | null> {
        const key = secretKey || process.env.PAYSTACK_SECRET_KEY;
        if (!key) {
            console.warn("PAYSTACK_SECRET_KEY is not set. Returning mock dedicated account.");
            return {
                bank: { name: "Wema Bank", slug: "wema-bank" },
                account_name: `${customer.first_name} ${customer.last_name}`,
                account_number: "99" + Math.random().toString().slice(2, 10),
                assigned: true,
                currency: "NGN",
            };
        }

        try {
            let customerCode;

            // 1. Try to Create Customer
            const customerResponse = await fetch(`${this.baseUrl}/customer`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${key}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(customer),
            });

            const customerData = await customerResponse.json();

            if (customerResponse.ok) {
                customerCode = customerData.data.customer_code;
            } else {
                // If creation failed, check if it's because customer exists
                // Paystack might return 400 with message "Customer already exists" or similar
                console.warn("Paystack create customer failed, trying to fetch:", customerData);

                // 1b. Fetch Customer by Email
                const fetchResponse = await fetch(`${this.baseUrl}/customer/${customer.email}`, {
                    headers: { Authorization: `Bearer ${key}` },
                });

                if (fetchResponse.ok) {
                    const fetchData = await fetchResponse.json();
                    customerCode = fetchData.data.customer_code;
                } else {
                    console.error("Failed to fetch existing customer:", await fetchResponse.json());
                    return null;
                }
            }

            if (!customerCode) {
                console.error("Could not obtain customer code.");
                return null;
            }

            // 2. Create Dedicated Account
            const response = await fetch(`${this.baseUrl}/dedicated_account`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${key}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ customer: customerCode, preferred_bank: "wema-bank" }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Paystack create dedicated account error:", errorData);

                // Handle Test Mode Limitation
                if (errorData.message && errorData.message.includes("test mode")) {
                    console.warn("Test mode detected, returning mock dedicated account.");
                    return {
                        bank: { name: "Demo Bank", slug: "demo-bank" },
                        account_name: `${customer.first_name} ${customer.last_name}`,
                        account_number: "1230001644",
                        assigned: true,
                        currency: "NGN",
                    };
                }

                return null;
            }

            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error("Error creating dedicated account:", error);
            return null;
        }
    }

    static async listTransactions(secretKey?: string): Promise<any[]> {
        const key = secretKey || process.env.PAYSTACK_SECRET_KEY;
        if (!key) return [];

        try {
            const response = await fetch(`${this.baseUrl}/transaction`, {
                headers: { Authorization: `Bearer ${key}` },
            });
            const data = await response.json();
            return data.status ? data.data : [];
        } catch (error) {
            console.error("Error listing transactions:", error);
            return [];
        }
    }

    static async resolveBVN(bvn: string, secretKey?: string): Promise<boolean> {
        const key = secretKey || process.env.PAYSTACK_SECRET_KEY;
        if (!key) return true; // Mock success

        try {
            const response = await fetch(`${this.baseUrl}/bank/resolve_bvn/${bvn}`, {
                headers: { Authorization: `Bearer ${key}` },
            });
            const data = await response.json();
            return data.status;
        } catch (error) {
            console.error("Error resolving BVN:", error);
            return false;
        }
    }

    static async createPaymentLink(
        data: { name: string; description: string; amount: number },
        secretKey?: string
    ): Promise<string | null> {
        const key = secretKey || process.env.PAYSTACK_SECRET_KEY;
        if (!key) return `https://paystack.com/pay/mock-${Date.now()}`;

        try {
            const response = await fetch(`${this.baseUrl}/page`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${key}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: data.name,
                    description: data.description,
                    amount: data.amount * 100, // Kobo
                }),
            });

            const resData = await response.json();
            return resData.status ? `https://paystack.com/pay/${resData.data.slug}` : null;
        } catch (error) {
            console.error("Error creating payment page:", error);
            return null;
        }
    }
}
