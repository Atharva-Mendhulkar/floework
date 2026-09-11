import FlowBoard from "@/components/FlowBoard";
import TaskDetailPanel from "@/components/TaskDetailPanel";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectTask } from "@/store/slices/projectSlice";
import type { TaskNode } from "@/data/mockData";
import { api, useGetHasRealTasksQuery, useDeleteSampleTasksMutation, useGetTasksQuery, useGetProjectsQuery } from "@/store/api";
import { useState, lazy, Suspense } from "react";
import { X, Sparkles, Loader2, Plus } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TaskCreateModal } from "@/components/TaskCreateModal";

const ExecutionGraph = lazy(() => import("@/components/ExecutionGraph").then(m => ({ default: m.ExecutionGraph })));

const BoardsPage = () => {
    const dispatch = useAppDispatch();
    const selectedTask = useAppSelector((state) => state.project.selectedTask);
    const { data: hasRealTasksRes } = useGetHasRealTasksQuery();
    const [deleteSamples] = useDeleteSampleTasksMutation();
    const [bannerDismissed, setBannerDismissed] = useState(false);
    const [isGraphCreateModalOpen, setIsGraphCreateModalOpen] = useState(false);

    const activeProjectId = useAppSelector((state) => state.dashboard.activeProjectId);
    const { data: projectsRes } = useGetProjectsQuery();
    const effectiveProjectId = activeProjectId || projectsRes?.data?.[0]?.id || 'proj-default-1';

    const { data: tasksRes } = useGetTasksQuery({ projectId: effectiveProjectId });

    const hasRealTasks = hasRealTasksRes?.data?.hasRealTasks ?? false;
    const showBanner = !hasRealTasks && !bannerDismissed;

    const handleClearSamples = async () => {
        try {
            await deleteSamples().unwrap();
            dispatch(api.util.invalidateTags(['Task'] as any));
            setBannerDismissed(true);
        } catch (e) {
            console.error("Failed to clear samples", e);
        }
    };

    const handleTaskClick = (task: TaskNode | null) => {
        dispatch(selectTask(task));
    };

    return (
        <div className="flex flex-col gap-3">
            {showBanner && (
                <div className="bg-blue-50/70 border border-blue-200/60 rounded-2xl p-4 flex items-center justify-between shadow-xs animate-in fade-in zoom-in duration-300">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100/70 flex items-center justify-center shrink-0">
                            <Sparkles size={18} className="text-[#007dff]" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-900">Welcome to Floework</p>
                            <p className="text-xs text-slate-600 max-w-xl mt-0.5">
                                We've seeded your workspace with sample tasks so you can test the Execution Graph. 
                                When you're ready, clear them out and replace with your real work.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleClearSamples}
                            className="px-4 py-2 bg-[#007dff] hover:bg-[#0066cc] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                        >
                            Clear samples
                        </button>
                        <button onClick={() => setBannerDismissed(true)} className="p-2 hover:bg-blue-100/60 rounded-xl text-slate-400 hover:text-slate-600 transition-colors">
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}
            <FlowBoard onTaskClick={handleTaskClick} />
            
            {/* Execution Graph Layer inserted below Kanban */}
            <div className="mt-4 mb-8 bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-[15px] font-semibold text-slate-900">Execution Intelligence Graph</h3>
                        <p className="text-[12px] text-slate-400">Interactive map of task dependencies and realtime signals.</p>
                    </div>
                    <button
                        onClick={() => setIsGraphCreateModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#007dff] hover:bg-[#0070e8] text-white text-xs font-semibold rounded-xl shadow-sm shadow-[#007dff]/20 transition-all active:scale-95"
                    >
                        <Plus size={13} />
                        <span>New Task</span>
                    </button>
                </div>
                <ErrorBoundary fallback={
                    <div className="h-[200px] flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border border-slate-200/80 text-slate-500 text-sm gap-2">
                        <span>Unable to display execution graph right now.</span>
                        <button onClick={() => window.location.reload()} className="text-xs text-[#007dff] hover:underline">Reload graph</button>
                    </div>
                }>
                    <Suspense fallback={<div className="h-[620px] flex items-center justify-center bg-slate-50/50 rounded-2xl border border-slate-200/80"><Loader2 className="animate-spin text-slate-400" /></div>}>
                        <ExecutionGraph
                            tasks={tasksRes?.data || []}
                            projectId={effectiveProjectId}
                            onTaskClick={handleTaskClick}
                            onNewTaskClick={() => setIsGraphCreateModalOpen(true)}
                        />
                    </Suspense>
                </ErrorBoundary>
            </div>
            <TaskDetailPanel task={selectedTask} onClose={() => handleTaskClick(null)} />

            {effectiveProjectId && (
                <TaskCreateModal
                    isOpen={isGraphCreateModalOpen}
                    onClose={() => setIsGraphCreateModalOpen(false)}
                    projectId={effectiveProjectId}
                />
            )}
        </div>
    );
};

export default BoardsPage;
