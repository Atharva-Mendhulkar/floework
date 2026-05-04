import { ArrowLeft, Zap, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Reveal from "@/components/Reveal";
import { Button } from "@/components/ui/button";

const PricingPage = () => {
    const navigate = useNavigate();

    const plans = [
        {
            name: "Free",
            price: "$0",
            description: "Perfect for individual developers and students.",
            features: [
                "Unlimited local focus sessions",
                "Basic task management",
                "Core causal analytics",
                "Community support",
                "1 Workspace"
            ],
            cta: "Get Started",
            popular: false
        },
        {
            name: "Pro",
            price: "$12",
            description: "For professionals who want to master their focus.",
            features: [
                "Everything in Free",
                "Advanced AI Executive Narratives",
                "GitHub & Linear Integrations",
                "Burnout Risk Trend analysis",
                "Priority Support",
                "3 Workspaces"
            ],
            cta: "Go Pro",
            popular: true
        },
        {
            name: "Team",
            price: "$39",
            description: "For small teams (up to 10 members) to align execution.",
            features: [
                "Everything in Pro",
                "Team Pulse & Presence",
                "Shared Workspace Visibility",
                "Team-wide Bottleneck Reports",
                "Admin Controls",
                "Unlimited Workspaces"
            ],
            cta: "Contact Sales",
            popular: false
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
                        <Zap size={14} className="text-[#007dff]" fill="#007dff" />
                        <span className="font-bold text-[15px] tracking-tight">
                            floework<span className="text-[#007dff]">.</span>
                        </span>
                    </div>
                    <div className="w-[60px]" /> {/* Spacer for balance */}
                </div>
            </nav>

            <main className="max-w-6xl mx-auto px-6 py-20">
                <Reveal>
                    <header className="mb-20 text-center">
                        <p className="text-[13px] font-bold text-[#007dff] uppercase tracking-widest mb-4">Pricing</p>
                        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.15] mb-6">
                            Plans that scale with you.
                        </h1>
                        <p className="text-xl text-slate-500 leading-relaxed font-medium max-w-2xl mx-auto">
                            Transparent pricing designed for focused individuals and high-performance teams.
                        </p>
                    </header>
                </Reveal>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {plans.map((plan, idx) => (
                        <Reveal key={plan.name} delay={idx * 100}>
                            <div className={`relative h-full bg-white border ${plan.popular ? 'border-[#007dff] shadow-xl shadow-[#007dff]/10' : 'border-slate-100'} rounded-[32px] p-8 flex flex-col`}>
                                {plan.popular && (
                                    <div className="absolute top-0 right-0 bg-[#007dff] text-white px-4 py-1 rounded-bl-xl text-[10px] font-bold uppercase tracking-widest">
                                        Most Popular
                                    </div>
                                )}
                                <div className="mb-8">
                                    <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                                    <p className="text-slate-500 text-sm font-medium">{plan.description}</p>
                                </div>
                                <div className="mb-8 flex items-baseline gap-1">
                                    <span className="text-4xl font-bold">{plan.price}</span>
                                    <span className="text-slate-400 font-medium text-sm">/month</span>
                                </div>
                                <ul className="space-y-4 mb-10 flex-grow">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-start gap-3 text-[14px] text-slate-600 font-medium">
                                            <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                                                <Check size={12} className="text-emerald-600" />
                                            </div>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                                <Button 
                                    className={`w-full h-12 rounded-xl text-[15px] font-semibold transition-all ${
                                        plan.popular 
                                        ? 'bg-[#007dff] text-white hover:bg-[#007dff]/90' 
                                        : 'bg-slate-50 text-slate-900 hover:bg-slate-100 border border-slate-100'
                                    }`}
                                    onClick={() => navigate("/register")}
                                >
                                    {plan.cta}
                                </Button>
                            </div>
                        </Reveal>
                    ))}
                </div>

                <Reveal delay={400}>
                    <div className="mt-24 bg-slate-50 rounded-[32px] p-12 text-center border border-slate-100">
                        <h2 className="text-2xl font-semibold mb-4">Need something custom?</h2>
                        <p className="text-slate-500 font-medium mb-8 max-w-xl mx-auto">
                            For larger organizations with custom security, compliance, or support needs, we offer Enterprise solutions tailored to your workflow.
                        </p>
                        <Button variant="outline" className="h-12 px-8 rounded-xl border-slate-200 text-slate-900 font-semibold" onClick={() => navigate("/contact")}>
                            Talk to us
                        </Button>
                    </div>
                </Reveal>
            </main>
        </div>
    );
};

export default PricingPage;
