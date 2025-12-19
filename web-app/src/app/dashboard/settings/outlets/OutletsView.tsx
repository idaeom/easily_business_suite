
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { PlusCircle, MapPin, Phone, Building2 } from "lucide-react";
import { OutletDialog } from "@/components/settings/OutletDialog";

export function OutletsView({ initialOutlets }: { initialOutlets: any[] }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedOutlet, setSelectedOutlet] = useState<any>(null);

    const handleCreate = () => {
        setSelectedOutlet(null);
        setIsDialogOpen(true);
    };

    const handleEdit = (outlet: any) => {
        setSelectedOutlet(outlet);
        setIsDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Branches</h2>
                    <p className="text-muted-foreground">Manage your physical store locations and settings.</p>
                </div>
                <Button onClick={handleCreate}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Branch
                </Button>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {initialOutlets.map((outlet) => (
                    <Card key={outlet.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => handleEdit(outlet)}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-muted-foreground" />
                                {outlet.name}
                            </CardTitle>
                            <CardDescription>Created {new Date(outlet.createdAt).toLocaleDateString()}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    <span>{outlet.address || "No address"}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4" />
                                    <span>{outlet.phone || "No phone"}</span>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="text-xs text-muted-foreground border-t bg-muted/20 p-3">
                            Loyalty: {outlet.loyaltyEarningRate}% Earn / {outlet.loyaltyRedemptionRate} Redeem
                        </CardFooter>
                    </Card>
                ))}

                {initialOutlets.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        No branches found. Create your first branch above.
                    </div>
                )}
            </div>

            <OutletDialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) setSelectedOutlet(null);
                }}
                outlet={selectedOutlet}
            />
        </div>
    );
}
