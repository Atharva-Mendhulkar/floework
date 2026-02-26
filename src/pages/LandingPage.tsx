import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Command, MessageSquare, Plus, Bell, Clock, ChevronDown, CheckCircle, Target, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ExecutionCausalityStrip, { type NodeId } from "@/components/ExecutionCausalityStrip";

// ─── Scroll-reveal hook
function useReveal(threshold = 0.15) {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
            { threshold }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, [threshold]);
    return { ref, visible };
}

// ─── Individual reveal wrapper
function Reveal({
    children, delay = 0, from = "bottom",
}: {
    children: React.ReactNode; delay?: number; from?: "bottom" | "left" | "right";
}) {
    const { ref, visible } = useReveal();
    const initial =
        from === "left" ? "translateX(-30px)" :
            from === "right" ? "translateX(30px)" : "translateY(40px)";
    return (
        <div
            ref={ref}
            style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "none" : initial,
                transition: `opacity 0.7s ease ${delay}ms, transform 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) ${delay}ms`,
            }}
            className="w-full"
        >
            {children}
        </div>
    );
}

// ─── Floating Cursor Avatar Component
function FloatingAvatar({ img, delay, top, left, right, bottom, anim, rotate, color }: any) {
    return (
        <div
            className={`absolute z-10 hidden sm:flex pointer-events-none`}
            style={{
                top, left, right, bottom,
                animation: `${anim} 5s ease-in-out infinite`,
                animationDelay: delay,
            }}
        >
            <div className="relative">
                <div className="w-14 h-14 rounded-full border-4 border-background shadow-xl overflow-hidden bg-background">
                    <img src={img} alt="User" className="w-full h-full object-cover" />
                </div>

                {/* Cursor Pointer SVG */}
                <div
                    className="absolute -bottom-2 -right-3 w-6 h-6 drop-shadow-md"
                    style={{ transform: `rotate(${rotate}deg)` }}
                >
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5.5 3L19 11.5L12 13.5L9 21L5.5 3Z" fill={color || "hsl(var(--focus))"} stroke="hsl(var(--background))" strokeWidth="2" strokeLinejoin="round" />
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
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50%      { transform: translateY(-12px) rotate(2deg); }
        }
        @keyframes swayB {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50%      { transform: translateY(10px) rotate(-2deg); }
        }
        @keyframes swayC {
          0%, 100% { transform: translateX(0px) translateY(0px); }
          50%      { transform: translateX(8px) translateY(-8px); }
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
            <div className="relative w-full overflow-hidden bg-white min-h-screen pb-40 pt-10 flex flex-col">

                {/* Vibrant Glowing Ambient Background (Iru AI style) */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
                    <div className="absolute top-[20%] left-[-10%] w-[600px] h-[600px] bg-purple-500/20 blur-[120px] rounded-full mix-blend-multiply opacity-70 animate-pulse"></div>
                    <div className="absolute top-[10%] right-[-5%] w-[500px] h-[500px] bg-cyan-400/20 blur-[100px] rounded-full mix-blend-multiply opacity-60"></div>
                    <div className="absolute bottom-[-10%] left-[20%] w-[700px] h-[500px] bg-orange-500/15 blur-[120px] rounded-full mix-blend-multiply opacity-60"></div>
                    <div className="absolute top-[40%] right-[20%] w-[400px] h-[400px] bg-emerald-400/20 blur-[100px] rounded-full mix-blend-multiply opacity-50"></div>

                    {/* Vertical light rays simulation */}
                    <div className="absolute top-1/2 left-1/4 w-[1px] h-[60vh] -translate-y-1/2 bg-gradient-to-b from-transparent via-purple-400/30 to-transparent blur-[2px] shadow-[0_0_20px_10px_rgba(168,85,247,0.2)]"></div>
                    <div className="absolute top-1/2 left-1/2 w-[1px] h-[50vh] -translate-y-1/2 bg-gradient-to-b from-transparent via-orange-500/40 to-transparent blur-[2px] shadow-[0_0_30px_15px_rgba(249,115,22,0.2)]"></div>
                    <div className="absolute top-1/2 right-1/4 w-[1px] h-[70vh] -translate-y-1/2 bg-gradient-to-b from-transparent via-cyan-400/30 to-transparent blur-[2px] shadow-[0_0_20px_10px_rgba(34,211,238,0.2)]"></div>
                </div>

                {/* ─── Navbar */}
                <nav className="relative z-50 py-5">
                    <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                        <div className="flex-1">
                            <span className="font-bold text-3xl tracking-tight text-foreground">floework<span className="text-[#007dff]">.</span></span>
                        </div>

                        <div className="hidden md:flex flex-1 justify-center items-center gap-8 text-[15px] font-medium text-text-secondary">
                            <button onClick={() => document.getElementById("section-causal")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-foreground transition-colors">Philosophy</button>
                            <button onClick={() => document.getElementById("section-features")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-foreground transition-colors">Features</button>
                            <button onClick={() => document.getElementById("section-vs")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-foreground transition-colors">Pricing</button>
                        </div>

                        <div className="flex flex-1 justify-end items-center gap-3">
                            <Button variant="ghost" className="h-10 px-5 rounded-full text-foreground hover:bg-slate-100 font-medium" onClick={() => navigate("/login")}>
                                Log In
                            </Button>
                            <Button className="h-10 px-6 rounded-full bg-[#007dff] text-white hover:bg-[#007dff]/90 font-medium shadow-md shadow-[#007dff]/20" onClick={() => navigate("/register")}>
                                Start Now
                            </Button>
                        </div>
                    </div>
                </nav>

                {/* ─── Hero Content */}
                <div className="relative z-20 max-w-[800px] mx-auto text-center mt-24 px-6">

                    <div className="anim-up-1 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface border border-border shadow-sm mb-8">
                        <Zap size={14} className="text-[#007dff]" />
                        <span className="text-[11px] font-bold tracking-wider uppercase text-text-secondary">Task-anchored focus</span>
                    </div>

                    <h1 className="anim-up-2 text-[56px] leading-[1.05] md:text-[72px] font-semibold text-foreground tracking-tight mb-6">
                        One tool to manage <br />
                        tasks and <span className="relative inline-block text-[#007dff]">
                            your team
                            <svg className="absolute -bottom-2 md:-bottom-3 left-0 w-full" viewBox="0 0 200 12" fill="none" preserveAspectRatio="none">
                                <path d="M2 10C50 4 150 2 198 8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.3" />
                            </svg>
                        </span>
                    </h1>

                    <p className="anim-up-3 text-lg md:text-xl text-text-secondary max-w-[680px] mx-auto leading-relaxed font-medium mb-10">
                        floework respects human cognitive limits. Connect focused individual work with team-level execution and outcomes, without invasive monitoring.
                    </p>

                    <div className="anim-up-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Button className="h-14 px-8 rounded-2xl bg-[#007dff] text-white hover:bg-[#007dff]/90 text-[17px] font-medium w-full sm:w-auto shadow-xl shadow-[#007dff]/20" onClick={() => navigate("/register")}>
                            Start for Free
                        </Button>
                        <Button variant="outline" className="h-14 px-8 rounded-2xl bg-background border-border text-foreground hover:bg-surface text-[17px] font-medium w-full sm:w-auto shadow-sm" onClick={() => navigate("/login")}>
                            Get a Demo
                        </Button>
                    </div>
                </div>

                {/* ─── Floating Avatars */}
                {/* Top Left */}
                <FloatingAvatar color="#3b82f6" img="https://i.pravatar.cc/150?img=5" delay="0s" anim="swayC" rotate={-45} top="18%" left="12%" />
                {/* Top Right */}
                <FloatingAvatar color="#10b981" img="https://i.pravatar.cc/150?img=11" delay="1s" anim="swayA" rotate={45} top="20%" right="12%" />
                {/* Bottom Left */}
                <FloatingAvatar color="#8b5cf6" img="https://i.pravatar.cc/150?img=43" delay="0.5s" anim="swayB" rotate={-110} bottom="10%" left="18%" />
                {/* Bottom Right */}
                <FloatingAvatar color="#f43f5e" img="https://i.pravatar.cc/150?img=68" delay="1.5s" anim="swayC" rotate={110} bottom="15%" right="18%" />
            </div>

            {/* ExecutionCausalityStrip — title + systems-diagram strip */}
            <div className="w-full bg-white py-16 px-6 text-center border-b border-slate-100">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">Mental Model</p>
                <h2 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight leading-tight">
                    The Causal Model of Work
                </h2>
                <p className="text-slate-400 mt-3 text-[15px] max-w-md mx-auto leading-relaxed">
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
            <section id="section-features" className="py-24 px-6 bg-white pt-32">
                <div className="max-w-[1100px] mx-auto text-center mb-16">
                    <Reveal>
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-slate-200 bg-slate-50 mb-8">
                            <CheckCircle size={14} className="text-[#007dff]" />
                            <span className="text-[11px] font-bold tracking-wider uppercase text-text-secondary">THE SOLUTION</span>
                        </div>
                        <h2 className="text-4xl md:text-[44px] font-medium text-foreground tracking-tight leading-tight mb-5 max-w-2xl mx-auto">
                            The full causal chain. <br /> Focus to Outcome.
                        </h2>
                        <p className="text-[17px] text-text-secondary max-w-2xl mx-auto leading-relaxed font-medium">
                            We model Focus → Effort → Task Progress → Team Outcome natively within the platform.
                        </p>
                    </Reveal>
                </div>

                {/* Bento Grid */}
                <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-5">

                    {/* Top Left: Deep work */}
                    <div className="md:col-span-5 bg-slate-50 border border-slate-200 rounded-[2rem] p-10 flex flex-col justify-between shadow-sm">
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
                    <div className="md:col-span-7 bg-slate-50 border border-slate-200 rounded-[2rem] p-2 pt-10 px-10 flex justify-center items-end overflow-hidden shadow-sm">
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
                    <div className="md:col-span-6 bg-slate-50 border border-slate-200 rounded-[2rem] p-10 pb-0 overflow-hidden flex flex-col shadow-sm">
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
                                        <div key={i} className={`flex justify-between items-center`}>
                                            <span className="text-[13px] font-medium text-text-secondary">{row.label}</span>
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
                    <div className="md:col-span-6 bg-slate-50 border border-slate-200 rounded-[2rem] p-10 pb-0 overflow-hidden flex flex-col shadow-sm">
                        <Reveal from="right" delay={200}>
                            <h3 className="text-2xl font-medium text-foreground mb-4">Task linkage</h3>
                            <p className="text-text-secondary font-medium mb-8 leading-relaxed max-w-sm">
                                Every focus session attaches directly to a Kanban card, linking the cognitive cost directly to the delivered outcome.
                            </p>

                            <div className="bg-white w-full rounded-t-xl shadow-lg border border-slate-200 border-b-0">
                                <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                                    <span className="font-semibold text-[15px] text-foreground">Task: Implement OAuth</span>
                                    <span className="text-[11px] font-bold px-3 py-1 bg-emerald-50 border border-emerald-100 rounded flex items-center gap-1 text-emerald-600">In Progress</span>
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

            {/* ─── Horizontal VS Competitors Section ─────────────────────────────────────────── */}
            <section className="py-32 px-6 bg-slate-50 relative overflow-hidden border-t border-slate-200">

                {/* Soft background glow to match hero */}
                <div className="absolute top-0 inset-x-0 h-[400px] bg-gradient-to-b from-orange-500/5 to-transparent pointer-events-none"></div>

                <div className="max-w-[1280px] mx-auto relative z-10">
                    <Reveal>
                        <div className="text-center mb-24 max-w-3xl mx-auto">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border mb-6">
                                <span className="text-[11px] font-bold tracking-wider uppercase text-text-secondary">THE DIFFERENCE</span>
                            </div>
                            <h2 className="text-4xl md:text-[52px] font-medium text-foreground tracking-tight leading-[1.1] mb-6">
                                Not just another tool.<br />A completely new layer.
                            </h2>
                            <p className="text-[19px] text-text-secondary leading-relaxed font-medium">
                                Why existing tools break under pressure, and how Floework fixes the root cause natively.
                            </p>
                        </div>
                    </Reveal>

                    <div className="space-y-8 max-w-[1100px] mx-auto">

                        {/* ROW 1: VS JIRA */}
                        <Reveal from="bottom" delay={0}>
                            <div className="group flex flex-col md:flex-row bg-surface border border-border rounded-[2rem] p-4 pr-10 overflow-hidden shadow-sm transition-all hover:shadow-md hover:border-focus/30">
                                {/* Visual side */}
                                <div className="w-full md:w-[45%] bg-background rounded-2xl border border-border p-6 flex items-center justify-center relative overflow-hidden h-[300px]">

                                    {/* Default State (Jira) */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center transition-opacity duration-500 group-hover:opacity-0 bg-white">
                                        <img src="/competitors/jira-logo.png" alt="Jira" className="w-28 h-28 md:w-36 md:h-36 object-contain mb-5 drop-shadow-sm" />
                                        <p className="text-slate-800 font-semibold mb-2 text-lg">Process Tracking</p>
                                        <p className="text-sm text-slate-500 leading-relaxed font-medium">
                                            "Cards move right, but no one knows what's actually happening right now. It's outcome-only visibility."
                                        </p>
                                    </div>

                                    {/* Hover State (Floework Mockup) */}
                                    <div className="absolute inset-0 bg-background flex flex-col items-center justify-center p-6 opacity-0 translate-y-8 transition-all duration-500 group-hover:opacity-100 group-hover:translate-y-0">
                                        <div className="w-full max-w-sm bg-surface border border-border rounded-xl shadow-lg p-5">
                                            <div className="flex items-center gap-3 mb-4">
                                                <img src="https://i.pravatar.cc/150?img=11" className="w-10 h-10 rounded-full" alt="User" />
                                                <div>
                                                    <p className="text-sm font-semibold text-foreground">Alex is focusing</p>
                                                    <p className="text-xs text-[#007dff] font-medium flex items-center gap-1"><Zap size={10} fill="currentColor" /> Active for 45m</p>
                                                </div>
                                            </div>
                                            <div className="bg-background border border-border rounded-lg p-3">
                                                <p className="text-xs text-text-muted font-medium mb-1 uppercase tracking-wider">Anchored Task</p>
                                                <p className="text-sm font-medium text-foreground">Implement Auth Middleware</p>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                                {/* Text side */}
                                <div className="w-full md:w-[55%] flex flex-col justify-center pl-10 py-10">
                                    <h3 className="text-3xl font-semibold text-foreground tracking-tight mb-4">Live Execution &gt; Static Tickets</h3>
                                    <p className="text-[17px] text-text-secondary leading-relaxed font-medium">
                                        Unlike Jira, floework anchors effort directly to tasks in real-time. Instead of asking "what's the status?", you automatically see exactly where focus is being deployed right now without interrupting anyone.
                                    </p>
                                </div>
                            </div>
                        </Reveal>

                        {/* ROW 2: VS SLACK */}
                        <Reveal from="bottom" delay={100}>
                            <div className="group flex flex-col md:flex-row-reverse bg-surface border border-border rounded-[2rem] p-4 pl-10 overflow-hidden shadow-sm transition-all hover:shadow-md hover:border-focus/30">
                                {/* Visual side */}
                                <div className="w-full md:w-[45%] bg-background rounded-2xl border border-border p-6 flex items-center justify-center relative overflow-hidden h-[300px]">

                                    {/* Default State (Slack) */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center transition-opacity duration-500 group-hover:opacity-0 bg-white">
                                        <img src="/competitors/Slack-Logo.png" alt="Slack" className="w-24 h-24 md:w-32 md:h-32 object-contain mb-6 drop-shadow-md" />
                                        <p className="text-[#4A154B] font-semibold mb-2 text-xl drop-shadow-sm">High-Noise Communication</p>
                                        <p className="text-sm text-indigo-900/60 leading-relaxed font-medium">
                                            "Constant pings, scattered context, and immediate pressure to respond. Focus is shattered daily."
                                        </p>
                                    </div>

                                    {/* Hover State (Floework Mockup) */}
                                    <div className="absolute inset-0 bg-background flex flex-col items-center justify-center p-6 opacity-0 translate-y-8 transition-all duration-500 group-hover:opacity-100 group-hover:translate-y-0">
                                        <div className="w-full max-w-sm bg-surface border border-border rounded-xl shadow-lg">
                                            <div className="p-4 border-b border-border flex justify-between items-center bg-background rounded-t-xl">
                                                <span className="text-sm font-semibold text-foreground">Post-Session Note</span>
                                            </div>
                                            <div className="p-5 space-y-4 bg-surface rounded-b-xl">
                                                <div className="flex gap-3">
                                                    <div className="w-8 h-8 rounded bg-[#007dff]/10 text-[#007dff] flex items-center justify-center shrink-0">
                                                        <CheckCircle size={14} />
                                                    </div>
                                                    <p className="text-[13px] text-text-secondary font-medium leading-relaxed">
                                                        "Finished the database migration. Added the script to the repo. Ready for review."
                                                    </p>
                                                </div>
                                                <div className="pt-2 flex justify-end">
                                                    <span className="text-[10px] uppercase font-bold text-text-muted bg-background border border-border px-2 py-1 rounded">Attached to Task</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                                {/* Text side */}
                                <div className="w-full md:w-[55%] flex flex-col justify-center pr-10 py-10">
                                    <h3 className="text-3xl font-semibold text-foreground tracking-tight mb-4">Async Context &gt; Interruptions</h3>
                                    <p className="text-[17px] text-text-secondary leading-relaxed font-medium">
                                        Unlike Slack, floework doesn't rely on immediate chat for alignment. Post-session notes automatically attach to the task, providing rich, contextual updates that the team can read entirely async.
                                    </p>
                                </div>
                            </div>
                        </Reveal>

                        {/* ROW 3: VS NOTION */}
                        <Reveal from="bottom" delay={200}>
                            <div className="group flex flex-col md:flex-row bg-surface border border-border rounded-[2rem] p-4 pr-10 overflow-hidden shadow-sm transition-all hover:shadow-md hover:border-focus/30">
                                {/* Visual side */}
                                <div className="w-full md:w-[45%] bg-background rounded-2xl border border-border p-6 flex items-center justify-center relative overflow-hidden h-[300px]">

                                    {/* Default State (Notion) */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center transition-opacity duration-500 group-hover:opacity-0 bg-white">
                                        <img src="/competitors/notion-logo.png" alt="Notion" className="w-20 h-20 md:w-24 md:h-24 object-contain mb-5 drop-shadow-sm" />
                                        <p className="text-stone-800 font-semibold mb-2 text-xl drop-shadow-sm">Execution Blindness</p>
                                        <p className="text-sm text-stone-500 leading-relaxed font-medium">
                                            "Beautiful docs, but completely disconnected from the actual work. It's a static repository, not an engine."
                                        </p>
                                    </div>

                                    {/* Hover State (Floework Mockup) */}
                                    <div className="absolute inset-0 bg-background flex flex-col items-center justify-center p-6 opacity-0 translate-y-8 transition-all duration-500 group-hover:opacity-100 group-hover:translate-y-0">
                                        <div className="w-full max-w-sm bg-surface border border-border rounded-xl shadow-lg p-5">
                                            <div className="flex items-center gap-2 mb-6">
                                                <div className="w-2 h-2 rounded-full bg-[#007dff] animate-pulse"></div>
                                                <span className="text-sm font-semibold text-foreground">Effort Insight</span>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="h-6 w-full rounded bg-muted/60 relative overflow-hidden">
                                                    <div className="absolute top-0 left-0 h-full w-[80%] bg-[#007dff]/30 border-r-2 border-[#007dff]"></div>
                                                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground z-10">4h 30m Focus Spent</span>
                                                </div>
                                                <p className="text-[12px] text-text-secondary leading-snug font-medium text-center">
                                                    This task took 3x longer than team average. The scope likely expanded during execution.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                                {/* Text side */}
                                <div className="w-full md:w-[55%] flex flex-col justify-center pl-10 py-10">
                                    <h3 className="text-3xl font-semibold text-foreground tracking-tight mb-4">Causal Analytics &gt; Static Docs</h3>
                                    <p className="text-[17px] text-text-secondary leading-relaxed font-medium">
                                        Unlike Notion, floework generates insights directly from execution data. Because we link focus to tasks, we can automatically summarize *why* things took longer or *where* friction occurred.
                                    </p>
                                </div>
                            </div>
                        </Reveal>

                    </div>
                </div>
            </section>



            <footer className="bg-[#f7f8fa] border-t border-slate-200 py-14 px-8">
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
                    <div className="flex gap-16 md:gap-24">
                        <div>
                            <ul className="space-y-4 text-[14px]">
                                {["About Us", "Contact", "What's New", "Careers"].map((item) => (
                                    <li key={item}>
                                        <a href="#" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors group">
                                            <ArrowRight size={13} className="text-slate-400 group-hover:text-[#007dff] transition-colors shrink-0" />
                                            {item}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <ul className="space-y-4 text-[14px]">
                                {["Product", "Solutions", "Integrations", "Pricing"].map((item) => (
                                    <li key={item}>
                                        <a href="#" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors group">
                                            <ArrowRight size={13} className="text-slate-400 group-hover:text-[#007dff] transition-colors shrink-0" />
                                            {item}
                                        </a>
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
                        <a href="#" className="hover:text-slate-600 transition-colors">Privacy Policy</a>
                        <a href="#" className="hover:text-slate-600 transition-colors">Terms of Service</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
