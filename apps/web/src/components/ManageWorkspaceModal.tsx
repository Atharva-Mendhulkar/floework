import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInviteToTeamMutation, useGetMyTeamsQuery } from "@/store/api";
import { toast } from "sonner";
import { Check, Copy } from "lucide-react";

interface ManageWorkspaceModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ManageWorkspaceModal({ isOpen, onClose }: ManageWorkspaceModalProps) {
    const { data: teamsRes, isLoading: loadingTeams } = useGetMyTeamsQuery(undefined, { skip: !isOpen });
    const [inviteToTeam, { isLoading: isInviting }] = useInviteToTeamMutation();

    const [email, setEmail] = useState("");
    const [role, setRole] = useState("MEMBER");
    const [selectedTeamId, setSelectedTeamId] = useState<string>("");
    const [generatedToken, setGeneratedToken] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const teams = teamsRes?.data || [];

    // Auto-select first team
    if (!selectedTeamId && teams.length > 0) {
        setSelectedTeamId(teams[0].id);
    }

    const handleInvite = async () => {
        if (!email.trim() || !selectedTeamId) {
            toast.error("Email and Team selection are required");
            return;
        }

        try {
            const res = await inviteToTeam({ teamId: selectedTeamId, email, role }).unwrap();
            toast.success("Invitation generated successfully");
            setGeneratedToken(res.data.token);
            setEmail("");
            // Do not auto-close so they can copy the token
        } catch (error: any) {
            toast.error(error?.data?.message || "Failed to generate invitation");
        }
    };

    const copyToClipboard = () => {
        if (generatedToken) {
            navigator.clipboard.writeText(generatedToken);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) {
                setGeneratedToken(null);
                onClose();
            }
        }}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Invite Members</DialogTitle>
                </DialogHeader>

                {generatedToken ? (
                    <div className="py-6 flex flex-col items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-2">
                            <Check size={24} />
                        </div>
                        <h3 className="font-semibold text-slate-900 text-center">Invitation Created!</h3>
                        <p className="text-sm text-slate-500 text-center px-4">
                            Send this token to your teammate. They can use it to join this workspace.
                        </p>

                        <div className="flex items-center w-full mt-2 gap-2">
                            <Input value={generatedToken} readOnly className="bg-slate-50 text-slate-500 text-center text-xs font-mono" />
                            <Button variant="outline" size="icon" onClick={copyToClipboard} className="shrink-0">
                                {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                            </Button>
                        </div>

                        <Button className="w-full mt-4" onClick={() => setGeneratedToken(null)}>
                            Invite Another Member
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Workspace</label>
                            <Select value={selectedTeamId} onValueChange={setSelectedTeamId} disabled={loadingTeams}>
                                <SelectTrigger>
                                    <SelectValue placeholder={loadingTeams ? "Loading workspaces..." : "Select Workspace"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {teams.map((team: any) => (
                                        <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <label htmlFor="email" className="text-sm font-medium">Email Address</label>
                            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hello@example.com" />
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Role</label>
                            <Select value={role} onValueChange={setRole}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="MEMBER">Member</SelectItem>
                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <p className="text-[11px] text-slate-500">
                            Inviting a user generates a secure token with a 7-day expiration.
                        </p>
                    </div>
                )}

                {!generatedToken && (
                    <DialogFooter>
                        <Button variant="outline" onClick={onClose} disabled={isInviting}>Cancel</Button>
                        <Button onClick={handleInvite} disabled={isInviting}>
                            {isInviting ? "Generating..." : "Generate Invite Token"}
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}
