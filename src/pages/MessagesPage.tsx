import { useState, useEffect, useRef } from "react";
import { useGetMessagesQuery, usePostMessageMutation, api } from "@/store/api";
import { useSocket } from "@/modules/socket/SocketContext";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "@/store";
import { Send, User as UserIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function MessagesPage() {
    const [content, setContent] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Hardcode a seeded project ID for MVP.
    const staticProjectId = "d5b480c4-ce88-4a96-aeae-7386b436a8ac";

    const { data: response, isLoading } = useGetMessagesQuery(staticProjectId);
    const [postMessage, { isLoading: isPosting }] = usePostMessageMutation();
    const { socket, isConnected } = useSocket();
    const dispatch = useDispatch<AppDispatch>();

    const messages = response?.data || [];

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // WebSocket Subscription
    useEffect(() => {
        if (!socket || !isConnected) return;

        // Join the specific project room
        socket.emit("join_project", staticProjectId);

        // Listen for incoming new messages
        socket.on("new_message", (newMessage: any) => {
            // Proactively update the Redux RTK Query cache to display the new message immediately
            dispatch(
                api.util.updateQueryData("getMessages", staticProjectId, (draft) => {
                    // ensure no duplicates
                    if (!draft.data.find(m => m.id === newMessage.id)) {
                        draft.data.push(newMessage);
                    }
                })
            );
        });

        return () => {
            socket.emit("leave_project", staticProjectId);
            socket.off("new_message");
        };
    }, [socket, isConnected, dispatch, staticProjectId]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;

        try {
            await postMessage({ projectId: staticProjectId, content }).unwrap();
            setContent("");
        } catch (error) {
            console.error("Failed to post message", error);
        }
    };

    return (
        <div className="flex-1 overflow-hidden flex flex-col bg-surface rounded-2xl shadow-card border border-border">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-background">
                <div>
                    <h2 className="text-lg font-semibold text-foreground">Team Chat</h2>
                    <p className="text-xs text-text-muted">Sprint 14 Discussion</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500" : "bg-warning"}`} />
                    <span className="text-xs font-medium text-text-secondary">
                        {isConnected ? "Connected" : "Reconnecting..."}
                    </span>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isLoading && (
                    <div className="flex items-center justify-center h-full text-text-muted text-sm">
                        Loading messages...
                    </div>
                )}

                {!isLoading && messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-text-muted">
                        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
                            <Send size={24} className="opacity-50" />
                        </div>
                        <p className="text-sm font-medium">No messages yet</p>
                        <p className="text-xs">Start the conversation below.</p>
                    </div>
                )}

                {messages.map((msg: any) => {
                    // Try to derive initials from author payload if populated
                    const authorInitials = msg.author?.name ? msg.author.name.substring(0, 2).toUpperCase() : "?";

                    return (
                        <div key={msg.id} className="flex items-start gap-3 group">
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-500/30">
                                {authorInitials}
                            </div>
                            <div className="flex flex-col gap-1 min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-foreground">{msg.author?.name || "Unknown"}</span>
                                    <span className="text-[10px] text-text-muted">
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="text-sm text-text-secondary bg-background rounded-b-xl rounded-tr-xl border border-border px-3 py-2 w-fit break-words max-w-[85%]">
                                    {msg.content}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-4 border-t border-border bg-background flex items-center gap-3">
                <Input
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-surface border-border focus-visible:ring-focus"
                    disabled={isPosting}
                />
                <Button
                    type="submit"
                    disabled={!content.trim() || isPosting}
                    className="bg-focus hover:bg-focus/90 text-white shrink-0 shadow-sm"
                >
                    <Send size={16} className="mr-2" />
                    Send
                </Button>
            </form>
        </div>
    );
}
