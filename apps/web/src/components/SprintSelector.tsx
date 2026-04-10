import { useGetProjectSprintsQuery, useCreateSprintMutation } from "@/store/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setActiveSprint } from "@/store/slices/dashboardSlice";
import { ChevronDown, Target, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export const SprintSelector = () => {
    const dispatch = useAppDispatch();
    const activeProjectId = useAppSelector((state) => state.dashboard.activeProjectId);
    const activeSprintId = useAppSelector((state) => state.dashboard.activeSprintId);
    const [createSprint] = useCreateSprintMutation();

    const { data: response, isLoading } = useGetProjectSprintsQuery(activeProjectId!, {
        skip: !activeProjectId,
    });

    const sprints = response?.data || [];

    // Auto-select active sprint if available, or first sprint, or null
    useEffect(() => {
        if (!activeSprintId && sprints.length > 0) {
            const active = sprints.find(s => s.status === "ACTIVE") || sprints[0];
            dispatch(setActiveSprint(active.id));
        }
    }, [activeSprintId, sprints, dispatch]);

    const activeSprint = sprints.find(s => s.id === activeSprintId);

    const handleCreateSprint = async () => {
        if (!activeProjectId) return;
        const name = `Sprint ${sprints.length + 1}`;
        const startDate = new Date().toISOString();
        const endDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(); // +14 days

        try {
            const res = await createSprint({ projectId: activeProjectId, name, startDate, endDate }).unwrap();
            dispatch(setActiveSprint(res.data.id));
            toast.success(`${name} created!`);
        } catch (err) {
            toast.error('Failed to create sprint');
        }
    };

    if (!activeProjectId) return null;

    if (isLoading) {
        return <span className="text-[13px] text-slate-400 font-medium animate-pulse ml-2">Loading sprints...</span>;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-1.5 cursor-pointer group hover:bg-slate-50 border border-transparent hover:border-slate-200 px-2 py-1 -ml-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#007dff]/20 outline-none">
                    <span className="text-[13px] text-slate-500 group-hover:text-slate-800 transition-colors font-medium truncate max-w-[120px]">
                        {activeSprint ? activeSprint.name : (sprints.length === 0 ? "Backlog" : "Select Sprint")}
                    </span>
                    <ChevronDown size={13} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 rounded-xl shadow-lg border-slate-200">
                <DropdownMenuLabel className="font-semibold text-slate-900 text-xs flex justify-between items-center">
                    <span>Active Sprints</span>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleCreateSprint(); }}
                        className="text-[10px] text-[#007dff] hover:bg-[#007dff]/10 p-1 rounded transition-colors"
                    >
                        <Plus size={12} />
                    </button>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem
                    onClick={() => dispatch(setActiveSprint(null))}
                    className={`cursor-pointer py-2 ${!activeSprintId ? 'bg-[#007dff]/5 text-[#007dff] font-medium' : 'text-slate-700 font-medium'}`}
                >
                    <Target className="mr-2 h-4 w-4 opacity-70" />
                    <span className="truncate">Backlog (All Tasks)</span>
                </DropdownMenuItem>

                {sprints.map((sprint) => (
                    <DropdownMenuItem
                        key={sprint.id}
                        onClick={() => dispatch(setActiveSprint(sprint.id))}
                        className={`cursor-pointer py-2 ${activeSprintId === sprint.id ? 'bg-[#007dff]/5 text-[#007dff] font-medium' : 'text-slate-700 font-medium'}`}
                    >
                        <div className={`w-1.5 h-1.5 rounded-full mr-2 ${sprint.status === 'ACTIVE' ? 'bg-emerald-500' : sprint.status === 'COMPLETED' ? 'bg-slate-300' : 'bg-amber-400'}`} />
                        <span className="truncate flex-1">{sprint.name}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
