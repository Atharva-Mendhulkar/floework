import type { Phase } from "@/data/mockData";
import type { TaskNode } from "@/data/mockData";
import TaskNodeCard from "./TaskNodeCard";
import { Plus } from "lucide-react";
import { useUpdateTaskMutation } from "@/store/api";
import { useSocket } from "@/modules/socket/SocketContext";

interface PhaseColumnProps {
  phase: Phase;
  isLast?: boolean;
  onTaskClick?: (task: TaskNode) => void;
}

const PhaseColumn = ({ phase, isLast, onTaskClick }: PhaseColumnProps) => {
  const [updateTask] = useUpdateTaskMutation();
  const { socket } = useSocket();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // allow drop
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    const fromPhaseId = e.dataTransfer.getData("fromPhaseId");
    const projectId = e.dataTransfer.getData("projectId");

    if (taskId && fromPhaseId && fromPhaseId !== phase.id) {

      // Determine new status based on drop column
      let newStatus = "in-progress";
      if (phase.id === "outcome") newStatus = "done";
      if (phase.id === "allocation") newStatus = "pending";

      // 1. Persist to DB
      await updateTask({ id: taskId, phase: phase.id, status: newStatus });

      // 2. Broadcast to other WebSocket clients
      if (socket) {
        socket.emit("task_moved", { taskId, projectId, phase: phase.id });
      }
    }
  };

  return (
    <div className="flex flex-col flex-1 min-w-[220px]">
      <div
        className="relative bg-secondary/60 border border-border rounded-2xl p-3 flex flex-col gap-2 min-h-[150px]"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {phase.tasks.map((task) => (
          <TaskNodeCard
            key={task.id}
            task={task}
            phaseId={phase.id}
            onClick={onTaskClick}
          />
        ))}
        <button className="flex items-center justify-center gap-1 text-text-muted text-xs py-1.5 rounded-xl hover:bg-secondary transition-colors mt-auto">
          <Plus size={14} /> Add
        </button>
      </div>
      <p className="text-xs font-medium text-text-secondary text-center mt-3">
        {phase.title}
      </p>
    </div>
  );
};

export default PhaseColumn;
