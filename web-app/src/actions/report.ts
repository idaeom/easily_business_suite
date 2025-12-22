"use server";

import { getDb } from "@/db";
import { sql } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth";

interface ReportParams {
    page?: number;
    limit?: number;
    search?: string;
    type?: 'ALL' | 'POS' | 'INVOICE';
    startDate?: Date;
    endDate?: Date;
}

export async function getUnifiedSalesReport({
    page = 1,
    limit = 20,
    search = "",
    type = "ALL",
    startDate,
    endDate,
    outletId,
    createdById,
    paymentMethod,
}: ReportParams & { outletId?: string, createdById?: string, paymentMethod?: string } = {}) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const db = await getDb();
    const offset = (page - 1) * limit;

    // Base WHERE conditions
    let posWhere = sql`TRUE`;
    let salesWhere = sql`TRUE`;

    if (startDate) {
        posWhere = sql`${posWhere} AND "transactionDate" >= ${startDate.toISOString()}`;
        salesWhere = sql`${salesWhere} AND "saleDate" >= ${startDate.toISOString()}`;
    }
    if (endDate) {
        // End of day logic usually expected
        const eod = new Date(endDate);
        eod.setHours(23, 59, 59, 999);
        posWhere = sql`${posWhere} AND "transactionDate" <= ${eod.toISOString()}`;
        salesWhere = sql`${salesWhere} AND "saleDate" <= ${eod.toISOString()}`;
    }
    if (search) {
        const searchPattern = `%${search}%`;
        // POS: Search ID
        posWhere = sql`${posWhere} AND (t.id ILIKE ${searchPattern})`;
        // Sales: Search ID or Customer Name
        salesWhere = sql`${salesWhere} AND (sl.id ILIKE ${searchPattern} OR sl."customerName" ILIKE ${searchPattern})`;
    }

    // POS Filters
    // Join Shifts for Outlet & Cashier
    // We can't easily join in the WHERE clause variable construction with Drizzle's sql template properly unless we write the full query.
    // So we will verify filters later or inject subqueries.
    // Better to use EXISTS or matching IDs.

    if (outletId && outletId !== 'all') {
        posWhere = sql`${posWhere} AND t."shiftId" IN (SELECT id FROM "Shift" WHERE "outletId" = ${outletId})`;
        salesWhere = sql`${salesWhere} AND sl."outletId" = ${outletId}`;
    }
    if (createdById && createdById !== 'all') {
        posWhere = sql`${posWhere} AND t."shiftId" IN (SELECT id FROM "Shift" WHERE "cashierId" = ${createdById})`;
        salesWhere = sql`${salesWhere} AND sl."createdById" = ${createdById}`;
    }

    // Status Logic
    // POS: COMPLETED (Includes Refunds)
    posWhere = sql`${posWhere} AND t.status = 'COMPLETED'`;
    // Sales: CONFIRMED
    salesWhere = sql`${salesWhere} AND sl.status = 'CONFIRMED'`;


    // Construct Queries
    // POS
    const posQuery = sql`
        SELECT 
            t.id, 
            t."transactionDate" as date, 
            t."totalAmount" as amount, 
            'POS' as type, 
            COALESCE((SELECT name FROM "Contact" WHERE id = t."contactId"), 'Walk-in Customer') as customer,
            t.status,
            t.id as reference,
            t."isRefund" as "isRefund",
            s."outletId" as "outletId",
            (SELECT name FROM "Outlet" WHERE id = s."outletId") as "outletName",
            s."cashierId" as "createdById",
            (SELECT name FROM "User" WHERE id = s."cashierId") as "createdByName"
        FROM "PosTransaction" t
        LEFT JOIN "Shift" s ON t."shiftId" = s.id
        WHERE ${posWhere}
    `;

    // Sales
    const salesQuery = sql`
        SELECT 
            sl.id, 
            sl."saleDate" as date, 
            sl."total" as amount, 
            'INVOICE' as type, 
            sl."customerName" as customer, 
            sl."status"::text as status,
            sl.id as reference,
            FALSE as "isRefund",
            sl."outletId" as "outletId",
            (SELECT name FROM "Outlet" WHERE id = sl."outletId") as "outletName",
            sl."createdById" as "createdById",
            (SELECT name FROM "User" WHERE id = sl."createdById") as "createdByName"
        FROM "SpSale" sl
        WHERE ${salesWhere}
    `;

    let finalQuery;
    if (type === 'POS') {
        finalQuery = posQuery;
    } else if (type === 'INVOICE') {
        finalQuery = salesQuery;
    } else {
        finalQuery = sql`${posQuery} UNION ALL ${salesQuery}`;
    }

    const reportQuery = sql`
        SELECT * FROM (${finalQuery}) as combined
        ORDER BY date DESC
        LIMIT ${limit} OFFSET ${offset}
    `;

    const result = await db.execute(reportQuery);

    // Metrics Calculation (Can be expensive on huge datasets, but reasonable for filtered)
    // We should probably run aggregate on the *filtered* set without limit.
    const metricsQuery = sql`
        SELECT 
            COUNT(*) as "count",
            SUM(CASE WHEN "isRefund" = TRUE THEN 0 ELSE "amount" END) as "grossSales",
            SUM(CASE WHEN "isRefund" = TRUE THEN "amount" ELSE 0 END) as "refunds",
            SUM(CASE WHEN "isRefund" = TRUE THEN -"amount" ELSE "amount" END) as "netSales"
        FROM (${finalQuery}) as combined
    `;
    const metricsResult = await db.execute(metricsQuery);
    const metricsRow = metricsResult.rows[0];

    const totalCount = Number(metricsRow.count);

    return {
        data: result.rows.map(row => ({
            ...row,
            amount: Number(row.amount),
            date: new Date(row.date as string),
            isRefund: row.isRefund === true
        })),
        meta: {
            page,
            limit,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit)
        },
        summary: {
            grossSales: Number(metricsRow.grossSales || 0),
            refunds: Number(metricsRow.refunds || 0),
            netSales: Number(metricsRow.netSales || 0),
            count: totalCount
        }
    };
}

export async function getReportOptions() {
    const db = await getDb();
    const outlets = await db.query.outlets.findMany({
        columns: { id: true, name: true }
    });
    const staff = await db.query.users.findMany({
        columns: { id: true, name: true }
    });
    const paymentMethods = await db.query.paymentMethods.findMany({
        columns: { code: true, name: true }
    });
    return { outlets, staff, paymentMethods };
}
