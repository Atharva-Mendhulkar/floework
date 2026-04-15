import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTaskMutation, useGetEstimationHintQuery, useGetUsersQuery } from "@/store/api";
import { toast } from "sonner";

interface TaskCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
}

export function TaskCreateModal({ isOpen, onClose, projectId }: TaskCreateModalProps) {
    const [createTask, { isLoading }] = useCreateTaskMutation();
    const { data: usersRes } = useGetUsersQuery();
    const team = usersRes?.data || [];

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [assigneeId, setAssigneeId] = useState<string>("unassigned");
    const [priority, setPriority] = useState("medium");
    const [dueDate, setDueDate] = useState("");
    const [dismissHint, setDismissHint] = useState(false);

    // Get today's date in YYYY-MM-DD format for date input minimum
    const today = new Date();
    const minDate = today.toISOString().split('T')[0];

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

        if (dueDate) {
            const selectedDate = new Date(dueDate);
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            
            if (selectedDate < todayStart) {
                toast.error("Due date cannot be in the past");
                return;
            }
        }

        try {
            await createTask({
                title,
                description,
                projectId,
                assigneeId: assigneeId === "unassigned" ? undefined : assigneeId,
                priority,
                dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
            }).unwrap();

            toast.success("Task created successfully");

            // Reset form
            setTitle("");
            setDescription("");
            setAssigneeId("unassigned");
            setPriority("medium");
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
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <label htmlFor="title" className="text-sm font-medium">Task Title</label>
                        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="E.g., Design System Tokens" />
                    </div>

                    <div className="grid gap-2">
                        <label htmlFor="description" className="text-sm font-medium">Description</label>
                        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Provide context..." />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Assignee</label>
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

                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Priority</label>
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
                            {hint && !dismissHint && (
                                <div className="mt-1.5 flex items-start justify-between bg-yellow-50 text-yellow-700/90 p-2.5 rounded-lg border border-yellow-200/50">
                                   <p className="text-[11px] font-medium leading-tight">
                                     Your {priority} '{hint.keyword}' tasks usually run {hint.ratio.toFixed(1)}x over. Consider {priority === 'low' ? 'Medium' : 'High'}.
                                   </p>
                                   <button onClick={() => setDismissHint(true)} className="text-yellow-600/70 hover:text-yellow-800 ml-2 shrink-0 text-[14px] leading-none">
                                      &times;
                                   </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <label htmlFor="dueDate" className="text-sm font-medium">Due Date</label>
                        <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} min={minDate} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? "Creating..." : "Create Task"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
