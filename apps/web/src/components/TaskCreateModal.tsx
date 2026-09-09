import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTaskMutation, useGetEstimationHintQuery, useGetUsersQuery, useGetTasksQuery, useAddDependencyMutation } from "@/store/api";
import { useAppSelector } from "@/store/hooks";
import { toast } from "sonner";
import { GitBranch, Layers } from "lucide-react";

interface TaskCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    initialPhase?: string;
}

export function TaskCreateModal({ isOpen, onClose, projectId, initialPhase = "allocation" }: TaskCreateModalProps) {
    const activeSprintId = useAppSelector((state) => state.dashboard.activeSprintId);
    const [createTask, { isLoading }] = useCreateTaskMutation();
    const [addDependency] = useAddDependencyMutation();
    const { data: usersRes } = useGetUsersQuery();
    const team = usersRes?.data || [];

    const { data: projectTasksRes } = useGetTasksQuery({ projectId }, { skip: !projectId });
    const availableTasks = projectTasksRes?.data || [];

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [assigneeId, setAssigneeId] = useState<string>("unassigned");
    const [priority, setPriority] = useState("medium");
    const [phase, setPhase] = useState<string>(initialPhase);
    const [dependsOnTaskId, setDependsOnTaskId] = useState<string>("none");
    const [dueDate, setDueDate] = useState("");
    const [dismissHint, setDismissHint] = useState(false);

    // Get today's date in YYYY-MM-DD format for date input minimum
    const todayStr = new Date().toISOString().split('T')[0];

    const STOP_WORDS = new Set(['a','an','the','and','or','to','of','for','in','on','with','add','fix','update','create','implement']);
    const keywords = title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3 && !STOP_WORDS.has(w));
    
    // Convert priority to S/M/L format
    const effortLevel = priority === 'low' ? 'S' : priority === 'high' ? 'L' : 'M';
    const { data: hintRes } = useGetEstimationHintQuery({ effort: effortLevel, keywords }, { skip: keywords.length === 0 });
    const hint = hintRes?.data;

    const handleSubmit = async () => {
        if (!title.trim()) {
            toast.error("Task title is required");
            return;
        }

        if (dueDate && dueDate < todayStr) {
            toast.error("Due date cannot be in the past");
            return;
        }

        try {
            const result = await createTask({
                title,
                description,
                projectId,
                assigneeId: assigneeId === "unassigned" ? undefined : assigneeId,
                priority,
                phase,
                dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
                sprintId: activeSprintId,
            }).unwrap();

            const createdTaskId = result?.data?.id;

            // Automatically link dependency if selected
            if (dependsOnTaskId && dependsOnTaskId !== "none" && createdTaskId) {
                try {
                    await addDependency({
                        sourceId: dependsOnTaskId,
                        targetId: createdTaskId,
                        type: 'BLOCKS',
                        projectId,
                    }).unwrap();
                    toast.success("Task created and dependency linked in Execution Graph!");
                } catch {
                    toast.success("Task created successfully (dependency link skipped)");
                }
            } else {
                toast.success("Task created successfully");
            }

            // Reset form
            setTitle("");
            setDescription("");
            setAssigneeId("unassigned");
            setPriority("medium");
            setPhase("allocation");
            setDependsOnTaskId("none");
            setDueDate("");
            setDismissHint(false);

            onClose();
        } catch (error: any) {
            toast.error(error?.data || "Failed to create task");
            console.error(error);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3.5 py-3">
                    <div className="grid gap-1.5">
                        <label htmlFor="title" className="text-xs font-semibold text-slate-700">Task Title</label>
                        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="E.g., Design System Tokens" />
                    </div>

                    <div className="grid gap-1.5">
                        <label htmlFor="description" className="text-xs font-semibold text-slate-700">Description</label>
                        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Context, requirements, acceptance criteria..." rows={2} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-1.5">
                            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                                <Layers size={12} className="text-slate-500" />
                                <span>Pipeline Phase</span>
                            </label>
                            <Select value={phase} onValueChange={setPhase}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Phase" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="allocation">Task Allocation</SelectItem>
                                    <SelectItem value="focus">Focus Sessions</SelectItem>
                                    <SelectItem value="resolution">Technical Resolution</SelectItem>
                                    <SelectItem value="outcome">Output & Outcome</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-1.5">
                            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                                <GitBranch size={12} className="text-slate-500" />
                                <span>Prerequisite (Blocked By)</span>
                            </label>
                            <Select value={dependsOnTaskId} onValueChange={setDependsOnTaskId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Independent" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None (Independent)</SelectItem>
                                    {availableTasks.map((t) => (
                                        <SelectItem key={t.id} value={t.id}>
                                            <span className="truncate max-w-[180px] inline-block">{t.title}</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-1.5">
                            <label className="text-xs font-semibold text-slate-700">Assignee</label>
                            <Select value={assigneeId} onValueChange={setAssigneeId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Assignee" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unassigned">Unassigned</SelectItem>
                                    {team.map(member => (
                                        <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-1.5">
                            <label className="text-xs font-semibold text-slate-700">Priority</label>
                            <Select value={priority} onValueChange={setPriority}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {hint && !dismissHint && (
                        <div className="flex items-start justify-between bg-yellow-50 text-yellow-700/90 p-2.5 rounded-xl border border-yellow-200/60">
                            <p className="text-[11px] font-medium leading-tight">
                                Your {priority} '{hint.keyword}' tasks usually run {hint.ratio.toFixed(1)}x over. Consider {priority === 'low' ? 'Medium' : 'High'}.
                            </p>
                            <button onClick={() => setDismissHint(true)} className="text-yellow-600/70 hover:text-yellow-800 ml-2 shrink-0 text-[14px] leading-none">
                                &times;
                            </button>
                        </div>
                    )}

                    <div className="grid gap-1.5">
                        <label htmlFor="dueDate" className="text-xs font-semibold text-slate-700">Due Date</label>
                        <Input 
                            id="dueDate" 
                            type="date" 
                            value={dueDate} 
                            min={todayStr}
                            onChange={(e) => setDueDate(e.target.value)} 
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isLoading} className="bg-[#007dff] hover:bg-[#0070e8] text-white">
                        {isLoading ? "Creating..." : "Create Task"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
