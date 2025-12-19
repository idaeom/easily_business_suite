"use client";

import { useState, useEffect, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, subMonths } from "date-fns";
import { Download, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getExpenseReports, getTaskReports, getAccountReports } from "@/actions/reports";
import { DateRange } from "react-day-picker";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

export default function ReportsPage() {
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: subMonths(new Date(), 6),
        to: new Date(),
    });
    const [category, setCategory] = useState("all");
    const [isPending, startTransition] = useTransition();

    const [expenseData, setExpenseData] = useState<{
        monthlyChartData: any[];
        categoryChartData: any[];
    }>({ monthlyChartData: [], categoryChartData: [] });

    const [taskData, setTaskData] = useState<{
        statusChartData: any[];
        monthlyChartData: any[];
    }>({ statusChartData: [], monthlyChartData: [] });

    const [accountData, setAccountData] = useState<any[]>([]);

    useEffect(() => {
        startTransition(async () => {
            const [expenses, tasks, accounts] = await Promise.all([
                getExpenseReports(dateRange?.from, dateRange?.to, category),
                getTaskReports(dateRange?.from, dateRange?.to),
                getAccountReports(dateRange?.from, dateRange?.to)
            ]);
            setExpenseData(expenses);
            setTaskData(tasks);
            setAccountData(accounts);
        });
    }, [dateRange, category]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
                <div className="flex items-center gap-2">
                    <Button variant="outline" disabled={isPending}>
                        <Download className="mr-2 h-4 w-4" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <label className="text-sm font-medium mb-2 block">Date Range</label>
                        <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                    </div>
                    <div className="w-full sm:w-[200px]">
                        <label className="text-sm font-medium mb-2 block">Category (Expenses)</label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger>
                                <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                <SelectItem value="Travel">Travel</SelectItem>
                                <SelectItem value="Software">Software</SelectItem>
                                <SelectItem value="Office">Office</SelectItem>
                                <SelectItem value="Meals">Meals</SelectItem>
                                <SelectItem value="Salary">Salary</SelectItem>
                                <SelectItem value="Logistics">Logistics</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="expenses" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="expenses">Expenses</TabsTrigger>
                    <TabsTrigger value="tasks">Tasks</TabsTrigger>
                    <TabsTrigger value="accounts">Charts of Accounts</TabsTrigger>
                </TabsList>

                <TabsContent value="expenses" className="space-y-4">
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Monthly Trend */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    Monthly Spend
                                    {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={expenseData.monthlyChartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip
                                            formatter={(value: number) => `₦${value.toLocaleString()}`}
                                        />
                                        <Legend />
                                        <Bar dataKey="total" fill="#8884d8" name="Total Spend" />
                                    </BarChart>
                                </ResponsiveContainer>
                                {expenseData.monthlyChartData.length === 0 && !isPending && (
                                    <div className="flex items-center justify-center h-full -mt-[300px] bg-background/50">
                                        <p className="text-muted-foreground">No data for selected period</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Category Breakdown */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    Spend by Category
                                    {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={expenseData.categoryChartData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }: { name?: string; percent?: number }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {expenseData.categoryChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value: number) => `₦${value.toLocaleString()}`}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                {expenseData.categoryChartData.length === 0 && !isPending && (
                                    <div className="flex items-center justify-center h-full -mt-[300px] bg-background/50">
                                        <p className="text-muted-foreground">No data for selected period</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="tasks" className="space-y-4">
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Monthly Creation Trend */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    Tasks Created (Monthly)
                                    {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={taskData.monthlyChartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="count" fill="#82ca9d" name="Tasks Created" />
                                    </BarChart>
                                </ResponsiveContainer>
                                {taskData.monthlyChartData.length === 0 && !isPending && (
                                    <div className="flex items-center justify-center h-full -mt-[300px] bg-background/50">
                                        <p className="text-muted-foreground">No data for selected period</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Status Breakdown */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    Task Status Distribution
                                    {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={taskData.statusChartData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }: { name?: string; percent?: number }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {taskData.statusChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                                {taskData.statusChartData.length === 0 && !isPending && (
                                    <div className="flex items-center justify-center h-full -mt-[300px] bg-background/50">
                                        <p className="text-muted-foreground">No data for selected period</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="accounts" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                Ledger Summary by Account
                                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Code</TableHead>
                                        <TableHead>Account Name</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead className="text-right">Total Debit</TableHead>
                                        <TableHead className="text-right">Total Credit</TableHead>
                                        <TableHead className="text-right">Net Change</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {accountData.length > 0 ? (
                                        accountData.map((account) => (
                                            <TableRow key={account.id}>
                                                <TableCell className="font-mono">{account.code}</TableCell>
                                                <TableCell>{account.name}</TableCell>
                                                <TableCell>{account.type}</TableCell>
                                                <TableCell className="text-right text-red-600">
                                                    {account.debits > 0 ? `₦${account.debits.toLocaleString()}` : "-"}
                                                </TableCell>
                                                <TableCell className="text-right text-green-600">
                                                    {account.credits > 0 ? `₦${account.credits.toLocaleString()}` : "-"}
                                                </TableCell>
                                                <TableCell className="text-right font-bold">
                                                    ₦{account.netChange.toLocaleString()}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                                No account activity in this period.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
