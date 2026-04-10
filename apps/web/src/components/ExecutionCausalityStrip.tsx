import { useState, useEffect, useCallback } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────
export type NodeId = "focus" | "effort" | "progress" | "outcomes";

export interface ScrollTargets {
    focus?: string;
    effort?: string;
    progress?: string;
    outcomes?: string;
}

interface ExecutionCausalityStripProps {
    activeNode: NodeId;
    onNodeChange: (node: NodeId) => void;
    scrollTargets?: ScrollTargets;
}

// ─── Canonical node data — no placeholders ─────────────────────────────────
const NODES: {
    id: NodeId;
    label: string;
    secondary: string;
    index: number;
}[] = [
        {
            id: "focus",
            index: 0,
            label: "Focus State",
            secondary:
                "When meaningful work is cognitively possible.\nTracks availability, not behavior.",
        },
        {
            id: "effort",
            index: 1,
            label: "Effort Signals",
            secondary:
                "Execution patterns inferred from sustained work,\nnot self-reported time.",
        },
        {
            id: "progress",
            index: 2,
            label: "Task Progress",
            secondary:
                "Tasks advance when execution conditions are met,\nnot when status is updated.",
        },
        {
            id: "outcomes",
            index: 3,
            label: "Team Outcomes",
            secondary:
                "Delivery patterns explained by upstream execution,\nnot post-hoc reporting.",
        },
    ];

const ORDER: NodeId[] = ["focus", "effort", "progress", "outcomes"];

// ─── ExecutionCausalityStrip ──────────────────────────────────────────────
export default function ExecutionCausalityStrip({
    activeNode,
    onNodeChange,
    scrollTargets = {},
}: ExecutionCausalityStripProps) {
    const [paused, setPaused] = useState(false);
    const [progressPct, setProgressPct] = useState(0);

    // Auto-advance every 5 seconds
    useEffect(() => {
        if (paused) return;

        // Reset progress bar for new node
        setProgressPct(0);

        const DURATION = 1500; // 1s per node
        const TICK = 50; // update every 50ms
        const step = (TICK / DURATION) * 100;

        const interval = setInterval(() => {
            setProgressPct((prev) => {
                if (prev + step >= 100) {
                    // Advance to next node
                    const currentIdx = ORDER.indexOf(activeNode);
                    const nextIdx = (currentIdx + 1) % ORDER.length;
                    onNodeChange(ORDER[nextIdx]);
                    return 0;
                }
                return prev + step;
            });
        }, TICK);

        return () => clearInterval(interval);
    }, [activeNode, paused, onNodeChange]);

    function handleNodeClick(id: NodeId) {
        onNodeChange(id);
        setProgressPct(0);
        // Scroll if mapped
        const targetId = scrollTargets[id];
        if (targetId) {
            document.getElementById(targetId)?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        }
    }

    const active = NODES.find((n) => n.id === activeNode) ?? NODES[0];
    const activeIdx = ORDER.indexOf(activeNode);

    return (
        <section
            className="w-full bg-white border-b border-slate-100 py-20 px-6"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            <div className="max-w-5xl mx-auto flex flex-col gap-16">

                {/* ── Node selector strip ──────────────────────────────── */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0">
                    {NODES.map((node, idx) => {
                        const isActive = node.id === activeNode;
                        const isPast = idx < activeIdx;

                        return (
                            <div key={node.id} className="flex items-center">
                                {/* Node button */}
                                <button
                                    onClick={() => handleNodeClick(node.id)}
                                    className="flex flex-col items-center gap-1.5 group"
                                    aria-pressed={isActive}
                                >
                                    {/* Step number dot */}
                                    <div
                                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[12px] font-bold transition-all duration-300
                      ${isActive
                                                ? "border-[#007dff] bg-[#007dff] text-white"
                                                : isPast
                                                    ? "border-[#007dff] bg-[#007dff]/10 text-[#007dff]"
                                                    : "border-slate-300 bg-white text-slate-400"
                                            }`}
                                    >
                                        {idx + 1}
                                    </div>
                                    {/* Label */}
                                    <span
                                        className={`text-[13px] tracking-wide font-medium transition-colors duration-200
                      ${isActive ? "text-[#007dff]" : isPast ? "text-[#007dff]/60" : "text-slate-400"}`}
                                    >
                                        {node.label}
                                    </span>
                                </button>

                                {/* Connecting line between nodes */}
                                {idx < NODES.length - 1 && (
                                    <div className="hidden md:block flex-1 mx-4 md:mx-6 h-px bg-slate-200 w-16 lg:w-28 relative overflow-hidden">
                                        {/* Filled portion for past/active transitions */}
                                        <div
                                            className="absolute left-0 top-0 h-full bg-[#007dff]/40 transition-all duration-300"
                                            style={{ width: isPast ? "100%" : isActive ? `${progressPct}%` : "0%" }}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* ── Full progress bar ─────────────────────────────────── */}
                {/* Shows precisely how long until next node advances */}
                <div className="w-full h-0.5 bg-slate-100 rounded-full overflow-hidden -mt-10">
                    <div
                        className="h-full bg-[#007dff]/50 transition-none"
                        style={{ width: `${((activeIdx + progressPct / 100) / NODES.length) * 100}%` }}
                    />
                </div>

                {/* ── Large active node panel ───────────────────────────── */}
                <div
                    key={activeNode} /* key forces re-mount for CSS animation */
                    className="animate-[fadeSlideUp_0.4s_ease-out_both]"
                    style={{
                        animation: "fadeSlideUp 0.4s ease-out both",
                    }}
                >
                    {/* Inline keyframe via style tag */}
                    <style>{`
            @keyframes fadeSlideUp {
              from { opacity: 0; transform: translateY(16px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>

                    <div className="flex flex-col md:flex-row gap-12 items-start">
                        {/* Left: step counter + label */}
                        <div className="shrink-0">
                            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                                Step {activeIdx + 1} of {NODES.length}
                            </p>
                            <h2 className="text-4xl md:text-5xl font-semibold text-slate-900 tracking-tight leading-tight mb-2">
                                {active.label}
                            </h2>
                            {/* Accent underline */}
                            <div className="w-10 h-0.5 bg-[#007dff] mt-4" />
                        </div>

                        {/* Right: secondary text + auto-timer indicator */}
                        <div className="flex-1">
                            <p className="text-[17px] md:text-xl text-slate-500 font-normal leading-relaxed whitespace-pre-line max-w-lg mt-2">
                                {active.secondary}
                            </p>

                            {/* Pause/play hint */}
                            <p className="text-[11px] text-slate-300 mt-8 font-medium tracking-wide">
                                {paused ? "▐▌ Paused — move cursor away to resume" : "▶ Auto-advancing · hover to pause"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── Caption ───────────────────────────────────────────── */}
                <p className="text-[13px] text-slate-400 font-normal text-center leading-relaxed tracking-wide border-t border-slate-100 pt-8">
                    floework models productivity as a causal system — not a collection of tools.
                </p>
            </div>
        </section>
    );
}
