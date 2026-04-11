import { useGetTasksQuery, useToggleTaskStarMutation } from "@/store/api";
import { Star, AlertCircle, StarOff } from "lucide-react";
import { useRole } from "@/hooks/useRole";
import { toast } from "sonner";

export default function StarredPage() {
    const { data: response, isLoading, error } = useGetTasksQuery(undefined);
    const [toggleStar, { isLoading: isToggling }] = useToggleTaskStarMutation();
    const { can } = useRole();

    const starredTasks = response?.data?.filter(task => task.isStarred) || [];

    const handleUnstar = async (id: string) => {
        try {
            await toggleStar({ id, isStarred: false }).unwrap();
            toast.success("Removed from starred");
        } catch {
            toast.error("Failed to update");
        }
    };

    const priorityStyle: Record<string, string> = {
        high: "text-red-500 bg-red-50",
        medium: "text-amber-600 bg-amber-50",
        low: "text-blue-500 bg-blue-50",
    };

    const statusStyle: Record<string, string> = {
        DONE: "text-emerald-600 bg-emerald-50",
        IN_PROGRESS: "text-[#007dff] bg-[#007dff]/10",
        PENDING: "text-slate-500 bg-slate-100",
    };

    return (
        <div className="flex-1 overflow-y-auto flex flex-col gap-5 max-w-4xl">
            <div>
                <h2 className="text-[15px] font-semibold text-slate-900">Starred</h2>
                <p className="text-[12px] text-slate-400 mt-0.5">Quick access to your most important tasks.</p>
            </div>

            {isLoading && (
                <div className="flex items-center gap-2 text-slate-400 text-[13px]">
                    <div className="w-4 h-4 rounded-full border-2 border-[#007dff] border-t-transparent animate-spin" />
                    Loading starred tasks…
                </div>
            )}

            {error && (
                <div className="flex items-center gap-2 text-red-500 text-[13px] p-3 bg-red-50 rounded-xl border border-red-100">
                    <AlertCircle size={15} />
                    Failed to load starred items. Server might be offline.
                </div>
            )}

            {!isLoading && !error && starredTasks.length === 0 && (
                <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-dashed border-slate-200 rounded-2xl">
                    <div className="w-12 h-12 rounded-full bg-yellow-50 border border-yellow-100 flex items-center justify-center mb-3">
                        <Star size={22} className="text-yellow-400" />
                    </div>
                    <h3 className="text-[14px] font-semibold text-slate-800 mb-1">No starred tasks</h3>
                    <p className="text-[12px] text-slate-400 max-w-xs">
                        Click the star icon on any task card to pin it here for quick access.
                    </p>
                </div>
            )}

            {!isLoading && !error && starredTasks.length > 0 && (
                <div className="flex flex-col gap-2">
                    {starredTasks.map(task => (
                        <div
                            key={task.id}
                            className="flex items-center justify-between p-4 bg-white border border-slate-200/80 rounded-2xl hover:border-[#007dff]/30 hover:shadow-sm transition-all group"
                        >
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                <Star size={16} className="text-yellow-400 mt-0.5 shrink-0" fill="currentColor" />
                                <div className="flex flex-col gap-1.5 min-w-0">
                                    <h4 className="text-[13px] font-semibold text-slate-800 truncate group-hover:text-[#007dff] transition-colors">
                                        {task.title}
                                    </h4>
                                    {task.description && (
                                        <p className="text-[11px] text-slate-400 line-clamp-1">{task.description}</p>
                                    )}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg ${statusStyle[task.status] || statusStyle.PENDING}`}>
                                            {task.status.replace("_", " ")}
                                        </span>
                                        {task.priority && (
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${priorityStyle[task.priority] || ""}`}>
                                                {task.priority.toUpperCase()}
                                            </span>
                                        )}
                                        {task.phase && (
                                            <span className="text-[10px] text-slate-400 font-medium px-2 py-0.5 rounded-lg bg-slate-100">
                                                {task.phase}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 ml-4 shrink-0">
                                {task.assignee && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-100">
                                        <div className="w-5 h-5 rounded-full bg-[#007dff]/20 text-[#007dff] flex items-center justify-center text-[9px] font-bold">
                                            {task.assignee?.name?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                        <span className="text-[11px] font-medium text-slate-600">{task.assignee.name}</span>
                                    </div>
                                )}
                                <button
                                    onClick={() => handleUnstar(task.id)}
                                    disabled={isToggling}
                                    title="Remove from starred"
                                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <StarOff size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* RBAC notice for non-admin */}
            {!can("create_task") && (
                <p className="text-[11px] text-slate-400 text-center">
                    You have read-only access. Contact your workspace admin to modify tasks.
                </p>
            )}
        </div>
    );
}
