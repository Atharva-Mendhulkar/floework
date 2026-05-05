import { ArrowLeft, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Reveal from "@/components/Reveal";

const TermsOfService = () => {
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
                        <img src="/favicon.svg" alt="floework" className="w-4 h-4 rounded-sm" />
                        <span className="font-bold text-[15px] tracking-tight">
                            floework<span className="text-[#007dff]">.</span>
                        </span>
                    </div>
                </div>
            </nav>

            <main className="max-w-[700px] mx-auto px-6 py-20">
                <Reveal>
                    <header className="mb-16 text-center">
                        <h1 className="text-4xl font-semibold tracking-tight leading-[1.15] mb-6">
                            Terms of Service
                        </h1>
                        <p className="text-lg text-slate-500 leading-relaxed font-medium">
                            Last updated: {new Date().toLocaleDateString()}
                        </p>
                    </header>
                </Reveal>

                <div className="prose prose-slate prose-lg max-w-none space-y-12 text-slate-700 leading-relaxed font-medium">
                    <section>
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4 tracking-tight">1. Terms</h2>
                        <p>
                            By accessing this website, you are agreeing to be bound by these website Terms and Conditions of Use, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4 tracking-tight">2. Use License</h2>
                        <p>
                            Permission is granted to temporarily download one copy of the materials (information or software) on floework's website for personal, non-commercial transitory viewing only.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4 tracking-tight">3. Disclaimer</h2>
                        <p>
                            The materials on floework's website are provided "as is". floework makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties, including without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
                        </p>
                    </section>
                </div>
            </main>
        </div>
    );
};

export default TermsOfService;
