import { useState } from "react";
import { useAuth } from "@/modules/auth/AuthContext";
import { 
    useGetMyTeamsQuery, 
    useGetWorkspaceMembersQuery, 
    useUpdateWorkspaceMutation,
    useUpdateWorkspaceMemberMutation,
    useRemoveWorkspaceMemberMutation,
    useDeleteWorkspaceMutation,
    useInviteToTeamMutation,
    useGetPendingInvitesQuery,
    useRevokeInviteMutation
} from "@/store/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { UserAvatar } from "@/components/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { User, Shield, UserPlus, Trash2, LogOut, Settings, MoreVertical, Copy, Check, Clock, Link as LinkIcon, Send } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InviteToWorkspaceModal } from "@/components/InviteToWorkspaceModal";

const WorkspaceSettingsPage = () => {
    const { user } = useAuth();
    const { data: teamsRes, isLoading: teamsLoading } = useGetMyTeamsQuery();
    const activeTeam = teamsRes?.data?.[0]; // Default to first for now, can be improved with a switcher
    const { data: membersRes, isLoading: membersLoading } = useGetWorkspaceMembersQuery(activeTeam?.id || "");
    const { data: pendingRes, refetch: refetchPending } = useGetPendingInvitesQuery(activeTeam?.id || "", {
        skip: !activeTeam?.id
    });
    
    const [updateWorkspace] = useUpdateWorkspaceMutation();
    const [updateRole] = useUpdateWorkspaceMemberMutation();
    const [removeMember] = useRemoveWorkspaceMemberMutation();
    const [deleteWorkspace] = useDeleteWorkspaceMutation();
    const [inviteMember] = useInviteToTeamMutation();
    const [revokeInvite] = useRevokeInviteMutation();

    const [wsName, setWsName] = useState(activeTeam?.name || "");
    const [inviteEmail, setInviteEmail] = useState("");
    const [lastInvite, setLastInvite] = useState<{ email: string; token: string } | null>(null);
    const [copied, setCopied] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

    const pendingInvites = pendingRes?.data || [];
    const isAdmin = membersRes?.data?.find(m => m.user_id === user?.id)?.role === "admin";

    const handleUpdateName = async () => {
        if (!activeTeam) return;
        try {
            await updateWorkspace({ id: activeTeam.id, name: wsName }).unwrap();
            toast.success("Workspace updated");
        } catch (e) {
            toast.error("Failed to update workspace");
        }
    };

    const handleInvite = async () => {
        if (!activeTeam || !inviteEmail) return;
        try {
            const res = await inviteMember({ teamId: activeTeam.id, email: inviteEmail }).unwrap();
            setLastInvite({ email: inviteEmail, token: res.data.token });
            setInviteEmail("");
            toast.success("Token generated successfully!");
        } catch (e) {
            toast.error("Failed to generate token");
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success("Token copied to clipboard!");
    };

    const handleChangeRole = async (targetUserId: string, newRole: string) => {
        if (!activeTeam) return;
        try {
            await updateRole({ workspaceId: activeTeam.id, userId: targetUserId, role: newRole }).unwrap();
            toast.success("Role updated");
        } catch (e) {
            toast.error("Failed to update role");
        }
    };

    const handleRemoveMember = async (targetUserId: string) => {
        if (!activeTeam) return;
        if (!confirm("Are you sure you want to remove this member?")) return;
        try {
            await removeMember({ workspaceId: activeTeam.id, userId: targetUserId }).unwrap();
            toast.success("Member removed");
        } catch (e) {
            toast.error("Failed to remove member");
        }
    };

    const handleDeleteWorkspace = async () => {
        if (!activeTeam) return;
        const confirmName = prompt(`Type "${activeTeam.name}" to delete this workspace. This action is irreversible.`);
        if (confirmName !== activeTeam.name) {
            toast.error("Workspace name mismatch. Deletion cancelled.");
            return;
        }
        try {
            await deleteWorkspace(activeTeam.id).unwrap();
            toast.success("Workspace deleted");
            window.location.href = "/onboarding";
        } catch (e) {
            toast.error("Failed to delete workspace");
        }
    };

    if (teamsLoading || membersLoading) {
        return <div className="p-8 text-center text-slate-500">Loading workspace settings...</div>;
    }

    if (!activeTeam) {
        return <div className="p-8 text-center text-slate-500">No active workspace found.</div>;
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Workspace Management</h1>
                    <p className="text-slate-500 text-sm mt-1">Configure your team settings and members</p>
                </div>
                <Badge variant="outline" className="px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                    {activeTeam.slug}
                </Badge>
            </header>

            {/* General Settings */}
            <Card className="border-slate-200/60 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Settings size={18} className="text-[#007dff]" />
                        General Information
                    </CardTitle>
                    <CardDescription>Update your workspace brand and identification</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Workspace Name</label>
                        <div className="flex gap-2">
                            <Input 
                                value={wsName} 
                                onChange={(e) => setWsName(e.target.value)} 
                                disabled={!isAdmin}
                                className="max-w-md"
                            />
                            {isAdmin && (
                                <Button onClick={handleUpdateName} variant="secondary">Update</Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Members Section */}
            <Card className="border-slate-200/60 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <User size={18} className="text-[#007dff]" />
                                Team Members
                            </CardTitle>
                            <CardDescription>People with access to this workspace</CardDescription>
                        </div>
                        {isAdmin && (
                            <Button onClick={() => setIsInviteModalOpen(true)} size="sm" className="bg-[#007dff] hover:bg-[#0066cc] text-white">
                                <UserPlus size={14} className="mr-2" />
                                Invite Member
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-slate-100">
                        {membersRes?.data?.map((member) => (
                            <div key={member.user_id} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <UserAvatar
                                        name={member.profiles?.full_name || "New User"}
                                        avatarUrl={member.profiles?.avatar_url}
                                        size="md"
                                    />
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">
                                            {member.profiles?.full_name || "New User"}
                                            {member.user_id === user?.id && <span className="ml-2 text-[10px] text-slate-400 font-normal">(You)</span>}
                                        </p>
                                        <p className="text-xs text-slate-500">Joined on {new Date(member.joined_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Badge variant={member.role === 'admin' ? "secondary" : "outline"} className="capitalize text-[10px] py-0 px-2">
                                        {member.role === 'admin' && <Shield size={10} className="mr-1 inline" />}
                                        {member.role}
                                    </Badge>

                                    {isAdmin && member.user_id !== user?.id && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 transition-colors">
                                                    <MoreVertical size={16} />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleChangeRole(member.user_id, member.role === 'admin' ? 'member' : 'admin')}>
                                                    Make {member.role === 'admin' ? 'Member' : 'Admin'}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-red-600 focus:text-red-700 focus:bg-red-50" onClick={() => handleRemoveMember(member.user_id)}>
                                                    Remove from team
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Pending Invitations Section */}
            {isAdmin && (
                <Card className="border-slate-200/60 shadow-sm overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Clock size={18} className="text-[#007dff]" />
                                    Pending Invitations
                                </CardTitle>
                                <CardDescription>Open invites awaiting team member acceptance</CardDescription>
                            </div>
                            <Button 
                                onClick={() => setIsInviteModalOpen(true)} 
                                variant="outline" 
                                size="sm" 
                                className="text-xs border-slate-200 text-slate-700"
                            >
                                <UserPlus size={13} className="mr-1.5" />
                                New Invite
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {pendingInvites.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-xs">
                                No pending invitations. All invited members have joined!
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {pendingInvites.map((inv: any) => {
                                    const link = inv.invite_link || `${window.location.origin}/join?token=${inv.token}`;
                                    return (
                                        <div key={inv.id || inv.token} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors">
                                            <div className="min-w-0 flex-1 pr-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-semibold text-slate-900 truncate">{inv.email}</span>
                                                    <Badge variant="outline" className="text-[10px] py-0 px-2 font-medium bg-white">
                                                        {inv.role || "Member"}
                                                    </Badge>
                                                    <Badge variant="secondary" className="text-[10px] py-0 px-2 font-medium bg-amber-50 text-amber-700 border-amber-200">
                                                        Pending
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                                                    <span>Token: {inv.token}</span>
                                                    <span>•</span>
                                                    <span>Expires in 7 days</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 text-xs border-slate-200 text-[#007dff] hover:bg-blue-50"
                                                    onClick={() => copyToClipboard(link)}
                                                >
                                                    <Copy size={13} className="mr-1.5" />
                                                    Copy Link
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 text-xs text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                    onClick={async () => {
                                                        try {
                                                            await revokeInvite({ teamId: activeTeam.id, inviteId: inv.id || inv.token }).unwrap();
                                                            toast.success("Invitation revoked");
                                                            refetchPending();
                                                        } catch {
                                                            toast.error("Failed to revoke invitation");
                                                        }
                                                    }}
                                                >
                                                    <Trash2 size={13} className="mr-1" />
                                                    Revoke
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

            {/* Danger Zone */}
            {isAdmin && (
                <Card className="border-red-100 bg-red-50/30 overflow-hidden">
                    <CardHeader>
                        <CardTitle className="text-lg text-red-900 flex items-center gap-2">
                            <Trash2 size={18} className="text-red-600" />
                            Danger Zone
                        </CardTitle>
                        <CardDescription className="text-red-700/70">Critical actions that affect the entire workspace</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-red-900">Delete this workspace</p>
                                <p className="text-xs text-red-700/60 max-w-sm mt-1">
                                    Once you delete a workspace, there is no going back. All projects, tasks, and data will be permanently removed.
                                </p>
                            </div>
                            <Button 
                                variant="destructive" 
                                className="bg-red-600 hover:bg-red-700 border-red-700 shadow-sm"
                                onClick={handleDeleteWorkspace}
                            >
                                <Trash2 size={16} className="mr-2" />
                                Delete Workspace
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <InviteToWorkspaceModal
                isOpen={isInviteModalOpen}
                onClose={() => {
                    setIsInviteModalOpen(false);
                    refetchPending();
                }}
                teamId={activeTeam.id}
            />
        </div>
    );
};

export default WorkspaceSettingsPage;
