import { ArrowLeft, Zap, Target, Zap as FocusIcon, BarChart3, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Reveal from "@/components/Reveal";

const FeaturesPage = () => {
    const navigate = useNavigate();

    const features = [
        {
            title: "FlowBoard",
            icon: <Target className="text-indigo-500" size={32} />,
            description: "A Kanban-style interface featuring real-time collaborative updates. Move tasks through your pipeline with instant state synchronization across your entire team.",
            bullets: [
                "Real-time task state sync",
                "Optimistic UI updates",
                "Task dependency mapping",
                "Drag-and-drop workflow"
            ],
            color: "indigo"
        },
        {
            title: "Autonomous Focus Engine",
            icon: <FocusIcon className="text-[#007dff]" size={32} />,
            description: "An integrated, task-linked lifecycle timer that auto-transitions task states and logs effort. It's designed to minimize the overhead of tracking work.",
            bullets: [
                "Task-linked lifecycle timers",
                "Audio success chimes",
                "Automated data persistence",
                "Non-invasive effort logging"
            ],
            color: "blue"
        },
        {
            title: "Execution Intelligence",
            icon: <BarChart3 className="text-emerald-500" size={32} />,
            description: "Deep analytics that track team health trends, workflow bottlenecks, and calculate estimation accuracy. Turn raw data into actionable insights.",
            bullets: [
                "Burnout Risk Trend analysis",
                "Workflow bottleneck mapping",
                "Estimation accuracy metrics",
                "Peak cognitive window detection"
            ],
            color: "emerald"
        },
        {
            title: "Team Pulse",
            icon: <Users className="text-orange-500" size={32} />,
            description: "Real-time visibility of teammate activity across the workspace. See who is 'In Focus' without the need for invasive screen-monitoring software.",
            bullets: [
                "Live presence indicators",
                "Workspace visibility controls",
                "Collaborative transparency",
                "Privacy-first status updates"
            ],
            color: "orange"
        }
    ];

    return (
        <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-[#007dff]/20">
            {/* Minimal Nav */}
            <nav className="border-b border-slate-100 py-4 px-6 sticky top-0 bg-white/80 backdrop-blur-md z-50">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-[14px] font-medium text-slate-500 hover:text-slate-900 transition-colors"
                    >
                        <ArrowLeft size={16} /> Back
                    </button>
                    <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => navigate("/")}>
                        <span className="font-bold text-[15px] tracking-tight">
                            floework<span className="text-[#007dff]">.</span>
                        </span>
                    </div>
                    <div className="w-[60px]" />
                </div>
            </nav>

            <main className="max-w-5xl mx-auto px-6 py-20">
                <Reveal>
                    <header className="mb-24 text-center">
                        <p className="text-[13px] font-bold text-[#007dff] uppercase tracking-widest mb-4">Product</p>
                        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.15] mb-6">
                            Everything you need to <br /> execute with focus.
                        </h1>
                        <p className="text-xl text-slate-500 leading-relaxed font-medium max-w-2xl mx-auto">
                            floework integrates the core mechanics of software work into a single, cohesive execution layer.
                        </p>
                    </header>
                </Reveal>

                <div className="space-y-32">
                    {features.map((feature, idx) => (
                        <Reveal key={feature.title} from={idx % 2 === 0 ? "left" : "right"}>
                            <div className={`flex flex-col ${idx % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-16`}>
                                <div className="flex-1">
                                    <div className="mb-6">{feature.icon}</div>
                                    <h2 className="text-3xl font-semibold mb-4 tracking-tight">{feature.title}</h2>
                                    <p className="text-lg text-slate-500 font-medium leading-relaxed mb-8">
                                        {feature.description}
                                    </p>
                                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {feature.bullets.map((bullet) => (
                                            <li key={bullet} className="flex items-center gap-2 text-[14px] text-slate-600 font-medium">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                                                {bullet}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="flex-1 w-full bg-slate-50 border border-slate-100 rounded-[32px] aspect-video flex items-center justify-center">
                                    {/* Placeholder for feature visualization */}
                                    <div className="text-slate-300 font-bold uppercase tracking-widest text-[11px]">
                                        {feature.title} Interface
                                    </div>
                                </div>
                            </div>
                        </Reveal>
                    ))}
                </div>

                <Reveal delay={400}>
                    <div className="mt-40 text-center">
                        <h2 className="text-3xl font-semibold mb-8 tracking-tight">The Causal Chain of Work</h2>
                        <div className="flex items-center justify-center py-10 my-8 border-y border-slate-100">
                            <p className="text-xl md:text-2xl font-semibold text-slate-900 text-center">
                                Focus <span className="text-slate-300 mx-2">→</span>
                                Effort <span className="text-slate-300 mx-2">→</span>
                                Progress <span className="text-slate-300 mx-2">→</span>
                                Outcome
                            </p>
                        </div>
                    </div>
                </Reveal>
            </main>
        </div>
    );
};

export default FeaturesPage;
