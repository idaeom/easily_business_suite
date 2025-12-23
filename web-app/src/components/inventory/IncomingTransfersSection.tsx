
import { useState } from "react";
import { ViewToggle } from "@/components/ui/view-toggle"; // Ensure imported
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, PackageOpen } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export function IncomingTransfersSection({ transfers, getOutletName, getItemName, onReceive }: any) {
    const [view, setView] = useState<"grid" | "list">("grid");
    const [page, setPage] = useState(1);
    const itemsPerPage = 6; // Grid 2 cols -> 6 items is 3 rows.

    const totalPages = Math.ceil(transfers.length / itemsPerPage);
    const paginatedItems = transfers.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium text-orange-600 flex items-center"><Truck className="mr-2 h-4 w-4" /> Incoming Transfers ({transfers.length})</h4>
                <ViewToggle view={view} onViewChange={setView} />
            </div>

            {view === "grid" ? (
                <div className="grid gap-4 md:grid-cols-2">
                    {paginatedItems.map((t: any) => (
                        <Card key={t.id} className="border-orange-200 bg-orange-50/50">
                            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
                                <div className="text-sm font-medium">From: {getOutletName(t.sourceOutletId)}</div>
                                <Badge variant="outline">{t.type}</Badge>
                            </CardHeader>
                            <CardContent className="py-2 px-4 text-sm">
                                <ul className="list-disc pl-4 space-y-1">
                                    {t.items.map((i: any, idx: number) => (
                                        <li key={idx}>{getItemName(i.itemId)} (Ordered: {i.quantity})</li>
                                    ))}
                                </ul>
                                {t.notes && <p className="text-muted-foreground mt-2 italic">{t.notes}</p>}
                                {t.status === 'PARTIALLY_COMPLETED' && <Badge className="mt-2" variant="secondary">Partially Received</Badge>}
                            </CardContent>
                            <CardFooter className="py-3 px-4">
                                <Button size="sm" className="w-full" onClick={() => onReceive(t)}>
                                    <PackageOpen className="mr-2 h-4 w-4" /> Receive Items
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-md border text-sm">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>From</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Items</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedItems.map((t: any) => (
                                <TableRow key={t.id}>
                                    <TableCell>{format(new Date(t.createdAt), "MMM d")}</TableCell>
                                    <TableCell>{getOutletName(t.sourceOutletId)}</TableCell>
                                    <TableCell><Badge variant="outline" className="text-xs">{t.type}</Badge></TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-xs">
                                            {t.items.slice(0, 2).map((i: any, idx: number) => (
                                                <span key={idx}>{i.quantity}x {getItemName(i.itemId)}</span>
                                            ))}
                                            {t.items.length > 2 && <span className="text-muted-foreground">+{t.items.length - 2} more</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {t.status === 'PARTIALLY_COMPLETED' ? <Badge variant="secondary">Partial</Badge> : <Badge variant="outline">{t.status}</Badge>}
                                    </TableCell>
                                    <TableCell>
                                        <Button size="sm" variant="secondary" onClick={() => onReceive(t)}>
                                            Receive
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        Previous
                    </Button>
                    <span className="text-sm font-medium">Page {page} of {totalPages}</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    );
}
