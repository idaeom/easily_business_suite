import PDFDocument from "pdfkit";
import { TaskService } from "./tasks";
import { ExpenseService } from "./expenses";
import fs from "fs";
import ExcelJS from "exceljs";

export class ReportingService {
    /**
     * Generate Task PDF Report
     */
    static async generateTaskPDF(taskId: string, outputPath: string) {
        const task = await TaskService.getTask(taskId);
        if (!task) throw new Error("Task not found");

        const expenses = await ExpenseService.getTaskExpenses(taskId);
        // Include all expenses, not just approved ones, as per "Task + Expenses" request
        // But let's group them by status

        return new Promise<void>((resolve, reject) => {
            const doc = new PDFDocument();
            const stream = fs.createWriteStream(outputPath);

            doc.pipe(stream);

            // Header
            doc.fontSize(20).text(`Task Report: ${task.uniqueNumber}`, { align: "center" });
            doc.moveDown();
            doc.fontSize(14).text(`Title: ${task.title}`);
            doc.fontSize(12).text(`Status: ${task.status}`);
            doc.text(`Description: ${task.description || "N/A"}`);
            doc.moveDown();

            // Sub-tasks
            if (task.subTasks.length > 0) {
                doc.fontSize(14).text("Sub-tasks:");
                task.subTasks.forEach((st: any) => {
                    doc.fontSize(12).text(`- ${st.uniqueNumber}: ${st.title} (${st.status})`);
                });
                doc.moveDown();
            }

            // Expenses
            if (expenses.length > 0) {
                doc.fontSize(14).text("Expenses:");

                const expensesByStatus = expenses.reduce((acc: any, curr: any) => {
                    acc[curr.status] = acc[curr.status] || [];
                    acc[curr.status].push(curr);
                    return acc;
                }, {});

                Object.keys(expensesByStatus).forEach(status => {
                    doc.fontSize(12).font('Helvetica-Bold').text(`${status}:`);
                    doc.font('Helvetica');
                    let total = 0;
                    expensesByStatus[status].forEach((e: any) => {
                        doc.text(`  - ${e.description}: NGN ${Number(e.amount).toLocaleString()}`);
                        total += Number(e.amount);
                    });
                    doc.text(`  Subtotal: NGN ${total.toLocaleString()}`);
                    doc.moveDown(0.5);
                });

                const grandTotal = expenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
                doc.moveDown();
                doc.fontSize(14).font('Helvetica-Bold').text(`Total Expenses: NGN ${grandTotal.toLocaleString()}`);
                doc.font('Helvetica');
            } else {
                doc.fontSize(12).text("No linked expenses.");
            }

            doc.end();

            stream.on("finish", resolve);
            stream.on("error", reject);
        });
    }

    /**
     * Generate Task Expenses Excel Report
     */
    static async generateTaskExcel(taskId: string, outputPath: string) {
        const task = await TaskService.getTask(taskId);
        if (!task) throw new Error("Task not found");

        const expenses = await ExpenseService.getTaskExpenses(taskId);

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Expenses");

        sheet.columns = [
            { header: "Date", key: "date", width: 15 },
            { header: "Description", key: "description", width: 30 },
            { header: "Amount (NGN)", key: "amount", width: 15 },
            { header: "Status", key: "status", width: 15 },
            { header: "Requested By", key: "user", width: 20 },
        ];

        expenses.forEach((e: any) => {
            sheet.addRow({
                date: e.createdAt,
                description: e.description,
                amount: Number(e.amount),
                status: e.status,
                user: e.user?.name || "Unknown",
            });
        });

        // Add total row
        const total = expenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
        sheet.addRow({});
        sheet.addRow({ description: "Total", amount: total });

        await workbook.xlsx.writeFile(outputPath);
    }
}
