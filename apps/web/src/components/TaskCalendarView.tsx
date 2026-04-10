import { useState, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { TaskNode } from "@/data/mockData";
import { format, isSameDay } from "date-fns";

interface TaskCalendarViewProps {
    tasks: TaskNode[];
    onTaskClick?: (task: TaskNode) => void;
}

export function TaskCalendarView({ tasks, onTaskClick }: TaskCalendarViewProps) {
    const [date, setDate] = useState<Date | undefined>(new Date());

    // Filter tasks due on the selected date
    const selectedTasks = useMemo(() => {
        if (!date) return [];
        return tasks.filter((task) => {
            if (!task.dueDate) return false;
            return isSameDay(new Date(task.dueDate), date);
        });
    }, [tasks, date]);

    // Aggregate days that have tasks to show dots on the calendar
    // Note: react-day-picker requires custom modifiers for dot indicators,
    // but we can simply rely on the users clicking around for now.
    const taskDates = useMemo(() => {
        return tasks
            .filter((t) => t.dueDate)
            .map((t) => new Date(t.dueDate as string));
    }, [tasks]);

    return (
        <div className="flex flex-col md:flex-row gap-6 mt-4">
            {/* Interactive Calendar */}
            <div className="bg-surface rounded-2xl border border-border flex justify-center p-2 shadow-sm shrink-0 h-fit">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    className="rounded-md"
                    modifiers={{
                        hasTask: taskDates,
                    }}
                    modifiersClassNames={{
                        hasTask: "bg-focus/10 text-focus font-bold",
                    }}
                />
            </div>

            {/* Task List for Selected Date */}
            <div className="flex-1 bg-surface rounded-2xl border border-border p-5 shadow-sm min-h-[350px]">
                <h3 className="text-base font-semibold text-foreground mb-4 border-b border-border pb-2">
                    {date ? `Tasks Due on ${format(date, "MMMM d, yyyy")}` : "Select a Date"}
                </h3>

                {!date ? (
                    <p className="text-sm text-text-muted mt-4">Please select a date from the calendar.</p>
                ) : selectedTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <p className="text-sm text-text-muted">No tasks due on this date.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {selectedTasks.map((task) => (
                            <div
                                key={task.id}
                                onClick={() => onTaskClick?.(task)}
                                className="group flex flex-col p-4 rounded-xl border border-border bg-background hover:border-focus/50 hover:shadow-sm transition-all cursor-pointer"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <h4 className="text-sm font-semibold text-foreground group-hover:text-focus transition-colors">
                                        {task.title}
                                    </h4>
                                    <span
                                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${task.priority === "high"
                                                ? "bg-red-500/10 text-red-500"
                                                : task.priority === "medium"
                                                    ? "bg-orange-500/10 text-orange-500"
                                                    : "bg-blue-500/10 text-blue-500"
                                            }`}
                                    >
                                        {task.priority || "Normal"}
                                    </span>
                                </div>

                                {task.description && (
                                    <p className="text-xs text-text-secondary line-clamp-2 mb-3">
                                        {task.description}
                                    </p>
                                )}

                                <div className="flex items-center justify-between mt-auto">
                                    <div className="flex items-center gap-2">
                                        {task.assignee ? (
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${task.assignee.color || 'bg-gray-500'} text-white`}>
                                                {task.assignee.initials || task.assignee.name.charAt(0)}
                                            </div>
                                        ) : (
                                            <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] text-text-muted border border-border border-dashed">
                                                ?
                                            </div>
                                        )}
                                        <span className="text-xs text-text-muted">
                                            {task.assignee ? task.assignee.name : "Unassigned"}
                                        </span>
                                    </div>
                                    <span className={`text-[10px] font-medium px-2 py-1 rounded-md ${task.status === "done" ? "bg-emerald-500/10 text-emerald-600" :
                                            task.status === "in-progress" ? "bg-focus/10 text-focus" :
                                                "bg-secondary text-text-secondary"
                                        }`}>
                                        {task.status.replace("-", " ")}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
