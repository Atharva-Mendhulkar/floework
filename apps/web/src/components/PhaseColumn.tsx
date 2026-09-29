import { useRef, useState } from "react";
import type { Phase } from "@/data/mockData";
import type { TaskNode } from "@/data/mockData";
import TaskNodeCard from "./TaskNodeCard";
import { Plus, Check, X } from "lucide-react";
import { useUpdateTaskMutation, useCreateTaskMutation, api } from "@/store/api";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

interface PhaseColumnProps {
  phase: Phase;
  isLast?: boolean;
  onTaskClick?: (task: TaskNode) => void;
}

const PhaseColumn = ({ phase, isLast, onTaskClick }: PhaseColumnProps) => {
  const [updateTask] = useUpdateTaskMutation();
  const [createTask, { isLoading: isCreating }] = useCreateTaskMutation();
  const dispatch = useAppDispatch();
  const lastActionTimeRef = useRef<Record<string, number>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const activeProjectId = useAppSelector((state) => state.dashboard.activeProjectId) || 'proj-default-1';
  const activeSprintId = useAppSelector((state) => state.dashboard.activeSprintId);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    const fromPhaseId = e.dataTransfer.getData("fromPhaseId");
    const projectId = e.dataTransfer.getData("projectId");

    if (taskId && fromPhaseId && fromPhaseId !== phase.id) {
      let newStatus = "in-progress";
      if (phase.id === "outcome") newStatus = "done";
      if (phase.id === "allocation") newStatus = "pending";

      const intentTime = Date.now();
      lastActionTimeRef.current[taskId] = intentTime;

      try {
        const task = phase.tasks.find(t => t.id === taskId);
        await updateTask({ 
          id: taskId, 
          phase: phase.id, 
          status: newStatus,
          version: task?.version,
          projectId
        }).unwrap();
      } catch (err: any) {
        console.warn("Update failed, checking for conflict:", err);
        const isStale = err?.status === 409 || err?.data?.error === 'STALE_UPDATE';
        
        if (isStale) {
          if (lastActionTimeRef.current[taskId] > intentTime) {
            console.log("Abandoning stale retry; newer action detected.");
            return;
          }

          toast.loading("Resolving conflict...", { duration: 1000 });
          
          try {
            await new Promise(r => setTimeout(r, 50 + Math.random() * 150));
            const { data: freshTask } = await (dispatch as any)(api.endpoints.getTask.initiate(taskId, { forceRefetch: true }));
            if (lastActionTimeRef.current[taskId] > intentTime) return;

            if (freshTask) {
              await updateTask({ 
                id: taskId, 
                phase: phase.id, 
                status: newStatus,
                version: freshTask.version,
                projectId
              }).unwrap();
              toast.success("Conflict resolved automatically.");
            }
          } catch (retryErr) {
            console.error("Retry failed:", retryErr);
            toast.error("Multiple people are editing this. Please refresh.");
          }
        } else {
          toast.error("Failed to move task. Please try again.");
        }
      }
    }
  };

  const handleQuickAdd = async () => {
    if (!newTitle.trim()) {
      setIsAdding(false);
      return;
    }
    try {
      await createTask({
        title: newTitle.trim(),
        projectId: activeProjectId,
        phase: phase.id,
        priority: "medium",
        sprintId: activeSprintId,
      }).unwrap();
      toast.success("Task created");
      setNewTitle("");
      setIsAdding(false);
    } catch {
      toast.error("Failed to create task");
    }
  };

  return (
    <div className="flex flex-col flex-1 min-w-[220px]">
      <div
        className="relative bg-secondary/60 border border-border rounded-2xl p-3 flex flex-col gap-2 min-h-[150px]"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {phase.tasks.map((task) => (
          <TaskNodeCard
            key={task.id}
            task={task}
            phaseId={phase.id}
            onClick={onTaskClick}
          />
        ))}

        {/* Inline quick-add */}
        {isAdding ? (
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-sm">
            <input
              ref={inputRef}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleQuickAdd();
                if (e.key === "Escape") { setIsAdding(false); setNewTitle(""); }
              }}
              placeholder="Task name..."
              className="flex-1 text-[12px] bg-transparent outline-none text-slate-800 placeholder:text-slate-400"
              autoFocus
              disabled={isCreating}
            />
            <button
              onClick={handleQuickAdd}
              disabled={isCreating || !newTitle.trim()}
              className="w-5 h-5 rounded-md bg-[#007dff] text-white flex items-center justify-center disabled:opacity-40 transition-opacity"
            >
              <Check size={11} />
            </button>
            <button
              onClick={() => { setIsAdding(false); setNewTitle(""); }}
              className="w-5 h-5 rounded-md text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
            >
              <X size={11} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center justify-center gap-1 text-text-muted text-xs py-1.5 rounded-xl hover:bg-secondary transition-colors mt-auto"
          >
            <Plus size={14} /> Add
          </button>
        )}
      </div>
      <p className="text-xs font-medium text-text-secondary text-center mt-3">
        {phase.title}
      </p>
    </div>
  );
};

export default PhaseColumn;
