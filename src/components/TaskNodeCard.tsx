import { Check, MoreHorizontal } from "lucide-react";
import type { TaskNode } from "@/data/mockData";

interface TaskNodeCardProps {
  task: TaskNode;
  onClick?: (task: TaskNode) => void;
}

const TaskNodeCard = ({ task, onClick }: TaskNodeCardProps) => {
  const statusStyles = {
    done: "border-emerald-200 bg-emerald-50/50",
    "in-progress": task.hasFocus ? "border-focus/40 bg-focus/5" : "border-border",
    pending: "border-border bg-surface",
  };

  return (
    <div
      onClick={() => onClick?.(task)}
      className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl border ${statusStyles[task.status]} shadow-card transition-shadow hover:shadow-hover group cursor-pointer`}
    >
      {/* Connection dot left */}
      <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-border bg-surface" />

      {task.assignee && (
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-lg ${task.assignee.color} flex items-center justify-center text-xs font-semibold text-foreground`}
        >
          {task.assignee.initials}
        </div>
      )}

      <span className="text-sm font-medium text-foreground flex-1 leading-tight">
        {task.title}
      </span>

      <div className="flex items-center gap-1">
        {task.status === "done" && (
          <div className="w-5 h-5 rounded-md bg-emerald-500 flex items-center justify-center">
            <Check size={12} className="text-surface" />
          </div>
        )}
        {task.hasFocus && (
          <div className="w-2 h-2 rounded-full bg-focus animate-pulse-soft" />
        )}
        <button className="opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-foreground">
          <MoreHorizontal size={14} />
        </button>
      </div>

      {/* Connection dot right */}
      <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-border bg-surface" />
    </div>
  );
};

export default TaskNodeCard;
