import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
    useGetMyTeamsQuery, 
    useInviteToTeamMutation, 
    useGetPendingInvitesQuery, 
    useRevokeInviteMutation 
} from "@/store/api";
import { toast } from "sonner";
import { Mail, Copy, Check, UserPlus, Shield, Clock, Trash2, Link as LinkIcon, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface InviteToWorkspaceModalProps {
    isOpen: boolean;
    onClose: () => void;
    teamId?: string;
}

export function InviteToWorkspaceModal({ isOpen, onClose, teamId }: InviteToWorkspaceModalProps) {
    const { data: teamsRes } = useGetMyTeamsQuery();
    const teams = teamsRes?.data || [];
    const activeTeamId = teamId || teams[0]?.id || "";
    const activeTeamName = teams.find(t => t.id === activeTeamId)?.name || "Workspace";

    const [email, setEmail] = useState("");
    const [role, setRole] = useState<"Member" | "Admin" | "Viewer">("Member");
    const [copiedToken, setCopiedToken] = useState<string | null>(null);
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);

    const [inviteToTeam, { isLoading: isInviting }] = useInviteToTeamMutation();
    const [revokeInvite, { isLoading: isRevoking }] = useRevokeInviteMutation();
    const { data: pendingRes, refetch: refetchPending } = useGetPendingInvitesQuery(activeTeamId, {
        skip: !activeTeamId,
    });

    const pendingInvites = pendingRes?.data || [];

    const handleSendInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !email.includes("@")) {
            toast.error("Please enter a valid email address");
            return;
        }

        try {
            const res = await inviteToTeam({
                teamId: activeTeamId,
                email: email.trim(),
                role,
            }).unwrap();

            const inviteData = res?.data;
            const link = inviteData?.invite_link || `${window.location.origin}/join?token=${inviteData?.token}`;
            setGeneratedLink(link);
            toast.success(`Invitation created for ${email}`);
            setEmail("");
            refetchPending();
        } catch (err: any) {
            toast.error(err?.data || "Failed to create invitation");
        }
    };

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedToken(id);
        toast.success("Invite link copied to clipboard!");
        setTimeout(() => setCopiedToken(null), 2500);
    };

    const handleRevoke = async (inviteId: string) => {
        try {
            await revokeInvite({ teamId: activeTeamId, inviteId }).unwrap();
            toast.success("Invitation revoked");
            refetchPending();
            if (generatedLink && generatedLink.includes(inviteId)) {
                setGeneratedLink(null);
            }
        } catch {
            toast.error("Failed to revoke invitation");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto rounded-2xl p-6 bg-white border border-slate-200/80 shadow-2xl">
                <DialogHeader className="space-y-1.5 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#007dff] flex items-center justify-center">
                            <UserPlus size={18} />
                        </div>
                        <DialogTitle className="text-xl font-bold text-slate-900">
                            Invite to {activeTeamName}
                        </DialogTitle>
                    </div>
                    <DialogDescription className="text-xs text-slate-500">
                        Add teammates by email or share an invitation link to collaborate on projects.
                    </DialogDescription>
                </DialogHeader>

                {/* Send Invite Form */}
                <form onSubmit={handleSendInvite} className="mt-4 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                            <Mail size={13} className="text-slate-400" /> Email Address
                        </label>
                        <div className="flex gap-2">
                            <Input
                                type="email"
                                placeholder="colleague@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="h-10 text-sm bg-slate-50/70 border-slate-200 focus:bg-white transition-colors"
                            />
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value as any)}
                                className="h-10 px-3 text-xs font-medium bg-slate-50/70 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#007dff]/20"
                            >
                                <option value="Member">Member</option>
                                <option value="Admin">Admin</option>
                                <option value="Viewer">Viewer</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button
                            type="submit"
                            disabled={isInviting || !email.trim()}
                            className="bg-[#007dff] hover:bg-[#0066cc] text-white text-xs font-semibold h-9 px-4 rounded-xl shadow-sm flex items-center gap-1.5"
                        >
                            <Sparkles size={14} />
                            {isInviting ? "Creating Invite..." : "Generate Invite Link"}
                        </Button>
                    </div>
                </form>

                {/* Generated Link Alert */}
                {generatedLink && (
                    <div className="mt-4 p-3.5 bg-blue-50/70 border border-blue-200/60 rounded-xl space-y-2 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#007dff] flex items-center gap-1.5">
                                <LinkIcon size={14} /> Active Shareable Invite Link
                            </span>
                            <span className="text-[10px] text-blue-600/80 font-medium">Expires in 7 days</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                readOnly
                                value={generatedLink}
                                className="flex-1 bg-white border border-blue-200 text-slate-700 text-xs font-mono px-3 py-1.5 rounded-lg select-all focus:outline-none"
                            />
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCopy(generatedLink, "active-link")}
                                className="h-8 px-3 text-xs bg-white hover:bg-blue-50 border-blue-200 text-[#007dff] font-semibold flex items-center gap-1.5"
                            >
                                {copiedToken === "active-link" ? (
                                    <>
                                        <Check size={13} className="text-emerald-500" />
                                        <span>Copied!</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy size={13} />
                                        <span>Copy</span>
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Pending Invites List */}
                <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                            <Clock size={13} className="text-slate-400" /> Pending Invitations ({pendingInvites.length})
                        </h4>
                    </div>

                    {pendingInvites.length === 0 ? (
                        <div className="py-6 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                            <p className="text-xs text-slate-400">No pending invitations for this workspace</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {pendingInvites.map((inv: any) => {
                                const link = inv.invite_link || `${window.location.origin}/join?token=${inv.token}`;
                                const isItemCopied = copiedToken === inv.id || copiedToken === inv.token;

                                return (
                                    <div
                                        key={inv.id || inv.token}
                                        className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/40 hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="min-w-0 flex-1 pr-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold text-slate-800 truncate">
                                                    {inv.email}
                                                </span>
                                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-medium border-slate-200 bg-white">
                                                    {inv.role || "Member"}
                                                </Badge>
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                                                Token: {inv.token}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7 text-slate-500 hover:text-[#007dff] hover:bg-blue-50"
                                                title="Copy invite link"
                                                onClick={() => handleCopy(link, inv.id || inv.token)}
                                            >
                                                {isItemCopied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                disabled={isRevoking}
                                                className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50"
                                                title="Revoke invitation"
                                                onClick={() => handleRevoke(inv.id || inv.token)}
                                            >
                                                <Trash2 size={13} />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <DialogFooter className="mt-4 pt-2 border-t border-slate-100">
                    <Button variant="outline" size="sm" onClick={onClose} className="text-xs rounded-xl">
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
