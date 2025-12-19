
import CreatePayrollForm from "@/components/hr/CreatePayrollForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewPayrollPage() {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight">New Payroll Run</h2>

            <Card>
                <CardHeader>
                    <CardTitle>Select Period</CardTitle>
                </CardHeader>
                <CardContent>
                    <CreatePayrollForm />
                </CardContent>
            </Card>
        </div>
    );
}
