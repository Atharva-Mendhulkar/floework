import type { Phase } from "@/data/mockData";
import type { TaskNode } from "@/data/mockData";
import TaskNodeCard from "./TaskNodeCard";
import { Plus } from "lucide-react";

interface PhaseColumnProps {
  phase: Phase;
  isLast?: boolean;
  onTaskClick?: (task: TaskNode) => void;
}

const PhaseColumn = ({ phase, isLast, onTaskClick }: PhaseColumnProps) => {
  return (
    <div className="flex flex-col flex-1 min-w-[220px]">
      <div className="relative bg-secondary/60 border border-border rounded-2xl p-3 flex flex-col gap-2">
        {phase.tasks.map((task) => (
          <TaskNodeCard key={task.id} task={task} onClick={onTaskClick} />
        ))}
        <button className="flex items-center justify-center gap-1 text-text-muted text-xs py-1.5 rounded-xl hover:bg-secondary transition-colors">
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
