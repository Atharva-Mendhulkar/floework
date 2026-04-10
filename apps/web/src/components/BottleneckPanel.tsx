import { useGetBottlenecksQuery } from "@/store/api";
import { AlertTriangle, CheckCircle2, Zap, BarChart2 } from "lucide-react";

const scoreColor = (score: number) => {
    if (score >= 70) return { bar: "#f87171", badge: "text-red-500 bg-red-50", label: "High" };
    if (score >= 40) return { bar: "#f59e0b", badge: "text-amber-600 bg-amber-50", label: "Medium" };
    return { bar: "#10b981", badge: "text-emerald-600 bg-emerald-50", label: "Low" };
};

const BottleneckPanel = () => {
    const { data: res, isLoading } = useGetBottlenecksQuery();
    const items = res?.data ?? [];

    return (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-[13px] font-semibold text-slate-900">Bottleneck Report</h3>
                    <p className="text-[11px] text-slate-400">Tasks ranked by execution fragmentation and blocker risk</p>
                </div>
                <BarChart2 size={16} className="text-slate-300 mt-0.5" />
            </div>

            {isLoading && (
                <div className="flex flex-col gap-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-slate-50 rounded-xl animate-pulse" />
                    ))}
                </div>
            )}

            {!isLoading && items.length === 0 && (
                <div className="h-28 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-100">
                    <CheckCircle2 size={20} className="text-emerald-400" />
                    <p className="text-[12px] text-slate-400 font-medium">No bottlenecks detected yet.</p>
                    <p className="text-[11px] text-slate-300">Complete focus sessions to generate the report.</p>
                </div>
            )}

            {!isLoading && items.length > 0 && (
                <div className="flex flex-col gap-2.5">
                    {items.slice(0, 6).map((item: any) => {
                        const c = scoreColor(item.bottleneckScore);
                        return (
                            <div key={item.taskId} className="flex flex-col gap-2 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                        {item.blockerRisk && (
                                            <AlertTriangle size={13} className="text-red-400 shrink-0" />
                                        )}
                                        <span className="text-[12px] font-semibold text-slate-800 truncate">
                                            {item.taskTitle}
                                        </span>
                                    </div>
                                    <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-lg ${c.badge}`}>
                                        {c.label} {item.bottleneckScore}
                                    </span>
                                </div>

                                {/* Score bar */}
                                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all"
                                        style={{ width: `${item.bottleneckScore}%`, background: c.bar }}
                                    />
                                </div>

                                {/* Metrics row */}
                                <div className="flex items-center gap-3 flex-wrap">
                                    <span className="flex items-center gap-1 text-[10px] text-slate-500">
                                        <Zap size={10} className="text-[#007dff]" fill="#007dff" />
                                        Density: <strong className="text-slate-700">{item.effortDensity.toFixed(2)}</strong>
                                    </span>
                                    <span className="text-[10px] text-slate-500">
                                        Sessions: <strong className="text-slate-700">{item.sessionCount}</strong>
                                    </span>
                                    <span className="text-[10px] text-slate-500">
                                        Focus: <strong className="text-slate-700">{item.totalFocusHrs}h</strong>
                                    </span>
                                </div>

                                {/* Recommendation */}
                                <p className="text-[11px] text-slate-500 leading-relaxed italic">
                                    {item.recommendation}
                                </p>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default BottleneckPanel;
