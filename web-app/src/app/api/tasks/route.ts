import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { tasks } from "@/db/schema";
import { desc } from "drizzle-orm";
import { TaskService } from "@/lib/tasks";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const db = await getDb();
        const allTasks = await db.query.tasks.findMany({
            orderBy: [desc(tasks.createdAt)],
            with: { subTasks: true }
        });
        return NextResponse.json(allTasks);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
    }
}

const createTaskSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
});

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const validated = createTaskSchema.parse(body);

        const task = await TaskService.createTask({
            title: validated.title,
            description: validated.description,
        }, (session.user as any).id);

        return NextResponse.json(task);
    } catch (error) {
        return NextResponse.json({ error: "Failed to create task" }, { status: 400 });
    }
}
