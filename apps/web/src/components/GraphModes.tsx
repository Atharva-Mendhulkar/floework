import React, { useState } from 'react';
import { Network, Flame, Link2, AlertTriangle, ShieldAlert, ChevronLeft, ChevronRight, Layers } from 'lucide-react';

export type GraphMode = 'default' | 'critical_path' | 'heatmap' | 'density' | 'blocker';

interface GraphModesProps {
  currentMode: GraphMode;
  onModeChange: (mode: GraphMode) => void;
}

const MODES = [
  { 
    id: 'default', 
    label: 'Default Flow', 
    description: 'Standard execution graph by pipeline phase',
    icon: Network 
  },
  { 
    id: 'critical_path', 
    label: 'Critical Path', 
    description: 'Longest sequential chain of unfinished dependencies',
    icon: AlertTriangle 
  },
  { 
    id: 'heatmap', 
    label: 'Execution Heatmap', 
    description: 'Activity heatmap based on completed focus sessions',
    icon: Flame 
  },
  { 
    id: 'density', 
    label: 'Dependency Density', 
    description: 'Visualizes highly connected hub tasks & bottlenecks',
    icon: Link2 
  },
  { 
    id: 'blocker', 
    label: 'Blocker Cascade', 
    description: 'Identifies blocked tasks with pending prerequisites',
    icon: ShieldAlert 
  },
] as const;

const GraphModes: React.FC<GraphModesProps> = ({ currentMode, onModeChange }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const activeModeObj = MODES.find((m) => m.id === currentMode) || MODES[0];
  const ActiveIcon = activeModeObj.icon;

  if (isCollapsed) {
    return (
      <div className="absolute top-4 left-4 z-20 animate-in fade-in slide-in-from-left-2 duration-200">
        <button
          onClick={() => setIsCollapsed(false)}
          className="flex items-center gap-2 px-3 py-2 bg-white/95 backdrop-blur border border-slate-200/90 rounded-xl shadow-md hover:shadow-lg hover:border-slate-300 text-slate-700 transition-all group"
          title="Expand Graph Modes (sidewards arrow)"
          aria-label="Expand graph modes menu"
        >
          <div className="w-6 h-6 rounded-lg bg-[#007dff]/10 text-[#007dff] flex items-center justify-center transition-colors group-hover:bg-[#007dff] group-hover:text-white">
            <ChevronRight size={15} className="transition-transform group-hover:translate-x-0.5" />
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <ActiveIcon size={14} className="text-[#007dff]" />
            <span className="text-slate-900">{activeModeObj.label}</span>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="absolute top-4 left-4 z-20 w-64 bg-white/95 backdrop-blur border border-slate-200/90 rounded-2xl shadow-xl p-3 flex flex-col gap-2 animate-in fade-in slide-in-from-left-3 duration-200">
      {/* Header with Collapsible Sidewards Arrow */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            <Layers size={13} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900">Graph Modes</span>
            <p className="text-[10px] text-slate-400 font-medium">Interactive intelligence</p>
          </div>
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all group"
          title="Collapse menu sideways"
          aria-label="Collapse menu sideways"
        >
          <ChevronLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
        </button>
      </div>

      {/* Modes List */}
      <div className="flex flex-col gap-1">
        {MODES.map((mode) => {
          const Icon = mode.icon;
          const isActive = currentMode === mode.id;

          return (
            <button
              key={mode.id}
              onClick={() => onModeChange(mode.id as GraphMode)}
              className={`flex items-start gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs transition-all ${
                isActive
                  ? 'bg-[#007dff] text-white shadow-md shadow-[#007dff]/25 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
              }`}
            >
              <div className={`mt-0.5 ${isActive ? 'text-white' : 'text-slate-400'}`}>
                <Icon size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="truncate">{mode.label}</span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  )}
                </div>
                <p className={`text-[10px] leading-tight line-clamp-1 mt-0.5 ${
                  isActive ? 'text-white/80' : 'text-slate-400'
                }`}>
                  {mode.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active mode mini footnote */}
      <div className="pt-1 px-1 border-t border-slate-100">
        <p className="text-[10px] text-slate-400 italic leading-snug">
          Tip: Drag between node handles to link new dependency edges.
        </p>
      </div>
    </div>
  );
};

export default GraphModes;
