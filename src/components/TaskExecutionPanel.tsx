import { useGetTaskSignalsQuery } from "@/store/api";
import { Zap, AlertTriangle, BarChart2, RefreshCw } from "lucide-react";

interface TaskExecutionPanelProps {
    taskId: string;
}

const DensityBar = ({ value }: { value: number }) => {
    const pct = Math.min(100, Math.round(value * 100));
    const color = pct >= 70 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#f87171";
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
            </div>
            <span className="text-[11px] font-semibold tabular-nums" style={{ color }}>{value.toFixed(2)}</span>
        </div>
    );
};

const TaskExecutionPanel = ({ taskId }: TaskExecutionPanelProps) => {
    const { data: res, isLoading } = useGetTaskSignalsQuery(taskId, { skip: !taskId });
    const signal = res?.data;

    if (isLoading) {
        return (
            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100 animate-pulse">
                <div className="h-3 bg-slate-200 rounded w-1/3 mb-3" />
                <div className="h-2 bg-slate-200 rounded w-full mb-2" />
                <div className="h-2 bg-slate-200 rounded w-2/3" />
            </div>
        );
    }

    if (!signal) {
        return (
            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center">
                <BarChart2 size={20} className="mx-auto text-slate-300 mb-2" />
                <p className="text-[12px] text-slate-400 font-medium">Execution signals appear after your first focus session on this task.</p>
            </div>
        );
    }

    const blockerColor = signal.blockerRisk ? "text-red-500 bg-red-50" : "text-emerald-600 bg-emerald-50";
    const velocityColor = signal.progressVelocity === "high"
        ? "text-emerald-600 bg-emerald-50"
        : signal.progressVelocity === "medium"
            ? "text-amber-600 bg-amber-50"
            : "text-red-500 bg-red-50";

    return (
        <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-3">
            <div className="flex items-center gap-1.5">
                <Zap size={13} className="text-[#007dff]" fill="#007dff" />
                <span className="text-[12px] font-semibold text-slate-700">Execution Signals</span>
            </div>

            <div className="flex flex-col gap-2.5">
                <div>
                    <div className="flex justify-between mb-1">
                        <span className="text-[11px] text-slate-500 font-medium">Effort Density</span>
                        <span className="text-[10px] text-slate-400">continuity of focus</span>
                    </div>
                    <DensityBar value={signal.effortDensity} />
                </div>

                <div className="flex gap-2">
                    <div className="flex-1 flex flex-col gap-1 bg-white rounded-lg p-2.5 border border-slate-100">
                        <div className="flex items-center gap-1">
                            <RefreshCw size={11} className="text-slate-400" />
                            <span className="text-[10px] text-slate-500 font-medium">Resume Rate</span>
                        </div>
                        <span className="text-[13px] font-bold text-slate-800">{signal.resumeRate.toFixed(1)}
                            <span className="text-[10px] font-normal text-slate-400 ml-1">per session</span>
                        </span>
                    </div>

                    <div className="flex-1 flex flex-col gap-1 bg-white rounded-lg p-2.5 border border-slate-100">
                        <span className="text-[10px] text-slate-500 font-medium">Progress Velocity</span>
                        <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md self-start capitalize ${velocityColor}`}>
                            {signal.progressVelocity}
                        </span>
                    </div>
                </div>

                <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-100">
                    <div className="flex items-center gap-1.5">
                        <AlertTriangle size={12} className={signal.blockerRisk ? "text-red-500" : "text-emerald-500"} />
                        <span className="text-[11px] text-slate-600 font-medium">Blocker Risk</span>
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${blockerColor}`}>
                        {signal.blockerRisk ? "Detected" : "None"}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default TaskExecutionPanel;
