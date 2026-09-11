import { useState, useMemo } from "react";
import { useAuth } from "@/modules/auth/AuthContext";
import { 
    useGetMyTeamsQuery, 
    useGetWorkspaceMembersQuery, 
    useUpdateWorkspaceMutation, 
    useUpdateWorkspaceMemberMutation, 
    useRemoveWorkspaceMemberMutation, 
    useDeleteWorkspaceMutation, 
    useGetPendingInvitesQuery, 
    useRevokeInviteMutation,
    useGetTasksQuery
} from "@/store/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { UserAvatar } from "@/components/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { 
    User, 
    Shield, 
    UserPlus, 
    Trash2, 
    Settings, 
    MoreVertical, 
    Copy, 
    Check, 
    Clock, 
    Search, 
    Zap, 
    Briefcase, 
    ExternalLink, 
    MessageSquare, 
    Layers, 
    AlertTriangle,
    Eye,
    CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { InviteToWorkspaceModal } from "@/components/InviteToWorkspaceModal";
import { MemberProfileModal } from "@/components/MemberProfileModal";
import { useNavigate } from "react-router-dom";

export default function WorkspaceSettingsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const { data: teamsRes, isLoading: teamsLoading } = useGetMyTeamsQuery();
    const activeTeam = teamsRes?.data?.[0] || {
        id: "proj-default-1",
        name: "Core Platform",
        slug: "core-platform"
    };

    const { data: membersRes, isLoading: membersLoading } = useGetWorkspaceMembersQuery(activeTeam.id);
    const { data: pendingRes, refetch: refetchPending } = useGetPendingInvitesQuery(activeTeam.id, {
        skip: !activeTeam.id
    });
    const { data: tasksRes } = useGetTasksQuery({ projectId: activeTeam.id });

    const [updateWorkspace, { isLoading: isUpdatingWs }] = useUpdateWorkspaceMutation();
    const [updateRole] = useUpdateWorkspaceMemberMutation();
    const [removeMember] = useRemoveWorkspaceMemberMutation();
    const [deleteWorkspace] = useDeleteWorkspaceMutation();
    const [revokeInvite, { isLoading: isRevoking }] = useRevokeInviteMutation();

    const [wsName, setWsName] = useState(activeTeam.name || "Core Platform");
    const [wsDescription, setWsDescription] = useState("Collaborative engineering workspace for execution graphs, sprint causality, and telemetry.");
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "focus" | "available" | "admin">("all");
    const [copiedToken, setCopiedToken] = useState<string | null>(null);

    // Modals
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState<any | null>(null);

    const members = membersRes?.data || [];
    const pendingInvites = pendingRes?.data || [];
    const tasks = tasksRes?.data || [];

    const currentMemberRecord = members.find((m: any) => m.user_id === user?.id || m.id === user?.id || m.email === user?.email);
    const isAdmin = currentMemberRecord ? currentMemberRecord.role === "admin" : true;

    // Filtered members list
    const filteredMembers = useMemo(() => {
        return members.filter((member: any) => {
            const name = (member.name || member.profiles?.full_name || "").toLowerCase();
            const email = (member.email || member.profiles?.email || "").toLowerCase();
            const role = (member.role || member.profiles?.role || "").toLowerCase();
            const presence = (member.presence || member.profiles?.presence || "available").toLowerCase();

            const query = searchQuery.toLowerCase().trim();
            const matchesQuery = !query || name.includes(query) || email.includes(query) || role.includes(query);

            if (!matchesQuery) return false;

            if (statusFilter === "focus") return presence === "focus";
            if (statusFilter === "available") return presence === "available";
            if (statusFilter === "admin") return role === "admin";
            return true;
        });
    }, [members, searchQuery, statusFilter]);

    // Member counts
    const inFocusCount = members.filter((m: any) => (m.presence || m.profiles?.presence) === "focus").length;
    const availableCount = members.filter((m: any) => (m.presence || m.profiles?.presence) === "available").length;

    const handleUpdateWorkspace = async () => {
        if (!wsName.trim()) {
            toast.error("Workspace name cannot be empty");
            return;
        }
        try {
            await updateWorkspace({ id: activeTeam.id, name: wsName.trim(), description: wsDescription }).unwrap();
            toast.success("Workspace settings updated");
        } catch {
            toast.error("Failed to update workspace");
        }
    };

    const handleCopyInviteLink = (link: string, id: string) => {
        navigator.clipboard.writeText(link);
        setCopiedToken(id);
        toast.success("Invite link copied to clipboard");
        setTimeout(() => setCopiedToken(null), 2000);
    };

    const handleChangeRole = async (targetUserId: string, newRole: string) => {
        try {
            await updateRole({ workspaceId: activeTeam.id, userId: targetUserId, role: newRole }).unwrap();
            toast.success(`Role updated to ${newRole}`);
        } catch {
            toast.error("Failed to update role");
        }
    };

    const handleRemoveMember = async (targetUserId: string, targetName: string) => {
        if (!confirm(`Are you sure you want to remove ${targetName} from the workspace?`)) return;
        try {
            await removeMember({ workspaceId: activeTeam.id, userId: targetUserId }).unwrap();
            toast.success(`${targetName} removed from workspace`);
        } catch {
            toast.error("Failed to remove member");
        }
    };

    const handleRevokeInvitation = async (inviteId: string) => {
        try {
            await revokeInvite({ teamId: activeTeam.id, inviteId }).unwrap();
            toast.success("Invitation revoked");
            refetchPending();
        } catch {
            toast.error("Failed to revoke invitation");
        }
    };

    const handleDeleteWorkspace = async () => {
        const confirmName = prompt(`Type "${activeTeam.name}" to confirm workspace deletion:`);
        if (confirmName !== activeTeam.name) {
            toast.error("Workspace name mismatch. Action cancelled.");
            return;
        }
        try {
            await deleteWorkspace(activeTeam.id).unwrap();
            toast.success("Workspace deleted");
            navigate("/onboarding");
        } catch {
            toast.error("Failed to delete workspace");
        }
    };

    const openMemberProfile = (member: any) => {
        setSelectedMember(member);
        setIsProfileModalOpen(true);
    };

    if (teamsLoading || membersLoading) {
        return (
            <div className="max-w-5xl mx-auto py-12 px-4 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-2 border-[#007dff] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-medium text-slate-500">Loading workspace telemetry...</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto py-8 px-4 space-y-8 animate-in fade-in duration-200 no-scrollbar">
            {/* Header with Title & Summary Badges */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200/80">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-2xl font-black tracking-tight text-slate-900">
                            Workspace Management
                        </h1>
                        <Badge variant="outline" className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-slate-50 border-slate-200">
                            {activeTeam.slug || "core-platform"}
                        </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                        Manage members, roles, permissions, invitations, and workspace parameters.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <Button
                        onClick={() => setIsInviteModalOpen(true)}
                        className="bg-[#007dff] hover:bg-[#0066cc] text-white text-xs font-semibold h-9 px-4 rounded-xl shadow-sm flex items-center gap-1.5"
                    >
                        <UserPlus size={14} />
                        <span>Invite Teammate</span>
                    </Button>
                </div>
            </div>

            {/* Quick Telemetry KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Teammates</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{members.length}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Active workspace seats</p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">In Deep Focus</p>
                    <div className="flex items-center gap-1.5 mt-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#007dff] animate-pulse" />
                        <p className="text-2xl font-black text-[#007dff]">{inFocusCount}</p>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">Flow sessions running</p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Available Now</p>
                    <div className="flex items-center gap-1.5 mt-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <p className="text-2xl font-black text-emerald-600">{availableCount}</p>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">Ready for collaboration</p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Pending Invites</p>
                    <p className="text-2xl font-black text-amber-600 mt-1">{pendingInvites.length}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Awaiting team signup</p>
                </div>
            </div>

            {/* General Workspace Identity Card */}
            <Card className="border-slate-200/80 shadow-sm rounded-2xl overflow-hidden bg-white">
                <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-4 px-6">
                    <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Settings size={17} className="text-[#007dff]" />
                        Workspace Identity & Settings
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                        Configure workspace brand name, unique slug, and executive description.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Workspace Name
                            </label>
                            <Input
                                value={wsName}
                                onChange={(e) => setWsName(e.target.value)}
                                disabled={!isAdmin}
                                placeholder="e.g. Core Engineering"
                                className="h-10 text-sm bg-slate-50/70 border-slate-200 focus:bg-white transition-colors"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Workspace Slug / Identifier
                            </label>
                            <Input
                                value={activeTeam.slug || "core-platform"}
                                readOnly
                                disabled
                                className="h-10 text-sm font-mono bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Description & Purpose
                        </label>
                        <Input
                            value={wsDescription}
                            onChange={(e) => setWsDescription(e.target.value)}
                            disabled={!isAdmin}
                            placeholder="Provide a brief summary of what your team builds here..."
                            className="h-10 text-sm bg-slate-50/70 border-slate-200 focus:bg-white transition-colors"
                        />
                    </div>

                    {isAdmin && (
                        <div className="flex justify-end pt-2">
                            <Button
                                onClick={handleUpdateWorkspace}
                                disabled={isUpdatingWs}
                                className="bg-[#007dff] hover:bg-[#0066cc] text-white text-xs font-semibold h-9 px-4 rounded-xl shadow-sm"
                            >
                                {isUpdatingWs ? "Saving..." : "Save Workspace Changes"}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Collaborative Team Members Hub */}
            <Card className="border-slate-200/80 shadow-sm rounded-2xl overflow-hidden bg-white">
                <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-4 px-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <User size={17} className="text-[#007dff]" />
                                Team Members ({members.length})
                            </CardTitle>
                            <CardDescription className="text-xs text-slate-500">
                                Click on any member to view full profile, focus telemetry, and assigned deliverables.
                            </CardDescription>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                onClick={() => setIsInviteModalOpen(true)}
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs border-slate-200 text-[#007dff] hover:bg-blue-50 font-semibold rounded-xl"
                            >
                                <UserPlus size={13} className="mr-1.5" />
                                Invite Member
                            </Button>
                        </div>
                    </div>

                    {/* Search & Filter Controls */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 mt-3 border-t border-slate-200/60">
                        <div className="relative w-full sm:w-72">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                                placeholder="Search by name, email, or role..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-8 pl-9 text-xs bg-white border-slate-200 rounded-xl"
                            />
                        </div>

                        <div className="flex items-center gap-1 w-full sm:w-auto bg-slate-200/50 p-0.5 rounded-xl text-xs font-semibold">
                            <button
                                onClick={() => setStatusFilter("all")}
                                className={`px-2.5 py-1 rounded-lg transition-all text-xs ${
                                    statusFilter === "all" ? "bg-white text-slate-900 shadow-sm font-bold" : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                All ({members.length})
                            </button>
                            <button
                                onClick={() => setStatusFilter("focus")}
                                className={`px-2.5 py-1 rounded-lg transition-all text-xs flex items-center gap-1 ${
                                    statusFilter === "focus" ? "bg-white text-[#007dff] shadow-sm font-bold" : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                <Zap size={11} className="text-[#007dff]" />
                                In Focus ({inFocusCount})
                            </button>
                            <button
                                onClick={() => setStatusFilter("available")}
                                className={`px-2.5 py-1 rounded-lg transition-all text-xs flex items-center gap-1 ${
                                    statusFilter === "available" ? "bg-white text-emerald-600 shadow-sm font-bold" : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Available ({availableCount})
                            </button>
                            <button
                                onClick={() => setStatusFilter("admin")}
                                className={`px-2.5 py-1 rounded-lg transition-all text-xs ${
                                    statusFilter === "admin" ? "bg-white text-slate-900 shadow-sm font-bold" : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                Admins
                            </button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <div className="divide-y divide-slate-100">
                        {filteredMembers.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 text-xs">
                                No teammates match your filter criteria.
                            </div>
                        ) : (
                            filteredMembers.map((member: any) => {
                                const mId = member.user_id || member.id;
                                const mName = member.name || member.profiles?.full_name || "Team Member";
                                const mEmail = member.email || member.profiles?.email || "member@floework.dev";
                                const mRole = member.role || member.profiles?.role || "member";
                                const mAvatar = member.avatar_url || member.profiles?.avatar_url || null;
                                const mTitle = member.title || member.profiles?.title || (mRole === "admin" ? "Lead Systems Architect" : "Software Engineer");
                                const mPresence: "focus" | "available" | "offline" = member.presence || member.profiles?.presence || "available";
                                const isSelf = mId === user?.id || mEmail === user?.email;

                                // Count tasks assigned to this member
                                const memberTasks = tasks.filter((t: any) => t.assignee?.id === mId || t.assignee?.name === mName);
                                const activeMemberTasks = memberTasks.filter((t: any) => t.status !== "done");

                                return (
                                    <div
                                        key={mId}
                                        onClick={() => openMemberProfile(member)}
                                        className="flex items-center justify-between p-4 hover:bg-slate-50/80 cursor-pointer transition-colors group"
                                    >
                                        {/* Member Avatar & Details */}
                                        <div className="flex items-center gap-3.5 min-w-0 pr-4">
                                            <div className="relative shrink-0">
                                                <UserAvatar
                                                    name={mName}
                                                    avatarUrl={mAvatar}
                                                    size="md"
                                                    status={mPresence}
                                                />
                                            </div>

                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-bold text-slate-900 group-hover:text-[#007dff] transition-colors truncate">
                                                        {mName}
                                                    </p>
                                                    {isSelf && (
                                                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-normal bg-slate-100 text-slate-500">
                                                            You
                                                        </Badge>
                                                    )}
                                                    <Badge 
                                                        variant={mRole === "admin" ? "secondary" : "outline"} 
                                                        className={`text-[10px] py-0 px-2 font-semibold capitalize ${
                                                            mRole === "admin" 
                                                                ? "bg-blue-50 text-[#007dff] border-blue-200" 
                                                                : "border-slate-200 text-slate-600 bg-white"
                                                        }`}
                                                    >
                                                        {mRole === "admin" && <Shield size={10} className="mr-1 inline" />}
                                                        {mRole}
                                                    </Badge>
                                                </div>

                                                <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5 truncate">
                                                    <span className="text-slate-600 font-medium">{mTitle}</span>
                                                    <span>•</span>
                                                    <span className="font-mono">{mEmail}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status Snippet & Actions */}
                                        <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                                            {/* Focus State Pill */}
                                            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200/60 text-[11px]">
                                                <span className={`w-2 h-2 rounded-full ${
                                                    mPresence === "focus" 
                                                        ? "bg-[#007dff] animate-pulse" 
                                                        : mPresence === "available" 
                                                            ? "bg-emerald-500" 
                                                            : "bg-slate-300"
                                                }`} />
                                                <span className="font-medium text-slate-700">
                                                    {mPresence === "focus" && (member.active_task_title || activeMemberTasks[0]?.title ? `Deep Work: ${member.active_task_title || activeMemberTasks[0]?.title}` : "In Deep Focus")}
                                                    {mPresence === "available" && "Available"}
                                                    {mPresence === "offline" && "Offline"}
                                                </span>
                                            </div>

                                            {/* Deliverables Count Badge */}
                                            <span className="hidden sm:inline-block text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                                {memberTasks.length} task{memberTasks.length !== 1 ? "s" : ""}
                                            </span>

                                            {/* View Profile CTA */}
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => openMemberProfile(member)}
                                                className="h-8 text-xs border-slate-200 text-slate-700 hover:text-[#007dff] hover:bg-blue-50/50 rounded-xl"
                                            >
                                                View Profile
                                            </Button>

                                            {/* Admin Actions Menu */}
                                            {isAdmin && !isSelf && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700 rounded-xl">
                                                            <MoreVertical size={15} />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg border-slate-200">
                                                        <DropdownMenuItem onClick={() => openMemberProfile(member)} className="text-xs cursor-pointer">
                                                            <User size={13} className="mr-2" />
                                                            <span>Inspect Profile</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => navigate("/messages")} className="text-xs cursor-pointer">
                                                            <MessageSquare size={13} className="mr-2" />
                                                            <span>Send Direct Message</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem 
                                                            onClick={() => handleChangeRole(mId, mRole === "admin" ? "member" : "admin")}
                                                            className="text-xs cursor-pointer"
                                                        >
                                                            <Shield size={13} className="mr-2" />
                                                            <span>Make {mRole === "admin" ? "Member" : "Admin"}</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem 
                                                            onClick={() => handleChangeRole(mId, "viewer")}
                                                            className="text-xs cursor-pointer"
                                                        >
                                                            <Eye size={13} className="mr-2" />
                                                            <span>Make Viewer</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem 
                                                            onClick={() => handleRemoveMember(mId, mName)}
                                                            className="text-xs text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer"
                                                        >
                                                            <Trash2 size={13} className="mr-2" />
                                                            <span>Remove from Workspace</span>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Pending Invitations Section */}
            {isAdmin && (
                <Card className="border-slate-200/80 shadow-sm rounded-2xl overflow-hidden bg-white">
                    <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-4 px-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <Clock size={17} className="text-[#007dff]" />
                                    Pending Invitations ({pendingInvites.length})
                                </CardTitle>
                                <CardDescription className="text-xs text-slate-500">
                                    Open invitations awaiting team member acceptance. Links expire in 7 days.
                                </CardDescription>
                            </div>

                            <Button 
                                onClick={() => setIsInviteModalOpen(true)} 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-xs border-slate-200 text-[#007dff] hover:bg-blue-50 font-semibold rounded-xl"
                            >
                                <UserPlus size={13} className="mr-1.5" />
                                Generate New Invite
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        {pendingInvites.length === 0 ? (
                            <div className="p-10 text-center text-slate-400 text-xs">
                                No pending invitations. All invited teammates have joined the workspace!
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {pendingInvites.map((inv: any) => {
                                    const link = inv.invite_link || `${window.location.origin}/join?token=${inv.token}`;
                                    const isCopied = copiedToken === inv.id || copiedToken === inv.token;

                                    return (
                                        <div key={inv.id || inv.token} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors">
                                            <div className="min-w-0 flex-1 pr-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-semibold text-slate-900 truncate">{inv.email}</span>
                                                    <Badge variant="outline" className="text-[10px] py-0 px-2 font-medium bg-white border-slate-200">
                                                        {inv.role || "Member"}
                                                    </Badge>
                                                    <Badge variant="secondary" className="text-[10px] py-0 px-2 font-semibold bg-amber-50 text-amber-700 border-amber-200">
                                                        Pending Acceptance
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                                                    <span>Token: {inv.token}</span>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock size={11} /> Expires in 7 days
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 text-xs border-slate-200 text-[#007dff] hover:bg-blue-50 font-semibold rounded-xl"
                                                    onClick={() => handleCopyInviteLink(link, inv.id || inv.token)}
                                                >
                                                    {isCopied ? <Check size={13} className="mr-1.5 text-emerald-500" /> : <Copy size={13} className="mr-1.5" />}
                                                    <span>{isCopied ? "Copied!" : "Copy Link"}</span>
                                                </Button>

                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    disabled={isRevoking}
                                                    className="h-8 text-xs text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                                                    onClick={() => handleRevokeInvitation(inv.id || inv.token)}
                                                >
                                                    <Trash2 size={13} className="mr-1" />
                                                    <span>Revoke</span>
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Roles & Permissions Reference Card */}
            <Card className="border-slate-200/80 shadow-sm rounded-2xl overflow-hidden bg-white">
                <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-4 px-6">
                    <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Layers size={17} className="text-[#007dff]" />
                        Collaborative Roles & Permission Levels
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                        Understanding permissions for team members within this Floework workspace.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 space-y-1.5">
                            <div className="flex items-center gap-2">
                                <Shield size={16} className="text-[#007dff]" />
                                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Admin Role</h4>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Full authority over team members, role assignments, invite links, task assignment, and workspace settings.
                            </p>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                            <div className="flex items-center gap-2">
                                <User size={16} className="text-slate-700" />
                                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Member Role</h4>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Create and modify tasks, run focus sessions, join sprint chat threads, and view Effort Narratives.
                            </p>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                            <div className="flex items-center gap-2">
                                <Eye size={16} className="text-amber-600" />
                                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Viewer Role</h4>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Read-only visibility into the execution graph, causality nodes, metrics, and sprint retrospective reports.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Danger Zone */}
            {isAdmin && (
                <Card className="border-red-200/70 bg-red-50/20 shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="py-4 px-6 border-b border-red-100/60">
                        <CardTitle className="text-base font-bold text-red-900 flex items-center gap-2">
                            <AlertTriangle size={17} className="text-red-600" />
                            Danger Zone
                        </CardTitle>
                        <CardDescription className="text-xs text-red-700/70">
                            Permanent, irreversible actions affecting the entire workspace and all deliverables.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-bold text-red-900">Delete this workspace</p>
                                <p className="text-xs text-red-700/70 max-w-md mt-0.5">
                                    Permanently delete this workspace along with all execution graphs, tasks, telemetry sessions, and team data.
                                </p>
                            </div>
                            <Button 
                                variant="destructive" 
                                className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold h-9 px-4 rounded-xl shadow-sm shrink-0"
                                onClick={handleDeleteWorkspace}
                            >
                                <Trash2 size={14} className="mr-1.5" />
                                Delete Workspace
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Modals */}
            <InviteToWorkspaceModal
                isOpen={isInviteModalOpen}
                onClose={() => {
                    setIsInviteModalOpen(false);
                    refetchPending();
                }}
                teamId={activeTeam.id}
            />

            <MemberProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => {
                    setIsProfileModalOpen(false);
                    setSelectedMember(null);
                }}
                member={selectedMember}
                workspaceId={activeTeam.id}
                isAdmin={isAdmin}
            />
        </div>
    );
}
