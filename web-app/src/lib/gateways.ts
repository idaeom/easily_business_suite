export interface PaymentGateway {
    name: string;
    initiateTransaction(amount: number, email: string, reference: string): Promise<{ authorizationUrl: string; accessCode: string }>;
    verifyTransaction(reference: string): Promise<{ status: 'success' | 'failed' | 'pending'; amount: number }>;
    disburse(amount: number, recipientCode: string, reference: string): Promise<{ status: 'success' | 'failed'; reference: string }>;
}

export class PaystackGateway implements PaymentGateway {
    name = 'Paystack';

    async initiateTransaction(amount: number, email: string, reference: string) {
        // Mock implementation
        console.log(`[Paystack] Initiating transaction for ${email}: ${amount} (Ref: ${reference})`);
        return {
            authorizationUrl: `https://checkout.paystack.com/${reference}`,
            accessCode: `ACCESS_${reference}`,
        };
    }

    async verifyTransaction(reference: string) {
        console.log(`[Paystack] Verifying transaction ${reference}`);
        return { status: 'success' as const, amount: 50000 }; // Mock success
    }

    async disburse(amount: number, recipientCode: string, reference: string) {
        console.log(`[Paystack] Disbursing ${amount} to ${recipientCode} (Ref: ${reference})`);
        return { status: 'success' as const, reference };
    }
}

export class MonnifyGateway implements PaymentGateway {
    name = 'Monnify';

    async initiateTransaction(amount: number, email: string, reference: string) {
        console.log(`[Monnify] Initiating transaction for ${email}: ${amount}`);
        return {
            authorizationUrl: `https://checkout.monnify.com/${reference}`,
            accessCode: `MNFY_${reference}`,
        };
    }

    async verifyTransaction(reference: string) {
        return { status: 'success' as const, amount: 50000 };
    }

    async disburse(amount: number, recipientCode: string, reference: string) {
        console.log(`[Monnify] Disbursing ${amount} to ${recipientCode}`);
        return { status: 'success' as const, reference };
    }
}

export class SquadcoGateway implements PaymentGateway {
    name = 'Squadco';

    async initiateTransaction(amount: number, email: string, reference: string) {
        console.log(`[Squadco] Initiating transaction for ${email}: ${amount}`);
        return {
            authorizationUrl: `https://checkout.squadco.com/${reference}`,
            accessCode: `SQD_${reference}`,
        };
    }

    async verifyTransaction(reference: string) {
        return { status: 'success' as const, amount: 50000 };
    }

    async disburse(amount: number, recipientCode: string, reference: string) {
        console.log(`[Squadco] Disbursing ${amount} to ${recipientCode}`);
        return { status: 'success' as const, reference };
    }
}

export const gateways = {
    paystack: new PaystackGateway(),
    monnify: new MonnifyGateway(),
    squadco: new SquadcoGateway(),
};
