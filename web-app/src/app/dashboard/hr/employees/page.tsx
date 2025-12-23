import { getAllEmployees } from "@/app/actions";
import { EmployeeList } from "@/components/hr/EmployeeList";
import { Protect } from "@/components/auth/Protect";

export default async function EmployeesPage() {
    const employees = await getAllEmployees();

    return (
        <div className="space-y-6">
            <Protect permission="MANAGE_EMPLOYEES" fallback={<div className="p-8 text-center text-muted-foreground border border-dashed rounded-lg">You do not have permission to manage employees.</div>}>
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold tracking-tight">Employees</h2>
                </div>

                <EmployeeList employees={employees} />
            </Protect>
        </div>
    );
}
