import { Sidebar } from "@/components/Sidebar";
import { getAppMode } from "@/actions/app-mode";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const currentMode = await getAppMode();

    return (
        <div className="flex h-screen bg-slate-50">
            {/* Sidebar on the left */}
            <Sidebar />

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto w-full transition-all duration-300">
                <div className="p-8 pb-24">
                    {children}
                </div>
            </main>
        </div>
    );
}
