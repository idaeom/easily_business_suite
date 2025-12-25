import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { expenses, attachments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    // For mobile, we might need token-based auth if cookies aren't shared.
    // Assuming the mobile app sends the session cookie or we have a way to validate.
    // For now, let's check session. If null, we might check for an Authorization header (Bearer token) if implemented.
    // But since we implemented mobile login via `/api/auth/mobile-login`, it likely sets a cookie or returns a user object.
    // If the mobile app uses the cookie, `getServerSession` should work.

    if (!session || !session.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;
    const db = await getDb();
    const expense = await db.query.expenses.findFirst({ where: eq(expenses.id, id) });
    if (!expense) {
        return new NextResponse("Expense not found", { status: 404 });
    }

    // Check permissions (Requester or Admin)
    const user = session.user as any;
    if (expense.requesterId !== user.id && user.role !== "ADMIN") {
        return new NextResponse("Forbidden", { status: 403 });
    }

    if (expense.status === "DISBURSED") {
        return new NextResponse("Cannot add receipt to disbursed expense", { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
        return new NextResponse("No file uploaded", { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    try {
        // 1. Validate
        const { validateFileBuffer } = await import("@/lib/server/file-validation");
        const validation = await validateFileBuffer(buffer);

        if (!validation.isValid) {
            return new NextResponse("Invalid file type", { status: 400 });
        }

        // 2. Secure Save
        const { saveSecureFile } = await import("@/lib/server/secure-storage");
        const savedFile = await saveSecureFile(buffer, file.name, validation.mime || file.type);

        // 3. Update DB
        const [attachment] = await db.insert(attachments).values({
            name: savedFile.originalName,
            url: savedFile.path, // Store secure filename
            type: savedFile.mimeType,
            size: savedFile.size,
            expenseId: id,
            uploaderId: user.id,
        }).returning();

        return NextResponse.json(attachment);
    } catch (error) {
        console.error("Upload failed:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
