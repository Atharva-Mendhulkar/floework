import { useGetProjectsQuery } from "@/store/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setActiveProject } from "@/store/slices/dashboardSlice";
import { ChevronDown, Folder } from "lucide-react";
import { useEffect } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel
} from "@/components/ui/dropdown-menu";

export const ProjectSelector = () => {
    const { data: response, isLoading } = useGetProjectsQuery();
    const dispatch = useAppDispatch();
    const activeProjectId = useAppSelector((state) => state.dashboard.activeProjectId);

    const projects = response?.data || [];

    useEffect(() => {
        // Auto-select first project if none is selected
        if (!activeProjectId && projects.length > 0) {
            dispatch(setActiveProject(projects[0].id));
        }
    }, [activeProjectId, projects, dispatch]);

    const activeProject = projects.find(p => p.id === activeProjectId);

    if (isLoading) {
        return (
            <div className="flex items-center gap-1.5 cursor-wait group max-w-[150px]">
                <span className="text-[13px] text-slate-400 font-medium animate-pulse">Loading workspace...</span>
            </div>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-1.5 cursor-pointer group hover:bg-slate-50 border border-transparent hover:border-slate-200 px-2 py-1 -ml-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#007dff]/20 outline-none">
                    <span className="text-[13px] text-slate-500 group-hover:text-slate-800 transition-colors font-medium truncate max-w-[120px]">
                        {activeProject?.name || "Select Project"}
                    </span>
                    <ChevronDown size={13} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 rounded-xl shadow-lg border-slate-200">
                <DropdownMenuLabel className="font-semibold text-slate-900 text-xs">Your Projects</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {projects.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-slate-500">No projects found.</div>
                ) : (
                    projects.map((project) => (
                        <DropdownMenuItem
                            key={project.id}
                            onClick={() => dispatch(setActiveProject(project.id))}
                            className={`cursor-pointer py-2 ${activeProjectId === project.id ? 'bg-[#007dff]/5 text-[#007dff] font-medium' : 'text-slate-700 font-medium'}`}
                        >
                            <Folder className="mr-2 h-4 w-4 opacity-70" />
                            <span className="truncate">{project.name}</span>
                        </DropdownMenuItem>
                    ))
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
