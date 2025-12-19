
"use client";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { addPayrollComment } from "@/app/actions";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { RichTextEditor } from "@/components/RichTextEditor";
import { MessageSquare, Reply } from "lucide-react";

type Comment = {
    id: string;
    content: string;
    createdAt: Date;
    user: { name: string | null };
    parentId: string | null;
    children?: Comment[];
};

function buildCommentTree(comments: any[]): Comment[] {
    const commentMap: Record<string, Comment> = {};
    const roots: Comment[] = [];

    comments.forEach(c => {
        commentMap[c.id] = { ...c, children: [] };
    });

    comments.forEach(c => {
        if (c.parentId) {
            if (commentMap[c.parentId]) {
                commentMap[c.parentId].children?.push(commentMap[c.id]);
            }
        } else {
            roots.push(commentMap[c.id]);
        }
    });

    return roots;
}

function CommentItem({ comment, runId, onReply }: { comment: Comment; runId: string; onReply: () => void }) {
    const [replying, setReplying] = useState(false);
    const [replyContent, setReplyContent] = useState("");
    const [loading, setLoading] = useState(false);

    const handleReplySubmit = async () => {
        if (!replyContent.replace(/<[^>]*>/g, '').trim()) return;
        setLoading(true);
        try {
            await addPayrollComment(runId, replyContent, comment.id);
            setReplyContent("");
            setReplying(false);
            onReply();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex space-x-3">
            <Avatar className="h-8 w-8 mt-1">
                <AvatarFallback>{comment.user?.name?.[0] || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
                <div className="bg-muted/30 p-3 rounded-lg space-y-1">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">{comment.user?.name}</span>
                        <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                        </span>
                    </div>
                    <div
                        className="text-sm text-foreground prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: comment.content }}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-muted-foreground"
                        onClick={() => setReplying(!replying)}
                    >
                        <Reply className="h-3 w-3 mr-1" /> Reply
                    </Button>
                </div>

                {replying && (
                    <div className="pl-2 border-l-2 border-muted space-y-2 mt-2">
                        <RichTextEditor content={replyContent} onChange={setReplyContent} />
                        <div className="flex gap-2">
                            <Button size="sm" onClick={handleReplySubmit} disabled={loading}>
                                {loading ? "Replying..." : "Post Reply"}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setReplying(false)}>Cancel</Button>
                        </div>
                    </div>
                )}

                {comment.children && comment.children.length > 0 && (
                    <div className="space-y-4 pt-2 pl-4 border-l-2 border-muted/50">
                        {comment.children.map(child => (
                            <CommentItem key={child.id} comment={child} runId={runId} onReply={onReply} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export function PayrollComments({ runId, comments }: { runId: string; comments: any[] }) {
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);

    const rootComments = buildCommentTree(comments);

    const handleSubmit = async () => {
        if (!content.replace(/<[^>]*>/g, '').trim()) return;
        setLoading(true);
        try {
            await addPayrollComment(runId, content);
            setContent("");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Comments ({comments.length})
                </h3>

                <RichTextEditor
                    content={content}
                    onChange={setContent}
                />
                <Button onClick={handleSubmit} disabled={loading || !content.replace(/<[^>]*>/g, '').trim()}>
                    {loading ? "Posting..." : "Post Comment"}
                </Button>
            </div>

            <div className="space-y-6">
                {rootComments.map((comment) => (
                    <CommentItem key={comment.id} comment={comment} runId={runId} onReply={() => { }} />
                ))}
                {comments.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-8 bg-muted/20 rounded-lg border border-dashed">
                        No comments yet.
                    </div>
                )}
            </div>
        </div>
    );
}
