import { Check, MoreHorizontal, Lock, Star } from "lucide-react";
import type { TaskNode } from "@/data/mockData";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { useSocket } from "@/modules/socket/SocketContext";
import { useToggleTaskStarMutation } from "@/store/api";
import { toast } from "sonner";

interface TaskNodeCardProps {
  task: TaskNode;
  phaseId: string;
  onClick?: (task: TaskNode) => void;
}

const TaskNodeCard = ({ task, phaseId, onClick }: TaskNodeCardProps) => {
  const { socket } = useSocket();
  const lockedTasks = useSelector((state: RootState) => state.project.lockedTasks);
  const isLocked = !!lockedTasks[task.id];
  const [toggleStar] = useToggleTaskStarMutation();

  const statusStyles = {
    done: "border-emerald-200 bg-emerald-50/50",
    "in-progress": task.hasFocus ? "border-focus/40 bg-focus/5" : "border-border",
    pending: "border-border bg-surface",
  };

  const handleStarClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleStar({ id: task.id, isStarred: !task.isStarred }).unwrap();
      toast.success(task.isStarred ? "Task removed from Starred" : "Task Starred!");
    } catch (error) {
      toast.error("Failed to update task star status");
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (isLocked) {
      e.preventDefault();
      return;
    }

    // Attempt to acquire lock on the backend
    if (socket) {
      socket.emit("lock_task", { taskId: task.id, projectId: task.projectId });
    }

    e.dataTransfer.setData("taskId", task.id);
    e.dataTransfer.setData("fromPhaseId", phaseId);
    e.dataTransfer.setData("projectId", task.projectId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    // Release lock once the drag operation completes (drop or cancel)
    if (socket) {
      socket.emit("unlock_task", { taskId: task.id, projectId: task.projectId });
    }
  }

  return (
    <div
      draggable={!isLocked}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onClick?.(task)}
      className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl border ${statusStyles[task.status]} shadow-card transition-shadow ${isLocked ? 'opacity-60 cursor-not-allowed border-warning/50' : 'hover:shadow-hover group cursor-grab active:cursor-grabbing'}`}
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

      <span className="text-sm font-medium text-foreground flex-1 leading-tight flex items-center gap-2">
        {task.title}
        {isLocked && <Lock size={12} className="text-warning flex-shrink-0" />}
      </span>

      <div className="flex items-center gap-1">
        <button
          onClick={handleStarClick}
          className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-secondary ${task.isStarred ? 'opacity-100 text-yellow-500' : 'text-text-muted hover:text-yellow-500'}`}
          title={task.isStarred ? "Unstar Task" : "Star Task"}
        >
          <Star size={14} fill={task.isStarred ? "currentColor" : "none"} />
        </button>
        {task.status === "done" && (
          <div className="w-5 h-5 rounded-md bg-emerald-500 flex items-center justify-center">
            <Check size={12} className="text-surface" />
          </div>
        )}
        {task.hasFocus && (
          <div className="w-2 h-2 rounded-full bg-focus animate-pulse-soft" />
        )}
        <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-secondary text-text-muted hover:text-foreground">
          <MoreHorizontal size={14} />
        </button>
      </div>

      {/* Connection dot right */}
      <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-border bg-surface" />
    </div>
  );
};

export default TaskNodeCard;
