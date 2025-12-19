
import { redirect } from "next/navigation";

export default function EmployeesNewRedirect() {
    redirect("/dashboard/settings/users?newUser=true");
}
