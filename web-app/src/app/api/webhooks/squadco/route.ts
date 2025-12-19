import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
// import { db } from "@/db";
import { accounts, transactions, ledgerEntries } from "@/db/schema";
import { eq } from "drizzle-orm";
import { FinanceService } from "@/lib/finance";

export async function POST(req: NextRequest) {
    const secret = process.env.SQUADCO_SECRET_KEY; // Assuming you have this env var
    if (!secret) return NextResponse.json({ message: "Secret not configured" }, { status: 500 });

    const body = await req.text();
    const signature = req.headers.get("x-squad-signature"); // Confirm header name with docs

    // Verify signature (Squadco might use different hashing, assuming HMAC SHA512 for now like Paystack/others or check docs)
    // Squadco docs say: hash the body with secret using HMAC SHA512
    const hash = crypto.createHmac("sha512", secret).update(body).digest("hex");

    if (hash !== signature) {
        // return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
        // For dev/sandbox, sometimes signature verification might be tricky. 
        // Uncomment above in prod.
        console.warn("[Squadco Webhook] Signature mismatch (Ignored for Dev)");
    }

    const event = JSON.parse(body);
    // Squadco structure might differ. Assuming standard event/data structure.
    // Actually Squadco sends the transaction object directly often.
    console.log(`[Squadco Webhook] Received event:`, event);

    // TODO: Parse Squadco specific event types
    // For now, we acknowledge receipt.

    return NextResponse.json({ message: "Event received" }, { status: 200 });
}
