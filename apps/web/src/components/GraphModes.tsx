import React from 'react';
import { Network, Flame, Link2, AlertTriangle } from 'lucide-react';

export type GraphMode = 'default' | 'critical_path' | 'heatmap' | 'density' | 'blocker';

interface GraphModesProps {
  currentMode: GraphMode;
  onModeChange: (mode: GraphMode) => void;
}

const GraphModes = ({ currentMode, onModeChange }: GraphModesProps) => {
  const modes = [
    { id: 'default', label: 'Default', icon: Network },
    { id: 'critical_path', label: 'Critical Path', icon: AlertTriangle },
    { id: 'heatmap', label: 'Execution Heatmap', icon: Flame },
    { id: 'density', label: 'Dependency Density', icon: Link2 },
    { id: 'blocker', label: 'Blocker Cascade', icon: AlertTriangle }, // Reusing icon for demo
  ] as const;

  return (
    <div className="absolute top-4 left-4 z-10 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 flex flex-col gap-1">
      {modes.map(mode => {
        const Icon = mode.icon;
        const isActive = currentMode === mode.id;
        
        return (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id as GraphMode)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
              isActive 
                ? 'bg-[#007dff] text-white shadow-md shadow-[#007dff]/20' 
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title={mode.label}
          >
            <Icon size={14} />
            {mode.label}
          </button>
        );
      })}
    </div>
  );
};

export default GraphModes;
