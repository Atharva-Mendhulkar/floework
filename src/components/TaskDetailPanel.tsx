import { X, Clock, User, AlertTriangle, CheckCircle } from "lucide-react";
import type { TaskNode } from "@/data/mockData";

interface TaskDetailPanelProps {
  task: TaskNode | null;
  onClose: () => void;
}

const timelineEvents = [
  { id: 1, type: "created", label: "Task created", user: "Sarah Chen", time: "Feb 18, 9:00 AM" },
  { id: 2, type: "assigned", label: "Assigned to team", user: "James Park", time: "Feb 18, 9:30 AM" },
  { id: 3, type: "focus", label: "Focus session started", user: "Mia Torres", time: "Feb 19, 10:00 AM", duration: "47 min" },
  { id: 4, type: "interrupt", label: "Interrupt logged", user: "Mia Torres", time: "Feb 19, 10:47 AM", reason: "Standup meeting" },
  { id: 5, type: "focus", label: "Focus session resumed", user: "Mia Torres", time: "Feb 19, 11:15 AM", duration: "1h 20min" },
  { id: 6, type: "bottleneck", label: "Bottleneck detected", user: "System", time: "Feb 20, 2:00 PM", reason: "Blocked by CI pipeline" },
  { id: 7, type: "resolved", label: "Blocker resolved", user: "Lina Sato", time: "Feb 20, 4:30 PM" },
];

const iconMap = {
  created: <CheckCircle size={14} className="text-text-muted" />,
  assigned: <User size={14} className="text-focus" />,
  focus: <Clock size={14} className="text-focus" />,
  interrupt: <AlertTriangle size={14} className="text-warning" />,
  bottleneck: <AlertTriangle size={14} className="text-warning" />,
  resolved: <CheckCircle size={14} className="text-emerald-500" />,
};

const TaskDetailPanel = ({ task, onClose }: TaskDetailPanelProps) => {
  if (!task) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-foreground/10 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-surface shadow-hover z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <p className="text-xs text-text-muted">Task Detail</p>
            <h3 className="text-base font-semibold text-foreground">{task.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-secondary transition-colors text-text-secondary"
          >
            <X size={16} />
          </button>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-4 px-5 py-4 border-b border-border">
          {task.assignee && (
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg ${task.assignee.color} flex items-center justify-center text-[10px] font-semibold text-foreground`}>
                {task.assignee.initials}
              </div>
              <span className="text-sm text-text-secondary">{task.assignee.name}</span>
            </div>
          )}
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-md ${
              task.status === "done"
                ? "bg-emerald-100 text-emerald-700"
                : task.status === "in-progress"
                ? "bg-focus/15 text-focus"
                : "bg-secondary text-text-secondary"
            }`}
          >
            {task.status}
          </span>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="text-xs font-medium text-text-secondary mb-4">Causal History</p>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[6px] top-2 bottom-2 w-px bg-border" />

            <div className="flex flex-col gap-4">
              {timelineEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-3 relative">
                  <div className="w-3.5 h-3.5 rounded-full bg-surface border-2 border-border flex items-center justify-center z-10 mt-0.5">
                    {/* dot */}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {iconMap[event.type as keyof typeof iconMap]}
                      <span className="text-sm font-medium text-foreground">{event.label}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-text-muted">{event.user}</span>
                      <span className="text-xs text-text-muted">·</span>
                      <span className="text-xs text-text-muted">{event.time}</span>
                    </div>
                    {event.duration && (
                      <span className="inline-block text-[10px] font-medium bg-focus/10 text-focus px-1.5 py-0.5 rounded mt-1">
                        {event.duration}
                      </span>
                    )}
                    {event.reason && (
                      <span className="inline-block text-[10px] font-medium bg-warning/10 text-warning px-1.5 py-0.5 rounded mt-1">
                        {event.reason}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TaskDetailPanel;
