import { useGetTasksQuery } from "@/store/api";
import { Star, AlertCircle } from "lucide-react";

export default function StarredPage() {
    const { data: response, isLoading, error } = useGetTasksQuery();

    const starredTasks = response?.data?.filter(task => task.isStarred) || [];

    return (
        <div className="flex-1 overflow-y-auto flex flex-col gap-6 max-w-4xl max-h-screen">
            <div>
                <h2 className="text-2xl font-bold text-foreground">Starred Items</h2>
                <p className="text-text-secondary mt-1">Quick access to your most important tasks and projects.</p>
            </div>

            {isLoading && (
                <div className="flex items-center gap-2 text-text-muted">
                    <div className="w-4 h-4 rounded-full border-2 border-focus border-t-transparent animate-spin" />
                    Loading your starred items...
                </div>
            )}

            {error && (
                <div className="flex items-center gap-2 text-warning p-4 bg-warning/10 rounded-xl">
                    <AlertCircle size={20} />
                    Failed to load starred items. Server might be down.
                </div>
            )}

            {!isLoading && !error && starredTasks.length === 0 && (
                <div className="flex flex-col items-center justify-center p-12 text-center bg-surface border border-border rounded-2xl border-dashed">
                    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-4 text-text-muted">
                        <Star size={24} />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">No starred items yet</h3>
                    <p className="text-text-secondary max-w-sm">
                        You haven't starred any tasks. Click the star icon on any task to add it to this view for quick access.
                    </p>
                </div>
            )}

            {!isLoading && !error && starredTasks.length > 0 && (
                <div className="grid gap-3">
                    {starredTasks.map(task => (
                        <div key={task.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-surface border border-border rounded-2xl hover:border-focus/50 transition-colors shadow-sm group cursor-pointer gap-4">
                            <div className="flex items-start gap-4 flex-1">
                                <div className="mt-1 text-yellow-500 flex-shrink-0">
                                    <Star size={18} fill="currentColor" />
                                </div>
                                <div className="flex flex-col">
                                    <h4 className="font-semibold text-foreground group-hover:text-focus transition-colors">{task.title}</h4>
                                    {task.description && (
                                        <p className="text-sm text-text-secondary line-clamp-1 mt-0.5">{task.description}</p>
                                    )}
                                    <div className="flex items-center gap-3 mt-3">
                                        <span className="text-xs font-medium px-2 py-1 rounded-md bg-secondary text-text-secondary uppercase">
                                            Phase: {task.phase}
                                        </span>
                                        <span className={`text-xs font-medium px-2 py-1 rounded-md ${task.status === "done" ? "bg-emerald-500/10 text-emerald-600" :
                                                task.status === "in-progress" ? "bg-focus/10 text-focus" :
                                                    "bg-secondary text-text-secondary"
                                            }`}>
                                            {task.status.replace("-", " ")}
                                        </span>
                                        {task.priority && (
                                            <span className={`text-xs font-bold px-2 py-1 rounded-md ${task.priority === "high" ? "text-red-500 bg-red-500/10" :
                                                    task.priority === "medium" ? "text-orange-500 bg-orange-500/10" :
                                                        "text-blue-500 bg-blue-500/10"
                                                }`}>
                                                {task.priority.toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 self-start sm:self-center">
                                {task.assignee ? (
                                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background border border-border`}>
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${task.assignee.color || 'bg-gray-500'} text-white`}>
                                            {task.assignee.initials || task.assignee.name.charAt(0)}
                                        </div>
                                        <span className="text-xs font-medium text-foreground">{task.assignee.name}</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background border border-border border-dashed">
                                        <span className="text-xs font-medium text-text-muted">Unassigned</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
