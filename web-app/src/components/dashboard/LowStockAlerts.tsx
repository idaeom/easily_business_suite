import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLowStockItems } from "@/actions/inventory";
import { AlertTriangle } from "lucide-react";

interface LowStockItem {
    id: string;
    outletId: string;
    name: string;
    outletName: string | null;
    quantity: string;
    minStockLevel: number | null;
}

export async function LowStockAlerts({ outletId }: { outletId?: string }) {
    const items = await getLowStockItems(outletId);

    if (items.length === 0) return null;

    return (
        <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-orange-800 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Low Stock Alerts
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {items.map((item: LowStockItem) => {
                        const qty = Number(item.quantity);
                        const isNegative = qty < 0;

                        return (
                            <div key={`${item.id}-${item.outletId}`} className={`flex items-center justify-between text-sm border-b border-orange-200/50 last:border-0 pb-2 last:pb-0 ${isNegative ? "bg-red-50 -mx-4 px-4 py-2" : ""}`}>
                                <div>
                                    <p className={`font-medium ${isNegative ? "text-red-900" : "text-orange-900"}`}>
                                        {item.name}
                                        {isNegative && <span className="ml-2 text-[10px] bg-red-100 text-red-700 px-1 rounded border border-red-200">NEGATIVE</span>}
                                    </p>
                                    <p className="text-xs text-orange-700">{item.outletName}</p>
                                </div>
                                <div className="text-right">
                                    <p className={`font-bold ${isNegative ? "text-red-700" : "text-red-600"}`}>{qty.toFixed(2)}</p>
                                    <p className="text-[10px] text-orange-600">Min: {item.minStockLevel}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
