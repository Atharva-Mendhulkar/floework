import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, ChevronDown, CheckCircle, Target, ArrowRight, Check, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import ExecutionCausalityStrip, { type NodeId } from "@/components/ExecutionCausalityStrip";

import Reveal from "@/components/Reveal";

interface FloatingAvatarProps {
    id?: string;
    img: string;
    delay: string;
    top?: string;
    left?: string;
    right?: string;
    bottom?: string;
    anim: string;
    rotate: number;
    color?: string;
}

function FloatingAvatar({
    img,
    delay,
    top,
    left,
    right,
    bottom,
    anim,
    rotate,
    color,
}: FloatingAvatarProps) {
    return (
        <div
            className="absolute z-10 hidden sm:flex pointer-events-none"
            style={{
                top,
                left,
                right,
                bottom,
            }}
        >
            {/* Floating wrapper: ONLY this moves */}
            <div
                className="relative w-[72px] h-[72px]"
                style={{
                    animation: `${anim} 6s ease-in-out infinite`,
                    animationDelay: delay,
                    willChange: "transform",
                }}
            >
                {/* ONE clean circle */}
                <div
                    className="
                        absolute inset-0
                        rounded-full
                        bg-white
                        border border-slate-200
                        shadow-[0_8px_24px_rgba(15,23,42,0.10)]
                    "
                />

                {/* Mascot */}
                <img
                    src={img}
                    alt="floework teammate"
                    className="
                        absolute
                        inset-0
                        z-10
                        w-full
                        h-full
                        object-contain
                        pointer-events-none
                    "
                    style={{
                        transform: "scale(1.15)",
                        transformOrigin: "center",
                    }}
                    loading="eager"
                    decoding="async"
                    draggable={false}
                />

                {/* Arrow, intentionally outside */}
                <div
                    className="
                        absolute
                        z-20
                        bottom-[-6px]
                        right-[-6px]
                        w-6
                        h-6
                        pointer-events-none
                    "
                    style={{
                        transform: `rotate(${rotate}deg)`,
                        filter: "drop-shadow(0 3px 4px rgba(15,23,42,0.20))",
                    }}
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-full h-full"
                    >
                        <path
                            d="M5.5 3L19 11.5L12 13.5L9 21L5.5 3Z"
                            fill={color || "#007dff"}
                            stroke="white"
                            strokeWidth="2"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>
            </div>
        </div>
    );
}

// ─── Main Landing Page
export default function LandingPage() {
    const navigate = useNavigate();
    // Active node for ExecutionCausalityStrip — controls section scrolling
    const [activeNode, setActiveNode] = useState<NodeId>("focus");
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 24);

        handleScroll();
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <div className="min-h-screen bg-background font-sans selection:bg-focus/20 text-foreground overflow-x-hidden relative">
            <style>{`
        .bg-grid-pattern {
          background-image: 
            linear-gradient(to right, hsl(var(--border) / 0.4) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--border) / 0.4) 1px, transparent 1px);
          background-size: 5rem 5rem;
          background-position: center top;
        }

        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }

        @keyframes swayA {
            0%, 100% {
                transform: translateY(0);
            }
            50% {
                transform: translateY(-5px);
            }
        }

        @keyframes swayB {
            0%, 100% {
                transform: translateY(0);
            }
            50% {
                transform: translateY(5px);
            }
        }

        @keyframes swayC {
            0%, 100% {
                transform: translateY(0);
            }
            50% {
                transform: translateY(-4px);
            }
        }

        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .anim-up-1 { animation: slideUpFade 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both; }
        .anim-up-2 { animation: slideUpFade 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both; }
        .anim-up-3 { animation: slideUpFade 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both; }
        .anim-up-4 { animation: slideUpFade 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.4s both; }
      `}</style>

            {/* ─── Hero Section with Neon Glow ─────────────────────────────────────────── */}
            {/* min-h-screen ensures the strip below is hidden on first load */}
            <div className="relative w-full overflow-hidden bg-white min-h-[100svh] pb-20 pt-4 sm:pt-8 md:min-h-screen md:pb-40 md:pt-10 flex flex-col">

                {/* Vibrant Glowing Ambient Background (Iru AI style) */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
                    <div className="absolute top-[18%] left-[-40%] h-[340px] w-[340px] rounded-full bg-purple-500/20 blur-[90px] mix-blend-multiply opacity-70 animate-pulse sm:left-[-10%] sm:h-[600px] sm:w-[600px] sm:blur-[120px]"></div>
                    <div className="absolute top-[8%] right-[-45%] h-[320px] w-[320px] rounded-full bg-cyan-400/20 blur-[80px] mix-blend-multiply opacity-60 sm:right-[-5%] sm:h-[500px] sm:w-[500px] sm:blur-[100px]"></div>
                    <div className="absolute bottom-[-18%] left-[10%] h-[320px] w-[420px] rounded-full bg-orange-500/15 blur-[90px] mix-blend-multiply opacity-60 sm:bottom-[-10%] sm:left-[20%] sm:h-[500px] sm:w-[700px] sm:blur-[120px]"></div>
                    <div className="absolute top-[44%] right-[4%] h-[260px] w-[260px] rounded-full bg-emerald-400/20 blur-[80px] mix-blend-multiply opacity-50 sm:right-[20%] sm:h-[400px] sm:w-[400px] sm:blur-[100px]"></div>

                    {/* Vertical light rays simulation */}
                    <div className="absolute top-1/2 left-1/4 w-[1px] h-[60vh] -translate-y-1/2 bg-gradient-to-b from-transparent via-purple-400/30 to-transparent blur-[2px] shadow-[0_0_20px_10px_rgba(168,85,247,0.2)]"></div>
                    <div className="absolute top-1/2 left-1/2 w-[1px] h-[50vh] -translate-y-1/2 bg-gradient-to-b from-transparent via-orange-500/40 to-transparent blur-[2px] shadow-[0_0_30px_15px_rgba(249,115,22,0.2)]"></div>
                    <div className="absolute top-1/2 right-1/4 w-[1px] h-[70vh] -translate-y-1/2 bg-gradient-to-b from-transparent via-cyan-400/30 to-transparent blur-[2px] shadow-[0_0_20px_10px_rgba(34,211,238,0.2)]"></div>
                </div>

                {/* ─── Navbar */}
                <nav className={`relative z-50 transition-all duration-300 ${isScrolled ? "sticky top-0 py-3 md:py-4" : "py-4 md:py-5"}`}>
                    <div
                        className={`max-w-7xl mx-auto flex items-center justify-between gap-3 transition-all duration-300 ${
                            isScrolled
                                ? "rounded-full border border-white/60 bg-white/55 px-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-5"
                                : "px-4 sm:px-6"
                        }`}
                    >
                        <div className="flex-1">
                            <span className="font-bold text-2xl tracking-tight text-foreground sm:text-3xl">floework<span className="text-[#007dff]">.</span></span>
                        </div>

                        <div className="hidden md:flex flex-1 justify-center items-center gap-8 text-[15px] font-medium text-text-secondary">
                            <button onClick={() => navigate("/philosophy")} className="hover:text-foreground transition-colors">Philosophy</button>
                            <button onClick={() => navigate("/features")} className="hover:text-foreground transition-colors">Features</button>
                            <button onClick={() => navigate("/design")} className="hover:text-foreground transition-colors">Design</button>
                        </div>

                        <div className="flex flex-1 justify-end items-center gap-3">
                            <Button variant="ghost" className="h-9 px-3 rounded-full text-xs text-foreground hover:bg-slate-100 hover:text-foreground font-medium sm:h-10 sm:px-5 sm:text-sm" onClick={() => navigate("/login")}>
                                Log In
                            </Button>
                            <Button className="h-9 px-4 rounded-full bg-[#007dff] text-xs text-white hover:bg-[#007dff]/90 font-medium shadow-md shadow-[#007dff]/20 sm:h-10 sm:px-6 sm:text-sm" onClick={() => navigate("/register")}>
                                Start Now
                            </Button>
                        </div>
                    </div>
                </nav>

                {/* ─── Hero Content */}
                <div className="relative z-20 max-w-[800px] mx-auto text-center mt-14 px-4 sm:mt-16 sm:px-6 md:mt-24">

                    <div className="anim-up-1 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-border shadow-sm mb-6 sm:px-4 md:mb-8">
                        <img src="/favicon.svg" alt="floework" className="w-4 h-4 rounded-sm" />
                        <span className="text-[10px] font-bold tracking-wider uppercase text-text-secondary sm:text-[11px]">Task-anchored focus</span>
                    </div>

                    <h1 className="anim-up-2 text-[40px] leading-[1.05] sm:text-[52px] md:text-[72px] font-semibold text-foreground tracking-tight mb-5 md:mb-6">
                        Human-Aware <br />
                        <span className="relative inline-block text-[#007dff]">
                            Productivity.
                            <svg className="absolute -bottom-2 md:-bottom-3 left-0 w-full" viewBox="0 0 200 12" fill="none" preserveAspectRatio="none">
                                <path d="M2 10C50 4 150 2 198 8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.3" />
                            </svg>
                        </span>
                    </h1>

                    <p className="anim-up-3 text-base sm:text-lg md:text-xl text-text-secondary max-w-[680px] mx-auto leading-relaxed font-medium mb-8 md:mb-10">
                        floework models work as a causal chain, not a list of static tickets. Replace context switching and process blindness with unified execution.
                    </p>

                    <div className="anim-up-4 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                        <Button className="h-12 px-6 rounded-2xl bg-[#007dff] text-white hover:bg-[#007dff]/90 text-[15px] font-medium w-full shadow-xl shadow-[#007dff]/20 sm:h-14 sm:w-auto sm:px-8 sm:text-[17px]" onClick={() => navigate("/register")}>
                            Start for Free
                        </Button>
                        <Button variant="outline" className="h-12 px-6 rounded-2xl bg-background border-border text-foreground hover:bg-slate-50 hover:text-foreground text-[15px] font-medium w-full shadow-sm sm:h-14 sm:w-auto sm:px-8 sm:text-[17px]" onClick={() => navigate("/login")}>
                            Get a Demo
                        </Button>
                    </div>
                </div>

                {/* Top Left */}
                <FloatingAvatar
                    id="one"
                    img="/assets/one.png"
                    delay="0s"
                    anim="swayC"
                    rotate={-45}
                    color="#007dff"
                    top="15%"
                    left="9%"
                />

                {/* Top Right */}
                <FloatingAvatar
                    id="two"
                    img="/assets/two.png"
                    delay="1s"
                    anim="swayA"
                    rotate={45}
                    color="#10b981"
                    top="16%"
                    right="9%"
                />

                {/* Bottom Left */}
                <FloatingAvatar
                    id="three"
                    img="/assets/three.png"
                    delay="0.5s"
                    anim="swayB"
                    rotate={-110}
                    color="#8b5cf6"
                    bottom="11%"
                    left="13%"
                />

                {/* Bottom Right */}
                <FloatingAvatar
                    id="four"
                    img="/assets/four.png"
                    delay="1.5s"
                    anim="swayC"
                    rotate={110}
                    color="#ef4444"
                    bottom="13%"
                    right="13%"
                />
            </div>

            {/* ExecutionCausalityStrip — title + systems-diagram strip */}
            <div className="w-full bg-white py-10 px-4 text-center border-b border-slate-100 sm:px-6 sm:py-12 md:py-16">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 sm:text-[11px]">Mental Model</p>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight leading-tight">
                    The Causal Model of Work
                </h2>
                <p className="text-slate-400 mt-3 text-sm sm:text-[15px] max-w-[320px] sm:max-w-md mx-auto leading-relaxed">
                    Every outcome is explained by what happened upstream.
                </p>
            </div>
            <ExecutionCausalityStrip
                activeNode={activeNode}
                onNodeChange={setActiveNode}
                scrollTargets={{
                    focus: "section-vs",
                    effort: "section-vs",
                    progress: "section-vs",
                    outcomes: "section-vs",
                }}
            />



            {/* ─── Features Section (Bento Grid Replica) ─────────────────────────────────────────── */}
            <section id="section-features" className="py-16 px-4 bg-white pt-20 sm:px-6 sm:py-20 md:py-24 md:pt-32">
                <div className="max-w-[1100px] mx-auto text-center mb-10 md:mb-16">
                    <Reveal>
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-slate-200 bg-slate-50 mb-6 md:mb-8">
                            <CheckCircle size={14} className="text-[#007dff]" />
                            <span className="text-[11px] font-bold tracking-wider uppercase text-text-secondary">THE SOLUTION</span>
                        </div>
                        <h2 className="text-3xl sm:text-4xl md:text-[44px] font-medium text-foreground tracking-tight leading-tight mb-5 max-w-2xl mx-auto">
                            The full causal chain. <br /> Focus to Outcome.
                        </h2>
                        <p className="text-base md:text-[17px] text-text-secondary max-w-2xl mx-auto leading-relaxed font-medium">
                            We model Focus → Effort → Task Progress → Team Outcome natively within the platform.
                        </p>
                    </Reveal>
                </div>

                {/* Bento Grid */}
                <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-5">

                    {/* Top Left: Deep work */}
                    <div className="md:col-span-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] p-6 flex flex-col justify-between shadow-sm sm:p-8 md:rounded-[2rem] md:p-10">
                        <Reveal from="left">
                            <h3 className="text-2xl font-medium text-foreground mb-4">Deep work, isolated</h3>
                            <p className="text-text-secondary font-medium mb-10 leading-relaxed">
                                Tasks are the anchor unit. Focus sessions are first-class entities. floework removes the noise so you can actually do the work.
                            </p>
                            <Button className="w-fit h-12 px-6 rounded-xl bg-[#007dff] text-white hover:bg-[#007dff]/90 font-medium">
                                Try a Session
                            </Button>
                        </Reveal>
                    </div>

                    {/* Top Right: Analytics Mockup */}
                    <div className="md:col-span-7 bg-slate-50 border border-slate-200 rounded-[1.5rem] p-2 pt-8 px-3 flex justify-center items-end overflow-hidden shadow-sm sm:px-6 md:rounded-[2rem] md:px-10 md:pt-10">
                        <Reveal from="right" delay={100}>
                            {/* Mockup Window */}
                            <div className="bg-white w-full max-w-[500px] rounded-t-xl shadow-lg border border-slate-200 border-b-0 p-6 pb-0">
                                <div className="flex items-center justify-between mb-8">
                                    <span className="font-semibold text-sm flex items-center gap-1 text-foreground">Effort vs Outcome <ChevronDown size={14} /></span>
                                    <div className="flex -space-x-2">
                                        <img src="https://i.pravatar.cc/150?img=1" className="w-6 h-6 rounded-full border-2 border-white" alt="Team" />
                                        <img src="https://i.pravatar.cc/150?img=2" className="w-6 h-6 rounded-full border-2 border-white" alt="Team" />
                                        <img src="https://i.pravatar.cc/150?img=3" className="w-6 h-6 rounded-full border-2 border-white" alt="Team" />
                                    </div>
                                </div>
                                {/* Bar Chart Mockup - adjusted colors for Floework */}
                                <div className="flex items-end justify-between h-[180px] px-2 gap-3 relative pb-6 border-b border-slate-100">
                                    <div className="absolute left-0 top-0 h-full flex flex-col justify-between items-start text-[10px] font-bold text-slate-400 pb-6 w-8">
                                        <span>10h</span><span>6h</span><span>2h</span><span>0</span>
                                    </div>
                                    <div className="w-8 ml-6 h-[40%] bg-slate-100 rounded-t-sm"></div>
                                    <div className="w-8 h-[60%] bg-slate-100 rounded-t-sm"></div>
                                    <div className="w-8 h-[30%] bg-slate-100 rounded-t-sm"></div>
                                    <div className="w-8 h-[85%] bg-[#007dff] rounded-t-sm"></div> {/* Active Bar */}
                                    <div className="w-8 h-[45%] bg-slate-100 rounded-t-sm"></div>
                                    <div className="w-8 h-[75%] bg-slate-100 rounded-t-sm"></div>
                                    <div className="w-8 h-[35%] bg-slate-100 rounded-t-sm"></div>
                                </div>
                            </div>
                        </Reveal>
                    </div>

                    {/* Bottom Left: Presences/Smart Notifications Mockup */}
                    <div className="md:col-span-6 bg-slate-50 border border-slate-200 rounded-[1.5rem] p-6 pb-0 overflow-hidden flex flex-col shadow-sm sm:p-8 sm:pb-0 md:rounded-[2rem] md:p-10 md:pb-0">
                        <Reveal from="left" delay={150}>
                            <h3 className="text-2xl font-medium text-foreground mb-4">Non-invasive visibility</h3>
                            <p className="text-text-secondary font-medium mb-8 leading-relaxed max-w-sm">
                                Real-time presence shows who's focused and what they're working on, without surveillance or productivity scores.
                            </p>

                            <div className="bg-white w-full rounded-t-xl shadow-lg border border-slate-200 border-b-0">
                                <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                                    <span className="font-semibold text-sm text-foreground">Visibility settings</span>
                                </div>
                                <div className="p-5 space-y-5">
                                    {[
                                        { label: "Share current task when focusing", active: true },
                                        { label: "Share exact timer duration", active: false },
                                        { label: "Publish session note on completion", active: true },
                                    ].map((row, i) => (
                                        <div key={i} className={`flex justify-between items-center gap-4`}>
                                            <span className="text-[13px] font-medium text-text-secondary leading-snug">{row.label}</span>
                                            <div className={`w-9 h-5 rounded-full flex items-center p-0.5 ${row.active ? 'bg-[#007dff] justify-end' : 'bg-slate-200 justify-start'}`}>
                                                <div className="w-4 h-4 rounded-full bg-white shadow-sm"></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Reveal>
                    </div>

                    {/* Bottom Right: Task Management Mockup */}
                    <div className="md:col-span-6 bg-slate-50 border border-slate-200 rounded-[1.5rem] p-6 pb-0 overflow-hidden flex flex-col shadow-sm sm:p-8 sm:pb-0 md:rounded-[2rem] md:p-10 md:pb-0">
                        <Reveal from="right" delay={200}>
                            <h3 className="text-2xl font-medium text-foreground mb-4">Task linkage</h3>
                            <p className="text-text-secondary font-medium mb-8 leading-relaxed max-w-sm">
                                Every focus session attaches directly to a Kanban card, linking the cognitive cost directly to the delivered outcome.
                            </p>

                            <div className="bg-white w-full rounded-t-xl shadow-lg border border-slate-200 border-b-0">
                                <div className="p-5 border-b border-slate-100 flex justify-between items-center gap-3">
                                    <span className="font-semibold text-[15px] text-foreground truncate">Task: Implement OAuth</span>
                                    <span className="text-[10px] sm:text-[11px] font-bold px-2 sm:px-3 py-1 bg-emerald-50 border border-emerald-100 rounded flex items-center gap-1 text-emerald-600 shrink-0">In Progress</span>
                                </div>
                                <div className="p-5 space-y-6">

                                    {/* Activity Item 1 */}
                                    <div className="flex gap-3">
                                        <img src="https://i.pravatar.cc/150?img=12" className="w-8 h-8 rounded-full" alt="User" />
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm font-semibold text-foreground">Bill Sanders</span>
                                                <span className="text-xs text-text-muted">Completed 45m focus</span>
                                            </div>
                                            <p className="text-[13px] text-slate-500 font-medium leading-relaxed bg-slate-100/50 p-4 rounded-xl rounded-tl-none border border-slate-200">
                                                "Got the Google provider working. Next up is Github."
                                            </p>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </Reveal>
                    </div>

                </div>
            </section>

            {/* ─── Disruptive Features Section ─────────────────────────────────────────── */}
            <section className="py-20 px-4 bg-slate-50 relative overflow-hidden border-t border-slate-200 sm:px-6 md:py-32">

                {/* Soft background glow to match hero */}
                <div className="absolute top-0 inset-x-0 h-[400px] bg-gradient-to-b from-[#007dff]/5 to-transparent pointer-events-none"></div>

                <div className="max-w-[1280px] mx-auto relative z-10">
                    <Reveal>
                        <div className="text-center mb-12 max-w-3xl mx-auto md:mb-24">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border mb-5 md:mb-6">
                                <span className="text-[11px] font-bold tracking-wider uppercase text-text-secondary">EXECUTION INTELLIGENCE</span>
                            </div>
                            <h2 className="text-3xl sm:text-4xl md:text-[52px] font-medium text-foreground tracking-tight leading-[1.1] mb-5 md:mb-6">
                                Not just another tracker.<br />An execution observatory.
                            </h2>
                            <p className="text-base md:text-[19px] text-text-secondary leading-relaxed font-medium">
                                We moved past static spreadsheets and chat rooms. floework is built on a real-time Execution Graph.
                            </p>
                        </div>
                    </Reveal>

                    <div className="space-y-8 max-w-[1100px] mx-auto">

                        {/* ROW 1: EXECUTION GRAPH / TASK REPLAY */}
                        <Reveal from="bottom" delay={0}>
                            <div className="group flex flex-col md:flex-row bg-surface border border-border rounded-[1.5rem] p-4 overflow-hidden shadow-sm transition-all hover:shadow-md hover:border-focus/30 md:rounded-[2rem] md:pr-10">
                                {/* Visual side */}
                                <div className="w-full md:w-[45%] bg-background rounded-2xl border border-border p-4 sm:p-6 flex items-center justify-center relative overflow-hidden h-[260px] sm:h-[300px]">

                                    {/* Default State */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center transition-opacity duration-500 group-hover:opacity-0 bg-white">
                                        <div className="w-20 h-20 mb-6 bg-indigo-50 border border-indigo-100 rounded-3xl flex items-center justify-center shadow-inner">
                                            <Target size={32} className="text-indigo-500" />
                                        </div>
                                        <p className="text-slate-800 font-semibold mb-2 text-xl drop-shadow-sm">The Execution Graph</p>
                                        <p className="text-sm text-slate-500 leading-relaxed font-medium">
                                            "A continuous, causal ledger of exactly how work unfolds over time."
                                        </p>
                                    </div>

                                    {/* Hover State (Task Replay Timeline Mockup) */}
                                    <div className="absolute inset-0 bg-background flex flex-col items-center justify-center p-6 opacity-0 translate-y-8 transition-all duration-500 group-hover:opacity-100 group-hover:translate-y-0">
                                        <div className="w-full max-w-sm bg-surface border border-border rounded-xl shadow-lg p-5">
                                            <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
                                                <span className="font-semibold text-sm text-foreground">Task Replay</span>
                                                <span className="text-[10px] uppercase font-bold text-[#007dff] bg-[#007dff]/10 px-2 py-1 rounded">Live</span>
                                            </div>

                                            <div className="relative pl-6 space-y-4 before:absolute before:inset-y-0 before:left-2.5 before:w-px before:bg-border">
                                                <div className="relative">
                                                    <div className="absolute -left-6 w-5 h-5 bg-background border-2 border-[#007dff] rounded-full flex items-center justify-center">
                                                        <div className="w-2 h-2 bg-[#007dff] rounded-full"></div>
                                                    </div>
                                                    <p className="text-xs font-semibold text-foreground">Focus Session Logged</p>
                                                    <p className="text-[11px] text-text-muted mt-1">45m duration • 2 interrupts</p>
                                                </div>
                                                <div className="relative">
                                                    <div className="absolute -left-6 w-5 h-5 bg-background border-2 border-amber-500 rounded-full flex items-center justify-center">
                                                        <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                                    </div>
                                                    <p className="text-xs font-semibold text-foreground">Status Change</p>
                                                    <p className="text-[11px] text-text-muted mt-1">Moved to In Progress</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                                {/* Text side */}
                                <div className="w-full md:w-[55%] flex flex-col justify-center px-1 py-8 md:pl-10 md:py-10">
                                    <h3 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight mb-4">Task Execution Replay</h3>
                                    <p className="text-base md:text-[17px] text-text-secondary leading-relaxed font-medium">
                                        Tasks aren't just cards that move left to right. Every focus session, status change, and blocker is logged to our Execution Graph. Click any task to instantly replay its entire history chronologically, exactly as it happened.
                                    </p>
                                </div>
                            </div>
                        </Reveal>

                        {/* ROW 2: COGNITIVE LOAD */}
                        <Reveal from="bottom" delay={100}>
                            <div className="group flex flex-col md:flex-row-reverse bg-surface border border-border rounded-[1.5rem] p-4 overflow-hidden shadow-sm transition-all hover:shadow-md hover:border-focus/30 md:rounded-[2rem] md:pl-10">
                                {/* Visual side */}
                                <div className="w-full md:w-[45%] bg-background rounded-2xl border border-border p-4 sm:p-6 flex items-center justify-center relative overflow-hidden h-[260px] sm:h-[300px]">

                                    {/* Default State */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center transition-opacity duration-500 group-hover:opacity-0 bg-white">
                                        <div className="w-20 h-20 mb-6 bg-rose-50 border border-rose-100 rounded-3xl flex items-center justify-center shadow-inner">
                                            <Zap size={32} className="text-rose-500" fill="currentColor" />
                                        </div>
                                        <p className="text-rose-900 font-semibold mb-2 text-xl drop-shadow-sm">Cognitive Load Monitoring</p>
                                        <p className="text-sm text-rose-900/60 leading-relaxed font-medium">
                                            "We measure physiological burden, not just hours in a seat."
                                        </p>
                                    </div>

                                    {/* Hover State (Burnout Mockup) */}
                                    <div className="absolute inset-0 bg-background flex flex-col items-center justify-center p-6 opacity-0 translate-y-8 transition-all duration-500 group-hover:opacity-100 group-hover:translate-y-0">
                                        <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 relative overflow-hidden">
                                            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 to-rose-500"></div>
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Burnout Risk Factors</span>
                                                <span className="text-sm font-bold text-rose-400">High (72%)</span>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/50 flex items-start gap-2">
                                                    <span className="text-amber-500 mt-0.5">•</span>
                                                    <span className="text-[11px] text-slate-300 leading-snug font-medium">Excessive context switching (Avg session &lt; 12m)</span>
                                                </div>
                                                <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/50 flex items-start gap-2">
                                                    <span className="text-rose-500 mt-0.5">•</span>
                                                    <span className="text-[11px] text-slate-300 leading-snug font-medium">After-hours penalty: High weekend execution</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                                {/* Text side */}
                                <div className="w-full md:w-[55%] flex flex-col justify-center px-1 py-8 md:pr-10 md:py-10">
                                    <h3 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight mb-4">Protecting the Human Element</h3>
                                    <p className="text-base md:text-[17px] text-text-secondary leading-relaxed font-medium mb-3">
                                        Our analytics go beyond basic time tracking to model actual cognitive burden. The system automatically detects burnout risks by penalizing fragmented micro-sessions and out-of-hours volume spikes.
                                    </p>
                                    <p className="text-base md:text-[17px] text-text-secondary leading-relaxed font-medium">
                                        Using historic data, floework pinpoints your optimal peak Deep Work windows and safely locks them directly into your Google Calendar.
                                    </p>
                                </div>
                            </div>
                        </Reveal>

                        {/* ROW 3: PREDICTIVE DELIVERY */}
                        <Reveal from="bottom" delay={200}>
                            <div className="group flex flex-col md:flex-row bg-surface border border-border rounded-[1.5rem] p-4 overflow-hidden shadow-sm transition-all hover:shadow-md hover:border-focus/30 md:rounded-[2rem] md:pr-10">
                                {/* Visual side */}
                                <div className="w-full md:w-[45%] bg-background rounded-2xl border border-border p-4 sm:p-6 flex items-center justify-center relative overflow-hidden h-[260px] sm:h-[300px]">

                                    {/* Default State */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center transition-opacity duration-500 group-hover:opacity-0 bg-white">
                                        <div className="w-20 h-20 mb-6 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-center justify-center shadow-inner">
                                            <Calendar size={32} className="text-emerald-500" />
                                        </div>
                                        <p className="text-emerald-900 font-semibold mb-2 text-xl drop-shadow-sm">Predictive Delivery Engine</p>
                                        <p className="text-sm text-emerald-900/60 leading-relaxed font-medium">
                                            "Solving the fundamental disconnect between estimated effort and actual capacity."
                                        </p>
                                    </div>

                                    {/* Hover State (Prediction Badge Mockup) */}
                                    <div className="absolute inset-0 bg-background flex flex-col items-center justify-center p-6 opacity-0 translate-y-8 transition-all duration-500 group-hover:opacity-100 group-hover:translate-y-0">
                                        <div className="w-full max-w-sm flex flex-col items-center">
                                            <div className="bg-amber-50 border border-amber-200 rounded-xl shadow-md p-4 w-full mb-3 text-center">
                                                <div className="flex items-center justify-center gap-2 mb-2">
                                                    <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse"></span>
                                                    <span className="text-amber-700 font-bold text-[15px]">54% Predictability</span>
                                                </div>
                                                <p className="text-xs text-amber-700/80 font-medium">Sprint Slippage Risk Detected</p>
                                            </div>

                                            <div className="w-full bg-surface border border-border pl-4 pr-4 py-3 rounded-xl shadow-sm space-y-2">
                                                <p className="text-[11px] text-text-secondary font-medium">✓ Trailing 4-week capacity averages 42 focus hours/week.</p>
                                                <p className="text-[11px] text-amber-600 font-semibold border-t border-border pt-2">⚠ Required priority effort exceeds historical team capacity.</p>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                                {/* Text side */}
                                <div className="w-full md:w-[55%] flex flex-col justify-center px-1 py-8 md:pl-10 md:py-10">
                                    <h3 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight mb-4">Autonomous Calibration & Delivery</h3>
                                    <p className="text-base md:text-[17px] text-text-secondary leading-relaxed font-medium mb-3">
                                        Stop guessing your capacity. Our Auto-Calibrating Estimation Engine learns your personal effort biases (e.g., "frontend tasks typically take you 1.5x longer than estimated") and dynamically generates coaching hints at task creation.
                                    </p>
                                    <p className="text-base md:text-[17px] text-text-secondary leading-relaxed font-medium">
                                        Meanwhile, the Predictive Delivery Engine flags systemic sprint risks caused by external forces like PR Wait-Times mapped natively from GitHub Webhooks.
                                    </p>
                                </div>
                            </div>
                        </Reveal>

                    </div>
                </div>
            </section>



            <section id="section-pricing" className="py-20 px-4 bg-slate-50 sm:px-6 md:py-32">
                <div className="max-w-[1100px] mx-auto">
                    <div className="text-center mb-10 md:mb-16">
                        <Reveal>
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-slate-200 bg-white mb-6 md:mb-8">
                                <img src="/favicon.svg" alt="floework" className="w-4 h-4 rounded-sm" />
                                <span className="text-[11px] font-bold tracking-wider uppercase text-text-secondary">PRICING</span>
                            </div>
                            <h2 className="text-3xl sm:text-4xl md:text-[44px] font-medium text-foreground tracking-tight leading-tight mb-5">
                                Simple, transparent pricing.
                            </h2>
                            <p className="text-base md:text-[17px] text-text-secondary max-w-2xl mx-auto leading-relaxed font-medium">
                                Start solo or with your team. No hidden fees.
                            </p>
                        </Reveal>
                    </div>

                    <div className="max-w-md mx-auto">
                        <Reveal>
                            <div className="bg-white border-2 border-[#007dff] rounded-[24px] p-6 shadow-xl shadow-[#007dff]/5 relative overflow-hidden sm:p-8 md:rounded-[32px] md:p-10">
                                <div className="absolute top-0 right-0 bg-[#007dff] text-white px-4 py-1 rounded-bl-xl text-[10px] font-bold uppercase tracking-widest">
                                    Current Plan
                                </div>
                                <h3 className="text-2xl font-bold text-foreground mb-2">Free for individuals</h3>
                                <p className="text-slate-500 font-medium mb-8">Upgrade for advanced team analytics.</p>

                                <div className="flex items-baseline gap-1 mb-8">
                                    <span className="text-4xl md:text-5xl font-bold text-foreground">$0</span>
                                    <span className="text-slate-400 font-medium">/month</span>
                                </div>

                                <ul className="space-y-4 mb-10">
                                    {[
                                        "Unlimited local focus sessions",
                                        "Basic task management",
                                        "Core causal analytics",
                                        "Community support"
                                    ].map((feature) => (
                                        <li key={feature} className="flex items-center gap-3 text-slate-600 font-medium">
                                            <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                                <Check size={12} className="text-emerald-600" />
                                            </div>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                <Button className="w-full h-14 rounded-2xl bg-[#007dff] text-white hover:bg-[#007dff]/90 text-[17px] font-semibold" onClick={() => navigate("/register")}>
                                    Get Started
                                </Button>
                            </div>
                        </Reveal>
                    </div>
                </div>
            </section>

            <footer className="bg-[#f7f8fa] border-t border-slate-200 py-12 px-4 sm:px-8 md:py-14">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-12">

                    {/* Left: Branding */}
                    <div className="max-w-xs">
                        <div className="flex items-center gap-1 mb-4">
                            <span className="font-bold text-3xl tracking-tight text-slate-900">floework<span className="text-[#007dff]">.</span></span>
                        </div>
                        <p className="text-slate-500 text-sm leading-relaxed mt-1">
                            Human-aware productivity.
                        </p>
                    </div>

                    {/* Right: Two columns of arrow-links */}
                    <div className="flex gap-10 sm:gap-16 md:gap-24">
                        <div>
                            <ul className="space-y-4 text-[14px]">
                                {[
                                    { name: "About Us", path: "/about" },
                                    { name: "Contact", path: "/contact" },
                                    { name: "Philosophy", path: "/philosophy" }
                                ].map((item) => (
                                    <li key={item.name}>
                                        <button onClick={() => navigate(item.path)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors group">
                                            <ArrowRight size={13} className="text-slate-400 group-hover:text-[#007dff] transition-colors shrink-0" />
                                            {item.name}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <ul className="space-y-4 text-[14px]">
                                {[
                                    { name: "Features", path: "/features" },
                                    { name: "Design", path: "/design" }
                                ].map((item) => (
                                    <li key={item.name}>
                                        <button onClick={() => navigate(item.path)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors group">
                                            <ArrowRight size={13} className="text-slate-400 group-hover:text-[#007dff] transition-colors shrink-0" />
                                            {item.name}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                </div>

                {/* Copyright bar */}
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 mt-12 pt-6 border-t border-slate-200 text-slate-400 text-[13px]">
                    <p>© {new Date().getFullYear()}. All rights reserved.</p>
                    <div className="flex items-center gap-6">
                        <button onClick={() => navigate("/privacy")} className="hover:text-slate-600 transition-colors">Privacy Policy</button>
                        <button onClick={() => navigate("/terms")} className="hover:text-slate-600 transition-colors">Terms of Service</button>
                    </div>
                </div>
            </footer>
        </div>
    );
}
