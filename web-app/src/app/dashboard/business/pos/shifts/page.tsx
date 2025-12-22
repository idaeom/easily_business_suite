
import { getDb } from "@/db";
import { posShifts } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import ReconcileButton from "./ReconcileButton";
import { ArrowLeft } from "lucide-react";

export default async function ShiftHistoryPage() {
    const db = await getDb();
    const data = await db.query.posShifts.findMany({
        with: { cashier: true },
        orderBy: [desc(posShifts.startTime)]
    });

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Shift History</h2>
                    <p className="text-muted-foreground">Manage and reconcile POS shifts.</p>
                </div>
                <Link href="/dashboard/business/pos">
                    <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Back to POS</Button>
                </Link>
            </div>

            <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b bg-muted/50 text-left">
                            <th className="p-4 font-medium">Cashier</th>
                            <th className="p-4 font-medium">Start Time</th>
                            <th className="p-4 font-medium">End Time</th>
                            <th className="p-4 font-medium">Status</th>
                            <th className="p-4 font-medium text-right">Expected (Cash)</th>
                            <th className="p-4 font-medium text-right">Actual (Cash)</th>
                            <th className="p-4 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.length === 0 && (
                            <tr>
                                <td colSpan={7} className="p-8 text-center text-muted-foreground">No shifts found.</td>
                            </tr>
                        )}
                        {data.map(shift => (
                            <tr key={shift.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                                <td className="p-4 font-medium">{shift.cashier?.name}</td>
                                <td className="p-4">{formatDate(shift.startTime)}</td>
                                <td className="p-4">{shift.endTime ? formatDate(shift.endTime) : "-"}</td>
                                <td className="p-4">
                                    <Badge variant={shift.status === "OPEN" ? "default" : shift.status === "RECONCILED" ? "outline" : "secondary"}
                                        className={shift.status === "RECONCILED" ? "border-green-500 text-green-600 bg-green-50" : ""}
                                    >
                                        {shift.status}
                                    </Badge>
                                </td>
                                <td className="p-4 text-right">{formatCurrency(Number(shift.expectedCash || 0))}</td>
                                <td className="p-4 text-right font-medium">{formatCurrency(Number(shift.actualCash || 0))}</td>
                                <td className="p-4 text-right">
                                    <Link href={`/dashboard/business/pos/shifts/${shift.id}`}>
                                        <Button size="sm" variant="outline">Review</Button>
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
