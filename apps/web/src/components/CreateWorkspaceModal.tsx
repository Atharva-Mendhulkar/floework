import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Rocket, Layout, Calendar } from "lucide-react";
import { useCreateTeamMutation, useCreateProjectMutation } from "@/store/api";
import { toast } from "sonner";

export function CreateWorkspaceModal() {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [createTeam, { isLoading }] = useCreateTeamMutation();

    const handleCreate = async () => {
        if (!name.trim()) return;
        try {
            await createTeam({ name }).unwrap();
            toast.success("Workspace created!");
            setOpen(false);
            setName("");
        } catch (err) {
            toast.error("Failed to create workspace");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2 border-slate-200">
                    <Plus size={16} /> New Workspace
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create Workspace</DialogTitle>
                    <DialogDescription>
                        Workspaces are shared environments for your teams and projects.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Workspace Name</Label>
                        <Input
                            id="name"
                            placeholder="e.g. Engineering, Marketing..."
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleCreate} disabled={isLoading} className="bg-slate-900 text-white">
                        {isLoading ? "Creating..." : "Create Workspace"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function CreateProjectModal({ teamId }: { teamId: string }) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [sprint, setSprint] = useState("Sprint 1");
    const [createProject, { isLoading }] = useCreateProjectMutation();

    const handleCreate = async () => {
        if (!name.trim()) return;
        try {
            await createProject({ teamId, name, sprintName: sprint }).unwrap();
            toast.success("Project created!");
            setOpen(false);
            setName("");
        } catch (err) {
            toast.error("Failed to create project");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="ghost" className="text-[#007dff] hover:text-[#007dff] hover:bg-[#007dff]/10">
                    <Plus size={14} className="mr-1" /> New Project
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create Project</DialogTitle>
                    <DialogDescription>
                        Launch a new execution tracker with a dedicated sprint.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="proj-name">Project Name</Label>
                        <Input
                            id="proj-name"
                            placeholder="e.g. Q4 Roadmap"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="sprint-name">Initial Sprint</Label>
                        <Input
                            id="sprint-name"
                            placeholder="e.g. Sprint 1"
                            value={sprint}
                            onChange={(e) => setSprint(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleCreate} disabled={isLoading} className="bg-slate-900 text-white">
                        {isLoading ? "Creating..." : "Create Project"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
