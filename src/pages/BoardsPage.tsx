import SidebarNavigation from "@/components/SidebarNavigation";
import TopHeader from "@/components/TopHeader";
import FlowBoard from "@/components/FlowBoard";
import TaskDetailPanel from "@/components/TaskDetailPanel";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectTask } from "@/store/slices/projectSlice";
import type { TaskNode } from "@/data/mockData";
import { api, useGetHasRealTasksQuery, useDeleteSampleTasksMutation } from "@/store/api";
import { useState } from "react";
import { X, Sparkles } from "lucide-react";

const BoardsPage = () => {
    const dispatch = useAppDispatch();
    const selectedTask = useAppSelector((state) => state.project.selectedTask);
    const { data: hasRealTasksRes } = useGetHasRealTasksQuery();
    const [deleteSamples] = useDeleteSampleTasksMutation();
    const [bannerDismissed, setBannerDismissed] = useState(false);

    const hasRealTasks = hasRealTasksRes?.data?.hasRealTasks ?? true;
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
        <div className="flex h-screen bg-background p-3 gap-3">
            <SidebarNavigation />
            <div className="flex flex-col flex-1 gap-3 min-w-0">
                <TopHeader />
                <main className="flex-1 overflow-y-auto flex flex-col gap-3">
                    {showBanner && (
                        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-in fade-in zoom-in duration-300">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-100/80 flex items-center justify-center">
                                    <Sparkles size={18} className="text-indigo-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-indigo-900">Welcome to Floework</p>
                                    <p className="text-xs text-indigo-700/80 max-w-xl">
                                        We've seeded your workspace with sample tasks so you can test the Execution Graph. 
                                        When you're ready, clear them out and replace with your real work.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleClearSamples}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
                                >
                                    Clear samples
                                </button>
                                <button onClick={() => setBannerDismissed(true)} className="p-2 hover:bg-indigo-100 rounded-xl text-indigo-400 hover:text-indigo-600 transition-colors">
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                    <FlowBoard onTaskClick={handleTaskClick} />
                </main>
            </div>
            <TaskDetailPanel task={selectedTask} onClose={() => handleTaskClick(null)} />
        </div>
    );
};

export default BoardsPage;
