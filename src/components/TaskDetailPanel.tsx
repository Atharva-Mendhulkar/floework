import { X, Clock, User, AlertTriangle, CheckCircle } from "lucide-react";
import type { TaskNode } from "@/data/mockData";
import TaskExecutionPanel from "@/components/TaskExecutionPanel";
import TaskReplayTimeline from "@/components/TaskReplayTimeline";

interface TaskDetailPanelProps {
  task: TaskNode | null;
  onClose: () => void;
}

const iconMap = {
  created: <CheckCircle size={14} className="text-text-muted" />,
  assigned: <User size={14} className="text-focus" />,
  focus: <Clock size={14} className="text-focus" />,
  interrupt: <AlertTriangle size={14} className="text-warning" />,
  bottleneck: <AlertTriangle size={14} className="text-warning" />,
  resolved: <CheckCircle size={14} className="text-emerald-500" />,
};

const statusStyle: Record<string, string> = {
  done: "bg-emerald-500/10 text-emerald-600",
  "in-progress": "bg-[#007dff]/10 text-[#007dff]",
  DONE: "bg-emerald-500/10 text-emerald-600",
  IN_PROGRESS: "bg-[#007dff]/10 text-[#007dff]",
  pending: "bg-slate-100 text-slate-500",
  PENDING: "bg-slate-100 text-slate-500",
};

const TaskDetailPanel = ({ task, onClose }: TaskDetailPanelProps) => {

  if (!task) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200">

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-slate-100">
          <div>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-0.5">Task Detail</p>
            <h3 className="text-[14px] font-semibold text-slate-900 leading-snug">{task.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600 mt-0.5 shrink-0"
          >
            <X size={15} />
          </button>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 flex-wrap">
          {task.assignee && (
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-lg ${task.assignee.color} flex items-center justify-center text-[9px] font-bold text-foreground`}>
                {task.assignee.initials}
              </div>
              <span className="text-[12px] text-slate-600">{task.assignee.name}</span>
            </div>
          )}
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg ${statusStyle[task.status] || statusStyle.pending}`}>
            {task.status.replace("_", " ")}
          </span>
          {task.priority && (
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg uppercase">
              {task.priority}
            </span>
          )}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">

          {/* Description */}
          {task.description && (
            <div>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1.5">Description</p>
              <p className="text-[13px] text-slate-600 leading-relaxed">{task.description}</p>
            </div>
          )}

          {/* Execution Signals & History — live from backend */}
          <TaskExecutionPanel taskId={task.id} />
          <TaskReplayTimeline taskId={task.id} />
        </div>
      </div>
    </>
  );
};

export default TaskDetailPanel;
