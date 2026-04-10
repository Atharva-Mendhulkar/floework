import { useGetStabilityGridQuery } from "@/store/api";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = [6, 8, 10, 12, 14, 16, 18, 20];

function scoreToColor(score: number): string {
    if (score === 0) return "#f1f5f9";
    if (score < 0.3) return "#bfdbfe";
    if (score < 0.6) return "#60a5fa";
    return "#007dff";
}

const FocusStabilityMap = () => {
    const { data: res, isLoading } = useGetStabilityGridQuery();
    const slots = res?.data ?? [];

    // Build a lookup map
    const grid: Record<string, number> = {};
    for (const slot of slots) {
        grid[`${slot.dayOfWeek}-${slot.hourOfDay}`] = slot.focusScore;
    }

    const peak = slots.length > 0
        ? slots.reduce((best: any, s: any) => (s.focusScore > (best?.focusScore ?? 0) ? s : best), null)
        : null;

    return (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-[13px] font-semibold text-slate-900">Focus Stability Map</h3>
                    <p className="text-[11px] text-slate-400">Your uninterrupted focus windows by day & hour</p>
                </div>
                {peak && (
                    <div className="text-right">
                        <p className="text-[10px] text-slate-400 font-medium">Peak Window</p>
                        <p className="text-[12px] font-semibold text-[#007dff]">
                            {DAY_LABELS[peak.dayOfWeek]} {peak.hourOfDay}:00
                        </p>
                    </div>
                )}
            </div>

            {isLoading ? (
                <div className="h-32 bg-slate-50 rounded-xl animate-pulse" />
            ) : slots.length === 0 ? (
                <div className="h-32 flex items-center justify-center rounded-xl border border-dashed border-slate-200">
                    <p className="text-[12px] text-slate-400 font-medium text-center px-4">
                        No focus data yet. Complete sessions to generate your stability map.
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <div className="flex gap-2 min-w-max">
                        {/* Day labels column */}
                        <div className="flex flex-col gap-1 pt-5">
                            {DAY_LABELS.map((day) => (
                                <div key={day} className="h-6 flex items-center">
                                    <span className="text-[10px] text-slate-400 font-medium w-7 text-right">{day}</span>
                                </div>
                            ))}
                        </div>

                        {/* Grid */}
                        <div className="flex flex-col gap-1">
                            {/* Hour headers */}
                            <div className="flex gap-1">
                                {HOURS.map((h) => (
                                    <div key={h} className="w-6 text-center">
                                        <span className="text-[9px] text-slate-300 font-medium">{h}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Cells */}
                            {DAY_LABELS.map((_, dayIdx) => (
                                <div key={dayIdx} className="flex gap-1">
                                    {HOURS.map((hour) => {
                                        const score = grid[`${dayIdx}-${hour}`] ?? 0;
                                        const isPeak = peak?.dayOfWeek === dayIdx && peak?.hourOfDay === hour;
                                        return (
                                            <div
                                                key={hour}
                                                title={`${DAY_LABELS[dayIdx]} ${hour}:00 — ${score > 0 ? (score * 100).toFixed(0) + '%' : 'No data'}`}
                                                className={`w-6 h-6 rounded-[4px] cursor-pointer transition-all hover:scale-110 ${isPeak ? 'ring-2 ring-[#007dff] ring-offset-1' : ''}`}
                                                style={{ background: scoreToColor(score) }}
                                            />
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-2 mt-3">
                        <span className="text-[10px] text-slate-400 font-medium">Less</span>
                        {[0, 0.15, 0.4, 0.7, 1].map((v) => (
                            <div key={v} className="w-4 h-4 rounded-[3px]" style={{ background: scoreToColor(v) }} />
                        ))}
                        <span className="text-[10px] text-slate-400 font-medium">More</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FocusStabilityMap;
