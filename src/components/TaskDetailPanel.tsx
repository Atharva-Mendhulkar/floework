import { X, Clock, User, AlertTriangle, CheckCircle } from "lucide-react";
import type { TaskNode } from "@/data/mockData";
import TaskExecutionPanel from "@/components/TaskExecutionPanel";
import { useGetFocusSessionsQuery } from "@/store/api";

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
  const { data: sessionsRes } = useGetFocusSessionsQuery(undefined, { skip: !task });
  const taskSessions = sessionsRes?.data?.filter((s: any) => s.taskId === task?.id) ?? [];

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

          {/* Execution Signals — live from backend */}
          <TaskExecutionPanel taskId={task.id} />

          {/* Focus History from real sessions */}
          {taskSessions.length > 0 && (
            <div>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-2">Focus Sessions</p>
              <div className="relative">
                <div className="absolute left-[6px] top-2 bottom-2 w-px bg-slate-100" />
                <div className="flex flex-col gap-3">
                  {taskSessions.slice(0, 6).map((s: any) => (
                    <div key={s.id} className="flex items-start gap-3 relative">
                      <div className="w-3.5 h-3.5 rounded-full bg-white border-2 border-[#007dff]/30 flex items-center justify-center z-10 mt-0.5 shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#007dff]/60" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[12px] font-medium text-slate-700">
                            {s.endTime ? `${Math.round(s.durationSecs / 60)} min session` : "Ongoing"}
                          </span>
                          {s.interrupts > 0 && (
                            <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">
                              {s.interrupts} interrupt{s.interrupts > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(s.startTime).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                          {" · "}
                          {new Date(s.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Empty state when no sessions yet */}
          {taskSessions.length === 0 && (
            <div className="flex flex-col items-center gap-1.5 py-4">
              <Clock size={18} className="text-slate-200" />
              <p className="text-[11px] text-slate-400 text-center">No focus sessions yet. Start one from the Focus page.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default TaskDetailPanel;
