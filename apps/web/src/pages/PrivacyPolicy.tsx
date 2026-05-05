import { ArrowLeft, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Reveal from "@/components/Reveal";

const PrivacyPolicy = () => {
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
                            Privacy Policy
                        </h1>
                        <p className="text-lg text-slate-500 leading-relaxed font-medium">
                            Last updated: {new Date().toLocaleDateString()}
                        </p>
                    </header>
                </Reveal>

                <div className="prose prose-slate prose-lg max-w-none space-y-12 text-slate-700 leading-relaxed font-medium">
                    <section>
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4 tracking-tight">1. Introduction</h2>
                        <p>
                            Welcome to floework. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website and tell you about your privacy rights and how the law protects you.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4 tracking-tight">2. The Data We Collect</h2>
                        <p>
                            We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Identity Data (name, username)</li>
                            <li>Contact Data (email address)</li>
                            <li>Technical Data (IP address, browser type, etc.)</li>
                            <li>Usage Data (information about how you use our website)</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-slate-900 mb-4 tracking-tight">3. How We Use Your Data</h2>
                        <p>
                            We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Where we need to perform the contract we are about to enter into or have entered into with you.</li>
                            <li>Where it is necessary for our legitimate interests and your interests and fundamental rights do not override those interests.</li>
                        </ul>
                    </section>
                </div>
            </main>
        </div>
    );
};

export default PrivacyPolicy;
