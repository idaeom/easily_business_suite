import { getUsersForOnboarding } from "@/actions/hr";
import EmployeeOnboardingForm from "@/components/hr/EmployeeOnboardingForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewEmployeePage() {
    const users = await getUsersForOnboarding();

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/hr/employees">
                    <Button variant="ghost" size="sm" className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Directory
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold tracking-tight">Onboard New Employee</h1>
            </div>

            <EmployeeOnboardingForm users={users} />
        </div>
    );
}
