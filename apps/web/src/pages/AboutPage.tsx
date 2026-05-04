import { ArrowLeft, Zap, Heart, Shield, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Reveal from "@/components/Reveal";

const AboutPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-[#007dff]/20">
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

            <main className="max-w-[700px] mx-auto px-6 py-20">
                <Reveal>
                    <header className="mb-16 text-center">
                        <p className="text-[13px] font-bold text-[#007dff] uppercase tracking-widest mb-4">About Us</p>
                        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.15] mb-6">
                            Restoring the focus.
                        </h1>
                        <p className="text-xl text-slate-500 leading-relaxed font-medium">
                            We believe that software engineering is a creative act that requires deep, uninterrupted focus.
                        </p>
                    </header>
                </Reveal>

                <div className="space-y-16">
                    <Reveal>
                        <section>
                            <h2 className="text-2xl font-semibold mb-4 tracking-tight">Our Mission</h2>
                            <p className="text-lg text-slate-600 leading-relaxed font-medium">
                                floework was born out of frustration with the fractured nature of modern productivity tools. We saw teams spending more time managing their tools than doing the work. Our mission is to build the execution layer for the next generation of high-performance technical teams.
                            </p>
                        </section>
                    </Reveal>

                    <Reveal delay={100}>
                        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100">
                                <Heart className="text-rose-500 mb-4" size={24} />
                                <h3 className="text-lg font-bold mb-2">Human-First</h3>
                                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                                    We design for the human cognitive capacity, not for manager dashboards.
                                </p>
                            </div>
                            <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100">
                                <Shield className="text-blue-500 mb-4" size={24} />
                                <h3 className="text-lg font-bold mb-2">Privacy-Driven</h3>
                                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                                    Visibility is earned through transparency, never through surveillance.
                                </p>
                            </div>
                            <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100">
                                <Sparkles className="text-amber-500 mb-4" size={24} />
                                <h3 className="text-lg font-bold mb-2">AI-Enhanced</h3>
                                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                                    AI should summarize and coach, not replace the developer's agency.
                                </p>
                            </div>
                            <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100">
                                <Zap className="text-[#007dff] mb-4" size={24} />
                                <h3 className="text-lg font-bold mb-2">Execute-Only</h3>
                                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                                    If it doesn't help you ship, it doesn't belong in floework.
                                </p>
                            </div>
                        </section>
                    </Reveal>

                    <Reveal delay={200}>
                        <section>
                            <h2 className="text-2xl font-semibold mb-4 tracking-tight">The Team</h2>
                            <p className="text-lg text-slate-600 leading-relaxed font-medium mb-8">
                                We are a small team of engineers and designers distributed across the world, obsessed with building the tools we always wished we had.
                            </p>
                            <div className="flex -space-x-4">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <img 
                                        key={i} 
                                        src={`https://i.pravatar.cc/150?img=${i + 10}`} 
                                        className="w-12 h-12 rounded-full border-4 border-white shadow-sm" 
                                        alt="Team Member" 
                                    />
                                ))}
                                <div className="w-12 h-12 rounded-full border-4 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">
                                    +3
                                </div>
                            </div>
                        </section>
                    </Reveal>
                </div>
            </main>
        </div>
    );
};

export default AboutPage;
