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
                            <h2 className="text-2xl font-semibold mb-6 tracking-tight">The Developer</h2>
                            <div className="flex flex-col md:flex-row items-center gap-8 bg-slate-50 p-8 rounded-[32px] border border-slate-100">
                                <div className="w-24 h-24 rounded-full bg-[#007dff] flex items-center justify-center text-white text-3xl font-bold">
                                    A
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <p className="text-xl text-slate-900 font-semibold mb-2">Atharva</p>
                                    <p className="text-lg text-slate-600 leading-relaxed font-medium mb-4">
                                        I am a solo developer Atharva.
                                    </p>
                                    <div className="flex flex-wrap justify-center md:justify-start gap-4">
                                        <a href="https://github.com/Atharva-Mendhulkar" target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-[#007dff] hover:underline">GitHub</a>
                                        <a href="https://x.com/atharvarta" target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-[#007dff] hover:underline">X.com</a>
                                        <a href="https://mendhu.tech" target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-[#007dff] hover:underline">mendhu.tech</a>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </Reveal>
                </div>

                {/* Bottom Right SVG */}
                <div className="fixed bottom-8 right-8 w-24 h-24 opacity-20 pointer-events-none">
                    <img src="/assets/porygon.svg" alt="Porygon" className="w-full h-full object-contain" />
                </div>
            </main>
        </div>
    );
};

export default AboutPage;
