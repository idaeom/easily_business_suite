"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export function IncomeChart({ data }: { data: any[] }) {
    if (data.length === 0) {
        return (
            <div className="h-[200px] flex items-center justify-center border-dashed border-2 rounded-md">
                <p className="text-muted-foreground">No income data available.</p>
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                    dataKey="date"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                />
                <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `₦${value.toLocaleString()}`}
                />
                <Tooltip
                    formatter={(value: number) => [`₦${value.toLocaleString()}`, "Revenue"]}
                    cursor={{ fill: 'transparent' }}
                />
                <Bar
                    dataKey="amount"
                    fill="#16a34a" // Green-600
                    radius={[4, 4, 0, 0]}
                />
            </BarChart>
        </ResponsiveContainer>
    );
}
