import { getAllAppraisals, getAllEmployees, getMyAppraisals, getPendingAppraisals } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import AppraisalForm from "@/components/hr/AppraisalForm";
import { AppraisalApprovalList, MyAppraisalList, TeamAppraisalList } from "@/components/hr/AppraisalLists";

export default async function AppraisalsPage() {
    const myAppraisals = await getMyAppraisals();
    const allAppraisals = await getAllAppraisals(); // Note: This should ideally just be for "Team Reviews" history
    const pendingAppraisals = await getPendingAppraisals();
    const employees = await getAllEmployees();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">Performace Appraisals</h2>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            New Appraisal
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Conduct New Appraisal</DialogTitle>
                        </DialogHeader>
                        <AppraisalForm employees={employees} />
                    </DialogContent>
                </Dialog>
            </div>

            <Tabs defaultValue="approvals" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="approvals">Approvals ({pendingAppraisals.length})</TabsTrigger>
                    <TabsTrigger value="all">Team Reviews</TabsTrigger>
                    <TabsTrigger value="my">My Reviews</TabsTrigger>
                </TabsList>

                <TabsContent value="approvals">
                    <AppraisalApprovalList appraisals={pendingAppraisals} />
                </TabsContent>

                <TabsContent value="my">
                    <MyAppraisalList appraisals={myAppraisals} />
                </TabsContent>

                <TabsContent value="all">
                    <TeamAppraisalList appraisals={allAppraisals} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
