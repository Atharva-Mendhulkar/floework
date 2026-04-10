import { Clock, CheckCircle, AlertTriangle, PlayCircle, Loader2 } from "lucide-react";
import { useGetTaskReplayQuery } from "@/store/api";

interface TaskReplayTimelineProps {
    taskId: string;
}

const getEventStyles = (eventType: string) => {
    switch (eventType) {
        case "TASK_CREATED":
            return { icon: <CheckCircle size={14} />, color: "text-slate-400 bg-slate-100", border: "border-slate-200" };
        case "STATUS_CHANGE":
            return { icon: <CheckCircle size={14} />, color: "text-amber-600 bg-amber-100", border: "border-amber-200" };
        case "FOCUS_START":
            return { icon: <PlayCircle size={14} />, color: "text-[#007dff] bg-[#007dff]/10", border: "border-[#007dff]/30" };
        case "FOCUS_STOP":
            return { icon: <Clock size={14} />, color: "text-emerald-600 bg-emerald-100", border: "border-emerald-200" };
        case "BLOCKER_DETECTED":
            return { icon: <AlertTriangle size={14} />, color: "text-red-600 bg-red-100", border: "border-red-200" };
        default:
            return { icon: <CheckCircle size={14} />, color: "text-slate-400 bg-slate-100", border: "border-slate-200" };
    }
};

const formatEventTitle = (event: any) => {
    switch (event.eventType) {
        case "TASK_CREATED":
            return "Task created";
        case "STATUS_CHANGE":
            return `Moved to ${event.metadata?.status?.replace("_", " ") || "unknown status"}`;
        case "FOCUS_START":
            return "Focus session started";
        case "FOCUS_STOP":
            const mins = Math.round((event.metadata?.durationSecs || 0) / 60);
            return `Focus session completed (${mins} min)`;
        case "BLOCKER_DETECTED":
            return "Blocker signal detected";
        default:
            return event.eventType.replace("_", " ");
    }
};

const TaskReplayTimeline = ({ taskId }: TaskReplayTimelineProps) => {
    const { data: replayData, isLoading } = useGetTaskReplayQuery(taskId);
    const events = replayData?.data || [];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-4">
                <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div className="flex flex-col items-center gap-1.5 py-4">
                <Clock size={16} className="text-slate-200" />
                <p className="text-[11px] text-slate-400 text-center">No execution events recorded yet.</p>
            </div>
        );
    }

    return (
        <div>
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-2 flex items-center justify-between">
                <span>Execution Timeline</span>
                <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold tracking-wider">REPLAY</span>
            </p>

            <div className="relative">
                {/* Vertical line connecting timeline nodes */}
                <div className="absolute left-[8px] top-2 bottom-2 w-px bg-slate-100" />

                <div className="flex flex-col gap-4">
                    {events.map((event: any, idx: number) => {
                        const styles = getEventStyles(event.eventType);
                        const isLast = idx === events.length - 1;

                        return (
                            <div key={event.id} className="flex items-start gap-3 relative">
                                {/* Node indicator */}
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center border-2 bg-white z-10 mt-1 shrink-0 ${styles.border} ${styles.color.split(' ')[0]}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full fill-current`} />
                                </div>

                                <div className="flex-1 min-w-0 pt-0.5">
                                    <div className="flex items-center justify-between gap-2 flex-wrap mb-0.5">
                                        <span className="text-[12px] font-medium text-slate-700">
                                            {formatEventTitle(event)}
                                        </span>
                                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                            {new Date(event.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                                        </span>
                                    </div>

                                    {/* Additional metadata tags */}
                                    {event.eventType === "FOCUS_STOP" && event.metadata?.interrupts > 0 && (
                                        <span className="inline-block text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md mt-1">
                                            {event.metadata.interrupts} interrupt{event.metadata.interrupts > 1 ? "s" : ""}
                                        </span>
                                    )}
                                    {event.eventType === "TASK_CREATED" && event.user?.name && (
                                        <span className="text-[11px] text-slate-500 block">by {event.user.name.split(' ')[0]}</span>
                                    )}
                                    {event.eventType === "STATUS_CHANGE" && event.user?.name && (
                                        <span className="text-[11px] text-slate-500 block">by {event.user.name.split(' ')[0]}</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default TaskReplayTimeline;
