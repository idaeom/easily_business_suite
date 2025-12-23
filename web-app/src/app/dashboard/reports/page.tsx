"use client";

import { useState, useEffect, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, subMonths } from "date-fns";
import { Download, Loader2, Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getExpenseReports, getTaskReports, getAccountReports, getPayrollReports, getFinancialStatements, getExpensesList } from "@/actions/reports";
import { DateRange } from "react-day-picker";
import Link from "next/link";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportDataToExcel } from "@/lib/export-utils";
import { Input } from "@/components/ui/input";
import { ExpensesTable } from "@/components/reports/ExpensesTable";
import { Protect } from "@/components/auth/Protect";

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
        balanceSheet: {
            assets: { current: any[], fixed: any[], totalCurrent: number, totalFixed: number, total: number },
            liabilities: { current: any[], longTerm: any[], totalCurrent: number, totalLongTerm: number, total: number },
            equity: any[],
            totalEquity: number
        };
        profitAndLoss: {
            revenue: any[],
            cogs: any[],
            operatingExpenses: any[],
            totalRevenue: number,
            totalCogs: number,
            grossProfit: number,
            totalOperatingExpenses: number,
            netOperatingIncome: number,
            netProfit: number
        };
    }>({
        balanceSheet: {
            assets: { current: [], fixed: [], totalCurrent: 0, totalFixed: 0, total: 0 },
            liabilities: { current: [], longTerm: [], totalCurrent: 0, totalLongTerm: 0, total: 0 },
            equity: [],
            totalEquity: 0
        },
        profitAndLoss: {
            revenue: [],
            cogs: [],
            operatingExpenses: [],
            totalRevenue: 0,
            totalCogs: 0,
            grossProfit: 0,
            totalOperatingExpenses: 0,
            netOperatingIncome: 0,
            netProfit: 0
        }
    });

    // EXPENSES TABLE STATE
    const [expensesTableData, setExpensesTableData] = useState<{
        data: any[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>({ data: [], total: 0, page: 1, limit: 10, totalPages: 1 });

    const [expensesPage, setExpensesPage] = useState(1);
    const [expensesSearch, setExpensesSearch] = useState("");
    const [isTableLoading, setIsTableLoading] = useState(false);

    useEffect(() => {
        startTransition(async () => {
            console.log("Fetching report data...");
            try {
                const results = await Promise.allSettled([
                    getExpenseReports(dateRange?.from, dateRange?.to, category),
                    getTaskReports(dateRange?.from, dateRange?.to),
                    getAccountReports(dateRange?.from, dateRange?.to),
                    getPayrollReports(dateRange?.from, dateRange?.to),
                    getFinancialStatements(dateRange?.from, dateRange?.to)
                ]);

                if (results[0].status === "fulfilled") setExpenseData(results[0].value);
                if (results[1].status === "fulfilled") setTaskData(results[1].value);
                if (results[2].status === "fulfilled") setAccountData(results[2].value);
                if (results[3].status === "fulfilled") setPayrollData(results[3].value);
                if (results[4].status === "fulfilled") setFinancialData(results[4].value as any);

            } catch (err) {
                console.error("Critical error fetching reports:", err);
            }
        });
    }, [dateRange, category]);

    // FETCH EXPENSES LIST
    useEffect(() => {
        const fetchTable = async () => {
            setIsTableLoading(true);
            try {
                const res = await getExpensesList(
                    expensesPage,
                    10,
                    expensesSearch,
                    category,
                    dateRange?.from,
                    dateRange?.to
                );
                setExpensesTableData(res);
            } catch (error) {
                console.error("Error fetching expenses list:", error);
            } finally {
                setIsTableLoading(false);
            }
        };

        // Debounce search
        const timeoutId = setTimeout(() => {
            fetchTable();
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [expensesPage, expensesSearch, category, dateRange]);


    const handleExportPL = () => {
        // Updated Export Logic for P&L
        const rows = [
            { Item: "REVENUE", Balance: "" },
            ...financialData.profitAndLoss.revenue.map((i: any) => ({ Item: `  ${i.name}`, Balance: i.amount })),
            { Item: "TOTAL REVENUE", Balance: financialData.profitAndLoss.totalRevenue },
            { Item: "", Balance: "" },
            { Item: "COST OF GOODS SOLD", Balance: "" },
            ...financialData.profitAndLoss.cogs.map((i: any) => ({ Item: `  ${i.name}`, Balance: i.amount })),
            { Item: "TOTAL COGS", Balance: financialData.profitAndLoss.totalCogs },
            { Item: "GROSS PROFIT", Balance: financialData.profitAndLoss.grossProfit },
            { Item: "", Balance: "" },
            { Item: "OPERATING EXPENSES", Balance: "" },
            ...financialData.profitAndLoss.operatingExpenses.map((e: any) => ({ Item: `  ${e.name}`, Balance: e.amount })),
            { Item: "TOTAL OPEX", Balance: financialData.profitAndLoss.totalOperatingExpenses },
            { Item: "", Balance: "" },
            { Item: "NET OPERATING INCOME", Balance: financialData.profitAndLoss.netOperatingIncome },
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
                    <Link href="/dashboard/reports/inventory">
                        <Button variant="secondary">
                            Stock Valuation
                        </Button>
                    </Link>
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
                </CardContent>
            </Card>

            <Tabs defaultValue="expenses" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="expenses">Expenses</TabsTrigger>
                    <Protect permission="VIEW_FINANCE"><TabsTrigger value="financials">Financial Statements</TabsTrigger></Protect>
                    <Protect permission="VIEW_PAYROLL"><TabsTrigger value="payroll">Payroll</TabsTrigger></Protect>
                    <TabsTrigger value="tasks">Tasks</TabsTrigger>
                    <TabsTrigger value="accounts">Charts of Accounts</TabsTrigger>
                </TabsList>

                {/* EXPENSES TAB CONTENT */}
                <TabsContent value="expenses" className="space-y-4">
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Monthly Trend */}
                        <Card>
                            <CardHeader><CardTitle>Monthly Expenses</CardTitle></CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={expenseData.monthlyChartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="total" fill="#8884d8" name="Total Expenses" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Category Breakdown */}
                        <Card>
                            <CardHeader><CardTitle>Expenses by Category</CardTitle></CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={expenseData.categoryChartData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={80}
                                            fill="#82ca9d"
                                            dataKey="value"
                                        >
                                            {expenseData.categoryChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>

                    {/* EXPENSES DATA TABLE */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                Expense Details
                                <div className="flex items-center gap-2 w-full max-w-sm">
                                    <Search className="w-4 h-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search expenses..."
                                        className="h-8"
                                        value={expensesSearch}
                                        onChange={(e) => setExpensesSearch(e.target.value)}
                                    />
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ExpensesTable
                                data={expensesTableData.data}
                                currentPage={expensesTableData.page}
                                totalPages={expensesTableData.totalPages}
                                totalCount={expensesTableData.total}
                                onPageChange={setExpensesPage}
                                isLoading={isTableLoading}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Financials Tab */}
                <TabsContent value="financials" className="space-y-4">
                    <Protect permission="VIEW_FINANCE" fallback={<div className="p-4 text-center text-muted-foreground border border-dashed rounded-md">You do not have permission to view Financial Statements.</div>}>
                        <div className="grid gap-6 md:grid-cols-2">
                            {/* PROFIT & LOSS */}
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
                                            {/* REVENUE */}
                                            <TableRow className="bg-slate-100 font-bold"><TableCell colSpan={2}>Revenue</TableCell></TableRow>
                                            {financialData.profitAndLoss.revenue.map((i: any) => (
                                                <TableRow key={i.id}><TableCell className="pl-4">{i.name}</TableCell><TableCell className="text-right">{i.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell></TableRow>
                                            ))}
                                            <TableRow className="font-bold border-t"><TableCell className="pl-4">Total Revenue</TableCell><TableCell className="text-right">{financialData.profitAndLoss.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell></TableRow>

                                            {/* COGS */}
                                            <TableRow className="bg-slate-100 font-bold"><TableCell colSpan={2}>Cost of Sales</TableCell></TableRow>
                                            {financialData.profitAndLoss.cogs.map((i: any) => (
                                                <TableRow key={i.id}><TableCell className="pl-4">{i.name}</TableCell><TableCell className="text-right">({i.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })})</TableCell></TableRow>
                                            ))}
                                            <TableRow className="font-bold border-t"><TableCell className="pl-4">Total Cost of Sales</TableCell><TableCell className="text-right">({financialData.profitAndLoss.totalCogs.toLocaleString(undefined, { minimumFractionDigits: 2 })})</TableCell></TableRow>

                                            {/* GROSS PROFIT */}
                                            <TableRow className="bg-slate-200 font-black text-lg border-y-2"><TableCell>Gross Profit</TableCell><TableCell className="text-right">{financialData.profitAndLoss.grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell></TableRow>

                                            {/* OPEX */}
                                            <TableRow className="bg-slate-100 font-bold"><TableCell colSpan={2}>Operating Expenses</TableCell></TableRow>
                                            {financialData.profitAndLoss.operatingExpenses.map((e: any) => (
                                                <TableRow key={e.id}><TableCell className="pl-4">{e.name}</TableCell><TableCell className="text-right">({e.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })})</TableCell></TableRow>
                                            ))}
                                            <TableRow className="font-bold border-t"><TableCell className="pl-4">Total Expenses</TableCell><TableCell className="text-right">({financialData.profitAndLoss.totalOperatingExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })})</TableCell></TableRow>

                                            {/* NET PROFIT */}
                                            <TableRow className="bg-green-100 font-black text-lg border-t-4 border-double"><TableCell>Net Profit</TableCell><TableCell className="text-right">{financialData.profitAndLoss.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell></TableRow>
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>

                            {/* BALANCE SHEET */}
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
                                            {/* ASSETS */}
                                            <TableRow className="bg-slate-100 font-bold"><TableCell colSpan={2}>Assets</TableCell></TableRow>

                                            <TableRow className="font-semibold text-slate-600"><TableCell className="pl-4">Current Assets</TableCell><TableCell></TableCell></TableRow>
                                            {financialData.balanceSheet.assets.current.map((a: any) => (
                                                <TableRow key={a.id}><TableCell className="pl-8">{a.name}</TableCell><TableCell className="text-right">{a.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell></TableRow>
                                            ))}
                                            <TableRow className="font-bold border-t"><TableCell className="pl-4">Total Current Assets</TableCell><TableCell className="text-right">{financialData.balanceSheet.assets.totalCurrent.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell></TableRow>

                                            <TableRow className="font-semibold text-slate-600"><TableCell className="pl-4">Fixed Assets</TableCell><TableCell></TableCell></TableRow>
                                            {financialData.balanceSheet.assets.fixed.map((a: any) => (
                                                <TableRow key={a.id}><TableCell className="pl-8">{a.name}</TableCell><TableCell className="text-right">{a.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell></TableRow>
                                            ))}
                                            <TableRow className="font-bold border-t"><TableCell className="pl-4">Total Fixed Assets</TableCell><TableCell className="text-right">{financialData.balanceSheet.assets.totalFixed.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell></TableRow>

                                            <TableRow className="bg-slate-200 font-bold border-t-2"><TableCell>Total Assets</TableCell><TableCell className="text-right">{financialData.balanceSheet.assets.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell></TableRow>


                                            {/* LIABILITIES */}
                                            <TableRow className="bg-slate-100 font-bold"><TableCell colSpan={2}>Liabilities</TableCell></TableRow>

                                            <TableRow className="font-semibold text-slate-600"><TableCell className="pl-4">Current Liabilities</TableCell><TableCell></TableCell></TableRow>
                                            {financialData.balanceSheet.liabilities.current.map((l: any) => (
                                                <TableRow key={l.id}><TableCell className="pl-8">{l.name}</TableCell><TableCell className="text-right">{l.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell></TableRow>
                                            ))}
                                            <TableRow className="font-bold border-t"><TableCell className="pl-4">Total Current Liabilities</TableCell><TableCell className="text-right">{financialData.balanceSheet.liabilities.totalCurrent.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell></TableRow>

                                            <TableRow className="font-semibold text-slate-600"><TableCell className="pl-4">Long Term Liabilities</TableCell><TableCell></TableCell></TableRow>
                                            {financialData.balanceSheet.liabilities.longTerm.map((l: any) => (
                                                <TableRow key={l.id}><TableCell className="pl-8">{l.name}</TableCell><TableCell className="text-right">{l.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell></TableRow>
                                            ))}
                                            <TableRow className="font-bold border-t"><TableCell className="pl-4">Total Long Term Liabilities</TableCell><TableCell className="text-right">{financialData.balanceSheet.liabilities.totalLongTerm.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell></TableRow>

                                            <TableRow className="bg-slate-200 font-bold border-t-2"><TableCell>Total Liabilities</TableCell><TableCell className="text-right">{financialData.balanceSheet.liabilities.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell></TableRow>

                                            {/* EQUITY */}
                                            <TableRow className="bg-slate-100 font-bold"><TableCell colSpan={2}>Equity</TableCell></TableRow>
                                            {financialData.balanceSheet.equity.map((eq: any) => (
                                                <TableRow key={eq.id}><TableCell className="pl-4">{eq.name}</TableCell><TableCell className="text-right">{eq.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell></TableRow>
                                            ))}
                                            <TableRow className="bg-slate-200 font-bold border-t-2"><TableCell>Total Equity</TableCell><TableCell className="text-right">{financialData.balanceSheet.totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell></TableRow>

                                            {/* CHECK */}
                                            <TableRow className="bg-slate-300 font-black border-t-4"><TableCell>Total Liab. & Equity</TableCell><TableCell className="text-right">{(financialData.balanceSheet.liabilities.total + financialData.balanceSheet.totalEquity).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell></TableRow>

                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                    </Protect>
                </TabsContent>

                {/* Payroll Tab */}
                <TabsContent value="payroll" className="space-y-4">
                    <Protect permission="VIEW_PAYROLL" fallback={<div className="p-4 text-center text-muted-foreground border border-dashed rounded-md">You do not have permission to view Payroll Reports.</div>}>
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
                    </Protect>
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
            </Tabs >
        </div >
    );
}
