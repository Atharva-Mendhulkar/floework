import { team } from "@/data/mockData";
import { phases as initialPhases } from "@/data/mockData";
import type { TaskNode } from "@/data/mockData";
import PhaseColumn from "./PhaseColumn";
import { Plus, Calendar, ListTodo, Filter, Zap } from "lucide-react";
import { useGetTasksQuery, api } from "@/store/api";
import { useMemo, useEffect, useState } from "react";
import { useSocket } from "@/modules/socket/SocketContext";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "@/store";
import { lockTask, unlockTask } from "@/store/slices/projectSlice";
import { TaskCreateModal } from "./TaskCreateModal";
import { TaskCalendarView } from "./TaskCalendarView";

interface FlowBoardProps {
  onTaskClick?: (task: TaskNode) => void;
}

const FlowBoard = ({ onTaskClick }: FlowBoardProps) => {
  const { data: response, isLoading, error } = useGetTasksQuery();
  const { socket, isConnected } = useSocket();
  const dispatch = useDispatch<AppDispatch>();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "calendar">("kanban");

  const staticProjectId = "d5b480c4-ce88-4a96-aeae-7386b436a8ac";

  /* WebSocket subscription */
  useEffect(() => {
    if (!socket || !isConnected) return;
    socket.emit("join_project", staticProjectId);

    socket.on("task_updated", (data: { taskId: string; phase: string; projectId: string }) => {
      dispatch(
        api.util.updateQueryData("getTasks", undefined, (draft) => {
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
      socket.emit("leave_project", staticProjectId);
      socket.off("task_updated");
      socket.off("task_locked");
      socket.off("task_unlocked");
    };
  }, [socket, isConnected, dispatch]);

  /* Re-group tasks into phase columns */
  const phases = useMemo(() => {
    const structuredPhases = initialPhases.map((phase) => ({ ...phase, tasks: [] as TaskNode[] }));
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
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5 flex flex-col gap-5">
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
            <p className="text-[12px] text-slate-400 font-medium">Sprint 14 · {totalTasks} tasks</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
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

          {/* Team avatars */}
          <div className="flex -space-x-2">
            {team.slice(0, 4).map((member) => (
              <div
                key={member.id}
                className={`w-7 h-7 rounded-full ${member.color} flex items-center justify-center text-[10px] font-bold text-slate-700 border-2 border-white`}
                title={member.name}
              >
                {member.initials}
              </div>
            ))}
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

      {/* ── Board / Calendar ─────────────────────────────────────── */}
      {viewMode === "kanban" ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {phases.map((phase, i) => (
            <PhaseColumn
              key={phase.id}
              phase={phase}
              isLast={i === phases.length - 1}
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
        projectId={staticProjectId}
      />
    </div>
  );
};

export default FlowBoard;
