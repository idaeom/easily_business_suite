"use client";

import React, { useState, useOptimistic } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { SpQuote } from '@/db/schema';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { updateQuoteStatus, convertQuoteToSale } from '@/actions/sales';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Loader2, MoreHorizontal, FileCheck, CheckCircle, XCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Pagination } from "@/components/Pagination";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { QuoteDetailsDialog } from "./QuoteDetailsDialog";

interface QuotePipelineProps {
    initialQuotes: any[];
    view?: "card" | "list";
    page?: number;
    limit?: number;
}

const STAGES = {
    DRAFT: { label: 'Draft', color: 'bg-slate-100 border-slate-200' },
    SENT: { label: 'Sent', color: 'bg-blue-50 border-blue-200' },
    ACCEPTED: { label: 'Accepted', color: 'bg-green-50 border-green-200' },
    CONVERTED: { label: 'Converted', color: 'bg-purple-50 border-purple-200' },
    REJECTED: { label: 'Rejected', color: 'bg-red-50 border-red-200' },
    EXPIRED: { label: 'Expired', color: 'bg-gray-100 border-gray-200' }
};

export function QuotePipeline({ initialQuotes, view = "card", page = 1, limit = 20 }: QuotePipelineProps) {
    const [quotes, setQuotes] = useState(initialQuotes);
    const [selectedQuote, setSelectedQuote] = useState<any>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);

    // Filter/Slice for List View
    // Filter/Slice for BOTH views (Universal Pagination)
    const displayedQuotes = quotes.slice((page - 1) * limit, page * limit);

    // Group quotes by status (Uses DISPLAYED quotes)
    const getQuotesByStage = (stage: string) => {
        return displayedQuotes.filter(q => q.status === stage);
    };

    const handleQuoteUpdate = (updatedQuote: any) => {
        setQuotes(prev => prev.map(q => q.id === updatedQuote.id ? { ...q, ...updatedQuote } : q));
        if (selectedQuote?.id === updatedQuote.id) {
            setSelectedQuote({ ...selectedQuote, ...updatedQuote });
        }
    };

    const handleCardClick = (quote: any) => {
        setSelectedQuote(quote);
        setDetailsOpen(true);
    };

    const onDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        // Prevent moving locked quotes
        const quote = quotes.find(q => q.id === draggableId);
        if (quote && ["CONVERTED", "REJECTED", "EXPIRED"].includes(quote.status)) {
            return;
        }

        const newStatus = destination.droppableId as any;

        // Optimistic Update
        const updatedQuotes = quotes.map(q =>
            q.id === draggableId ? { ...q, status: newStatus } : q
        );
        setQuotes(updatedQuotes);

        // Server Action
        try {
            await updateQuoteStatus(draggableId, newStatus);
        } catch (error) {
            // Revert on error
            setQuotes(initialQuotes);
            console.error("Failed to update status", error);
        }
    };

    return (
        <div className="h-full flex flex-col space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Sales Pipeline</h2>
            </div>

            {view === "card" ? (
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 h-[calc(100vh-250px)] min-h-[500px]">
                        {Object.entries(STAGES).map(([stageKey, config]) => (
                            <div key={stageKey} className={cn("flex flex-col rounded-lg border bg-slate-50/50", config.color)}>
                                <div className="p-3 border-b flex justify-between items-center bg-white/50 backdrop-blur-sm rounded-t-lg">
                                    <h3 className="font-semibold text-sm">{config.label}</h3>
                                    <Badge variant="secondary" className="text-xs">
                                        {getQuotesByStage(stageKey).length}
                                    </Badge>
                                </div>

                                <Droppable droppableId={stageKey}>
                                    {(provided, snapshot) => (
                                        <div
                                            {...provided.droppableProps}
                                            ref={provided.innerRef}
                                            className={cn(
                                                "flex-1 p-2 space-y-2 overflow-y-auto transition-colors",
                                                snapshot.isDraggingOver ? "bg-slate-100/80" : ""
                                            )}
                                        >
                                            {getQuotesByStage(stageKey).map((quote, index) => (
                                                <Draggable
                                                    key={quote.id}
                                                    draggableId={quote.id}
                                                    index={index}
                                                    isDragDisabled={["CONVERTED", "REJECTED", "EXPIRED"].includes(quote.status)}
                                                >
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            style={{ ...provided.draggableProps.style }}
                                                            onClick={() => handleCardClick(quote)}
                                                            className={cn(
                                                                "bg-white p-3 rounded-md border shadow-sm hover:shadow-md transition-shadow cursor-pointer active:cursor-grabbing",
                                                                snapshot.isDragging ? "shadow-lg scale-105 rotate-1" : ""
                                                            )}
                                                        >
                                                            <div className="flex justify-between items-start mb-2">
                                                                <span className="font-medium text-sm truncate max-w-[120px]" title={quote.customerName}>
                                                                    {quote.customerName}
                                                                </span>
                                                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                                    <span className="text-xs text-muted-foreground mr-1">
                                                                        {format(new Date(quote.quoteDate), 'MMM d')}
                                                                    </span>
                                                                    <QuoteActions quote={quote} onUpdate={handleQuoteUpdate} />
                                                                </div>
                                                            </div>

                                                            <div className="text-lg font-bold text-slate-900 mb-2">
                                                                ₦{Number(quote.total).toLocaleString()}
                                                            </div>

                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                <Badge variant="outline" className="text-[10px] px-1 h-5">
                                                                    {quote.items.length} Items
                                                                </Badge>
                                                                {quote.contact?.name !== quote.customerName && (
                                                                    <span className="truncate max-w-[80px]" title={quote.contact?.name}>
                                                                        via {quote.contact?.name}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        ))}
                    </div>
                </DragDropContext>
            ) : (
                <div className="bg-white rounded-md border text-sm">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Reference</TableHead>
                                <TableHead>Items</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {displayedQuotes.map(quote => (
                                <TableRow key={quote.id} onClick={() => handleCardClick(quote)} className="cursor-pointer hover:bg-slate-50">
                                    <TableCell>{format(new Date(quote.quoteDate), "dd MMM yyyy")}</TableCell>
                                    <TableCell>
                                        <div className="font-medium">{quote.customerName}</div>
                                        {quote.contact?.name !== quote.customerName && (
                                            <div className="text-xs text-muted-foreground">via {quote.contact?.name}</div>
                                        )}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">{quote.id.slice(0, 8)}</TableCell>
                                    <TableCell>{quote.items?.length || 0} Items</TableCell>
                                    <TableCell className="font-bold">₦{Number(quote.total).toLocaleString()}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={STAGES[quote.status as keyof typeof STAGES]?.color || ""}>
                                            {STAGES[quote.status as keyof typeof STAGES]?.label || quote.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                        <div className="float-right">
                                            <QuoteActions quote={quote} onUpdate={handleQuoteUpdate} />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            <Pagination
                currentPage={page}
                totalItems={quotes.length}
                pageSize={limit}
                showViewToggle={true}
                pageParam="quotePage"
                limitParam="quoteLimit"
            />

            <QuoteDetailsDialog
                open={detailsOpen}
                onOpenChange={setDetailsOpen}
                quote={selectedQuote}
                onUpdate={handleQuoteUpdate}
            />
        </div>
    );
}

function QuoteActions({ quote, onUpdate }: { quote: any, onUpdate?: (q: any) => void }) {
    const { toast } = useToast();

    const handleConvert = async () => {
        try {
            const res = await convertQuoteToSale(quote.id);
            if (res.success) {
                toast({ title: "Success", description: "Quote converted to Sale!" });
                if (onUpdate) onUpdate({ ...quote, status: "CONVERTED" });
            }
        } catch (e) {
            toast({ title: "Error", description: "Failed to convert quote.", variant: "destructive" });
        }
    };

    const handleStatus = async (status: "ACCEPTED" | "REJECTED") => {
        try {
            await updateQuoteStatus(quote.id, status);
            toast({ title: "Status Updated", description: `Quote marked as ${status}` });
            if (onUpdate) onUpdate({ ...quote, status });
        } catch (e) {
            toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-6 w-6 p-0 hover:bg-slate-100 rounded-full">
                    <MoreHorizontal size={14} className="text-muted-foreground" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {quote.status !== 'ACCEPTED' && quote.status !== 'REJECTED' && (
                    <>
                        <DropdownMenuItem onClick={() => handleStatus("ACCEPTED")}>
                            <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Mark Accepted
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatus("REJECTED")}>
                            <XCircle className="mr-2 h-4 w-4 text-red-500" /> Mark Rejected
                        </DropdownMenuItem>
                    </>
                )}
                {quote.status === 'ACCEPTED' && (
                    <DropdownMenuItem onClick={handleConvert}>
                        <FileCheck className="mr-2 h-4 w-4 text-blue-500" /> Convert to Sale
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
