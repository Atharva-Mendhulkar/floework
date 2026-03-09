import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useJoinTeamMutation } from "@/store/api";
import { toast } from "sonner";

interface JoinWorkspaceModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function JoinWorkspaceModal({ isOpen, onClose }: JoinWorkspaceModalProps) {
    const [joinTeam, { isLoading }] = useJoinTeamMutation();
    const [token, setToken] = useState("");

    const handleSubmit = async () => {
        if (!token.trim()) {
            toast.error("Invitation token is required");
            return;
        }

        try {
            await joinTeam({ token }).unwrap();
            toast.success("Successfully joined the workspace!");
            setToken("");
            onClose();
            // Optional: Hard reload to ensure all queries (tasks, projects) fetch fresh workspace data.
            window.location.reload();
        } catch (error: any) {
            toast.error(error?.data?.message || "Failed to join workspace. Token may be invalid/expired.");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Join a Workspace</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <label htmlFor="token" className="text-sm font-medium">Invitation Token</label>
                        <Input
                            id="token"
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            placeholder="Paste your invite token here..."
                        />
                        <p className="text-[11px] text-slate-500 mt-1">
                            Ask your workspace admin to generate an invitation link or token for you.
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? "Joining..." : "Join Workspace"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
