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
    endDate
}: ReportParams = {}) {
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
        posWhere = sql`${posWhere} AND "transactionDate" <= ${endDate.toISOString()}`;
        salesWhere = sql`${salesWhere} AND "saleDate" <= ${endDate.toISOString()}`;
    }
    if (search) {
        const searchPattern = `%${search}%`;
        // POS: Search ID
        posWhere = sql`${posWhere} AND ("id" ILIKE ${searchPattern})`;
        // Sales: Search ID or Customer Name
        salesWhere = sql`${salesWhere} AND ("id" ILIKE ${searchPattern} OR "customerName" ILIKE ${searchPattern})`;
    }

    // COMPLETE ONLY for POS, CONFIRMED for Sales
    posWhere = sql`${posWhere} AND status = 'COMPLETED'`;
    salesWhere = sql`${salesWhere} AND status = 'CONFIRMED'`;

    // Construct Queries
    const posQuery = sql`
        SELECT 
            id, 
            "transactionDate" as date, 
            "totalAmount" as amount, 
            'POS' as type, 
            COALESCE((SELECT name FROM "Contact" WHERE id = "PosTransaction"."contactId"), 'Walk-in Customer') as customer,
            status,
            id as reference
        FROM "PosTransaction"
        WHERE ${posWhere}
    `;

    const salesQuery = sql`
        SELECT 
            id, 
            "saleDate" as date, 
            "total" as amount, 
            'INVOICE' as type, 
            "customerName" as customer, 
            "status"::text as status,
            id as reference
        FROM "SpSale"
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

    const countQuery = sql`SELECT COUNT(*) as total FROM (${finalQuery}) as combined`;
    const countResult = await db.execute(countQuery);
    const totalCount = Number(countResult.rows[0].total);

    return {
        data: result.rows.map(row => ({
            ...row,
            amount: Number(row.amount),
            date: new Date(row.date as string)
        })),
        meta: {
            page,
            limit,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit)
        }
    };
}
