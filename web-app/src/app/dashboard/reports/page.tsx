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
import { getExpenseReports, getTaskReports, getAccountReports, getPayrollReports, getFinancialStatements } from "@/actions/reports";
import { DateRange } from "react-day-picker";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportDataToExcel } from "@/lib/export-utils";

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

    // New Reporting Data
    const [payrollData, setPayrollData] = useState<{
        summary: any;
        employeeBreakdown: any[];
        taxSchedule: any[];
    }>({
        summary: { totalGross: 0, totalNet: 0, totalTax: 0, totalPension: 0 },
        employeeBreakdown: [],
        taxSchedule: []
    });

    const [financialData, setFinancialData] = useState<{
        balanceSheet: any;
        profitAndLoss: any;
    }>({
        balanceSheet: {
            assets: [],
            liabilities: [],
            equity: [],
            totalAssets: 0,
            totalLiabilities: 0,
            totalEquity: 0
        },
        profitAndLoss: {
            income: [],
            expenses: [],
            totalIncome: 0,
            totalExpenses: 0,
            netProfit: 0
        }
    });

    useEffect(() => {
        startTransition(async () => {
            console.log("Fetching report data...");
            try {
                // Fetch independently to prevent one failure from blocking all
                const expensesPromise = getExpenseReports(dateRange?.from, dateRange?.to, category);
                const tasksPromise = getTaskReports(dateRange?.from, dateRange?.to);
                const accountsPromise = getAccountReports(dateRange?.from, dateRange?.to);
                const payrollPromise = getPayrollReports(dateRange?.from, dateRange?.to);
                const financialsPromise = getFinancialStatements(dateRange?.from, dateRange?.to);

                const results = await Promise.allSettled([
                    expensesPromise,
                    tasksPromise,
                    accountsPromise,
                    payrollPromise,
                    financialsPromise
                ]);

                // Expenses
                if (results[0].status === "fulfilled") setExpenseData(results[0].value);
                else console.error("Expenses fetch failed:", results[0].reason);

                // Tasks
                if (results[1].status === "fulfilled") setTaskData(results[1].value);
                else console.error("Tasks fetch failed:", results[1].reason);

                // Accounts
                if (results[2].status === "fulfilled") setAccountData(results[2].value);
                else console.error("Accounts fetch failed:", results[2].reason);

                // Payroll
                if (results[3].status === "fulfilled") setPayrollData(results[3].value);
                else console.error("Payroll fetch failed:", results[3].reason);

                // Financials
                if (results[4].status === "fulfilled") setFinancialData(results[4].value);
                else console.error("Financials fetch failed:", results[4].reason);

            } catch (err) {
                console.error("Critical error fetching reports:", err);
            }
        });
    }, [dateRange, category]);

    const handleExportPL = () => {
        const rows = [
            { Item: "REVENUE", Balance: "" },
            ...financialData.profitAndLoss.income.map((i: any) => ({ Item: `  ${i.name}`, Balance: i.amount })),
            { Item: "TOTAL REVENUE", Balance: financialData.profitAndLoss.totalIncome },
            { Item: "", Balance: "" },
            { Item: "EXPENSES", Balance: "" },
            ...financialData.profitAndLoss.expenses.map((e: any) => ({ Item: `  ${e.name}`, Balance: e.amount })),
            { Item: "TOTAL EXPENSES", Balance: financialData.profitAndLoss.totalExpenses },
            { Item: "", Balance: "" },
            { Item: "NET PROFIT", Balance: financialData.profitAndLoss.netProfit }
        ];
        exportDataToExcel(rows, `ProfitLoss_${format(new Date(), "yyyy-MM-dd")}`, "P&L");
    };

    const handleExportTax = () => {
        // taxSchedule is likely { name, tin, gross_income, tax_payable ... }
        exportDataToExcel(payrollData.taxSchedule, `TaxSchedule_${format(new Date(), "yyyy-MM-dd")}`, "Tax Schedule");
    };

    const handleExportExpenses = () => {
        exportDataToExcel(expenseData.categoryChartData, `Expenses_${format(new Date(), "yyyy-MM-dd")}`, "Expenses");
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" disabled={isPending}>
                                <Download className="mr-2 h-4 w-4" />
                                Export
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={handleExportPL}>
                                Profit & Loss (Excel)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleExportTax}>
                                Tax Schedule (Excel)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleExportExpenses}>
                                Expense Summary (Excel)
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
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
                    <TabsTrigger value="financials">Financial Statements</TabsTrigger>
                    <TabsTrigger value="payroll">Payroll</TabsTrigger>
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

                {/* Financials Tab */}
                <TabsContent value="financials" className="space-y-4">
                    <div className="grid gap-6 md:grid-cols-2">
                        <Card>
                            <CardHeader><CardTitle>Profit & Loss</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Item</TableHead>
                                            <TableHead className="text-right">Balance</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow className="bg-slate-50 font-bold"><TableCell colSpan={2}>Revenue</TableCell></TableRow>
                                        {financialData.profitAndLoss.income.map((i: any) => (
                                            <TableRow key={i.id}><TableCell className="pl-4">{i.name}</TableCell><TableCell className="text-right">{i.amount?.toFixed(2) || "0.00"}</TableCell></TableRow>
                                        ))}
                                        <TableRow className="font-bold border-t-2"><TableCell>Total Revenue</TableCell><TableCell className="text-right">{financialData.profitAndLoss.totalIncome.toFixed(2)}</TableCell></TableRow>

                                        <TableRow className="bg-slate-50 font-bold"><TableCell colSpan={2}>Expenses</TableCell></TableRow>
                                        {financialData.profitAndLoss.expenses.map((e: any) => (
                                            <TableRow key={e.id}><TableCell className="pl-4">{e.name}</TableCell><TableCell className="text-right">{e.amount?.toFixed(2) || "0.00"}</TableCell></TableRow>
                                        ))}
                                        <TableRow className="font-bold border-t-2"><TableCell>Total Expenses</TableCell><TableCell className="text-right">{financialData.profitAndLoss.totalExpenses.toFixed(2)}</TableCell></TableRow>

                                        <TableRow className="font-black text-lg border-t-4"><TableCell>Net Profit</TableCell><TableCell className="text-right">{financialData.profitAndLoss.netProfit.toFixed(2)}</TableCell></TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader><CardTitle>Balance Sheet</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Item</TableHead>
                                            <TableHead className="text-right">Balance</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow className="bg-slate-50 font-bold"><TableCell colSpan={2}>Assets</TableCell></TableRow>
                                        {financialData.balanceSheet.assets.map((a: any, idx: number) => (
                                            <TableRow key={idx}><TableCell className="pl-4">{a.name}</TableCell><TableCell className="text-right">{a.amount?.toFixed(2) || "0.00"}</TableCell></TableRow>
                                        ))}
                                        <TableRow className="font-bold border-t-2"><TableCell>Total Assets</TableCell><TableCell className="text-right">{financialData.balanceSheet.totalAssets.toFixed(2)}</TableCell></TableRow>

                                        <TableRow className="bg-slate-50 font-bold"><TableCell colSpan={2}>Liabilities</TableCell></TableRow>
                                        {financialData.balanceSheet.liabilities.map((l: any, idx: number) => (
                                            <TableRow key={idx}><TableCell className="pl-4">{l.name}</TableCell><TableCell className="text-right">{l.amount?.toFixed(2) || "0.00"}</TableCell></TableRow>
                                        ))}
                                        <TableRow className="font-bold border-t-2"><TableCell>Total Liabilities</TableCell><TableCell className="text-right">{financialData.balanceSheet.totalLiabilities.toFixed(2)}</TableCell></TableRow>

                                        <TableRow className="bg-slate-50 font-bold"><TableCell colSpan={2}>Equity</TableCell></TableRow>
                                        {financialData.balanceSheet.equity.map((eq: any, idx: number) => (
                                            <TableRow key={idx}><TableCell className="pl-4">{eq.name}</TableCell><TableCell className="text-right">{eq.amount?.toFixed(2) || "0.00"}</TableCell></TableRow>
                                        ))}
                                        <TableRow className="font-bold border-t-2"><TableCell>Total Equity</TableCell><TableCell className="text-right">{financialData.balanceSheet.totalEquity.toFixed(2)}</TableCell></TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Payroll Tab */}
                <TabsContent value="payroll" className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Payroll Summary</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-4 gap-4 text-center">
                                <div className="border p-4 rounded"><div className="text-xs text-muted-foreground">Total Gross</div><div className="text-xl font-bold">₦{Number(payrollData.summary.totalGross).toLocaleString()}</div></div>
                                <div className="border p-4 rounded"><div className="text-xs text-muted-foreground">Total Net Pay</div><div className="text-xl font-bold">₦{Number(payrollData.summary.totalNet).toLocaleString()}</div></div>
                                <div className="border p-4 rounded"><div className="text-xs text-muted-foreground">Tax (PAYE)</div><div className="text-xl font-bold">₦{Number(payrollData.summary.totalTax).toLocaleString()}</div></div>
                                <div className="border p-4 rounded"><div className="text-xs text-muted-foreground">Pension</div><div className="text-xl font-bold">₦{Number(payrollData.summary.totalPension).toLocaleString()}</div></div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Tax Schedule</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Employee</TableHead>
                                        <TableHead>Tax ID</TableHead>
                                        <TableHead className="text-right">Gross</TableHead>
                                        <TableHead className="text-right">Tax</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payrollData.taxSchedule.map((row: any, idx: number) => (
                                        <TableRow key={idx}>
                                            <TableCell>{row.name}</TableCell>
                                            <TableCell>{row.tin || "N/A"}</TableCell>
                                            <TableCell className="text-right">{row.gross_income?.toFixed(2)}</TableCell>
                                            <TableCell className="text-right">{row.tax_payable?.toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                    {payrollData.taxSchedule.length === 0 && <TableRow><TableCell colSpan={4} className="text-center">No records found</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
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
