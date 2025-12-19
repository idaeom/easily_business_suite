import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { ShoppingBag, FileText, Banknote } from "lucide-react";

interface PosMetricsProps {
    metrics: {
        itemsSold: number;
        transactionCount: number;
        totalRevenue: number;
    };
}

export function PosMetrics({ metrics }: PosMetricsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Card>
                <CardContent className="p-4 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Items Sold</p>
                        <h3 className="text-2xl font-bold">{metrics.itemsSold}</h3>
                    </div>
                    <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <ShoppingBag className="h-4 w-4 text-blue-600" />
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-4 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Transactions</p>
                        <h3 className="text-2xl font-bold">{metrics.transactionCount}</h3>
                    </div>
                    <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                        <FileText className="h-4 w-4 text-green-600" />
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-4 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                        <h3 className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</h3>
                    </div>
                    <div className="h-8 w-8 bg-amber-100 rounded-full flex items-center justify-center">
                        <Banknote className="h-4 w-4 text-amber-600" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
