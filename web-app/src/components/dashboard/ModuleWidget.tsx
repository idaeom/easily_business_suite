
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricItem {
    label: string;
    value: string | number;
    subtext?: string;
    status?: "success" | "warning" | "danger" | "neutral";
}

interface ModuleWidgetProps {
    title: string;
    icon: React.ElementType;
    color: "blue" | "purple" | "green" | "orange" | "red" | "sky" | "indigo";
    href: string;
    metrics: MetricItem[];
    className?: string;
}

const colorMap = {
    blue: "text-blue-600 bg-blue-50 border-blue-100",
    purple: "text-purple-600 bg-purple-50 border-purple-100",
    green: "text-green-600 bg-green-50 border-green-100",
    orange: "text-orange-600 bg-orange-50 border-orange-100",
    red: "text-red-600 bg-red-50 border-red-100",
    sky: "text-sky-600 bg-sky-50 border-sky-100",
    indigo: "text-indigo-600 bg-indigo-50 border-indigo-100",
};

export function ModuleWidget({ title, icon: Icon, color, href, metrics, className }: ModuleWidgetProps) {
    const theme = colorMap[color];

    return (
        <Card className={cn("hover:shadow-md transition-shadow border-l-4", className, `border-l-${color}-500`)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <div className={cn("p-2 rounded-lg", theme)}>
                        <Icon size={20} />
                    </div>
                    {title}
                </CardTitle>
                <Link href={href} className="text-slate-400 hover:text-slate-600 transition-colors">
                    <ArrowRight size={18} />
                </Link>
            </CardHeader>
            <CardContent>
                <div className="space-y-4 pt-2">
                    {metrics.map((metric, i) => (
                        <div key={i} className="flex items-center justify-between">
                            <span className="text-sm text-slate-500">{metric.label}</span>
                            <div className="text-right">
                                <p className={cn("font-bold text-slate-900", {
                                    "text-green-600": metric.status === "success",
                                    "text-red-500": metric.status === "danger",
                                    "text-orange-500": metric.status === "warning",
                                })}>
                                    {metric.value}
                                </p>
                                {metric.subtext && (
                                    <p className="text-xs text-slate-400">{metric.subtext}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
