import { phases, team } from "@/data/mockData";
import type { TaskNode } from "@/data/mockData";
import PhaseColumn from "./PhaseColumn";
import { Plus, Upload, Calendar } from "lucide-react";

interface FlowBoardProps {
  onTaskClick?: (task: TaskNode) => void;
}

const FlowBoard = ({ onTaskClick }: FlowBoardProps) => {
  return (
    <div className="bg-surface rounded-2xl shadow-card p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">
          Sprint 14 — Task Flow
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex -space-x-2">
            {team.map((member) => (
              <div
                key={member.id}
                className={`w-8 h-8 rounded-full ${member.color} flex items-center justify-center text-xs font-semibold text-foreground border-2 border-surface`}
                title={member.name}
              >
                {member.initials}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-secondary transition-colors text-text-secondary">
              <Plus size={16} />
            </button>
            <button className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-secondary transition-colors text-text-secondary">
              <Upload size={16} />
            </button>
            <button className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-secondary transition-colors text-text-secondary">
              <Calendar size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {phases.map((phase, i) => (
          <PhaseColumn
            key={phase.id}
            phase={phase}
            isLast={i === phases.length - 1}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>
    </div>
  );
};

export default FlowBoard;
