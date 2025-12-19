"use client";

import { useState } from "react";
import { uploadTaskAttachment, deleteTaskAttachment } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { FileIcon, Trash2, Upload, Eye, FileText, Image as ImageIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

export function TaskAttachments({ taskId, attachments }: { taskId: string, attachments: any[] }) {
    const [uploading, setUploading] = useState(false);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            await uploadTaskAttachment(taskId, formData);
        } catch (error) {
            console.error("Upload failed:", error);
            alert("Upload failed");
        } finally {
            setUploading(false);
            // Reset input
            e.target.value = "";
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this attachment?")) return;
        try {
            await deleteTaskAttachment(id);
        } catch (error) {
            console.error("Delete failed:", error);
            alert("Delete failed");
        }
    };

    const getIcon = (type: string) => {
        if (type.startsWith("image/")) return <ImageIcon className="h-5 w-5 text-blue-500" />;
        if (type === "application/pdf") return <FileText className="h-5 w-5 text-red-500" />;
        return <FileIcon className="h-5 w-5 text-gray-500" />;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <FileIcon className="h-5 w-5" />
                    Attachments ({attachments.length})
                </h3>
                <div className="relative">
                    <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        onChange={handleUpload}
                        disabled={uploading}
                    />
                    <label htmlFor="file-upload">
                        <Button variant="outline" size="sm" className="cursor-pointer" asChild disabled={uploading}>
                            <span>
                                <Upload className="h-4 w-4 mr-2" />
                                {uploading ? "Uploading..." : "Upload File"}
                            </span>
                        </Button>
                    </label>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {attachments.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors group">
                        <div className="flex items-center space-x-3 overflow-hidden">
                            <div className="flex-shrink-0">
                                {getIcon(file.type)}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{file.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {(file.size / 1024).toFixed(1)} KB • {formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}
                                </p>
                                <p className="text-xs text-muted-foreground">by {file.uploader?.name}</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" asChild title="Preview">
                                <Link href={file.url} target="_blank" prefetch={false}>
                                    <Eye className="h-4 w-4" />
                                </Link>
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(file.id)} title="Delete">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}
                {attachments.length === 0 && (
                    <div className="col-span-full text-sm text-muted-foreground text-center py-8 bg-muted/20 rounded-lg border border-dashed">
                        No attachments yet.
                    </div>
                )}
            </div>
        </div>
    );
}
