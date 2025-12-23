
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";

/**
 * Exports a specific DOM element to PDF using html2canvas and jsPDF.
 * Best for exact visual reproduction (e.g., Payslips, Invoices).
 */
export async function exportToPDF(elementId: string, fileName: string, orientation: "p" | "l" = "p") {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error(`Element with id ${elementId} not found`);
        return;
    }

    try {
        const canvas = await html2canvas(element, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL("image/png");

        const pdf = new jsPDF(orientation, "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;
        }

        pdf.save(`${fileName}.pdf`);
    } catch (error) {
        console.error("Export to PDF failed", error);
    }
}

/**
 * Exports JSON data to Excel.
 */
export function exportDataToExcel(data: any[], fileName: string, sheetName: string = "Sheet1") {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

/**
 * Exports an existing HTML Table to Excel.
 */
export function exportTableToExcel(tableId: string, fileName: string) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const worksheet = XLSX.utils.table_to_sheet(table);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

/**
 * Generates a simple text-based PDF report using autoTable.
 * Useful for tables where you want clean vector text instead of an image.
 */
export function exportReportToPDF(title: string, columns: string[], rows: any[][], fileName: string) {
    const doc = new jsPDF();
    doc.text(title, 14, 20);
    // @ts-ignore
    doc.autoTable({
        head: [columns],
        body: rows,
        startY: 30,
    });
    doc.save(`${fileName}.pdf`);
}
