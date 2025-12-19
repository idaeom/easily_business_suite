import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { expenses, users } from "@/db/schema";
import { desc } from "drizzle-orm";
import { ExpenseService } from "@/lib/expenses";
import { z } from "zod";

export async function GET() {
    try {
        const db = await getDb();
        const allExpenses = await db.query.expenses.findMany({
            orderBy: [desc(expenses.createdAt)],
            with: { requester: true, task: true }
        });
        return NextResponse.json(allExpenses);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
    }
}

const createExpenseSchema = z.object({
    description: z.string().min(1, "Description is required"),
    amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const validated = createExpenseSchema.parse(body);

        // For demo, use first user
        const db = await getDb();
        const user = await db.query.users.findFirst();
        if (!user) return NextResponse.json({ error: "No user found" }, { status: 404 });

        const expense = await ExpenseService.createExpense({
            description: validated.description,
            amount: validated.amount,
            requesterId: user.id,
        });

        return NextResponse.json(expense);
    } catch (error) {
        return NextResponse.json({ error: "Failed to create expense" }, { status: 400 });
    }
}
