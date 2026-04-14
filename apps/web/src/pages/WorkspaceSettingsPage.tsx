import { useState } from "react";
import { useAuth } from "@/modules/auth/AuthContext";
import { 
    useGetMyTeamsQuery, 
    useGetWorkspaceMembersQuery, 
    useUpdateWorkspaceMutation,
    useUpdateWorkspaceMemberMutation,
    useRemoveWorkspaceMemberMutation,
    useDeleteWorkspaceMutation,
    useInviteToTeamMutation
} from "@/store/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Shield, UserPlus, Trash2, LogOut, Settings, MoreVertical, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const WorkspaceSettingsPage = () => {
    const { user } = useAuth();
    const { data: teamsRes, isLoading: teamsLoading } = useGetMyTeamsQuery();
    const activeTeam = teamsRes?.data?.[0]; // Default to first for now, can be improved with a switcher
    const { data: membersRes, isLoading: membersLoading } = useGetWorkspaceMembersQuery(activeTeam?.id || "");
    
    const [updateWorkspace] = useUpdateWorkspaceMutation();
    const [updateRole] = useUpdateWorkspaceMemberMutation();
    const [removeMember] = useRemoveWorkspaceMemberMutation();
    const [deleteWorkspace] = useDeleteWorkspaceMutation();
    const [inviteMember] = useInviteToTeamMutation();

    const [wsName, setWsName] = useState(activeTeam?.name || "");
    const [inviteEmail, setInviteEmail] = useState("");
    const [lastInvite, setLastInvite] = useState<{ email: string; token: string } | null>(null);
    const [copied, setCopied] = useState(false);

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
                            <div className="flex gap-2">
                                <Input 
                                    placeholder="Enter invitee email (for tracking)" 
                                    className="h-9 w-72 text-sm"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                />
                                <Button onClick={handleInvite} size="sm" className="bg-[#007dff] hover:bg-[#0066cc]">
                                    <UserPlus size={14} className="mr-2" />
                                    Generate Token
                                </Button>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {/* Latest Invite Banner */}
                    {lastInvite && (
                        <div className="bg-[#007dff]/5 border-b border-[#007dff]/20 p-4 animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-[#007dff]">New Token Generated for {lastInvite.email}</p>
                                    <p className="text-xs text-slate-500">Send this token to the user so they can join during onboarding.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <code className="bg-white border text-[#007dff] px-3 py-1.5 rounded-lg font-mono text-sm font-bold shadow-sm">
                                        {lastInvite.token}
                                    </code>
                                    <Button 
                                        size="icon" 
                                        variant="outline" 
                                        className="h-9 w-9 text-[#007dff] border-[#007dff]/30 hover:bg-[#007dff]/10"
                                        onClick={() => copyToClipboard(lastInvite.token)}
                                    >
                                        {copied ? <Check size={16} /> : <Copy size={16} />}
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="text-slate-400 text-xs"
                                        onClick={() => setLastInvite(null)}
                                    >
                                        Close
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="divide-y divide-slate-100">
                        {membersRes?.data?.map((member) => (
                            <div key={member.user_id} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold border border-slate-200 overflow-hidden">
                                        {member.profiles?.avatar_url ? (
                                            <img src={member.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            member.profiles?.full_name?.charAt(0) || "U"
                                        )}
                                    </div>
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
        </div>
    );
};

export default WorkspaceSettingsPage;
