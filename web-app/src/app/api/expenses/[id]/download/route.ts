import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { expenses } from "@/db/schema";
import { eq } from "drizzle-orm";
import archiver from "archiver";
import { join } from "path";
import { createReadStream, existsSync } from "fs";
import { Readable } from "stream";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;
    const db = await getDb();
    const expense = await db.query.expenses.findFirst({
        where: eq(expenses.id, id),
        with: {
            attachments: true,
            requester: true,
            task: true,
            beneficiaries: true,
            comments: { with: { user: true } }
        }
    }) as any;

    if (!expense) {
        return new NextResponse("Expense not found", { status: 404 });
    }

    // RLS Check
    const user = session.user as any;
    if (user.role !== "ADMIN" && expense.requesterId !== user.id && expense.approverId !== user.id) {
        return new NextResponse("Forbidden", { status: 403 });
    }

    const archive = archiver("zip", {
        zlib: { level: 9 }
    });

    // Create a pass-through stream to pipe the archive to the response
    const stream = new Readable({
        read() { }
    });

    archive.on("data", (chunk) => {
        stream.push(chunk);
    });

    archive.on("end", () => {
        stream.push(null);
    });

    archive.on("error", (err) => {
        console.error("Archiver error:", err);
        stream.push(null); // End stream on error
    });

    // Add Expense Details as Markdown
    const details = `
# Expense Details

**Description:** ${expense.description}
**Amount:** NGN ${Number(expense.amount).toLocaleString()}
**Status:** ${expense.status}
**Category:** ${expense.category || "N/A"}
**Incurred At:** ${expense.incurredAt ? new Date(expense.incurredAt).toLocaleDateString() : "N/A"}
**Requester:** ${expense.requester.name}
**Task:** ${expense.task ? `${expense.task.uniqueNumber} - ${expense.task.title}` : "N/A"}

## Beneficiaries
${expense.beneficiaries.map((b: any) => `- ${b.name} (${b.bankName}): NGN ${Number(b.amount).toLocaleString()}`).join("\n")}

## Comments
${expense.comments.map((c: any) => `- **${c.user.name}** (${new Date(c.createdAt).toLocaleString()}): ${c.content}`).join("\n")}
    `;

    archive.append(details, { name: "expense-details.md" });

    // Add Attachments
    for (const attachment of expense.attachments) {
        const filePath = join(process.cwd(), "public", attachment.url);
        if (existsSync(filePath)) {
            archive.file(filePath, { name: attachment.name });
        } else {
            console.warn(`Attachment file not found: ${filePath}`);
            archive.append(`File not found: ${attachment.name}`, { name: `MISSING_${attachment.name}.txt` });
        }
    }

    archive.finalize();

    // Return the stream as the response body
    // Note: Next.js App Router Route Handlers return a Response object.
    // We need to cast the Node.js Readable stream to a Web ReadableStream or use `new Response(stream as any)`

    // @ts-ignore - Readable is compatible enough for Response body
    return new Response(stream, {
        headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename="expense-${expense.id}.zip"`,
        },
    });
}
