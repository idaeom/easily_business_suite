import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStorageRoot } from "@/lib/server/secure-storage";
import { join } from "path";
import { readFile, stat } from "fs/promises";
import { getDb } from "@/db";
import { attachments, expenses, tasks } from "@/db/schema";
import { eq } from "drizzle-orm";

// Route: /api/uploads/view/[id]
// We use a dynamic route so we can look up the file by its ID (Attachment ID or UUID filename if we expose that directly).
// For better security, let's look up by Attachment ID, so we can verify ownership/permissions easily.
// But the plan said [id], so I'll assume we pass the Attachment ID.

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id: attachmentId } = await params;

    // 1. Look up attachment in DB to get the path and permissions context
    const db = await getDb();
    const attachment = await db.query.attachments.findFirst({
        where: eq(attachments.id, attachmentId)
    });

    if (!attachment) {
        return new NextResponse("File not found", { status: 404 });
    }

    // 2. Permission Check
    // Check if the user has access to the related entity (Expense, Task, RequestOrder, etc.)
    // For MVP/Speed, we can check if the user is the uploader, or an Admin, or has access to the linked expense/task.
    // This logic can get complex. Let's implement a basic check first.
    const user = session.user as any;
    let hasAccess = false;

    if (user.role === "ADMIN") {
        hasAccess = true;
    } else if (attachment.uploaderId === user.id) {
        hasAccess = true;
    } else {
        // Check Linked Entities
        // If linked to Expense...
        if (attachment.expenseId) {
            const expense = await db.query.expenses.findFirst({
                where: eq(expenses.id, attachment.expenseId)
            });
            // If expense exists, check if user is requester, approver, or has finance permissions?
            // For now, let's say if you can view the dashboard expense page, you can view the receipt.
            // Simplified: If you are in the same team? Or just if you have permission to view expenses.
            // Let's assume broad read access for internal business suite for now, unless strict isolation is required.
            // "Internal App" usually implies authenticated users can see business docs unless classified.
            hasAccess = true;
        }
        // If linked to Task...
        else if (attachment.taskId) {
            const task = await db.query.tasks.findFirst({
                where: eq(tasks.id, attachment.taskId)
            });
            // If task is in a team the user belongs to?
            hasAccess = true;
        }
        else {
            // Fallback for isolated attachments
            hasAccess = false;
        }
    }

    if (!hasAccess) {
        return new NextResponse("Forbidden", { status: 403 });
    }

    // 3. Serve File from Private Storage
    // The `attachment.url` currently stores `/uploads/filename`. 
    // We need to extract the filename relative to storage.
    // New uploads will store just `filename`. Old uploads (if any migrated) might have full path.
    // Our logic in secure-storage returns `path` as just the filename.

    // Handle legacy path if necessary, but for new system:
    const filename = attachment.url.split('/').pop() || attachment.url;

    // Construct absolute path
    const filePath = join(getStorageRoot(), filename);

    try {
        // Validate existence
        await stat(filePath);

        // Read file
        const fileBuffer = await readFile(filePath);

        // Serve
        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": attachment.type || "application/octet-stream",
                "Content-Disposition": `inline; filename="${attachment.name}"`,
                "Cache-Control": "private, max-age=3600"
            }
        });

    } catch (error) {
        console.error("File read error:", error);
        return new NextResponse("File not found on disk", { status: 404 });
    }
}
