import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "./UserAvatar";
import { 
    useGetTasksQuery, 
    useUpdateTaskMutation, 
    useUpdateWorkspaceMemberMutation, 
    useRemoveWorkspaceMemberMutation 
} from "@/store/api";
import { useAuth } from "@/modules/auth/AuthContext";
import { useAppDispatch } from "@/store/hooks";
import { selectTask } from "@/store/slices/projectSlice";
import { setActiveTask } from "@/store/slices/dashboardSlice";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { 
    Mail, 
    Check, 
    Shield, 
    MessageSquare, 
    CheckCircle2, 
    ExternalLink, 
    UserMinus, 
    Plus, 
    Calendar,
    Briefcase
} from "lucide-react";

interface MemberProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    member: any | null;
    workspaceId?: string;
    isAdmin?: boolean;
}

export function MemberProfileModal({ 
    isOpen, 
    onClose, 
    member, 
    workspaceId = "proj-default-1", 
    isAdmin = false 
}: MemberProfileModalProps) {
    const { user: currentUser } = useAuth();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
    const [copiedEmail, setCopiedEmail] = useState(false);
    const [assignDropdownOpen, setAssignDropdownOpen] = useState(false);

    const { data: tasksRes } = useGetTasksQuery({ projectId: workspaceId }, { skip: !isOpen });
    const [updateTask, { isLoading: isAssigning }] = useUpdateTaskMutation();
    const [updateRole, { isLoading: isUpdatingRole }] = useUpdateWorkspaceMemberMutation();
    const [removeMember, { isLoading: isRemoving }] = useRemoveWorkspaceMemberMutation();

    if (!member) return null;

    const memberId = member.user_id || member.id;
    const memberName = member.name || member.profiles?.full_name || "Team Member";
    const memberEmail = member.email || member.profiles?.email || "member@floework.dev";
    const memberRole = member.role || member.profiles?.role || "member";
    const memberAvatar = member.avatar_url || member.profiles?.avatar_url || null;
    const memberTitle = member.title || member.profiles?.title || (memberRole === "admin" ? "Lead Systems Architect" : "Software Engineer");
    const memberBio = member.bio || "Collaborating on engineering deliverables, causality graphs, and sprint execution.";
    const memberPresence: "focus" | "available" | "offline" = member.presence || member.profiles?.presence || "available";
    const memberHandle = member.handle || `@${memberName.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
    const joinedDateStr = member.joined_at 
        ? new Date(member.joined_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "Jan 15, 2025";

    const allTasks = tasksRes?.data || [];
    const assignedTasks = allTasks.filter((t: any) => {
        return (
            t.assignee?.id === memberId ||
            t.assignee?.name === memberName ||
            t.assignee_id === memberId
        );
    });

    const activeTasks = assignedTasks.filter((t: any) => t.status !== "done");
    const completedTasks = assignedTasks.filter((t: any) => t.status === "done");

    // Calculated metrics
    const focusHours = member.focus_hours ?? Number((assignedTasks.reduce((acc: number, t: any) => acc + (t.focusCount || 0) * 0.5, 8)).toFixed(1));
    const velocityScore = member.focus_velocity ?? Math.min(98, 85 + completedTasks.length * 2);

    const handleCopyEmail = () => {
        navigator.clipboard.writeText(memberEmail);
        setCopiedEmail(true);
        toast.success("Email copied to clipboard");
        setTimeout(() => setCopiedEmail(false), 2000);
    };

    const handleGoToChat = () => {
        onClose();
        navigate("/messages");
    };

    const handleOpenTask = (task: any) => {
        dispatch(selectTask(task));
        dispatch(setActiveTask(task.id));
        onClose();
        navigate("/boards");
    };

    const handleAssignTask = async (taskId: string) => {
        try {
            await updateTask({
                id: taskId,
                assigneeId: memberId,
                projectId: workspaceId
            }).unwrap();
            setAssignDropdownOpen(false);
            toast.success(`Assigned deliverable to ${memberName}`);
        } catch {
            toast.error("Failed to assign task");
        }
    };

    const handleChangeRole = async (newRole: string) => {
        try {
            await updateRole({
                workspaceId,
                userId: memberId,
                role: newRole
            }).unwrap();
            toast.success(`Role updated to ${newRole}`);
        } catch {
            toast.error("Failed to update member role");
        }
    };

    const handleRemoveFromWorkspace = async () => {
        if (!confirm(`Are you sure you want to remove ${memberName} from this workspace?`)) return;
        try {
            await removeMember({
                workspaceId,
                userId: memberId
            }).unwrap();
            toast.success(`${memberName} removed from workspace`);
            onClose();
        } catch {
            toast.error("Failed to remove member");
        }
    };

    const isSelf = currentUser?.id === memberId || currentUser?.email === memberEmail;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[620px] max-h-[92vh] overflow-y-auto p-0 rounded-2xl bg-white border border-slate-200/80 shadow-2xl no-scrollbar">
                {/* Header Banner */}
                <div className="relative h-24 bg-gradient-to-r from-[#007dff] via-blue-500 to-indigo-600 p-6 flex items-end">
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                        <Badge 
                            variant="secondary" 
                            className="bg-white/20 hover:bg-white/30 text-white border-0 text-[10px] font-semibold tracking-wider uppercase backdrop-blur-md"
                        >
                            {memberRole === "admin" && <Shield size={11} className="mr-1 inline" />}
                            {memberRole}
                        </Badge>
                        {isSelf && (
                            <Badge variant="outline" className="bg-white/20 text-white border-0 text-[10px] backdrop-blur-md">
                                You
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Profile Overview Card */}
                <div className="px-6 pt-0 pb-4 border-b border-slate-100 relative">
                    <div className="flex items-start justify-between -mt-10 mb-3">
                        <div className="relative">
                            <UserAvatar
                                name={memberName}
                                avatarUrl={memberAvatar}
                                size="lg"
                                status={memberPresence}
                                className="ring-4 ring-white shadow-md rounded-full bg-white"
                            />
                        </div>

                        {/* Quick action buttons */}
                        <div className="flex items-center gap-2 pt-12">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCopyEmail}
                                className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5 rounded-xl"
                                title="Copy Email"
                            >
                                {copiedEmail ? <Check size={13} className="text-emerald-500" /> : <Mail size={13} />}
                                <span>{copiedEmail ? "Copied" : "Email"}</span>
                            </Button>

                            <Button
                                size="sm"
                                onClick={handleGoToChat}
                                className="h-8 text-xs bg-[#007dff] hover:bg-[#0066cc] text-white gap-1.5 rounded-xl shadow-sm"
                            >
                                <MessageSquare size={13} />
                                <span>Message</span>
                            </Button>
                        </div>
                    </div>

                    {/* Member Identity & Details */}
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold text-slate-900 leading-tight">
                                {memberName}
                            </h2>
                            <span className="text-xs text-slate-400 font-mono">{memberHandle}</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-600 mt-0.5 flex items-center gap-1.5">
                            <Briefcase size={12} className="text-slate-400" />
                            {memberTitle}
                        </p>
                        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                            {memberBio}
                        </p>

                        <div className="flex items-center gap-4 mt-3 text-[11px] text-slate-400 font-medium">
                            <span className="flex items-center gap-1">
                                <Calendar size={12} />
                                Joined {joinedDateStr}
                            </span>
                            <span>•</span>
                            <span className="font-mono text-slate-500">{memberEmail}</span>
                        </div>
                    </div>

                    {/* Live Presence Banner */}
                    <div className="mt-4 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${
                                memberPresence === "focus" 
                                    ? "bg-[#007dff] animate-pulse" 
                                    : memberPresence === "available" 
                                        ? "bg-emerald-500" 
                                        : "bg-slate-300"
                            }`} />
                            <span className="font-semibold text-slate-800">
                                {memberPresence === "focus" && "Currently in Deep Focus Session"}
                                {memberPresence === "available" && "Available for Collaboration"}
                                {memberPresence === "offline" && "Away / Offline"}
                            </span>
                        </div>
                        {memberPresence === "focus" && (
                            <span className="text-[11px] text-[#007dff] font-medium truncate max-w-[200px]">
                                {member.active_task_title || activeTasks[0]?.title || "Focus Deliverable"}
                            </span>
                        )}
                    </div>
                </div>

                {/* Telemetry Metrics Strip */}
                <div className="grid grid-cols-4 divide-x divide-slate-100 bg-slate-50/50 border-b border-slate-100 py-3.5 px-6">
                    <div className="text-center">
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Deep Focus</p>
                        <p className="text-lg font-black text-slate-900 mt-0.5">{focusHours}h</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">In-Flight</p>
                        <p className="text-lg font-black text-[#007dff] mt-0.5">{activeTasks.length}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Resolved</p>
                        <p className="text-lg font-black text-emerald-600 mt-0.5">{completedTasks.length}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Velocity</p>
                        <p className="text-lg font-black text-slate-900 mt-0.5">{velocityScore}%</p>
                    </div>
                </div>

                {/* Workload / Deliverables Section */}
                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 bg-slate-100/80 p-0.5 rounded-lg text-xs font-semibold">
                            <button
                                onClick={() => setActiveTab("active")}
                                className={`px-3 py-1 rounded-md transition-all ${
                                    activeTab === "active" 
                                        ? "bg-white text-slate-900 shadow-sm" 
                                        : "text-slate-500 hover:text-slate-900"
                                }`}
                            >
                                Active Deliverables ({activeTasks.length})
                            </button>
                            <button
                                onClick={() => setActiveTab("completed")}
                                className={`px-3 py-1 rounded-md transition-all ${
                                    activeTab === "completed" 
                                        ? "bg-white text-slate-900 shadow-sm" 
                                        : "text-slate-500 hover:text-slate-900"
                                }`}
                            >
                                Completed ({completedTasks.length})
                            </button>
                        </div>

                        {/* Quick Assign Dropdown */}
                        <div className="relative">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setAssignDropdownOpen(!assignDropdownOpen)}
                                className="h-7 text-xs border-slate-200 text-[#007dff] hover:bg-blue-50 font-semibold gap-1 rounded-lg"
                            >
                                <Plus size={12} />
                                <span>Assign Task</span>
                            </Button>

                            {assignDropdownOpen && (
                                <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-xl border border-slate-200 shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95">
                                    <div className="p-2 border-b border-slate-100 bg-slate-50">
                                        <p className="text-[11px] font-bold text-slate-700">Assign from Workspace</p>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 p-1">
                                        {allTasks.length === 0 ? (
                                            <p className="p-3 text-xs text-slate-400 text-center">No tasks available</p>
                                        ) : (
                                            allTasks.map((t: any) => (
                                                <button
                                                    key={t.id}
                                                    disabled={isAssigning}
                                                    onClick={() => handleAssignTask(t.id)}
                                                    className="w-full text-left px-2.5 py-2 hover:bg-slate-50 rounded-lg text-xs transition-colors flex items-center justify-between group"
                                                >
                                                    <span className="truncate pr-2 font-medium text-slate-700 group-hover:text-[#007dff]">
                                                        {t.title}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                                        {t.phase || "task"}
                                                    </span>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Task List */}
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1 no-scrollbar">
                        {activeTab === "active" ? (
                            activeTasks.length === 0 ? (
                                <div className="py-8 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                                    <p className="text-xs text-slate-400">No active deliverables assigned to this member</p>
                                </div>
                            ) : (
                                activeTasks.map((task: any) => (
                                    <div
                                        key={task.id}
                                        onClick={() => handleOpenTask(task)}
                                        className="p-3 rounded-xl border border-slate-200/80 bg-white hover:border-[#007dff]/50 hover:shadow-sm cursor-pointer transition-all flex items-center justify-between group"
                                    >
                                        <div className="min-w-0 flex-1 pr-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-slate-900 group-hover:text-[#007dff] truncate transition-colors">
                                                    {task.title}
                                                </span>
                                                <Badge variant="outline" className="text-[9px] uppercase px-1.5 py-0 font-medium">
                                                    {task.priority || "medium"}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 font-mono">
                                                <span>Phase: {task.phase || "allocation"}</span>
                                                <span>•</span>
                                                <span>{task.focusCount || 0} focus sessions</span>
                                            </div>
                                        </div>
                                        <ExternalLink size={14} className="text-slate-300 group-hover:text-[#007dff] shrink-0 transition-colors" />
                                    </div>
                                ))
                            )
                        ) : (
                            completedTasks.length === 0 ? (
                                <div className="py-8 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                                    <p className="text-xs text-slate-400">No completed deliverables yet</p>
                                </div>
                            ) : (
                                completedTasks.map((task: any) => (
                                    <div
                                        key={task.id}
                                        onClick={() => handleOpenTask(task)}
                                        className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white cursor-pointer transition-all flex items-center justify-between group"
                                    >
                                        <div className="min-w-0 flex-1 pr-3">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                                                <span className="text-xs font-semibold text-slate-700 line-through truncate">
                                                    {task.title}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-mono mt-0.5 ml-5">
                                                Delivered in {task.phase || "outcome"}
                                            </p>
                                        </div>
                                        <ExternalLink size={14} className="text-slate-300 group-hover:text-slate-600 shrink-0 transition-colors" />
                                    </div>
                                ))
                            )
                        )}
                    </div>
                </div>

                {/* Admin Management Actions Footer */}
                {isAdmin && !isSelf && (
                    <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                            <span className="text-slate-500 font-medium">Role:</span>
                            <select
                                value={memberRole}
                                disabled={isUpdatingRole}
                                onChange={(e) => handleChangeRole(e.target.value)}
                                className="h-7 px-2 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#007dff]/20 cursor-pointer"
                            >
                                <option value="member">Member</option>
                                <option value="admin">Admin</option>
                                <option value="viewer">Viewer</option>
                            </select>
                        </div>

                        <Button
                            size="sm"
                            variant="ghost"
                            disabled={isRemoving}
                            onClick={handleRemoveFromWorkspace}
                            className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 gap-1 rounded-lg"
                        >
                            <UserMinus size={13} />
                            <span>Remove Member</span>
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
