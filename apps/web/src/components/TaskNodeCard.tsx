import { Check, MoreHorizontal, Lock, Star, Play, Zap, Github, X } from "lucide-react";
import { useState, useEffect } from "react";
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
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
     if (task.isSample && task.title === 'Review authentication flow' && !localStorage.getItem('floework_onboarding_v1_complete')) {
         setShowTooltip(true);
     }
  }, [task]);

  const dismissTooltip = (e: React.MouseEvent) => {
      e.stopPropagation();
      localStorage.setItem('floework_onboarding_v1_complete', 'true');
      setShowTooltip(false);
  };

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

  const openHours = (openedAt: string | Date) => Math.floor((Date.now() - new Date(openedAt).getTime()) / 3_600_000);
  const activePR = (task as any).linkedPRs?.[0];
  const showPRBadge = activePR && activePR.state === 'open' && openHours(activePR.openedAt) >= 24;
  const prWaitTime = showPRBadge ? openHours(activePR.openedAt) : 0;

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
          {task.assignee?.name?.[0] || 'U'}
        </div>
      )}

      <span className="text-sm font-medium text-foreground flex-1 leading-tight flex items-center gap-2">
        {task.title}
        {isLocked && <Lock size={12} className="text-warning flex-shrink-0" />}
      </span>

      <div className="flex items-center gap-2">
        {showPRBadge && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-amber-200 bg-amber-50 text-[10.5px] font-bold text-amber-600 shadow-sm" title={`Blocked by PR #${activePR.prNumber} for ${prWaitTime}h`}>
            <Github size={11} className="shrink-0" /> PR: {prWaitTime}h
          </div>
        )}
        {/* Effort & Focus Count */}
        <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg bg-slate-50 border border-slate-100 opacity-60 group-hover:opacity-100 transition-opacity">
          {task.effort && (
            <span className="text-[10px] font-bold text-slate-400 w-4 h-4 flex items-center justify-center border border-slate-200 rounded-md bg-white">
              {task.effort}
            </span>
          )}
          {task.focusCount ? (
            <span className="text-[10px] font-bold text-[#007dff] flex items-center gap-0.5">
              {task.focusCount}<Zap size={8} fill="currentColor" />
            </span>
          ) : null}
        </div>

        <button
          onClick={handleStarClick}
          className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-secondary ${task.isStarred ? 'opacity-100 text-yellow-500' : 'text-text-muted hover:text-yellow-500'}`}
          title={task.isStarred ? "Unstar Task" : "Star Task"}
        >
          <Star size={14} fill={task.isStarred ? "currentColor" : "none"} />
        </button>

        {/* Quick Focus Toggle */}
        <div className="relative">
          {showTooltip && (
              <div className="absolute bottom-full right-0 mb-3 w-52 bg-indigo-600 text-white text-[11px] font-medium p-3 rounded-xl shadow-xl z-50 animate-bounce">
                  <div className="flex justify-between items-start gap-2 mb-1">
                      <span>Start your first session to see how Floework tracks your work.</span>
                      <button onClick={dismissTooltip} className="text-indigo-200 hover:text-white shrink-0"><X size={12}/></button>
                  </div>
                  <div className="absolute -bottom-1.5 right-2 w-3 h-3 bg-indigo-600 rotate-45" />
              </div>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              localStorage.setItem('floework_onboarding_v1_complete', 'true');
              window.location.href = `/focus?taskId=${task.id}`; // Redirect to focus page
            }}
            className={`${showTooltip ? 'opacity-100 ring-4 ring-indigo-500/30' : 'opacity-0 group-hover:opacity-100'} transition-opacity w-7 h-7 rounded-lg bg-[#007dff] text-white flex items-center justify-center shadow-lg shadow-[#007dff]/20 active:scale-95`}
            title="Start Focus Session"
          >
            <Play size={12} fill="white" />
          </button>
        </div>

        {task.status === "done" && (
          <div className="w-5 h-5 rounded-md bg-emerald-500 flex items-center justify-center">
            <Check size={12} className="text-surface" />
          </div>
        )}
        {task.hasFocus && (
          <div className="w-2 h-2 rounded-full bg-focus animate-pulse-soft" />
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onClick?.(task); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-secondary text-text-muted hover:text-foreground"
          title="View details"
        >
          <MoreHorizontal size={14} />
        </button>
      </div>

      {/* Connection dot right */}
      <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-border bg-surface" />
    </div>
  );
};

export default TaskNodeCard;
