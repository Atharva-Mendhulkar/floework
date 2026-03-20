import { ArrowLeft, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Reveal } from "@/components/Reveal"; // Using shared reveal component

const PhilosophyPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-[#007dff]/20">
            {/* Minimal Nav */}
            <nav className="border-b border-slate-100 py-4 px-6 sticky top-0 bg-white/80 backdrop-blur-md z-50">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-[14px] font-medium text-slate-500 hover:text-slate-900 transition-colors"
                    >
                        <ArrowLeft size={16} /> Back
                    </button>
                    <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => navigate("/")}>
                        <Zap size={14} className="text-[#007dff]" fill="#007dff" />
                        <span className="font-bold text-[15px] tracking-tight">
                            floework<span className="text-[#007dff]">.</span>
                        </span>
                    </div>
                </div>
            </nav>

            <main className="max-w-[700px] mx-auto px-6 py-20 md:py-32">
                <Reveal>
                    <header className="mb-16 text-center">
                        <p className="text-[13px] font-bold text-[#007dff] uppercase tracking-widest mb-4">Manifesto</p>
                        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.15] mb-6">
                            Human-Aware Productivity.
                        </h1>
                        <p className="text-xl text-slate-500 leading-relaxed font-medium">
                            Why we built a system that models work as a causal chain, rather than a list of static tickets.
                        </p>
                    </header>
                </Reveal>

                <div className="prose prose-slate prose-lg max-w-none space-y-12 text-slate-700 leading-relaxed font-medium">
                    <Reveal>
                        <section>
                            <h2 className="text-2xl font-semibold text-slate-900 mb-4 tracking-tight">1. Background</h2>
                            <p className="mb-4">
                                Modern software teams rely on multiple tools for managing work and collaboration. Commonly used platforms include tools for documentation and planning, team communication, task tracking, and time logging.
                            </p>
                            <p className="mb-4">
                                While each tool is effective in isolation, their combined usage introduces fragmentation across focus, execution, and visibility. Teams commonly experience excessive context switching, invisible individual effort, burnout caused by misaligned expectations, and a lack of causal linkage between work done and outcomes delivered.
                            </p>
                            <p>
                                floework was proposed as a single integrated SaaS platform that unifies task execution, collaboration, and personal productivity — with a core focus on human cognitive limits and sustainable execution.
                            </p>
                        </section>
                    </Reveal>

                    <Reveal>
                        <section>
                            <h2 className="text-2xl font-semibold text-slate-900 mb-4 tracking-tight">2. The Problem Statement</h2>
                            <p className="mb-4">
                                Existing productivity systems optimize for process tracking and managerial visibility, but fundamentally fail to capture focus quality, the cognitive cost of interruptions, or the relationship between effort and task completion.
                            </p>
                            <p className="mb-6">
                                As a result, teams often work harder without shipping faster. They misinterpret delays as inefficiency. They increase pressure, which inevitably leads to burnout.
                            </p>

                            <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl mb-6">
                                <h3 className="text-[15px] font-bold text-slate-900 uppercase tracking-wide mb-3">Limitations of the Current Stack</h3>
                                <ul className="space-y-3 text-[15px] list-none p-0">
                                    <li className="flex gap-3"><span className="text-slate-400 font-bold w-32 shrink-0">Documentation</span> Static and execution-blind.</li>
                                    <li className="flex gap-3"><span className="text-slate-400 font-bold w-32 shrink-0">Communication</span> High interruption, low memory.</li>
                                    <li className="flex gap-3"><span className="text-slate-400 font-bold w-32 shrink-0">Task Tracking</span> Process visibility, but outcome-only.</li>
                                    <li className="flex gap-3"><span className="text-slate-400 font-bold w-32 shrink-0">Time Tracking</span> Manual, invasive, and context-free.</li>
                                </ul>
                            </div>
                            <p>
                                Despite integrations, these tools do not share a unified execution state.
                            </p>
                        </section>
                    </Reveal>

                    <Reveal>
                        <section>
                            <h2 className="text-2xl font-semibold text-slate-900 mb-4 tracking-tight">3. The Causal Model of Work</h2>
                            <p className="mb-6">
                                No existing platform models the full causal chain. We built floework around a very simple, albeit profound realization:
                            </p>

                            <div className="flex items-center justify-center py-10 my-8 border-y border-slate-100 bg-slate-50/50">
                                <p className="text-xl md:text-2xl font-semibold text-slate-900 text-center">
                                    Focus <span className="text-slate-300 mx-2">→</span>
                                    Effort <span className="text-slate-300 mx-2">→</span>
                                    Progress <span className="text-slate-300 mx-2">→</span>
                                    Outcome
                                </p>
                            </div>

                            <p className="mb-4">
                                In floework, tasks are the anchor unit. Focus sessions are first-class entities. Real-time visibility is non-invasive, relying on sustained work patterns rather than screen-recording.
                            </p>
                            <p>
                                By linking focus to tasks, we automatically summarize <em>why</em> things took longer or <em>where</em> friction occurred. Unlike fragmented toolchains, the system models causality between effort and delivery, enabling healthier, more predictable team performance.
                            </p>
                        </section>
                    </Reveal>

                    <Reveal>
                        <section>
                            <h2 className="text-2xl font-semibold text-slate-900 mb-4 tracking-tight">4. Autonomous Execution Intelligence</h2>
                            <p className="mb-4">
                                Beyond modeling focus, floework acts as an intelligent execution layer. By integrating directly with GitHub to flag stalled PRs and auto-calibrating point estimations based on your historical organic effort boundaries, the platform transforms from a passive ledger into an active engineering coach.
                            </p>
                            <p>
                                We prioritize human cognitive limits. The platform tracks your peak cognitive windows historically and generates native `.ics` protection blocks synced directly to your Google Calendar — shielding the human element from systemic sprint burnout automatically. 
                            </p>
                        </section>
                    </Reveal>
                </div>

                <Reveal>
                    <div className="mt-24 pt-10 border-t border-slate-100 text-center">
                        <h3 className="text-2xl font-semibold text-slate-900 mb-6 tracking-tight">Ready to change how your team works?</h3>
                        <button
                            onClick={() => navigate("/register")}
                            className="h-14 px-8 rounded-2xl bg-[#007dff] text-white hover:bg-[#007dff]/90 text-[16px] font-semibold shadow-lg shadow-[#007dff]/20 transition-all"
                        >
                            Start Using floework
                        </button>
                    </div>
                </Reveal>
            </main>
        </div>
    );
};

export default PhilosophyPage;
