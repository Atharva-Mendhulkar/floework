import { useState, useEffect, useRef } from "react";
import { useGetMessagesQuery, usePostMessageMutation, useGetProjectsQuery, api } from "@/store/api";
import { supabase } from "@/lib/supabase";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "@/store";
import { Send, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function MessagesPage() {
    const [content, setContent] = useState("");
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [showProjectPicker, setShowProjectPicker] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { data: projectsRes } = useGetProjectsQuery();
    const projects = projectsRes?.data || [];
    const activeProject = projects.find(p => p.id === selectedProjectId) || projects[0] || null;
    const projectId = activeProject?.id || null;

    // Auto-select first project
    useEffect(() => {
        if (!selectedProjectId && projects.length > 0) {
            setSelectedProjectId(projects[0].id);
        }
    }, [projects, selectedProjectId]);

    const { data: response, isLoading } = useGetMessagesQuery(projectId!, { skip: !projectId });
    const [postMessage, { isLoading: isPosting }] = usePostMessageMutation();
    const isConnected = true; // Supabase handles connection state internally
    const dispatch = useDispatch<AppDispatch>();

    const messages = response?.data || [];

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        if (!projectId) return;

        // Subscribe to New Messages via Supabase Realtime
        const channel = supabase
            .channel(`project-chat-${projectId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `project_id=eq.${projectId}`
                },
                async (payload) => {
                    // Fetch profile info for the new message author
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('full_name, avatar_url')
                        .eq('id', payload.new.author_id)
                        .single();

                    const enrichedMessage = {
                        id: payload.new.id,
                        content: payload.new.content,
                        createdAt: payload.new.created_at,
                        author: {
                            id: payload.new.author_id,
                            name: profile?.full_name || 'Unknown',
                            avatarUrl: profile?.avatar_url
                        }
                    };

                    dispatch(
                        api.util.updateQueryData("getMessages", projectId, (draft) => {
                            if (!draft.data.find((m: any) => m.id === enrichedMessage.id)) {
                                draft.data.push(enrichedMessage);
                            }
                        })
                    );
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [dispatch, projectId]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || !projectId) return;
        try {
            await postMessage({ projectId, content }).unwrap();
            setContent("");
        } catch (err) {
            console.error("Failed to post message", err);
        }
    };

    return (
        <div className="flex-1 overflow-hidden flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200/80">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                <div className="relative">
                    <button
                        onClick={() => setShowProjectPicker(v => !v)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-[#007dff]/40 transition-all"
                    >
                        <span className="text-[13px] font-semibold text-slate-800">
                            {activeProject?.name || "Select project"}
                        </span>
                        <ChevronDown size={13} className="text-slate-400" />
                    </button>
                    {showProjectPicker && projects.length > 0 && (
                        <div className="absolute top-full left-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-lg z-10 min-w-[180px] overflow-hidden">
                            {projects.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => { setSelectedProjectId(p.id); setShowProjectPicker(false); }}
                                    className={`w-full text-left px-3 py-2 text-[13px] font-medium transition-colors hover:bg-slate-50
                                        ${p.id === projectId ? "text-[#007dff] bg-[#007dff]/5" : "text-slate-700"}`}
                                >
                                    {p.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500" : "bg-amber-400"}`} />
                    <span className="text-[11px] font-medium text-slate-400">
                        {isConnected ? "Live" : "Reconnecting..."}
                    </span>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
                {isLoading && (
                    <div className="flex items-center justify-center h-full">
                        <div className="w-6 h-6 border-2 border-[#007dff] border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
                {!isLoading && messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                            <Send size={18} className="opacity-50" />
                        </div>
                        <p className="text-[13px] font-medium">No messages yet</p>
                        <p className="text-[11px]">Start the conversation below.</p>
                    </div>
                )}
                {messages.map((msg: any) => {
                    const initials = msg.author?.name ? msg.author.name.substring(0, 2).toUpperCase() : "?";
                    return (
                        <div key={msg.id} className="flex items-start gap-3 group">
                            <div className="w-8 h-8 rounded-xl bg-[#007dff]/10 text-[#007dff] flex items-center justify-center font-bold text-[11px] shrink-0">
                                {initials}
                            </div>
                            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-[12px] font-semibold text-slate-800">{msg.author?.name || "Unknown"}</span>
                                    <span className="text-[10px] text-slate-400">
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                </div>
                                <div className="text-[13px] text-slate-600 bg-slate-50 border border-slate-100 rounded-b-xl rounded-tr-xl px-3 py-2 w-fit max-w-[80%] break-words">
                                    {msg.content}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="px-5 py-3 border-t border-slate-100 flex items-center gap-3">
                <Input
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder={projectId ? "Type a message…" : "Select a project first"}
                    className="flex-1 bg-slate-50 border-slate-200 focus-visible:ring-[#007dff]"
                    disabled={isPosting || !projectId}
                />
                <Button
                    type="submit"
                    disabled={!content.trim() || isPosting || !projectId}
                    className="bg-[#007dff] hover:bg-[#0068d6] text-white shrink-0"
                >
                    <Send size={15} className="mr-1.5" />
                    Send
                </Button>
            </form>
        </div>
    );
}
