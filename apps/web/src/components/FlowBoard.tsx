import { team } from "@/data/mockData";
import { phases as initialPhases } from "@/data/mockData";
import type { TaskNode } from "@/data/mockData";
import PhaseColumn from "./PhaseColumn";
import { Plus, Calendar, ListTodo, Filter, Zap, TrendingDown, TrendingUp, AlertCircle } from "lucide-react";
import { useGetTasksQuery, useGetProjectPredictionQuery, useGetProjectsQuery, api } from "@/store/api";
import { useMemo, useEffect, useState } from "react";
import { useSocket } from "@/modules/socket/SocketContext";
import { useDispatch } from "react-redux";
import { useAppSelector } from "@/store/hooks";
import type { AppDispatch } from "@/store";
import { lockTask, unlockTask } from "@/store/slices/projectSlice";
import { TaskCreateModal } from "./TaskCreateModal";
import { TaskCalendarView } from "./TaskCalendarView";

interface FlowBoardProps {
  onTaskClick?: (task: TaskNode | null) => void;
}

const FlowBoard = ({ onTaskClick }: FlowBoardProps) => {
  const activeProjectId = useAppSelector((state) => state.dashboard.activeProjectId);
  const activeSprintId = useAppSelector((state) => state.dashboard.activeSprintId);
  const { data: response, isLoading, error } = useGetTasksQuery(activeProjectId || undefined);
  const { socket, isConnected } = useSocket();
  const dispatch = useDispatch<AppDispatch>();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "calendar">("kanban");
  const [showOnboardingTooltip, setShowOnboardingTooltip] = useState(() => {
    return !localStorage.getItem('floework_onboarding_v1_complete');
  });

  const searchQuery = useAppSelector((state) => state.dashboard.searchQuery);
  // Remove the old redeclarations here (around line 31 in original)

  const { data: sprintsRes } = api.endpoints.getProjectSprints.useQueryState(activeProjectId!, { skip: !activeProjectId });
  const activeSprint = sprintsRes?.data?.find((s: any) => s.id === activeSprintId);

  // Refetch tasks if sprint changes (backend mapping via sprintId would ideally be passed to getTasks query param)
  // For now, if activeSprintId is null, it's Backlog. We should probably pass activeSprintId to useGetTasksQuery!

  const { data: projectsRes } = useGetProjectsQuery();
  const fallbackProjectId = projectsRes?.data?.[0]?.id || "fallback-id";
  const effectiveProjectId = activeProjectId || fallbackProjectId;

  const { data: predictionRes } = useGetProjectPredictionQuery(effectiveProjectId, { skip: !activeProjectId });
  const prediction = predictionRes?.data;

  /* WebSocket subscription */
  useEffect(() => {
    if (!socket || !isConnected || !effectiveProjectId || effectiveProjectId === "fallback-id") return;
    socket.emit("join_project", effectiveProjectId);

    socket.on("task_updated", (data: { taskId: string; phase: string; projectId: string }) => {
      // v1.2 Fix: Use activeProjectId (or undefined) as context to match the query cache key
      dispatch(
        api.util.updateQueryData("getTasks", activeProjectId || undefined, (draft) => {
          if (!draft || !draft.data) return;
          const task = draft.data.find((t: any) => t.id === data.taskId);
          if (task) {
            task.phase = data.phase;
            let newStatus = "in-progress";
            if (data.phase === "outcome") newStatus = "done";
            if (data.phase === "allocation") newStatus = "pending";
            task.status = newStatus as typeof task.status;
          }
        })
      );
    });

    socket.on("task_locked", (data: { taskId: string; lockedBy: string }) => {
      dispatch(lockTask(data));
    });

    socket.on("task_unlocked", (data: { taskId: string }) => {
      dispatch(unlockTask(data.taskId));
    });

    return () => {
      socket.emit("leave_project", effectiveProjectId);
      socket.off("task_updated");
      socket.off("task_locked");
      socket.off("task_unlocked");
    };
  }, [socket, isConnected, dispatch]);

  /* Re-group tasks into phase columns */
  const phases = useMemo(() => {
    console.log("Floework Board v1.2 Active - Scoped:", activeProjectId);
    const structuredPhases = (initialPhases || []).map((phase) => ({ ...phase, tasks: [] as TaskNode[] }));
    if (response?.data) {
      response.data.forEach((task: TaskNode) => {
        const target = structuredPhases.find((p) => p.id === task.phase) || structuredPhases[0];
        target.tasks.push(task);
      });
    }
    return structuredPhases;
  }, [response]);

  const totalTasks = phases.reduce((sum, p) => sum + p.tasks.length, 0);
  const doneTasks = phases.find((p) => p.id === "outcome")?.tasks.length ?? 0;
  const progressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5 flex flex-col gap-5 relative">
      {/* Onboarding Tooltip Overlay */}
      {showOnboardingTooltip && totalTasks > 0 && (
        <div className="absolute top-1/3 left-1/3 z-50 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl p-4 flex items-start gap-3 max-w-sm relative">
            {/* Pointer arrow */}
            <div className="absolute -bottom-2 left-6 w-4 h-4 bg-slate-900 border-b border-r border-slate-700 rotate-45" />
            
            <div className="w-8 h-8 rounded-full bg-[#007dff]/20 flex items-center justify-center shrink-0">
              <Zap size={16} className="text-[#007dff]" fill="currentColor" />
            </div>
            <div>
              <h4 className="text-[13px] font-semibold text-white mb-1">Start your first session</h4>
              <p className="text-[12px] text-slate-300 mb-3 leading-relaxed">
                Hover over any task card below and click the lightning bolt to start your first focus session. See how Floework tracks your cognitive load.
              </p>
              <button 
                onClick={() => {
                  localStorage.setItem('floework_onboarding_v1_complete', 'true');
                  setShowOnboardingTooltip(false);
                }}
                className="text-[11px] font-bold text-slate-900 bg-white hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold text-slate-900 tracking-tight">
                Task Flow
              </h2>
              {isLoading && (
                <span className="text-[11px] text-slate-400 animate-pulse font-medium">Syncing…</span>
              )}
              {error && (
                <span className="text-[11px] text-amber-500 font-medium">Connection error</span>
              )}
            </div>

            <div className="flex items-center gap-1.5 mt-0.5 group">
              <span className="text-[12px] text-slate-500 font-semibold">
                {activeSprint ? activeSprint.name : (activeSprintId === null ? "Backlog" : "Sprint view")}
              </span>
              <span className="text-[12px] text-slate-400 font-medium">· {totalTasks} tasks</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Predictive Delivery Badge */}
          {prediction && (
            <div
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border shadow-sm group relative cursor-help
                ${prediction.deliveryProbability >= 80
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : prediction.deliveryProbability >= 50
                    ? "bg-amber-50 border-amber-200 text-amber-700"
                    : "bg-red-50 border-red-200 text-red-700"
                }`}
            >
              {prediction.deliveryProbability >= 80 ? (
                <TrendingUp size={14} className="text-emerald-500" />
              ) : prediction.deliveryProbability >= 50 ? (
                <AlertCircle size={14} className="text-amber-500" />
              ) : (
                <TrendingDown size={14} className="text-red-500" />
              )}
              <span className="text-[12px] font-bold tracking-tight">
                {prediction.deliveryProbability}% Predictability
              </span>

              {/* Tooltip for factors */}
              <div className="absolute top-full mt-2 right-0 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-xl p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <p className="text-[11px] font-medium text-slate-300 mb-2">AI Delivery Prediction</p>
                <div className="flex flex-col gap-1.5">
                  {/* v1.1 Defensive Fix: Ensure factors exists */}
                  {(prediction.factors || []).map((f: string, i: number) => (
                    <p key={i} className="text-[11px] text-slate-100 leading-snug flex items-start">
                      <span className="mr-1.5 opacity-50">•</span>
                      <span>{f}</span>
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Sprint progress badge */}
          <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#007dff] rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-[12px] font-semibold text-slate-600">{progressPct}%</span>
          </div>

          {/* Team avatars with presence indicators */}
          <div className="flex -space-x-1.5 px-2">
            {(team || []).slice(0, 4).map((member, idx) => {
              // Mock presence: 1st is in focus, 2nd available, 3rd/4th away
              const status = idx === 0 ? "focus" : idx === 1 ? "available" : "offline";
              return (
                <div key={member.id} className="relative group">
                  <div
                    className={`w-7 h-7 rounded-full ${member.color} flex items-center justify-center text-[10px] font-bold text-slate-700 border-2 border-white shadow-sm ring-offset-1 
                      ${status === "focus" ? "ring-2 ring-[#007dff] animate-pulse-soft" : ""}
                    `}
                    title={`${member.name} (${status === "focus" ? "In Focus" : status === "available" ? "Available" : "Offline"})`}
                  >
                    {member.initials}
                  </div>
                  {/* Presence dot */}
                  <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white
                    ${status === "focus" ? "bg-[#007dff]" : status === "available" ? "bg-emerald-500" : "bg-slate-300"}
                  `} />
                </div>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            <button
              className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-colors text-slate-500"
              title="Filter"
            >
              <Filter size={15} />
            </button>
            <button
              onClick={() => setViewMode(viewMode === "kanban" ? "calendar" : "kanban")}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${viewMode === "calendar"
                ? "bg-[#007dff]/10 text-[#007dff]"
                : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                }`}
              title="Toggle View"
            >
              {viewMode === "kanban" ? <Calendar size={15} /> : <ListTodo size={15} />}
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-[12px] font-semibold bg-[#007dff] text-white hover:bg-[#0070e8] transition-colors shadow-sm shadow-[#007dff]/20"
            >
              <Plus size={13} /> New Task
            </button>
          </div>
        </div>
      </div>

      {/* ── Board / Calendar / Empty State ───────────────────────── */}
      {totalTasks === 0 && !isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-6 shadow-sm">
            <Zap size={28} className="text-slate-200" fill="currentColor" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">A calm space for work</h3>
          <p className="text-[14px] text-slate-400 max-w-[280px] mx-auto mb-8 font-medium italic">
            "Eliminate noise. Decide what matters. Watch how it unfolds."
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="h-12 px-6 rounded-2xl bg-[#007dff] text-white font-semibold text-[14px] shadow-lg shadow-[#007dff]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Create your first task
          </button>
        </div>
      ) : viewMode === "kanban" ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {(phases || []).map((phase, i) => (
            <PhaseColumn
              key={phase.id}
              phase={phase}
              isLast={i === (phases?.length || 0) - 1}
              onTaskClick={onTaskClick}
            />
          ))}
        </div>
      ) : (
        <TaskCalendarView tasks={response?.data || []} onTaskClick={onTaskClick} />
      )}

      <TaskCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        projectId={effectiveProjectId}
      />
    </div>
  );
};

export default FlowBoard;
