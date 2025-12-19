import { NextRequest, NextResponse } from "next/server";
import { ReportingService } from "@/lib/reporting";
import fs from "fs";
import path from "path";
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
    const tempDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }

    const filePath = path.join(tempDir, `task-${id}-expenses.xlsx`);

    try {
        await ReportingService.generateTaskExcel(id, filePath);

        const fileBuffer = fs.readFileSync(filePath);
        fs.unlinkSync(filePath); // Clean up

        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="task-${id}-expenses.xlsx"`,
            },
        });
    } catch (error) {
        console.error("Error generating Excel:", error);
        return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
    }
}
