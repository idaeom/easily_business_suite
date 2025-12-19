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

    // 3. Handle File Upload (Local Dev / VPS approach)
    // In production (Vercel/Netlify), use S3/Supabase Storage presigned URLs.
    const file = formData.get("receipt") as File;
    if (file && file.size > 0) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const uploadDir = join(process.cwd(), "public", "uploads");
        await mkdir(uploadDir, { recursive: true });

        const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const filePath = join(uploadDir, fileName);

        await writeFile(filePath, buffer);

        // Note: You'd pass this URL to ExpenseService if your schema supports it (e.g., attachments table)
        // For now, we assume AttachmentService handles it separately or we extend ExpenseService.
    }

    // 4. Call The Service
    try {
        await ExpenseService.createExpense({
            ...validated,
            incurredAt: new Date(validated.incurredAt),
            requesterId: user.id,
            beneficiaries: beneficiaries
        });
    } catch (error: any) {
        return { error: error.message };
    }

    revalidatePath(`/dashboard/tasks/${validated.taskId}`);
    return { success: true };
}
