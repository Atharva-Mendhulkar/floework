import { useRef } from "react";
import type { Phase } from "@/data/mockData";
import type { TaskNode } from "@/data/mockData";
import TaskNodeCard from "./TaskNodeCard";
import { Plus } from "lucide-react";
import { useUpdateTaskMutation, api } from "@/store/api";
import { toast } from "sonner";
import { useAppDispatch } from "@/store/hooks";

interface PhaseColumnProps {
  phase: Phase;
  isLast?: boolean;
  onTaskClick?: (task: TaskNode) => void;
}

const PhaseColumn = ({ phase, isLast, onTaskClick }: PhaseColumnProps) => {
  const [updateTask] = useUpdateTaskMutation();
  const dispatch = useAppDispatch();
  const lastActionTimeRef = useRef<Record<string, number>>({});

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // allow drop
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    const fromPhaseId = e.dataTransfer.getData("fromPhaseId");
    const projectId = e.dataTransfer.getData("projectId");

    if (taskId && fromPhaseId && fromPhaseId !== phase.id) {

      // Determine new status based on drop column
      let newStatus = "in-progress";
      if (phase.id === "outcome") newStatus = "done";
      if (phase.id === "allocation") newStatus = "pending";

      // 1. Persist to DB
      // Record the time of this specific user intent
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
          // 4.0 Intent-Aware Retry Guard:
          // If the user has performed a NEWER action on this task, abandon this retry.
          if (lastActionTimeRef.current[taskId] > intentTime) {
            console.log("Abandoning stale retry; newer action detected.");
            return;
          }

          toast.loading("Resolving conflict...", { duration: 1000 });
          
          try {
            // 1.1 Jitter to prevent retry storms (50ms - 200ms)
            await new Promise(r => setTimeout(r, 50 + Math.random() * 150));

            // Fetch fresh state directly
            const { data: freshTask } = await (dispatch as any)(api.endpoints.getTask.initiate(taskId, { forceRefetch: true }));
            
            // Re-check intent relevancy after fetch
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
        <button className="flex items-center justify-center gap-1 text-text-muted text-xs py-1.5 rounded-xl hover:bg-secondary transition-colors mt-auto">
          <Plus size={14} /> Add
        </button>
      </div>
      <p className="text-xs font-medium text-text-secondary text-center mt-3">
        {phase.title}
      </p>
    </div>
  );
};

export default PhaseColumn;
