"use server";

import { z } from "zod";
import { ExpenseService } from "@/lib/expenses";
import { getAuthenticatedUser } from "@/lib/auth"; // Your auth helper
import { revalidatePath } from "next/cache";
import { join } from "path";
import { writeFile, mkdir } from "fs/promises";

// Validation Schema matches your UI
const expenseSchema = z.object({
    description: z.string().min(3),
    amount: z.coerce.number().positive(),
    taskId: z.string().uuid().optional().or(z.literal("")),
    category: z.string().optional(),
    expenseAccountId: z.string().optional(), // Link to Chart of Accounts
    incurredAt: z.string(), // Date string
    beneficiaries: z.string(), // JSON string (parsed later)
});

export async function createExpenseAction(formData: FormData) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    // 1. Parse Basic Fields
    const rawData = {
        description: formData.get("description"),
        amount: formData.get("amount"),
        taskId: formData.get("taskId") || undefined,
        category: formData.get("category") || undefined,
        expenseAccountId: formData.get("expenseAccountId") || undefined,
        incurredAt: formData.get("incurredAt"),
        beneficiaries: formData.get("beneficiaries"),
    };

    const validated = expenseSchema.parse(rawData);

    // Security Check: Only Admins or Users with specific permission can create expenses without a Task
    const hasPermission = user.role === "ADMIN" || user.permissions.includes("CREATE_GENERAL_EXPENSE");

    if (!validated.taskId && !hasPermission) {
        return { error: "Security Restriction: You need the 'CREATE_GENERAL_EXPENSE' permission to create expenses without a linked Task." };
    }

    // 2. Parse & Validate Beneficiaries
    let beneficiaries: any[] = [];
    try {
        beneficiaries = JSON.parse(validated.beneficiaries);

        // Financial Integrity Check
        const sum = beneficiaries.reduce((acc: number, b: any) => acc + Number(b.amount), 0);
        // Use a small epsilon for floating point safety
        if (Math.abs(sum - validated.amount) > 0.01) {
            return { error: `Mismatch: Expense is ${validated.amount}, but beneficiaries sum to ${sum}` };
        }
    } catch (e) {
        return { error: "Invalid beneficiary data" };
    }

    // 3. Handle File Upload (Secure)
    const file = formData.get("receipt") as File;
    let attachmentId = null;

    if (file && file.size > 0) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // a. Validate
        try {
            const { validateFileBuffer } = await import("@/lib/server/file-validation");
            const validation = await validateFileBuffer(buffer);

            if (!validation.isValid) {
                return { error: "Invalid file type. Only Images, PDFs, and Office docs are allowed." };
            }

            // b. Secure Save
            const { saveSecureFile } = await import("@/lib/server/secure-storage");
            const savedFile = await saveSecureFile(buffer, file.name, validation.mime || file.type);

            // c. Create Attachment Record 
            // We need to insert this into the attachments table and link it to the expense later, 
            // or pass the metadata to ExpenseService to handle the DB insertion.
            // Since ExpenseService.createExpense takes a complex object, let's see if we can pass attachment data.
            // Currently `createExpense` schema might not support it directly.
            // Let's modify the payload we send to ExpenseService to include `attachment`.

            // For this refactor, I will append the attachment info to the rawData 
            // or handle the DB insert here if ExpenseService doesn't support it yet.
            // Looking at schema, Attachment has `expenseId`. 
            // It's better to create the expense FIRST, then create the attachment linked to it.
            // So we'll hold onto the `savedFile` metadata.

            // We'll pass this special object context to the service call below
            // OR we rely on the service to return the ID and then we insert the attachment.

            // Let's do: Create Expense -> Get ID -> Insert Attachment.
            // Need to update step 4.

            (validated as any).tempAttachment = savedFile;

        } catch (e) {
            console.error("Upload error", e);
            return { error: "File upload failed" };
        }
    }

    // 4. Call The Service
    try {
        const newExpense = await ExpenseService.createExpense({
            ...validated,
            incurredAt: new Date(validated.incurredAt),
            requesterId: user.id,
            beneficiaries: beneficiaries
        });

        // Handle Attachment Linking
        if ((validated as any).tempAttachment) {
            const savedFile = (validated as any).tempAttachment;
            const { getDb } = await import("@/db");
            const { attachments } = await import("@/db/schema");

            const db = await getDb();
            await db.insert(attachments).values({
                name: savedFile.originalName,
                url: savedFile.path, // relative path (UUID)
                type: savedFile.mimeType,
                size: savedFile.size,
                expenseId: newExpense.id, // Assuming createExpense returns the object with ID
                uploaderId: user.id
            });
        }
    } catch (error: any) {
        return { error: error.message };
    }

    revalidatePath(`/dashboard/tasks/${validated.taskId}`);
    return { success: true };
}

export async function payExpensesBatch(expenseIds: string[], sourceAccountId: string, paymentMethod: string) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    // We could use a transaction here if ExpenseService supported it, but let's loop for now.
    // If one fails, we stop? Or try all? 
    // Let's try all and report errors.

    const results = [];

    for (const id of expenseIds) {
        try {
            await ExpenseService.payExpense(id, sourceAccountId, paymentMethod, user.id);
            results.push({ id, status: "success" });
        } catch (error: any) {
            console.error(`Failed to pay expense ${id}`, error);
            results.push({ id, status: "error", message: error.message });
        }
    }

    revalidatePath("/dashboard/hr/payroll");
    revalidatePath("/dashboard/business/finance/accounts");

    const errors = results.filter(r => r.status === "error");
    if (errors.length > 0) {
        return { success: false, message: `Paid ${results.length - errors.length} expenses. Failed: ${errors.length}`, errors };
    }

    return { success: true };
}
