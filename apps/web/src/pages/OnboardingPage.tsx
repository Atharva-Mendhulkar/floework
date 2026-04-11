import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSetupWorkspaceMutation } from "@/store/api";
import { toast } from "sonner";
import { CheckCircle2, ArrowRight, Wand2, Rocket, Layout, Calendar } from "lucide-react";

export default function OnboardingPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [useCase, setUseCase] = useState<string | null>(null);
    const [workspaceName, setWorkspaceName] = useState("");
    const [projectName, setProjectName] = useState("");
    const [sprintName, setSprintName] = useState("Sprint 1");

    const [setupWorkspace, { isLoading: isSettingUp }] = useSetupWorkspaceMutation();

    const handleNext = async () => {
        if (step === 1) {
            if (!useCase) return;
            setStep(2);
        } else if (step === 2) {
            if (!workspaceName.trim()) {
                toast.error("Please name your workspace.");
                return;
            }
            setStep(3);
        } else if (step === 3) {
            if (!projectName.trim() || !sprintName.trim()) {
                toast.error("Please fill in project and sprint details.");
                return;
            }
            
            try {
                await setupWorkspace({ 
                    workspaceName: workspaceName,
                    projectName: projectName,
                    sprintName: sprintName,
                }).unwrap();
                
                // Note: setupWorkspace mutation currently takes projectName and sprintName
                // I'll adjust the parameters in api.ts to be more descriptive if needed,
                // but for now I'll use what's there.
                
                toast.success("Welcome to floework!");
                navigate("/dashboard");
            } catch (err: any) {
                console.error("Onboarding setup failed:", err);
                const errMsg = err.data || err.message || "Failed to finalize workspace";
                toast.error(errMsg);
            }
        }
    };

    const handleSkipSandbox = async () => {
        try {
            await setupWorkspace({ useSandbox: true }).unwrap();
            toast.success("Sandbox initialized!");
            navigate("/dashboard");
        } catch (err) {
            toast.error("Failed to inject sandbox");
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 sm:p-12 transition-all duration-700 font-sans">
            <div className="w-full max-w-lg flex flex-col items-center">
                
                {/* Progress Indicators */}
                <div className="flex gap-2 mb-12">
                    {[1, 2, 3].map((s) => (
                        <div 
                            key={s} 
                            className={`h-1.5 w-12 rounded-full transition-all duration-500 ${step >= s ? "bg-slate-900" : "bg-slate-100"}`}
                        />
                    ))}
                </div>

                {/* Step 1: Use Case */}
                {step === 1 && (
                    <div className="w-full space-y-10 animate-[in-slide-up_0.6s_ease-out_both] flex flex-col items-center text-center">
                        <div className="space-y-4">
                            <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight">How will you execute?</h1>
                            <p className="text-slate-500 font-medium text-lg max-w-sm mx-auto">
                                floework is built to respect human cognitive limits.
                            </p>
                        </div>

                        <div className="flex flex-col gap-4 w-full">
                            {[
                                { id: 'solo', title: 'Individual Contributor', desc: 'Focus on deep work without noise.' },
                                { id: 'team', title: 'Technical Team', desc: 'Align effort with delivery.' },
                                { id: 'student', title: 'Student Project', desc: 'Stay on track together.' }
                            ].map((item, idx) => (
                                <button
                                    key={item.id}
                                    onClick={() => setUseCase(item.id)}
                                    style={{ animationDelay: `${idx * 100 + 200}ms` }}
                                    className={`w-full p-6 rounded-3xl border-2 text-left transition-all animate-[in-slide-up_0.5s_ease-out_both] ${useCase === item.id
                                        ? "border-[#007dff] bg-[#007dff]/5 shadow-sm shadow-[#007dff]/10 scale-[1.02]"
                                        : "border-slate-100 hover:border-slate-300 hover:bg-slate-50 hover:scale-[1.01]"
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-lg font-bold text-slate-900 block mb-1">
                                                {item.title}
                                            </span>
                                            <span className="text-[13px] text-slate-500 font-medium">
                                                {item.desc}
                                            </span>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${useCase === item.id ? 'border-[#007dff] bg-[#007dff] text-white' : 'border-slate-300 text-transparent'}`}>
                                            <CheckCircle2 size={16} strokeWidth={3} />
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 2: Workspace Creation */}
                {step === 2 && (
                    <div className="w-full space-y-10 animate-[in-slide-up_0.6s_ease-out_both] flex flex-col items-center">
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <Rocket className="text-slate-900" size={32} />
                            </div>
                            <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight">Name your space</h1>
                            <p className="text-slate-500 font-medium text-lg max-w-sm mx-auto">
                                Give your workspace a unique identity.
                            </p>
                        </div>

                        <div className="w-full space-y-2">
                             <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Workspace Name</label>
                            <input
                                type="text"
                                placeholder="e.g. Acme Corp or My Backend Project"
                                value={workspaceName}
                                onChange={(e) => setWorkspaceName(e.target.value)}
                                className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-6 py-5 text-xl font-bold focus:outline-none focus:border-[#007dff] focus:bg-white text-slate-900 transition-all placeholder:text-slate-400"
                                autoFocus
                            />
                        </div>
                    </div>
                )}

                {/* Step 3: Project & Sprint */}
                {step === 3 && (
                    <div className="w-full space-y-10 animate-[in-slide-up_0.6s_ease-out_both] flex flex-col items-center">
                        <div className="text-center space-y-4">
                            <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight">Define Execution</h1>
                            <p className="text-slate-500 font-medium text-lg max-w-sm mx-auto">
                                Create your first project and sprint cycle.
                            </p>
                        </div>

                        <div className="flex flex-col gap-6 w-full">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <Layout size={14} /> Project Name
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Core API or Q4 Launch"
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                    className="w-full bg-slate-100/50 border-2 border-slate-200 rounded-2xl px-6 py-4 text-lg font-bold focus:outline-none focus:border-[#007dff] focus:bg-white text-slate-900 transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <Calendar size={14} /> Initial Sprint
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Sprint 1 or MVP Stage"
                                    value={sprintName}
                                    onChange={(e) => setSprintName(e.target.value)}
                                    className="w-full bg-slate-100/50 border-2 border-slate-200 rounded-2xl px-6 py-4 text-lg font-bold focus:outline-none focus:border-[#007dff] focus:bg-white text-slate-900 transition-all"
                                />
                            </div>
                        </div>

                        <button onClick={handleSkipSandbox} className="mt-4 text-slate-400 hover:text-slate-800 font-bold text-xs flex items-center gap-2 transition-colors uppercase tracking-widest">
                            <Wand2 size={16} /> Skip and use sandbox template
                        </button>
                    </div>
                )}

                {/* Action Bar */}
                <div className="w-full flex flex-col items-center mt-12 animate-[fade-in_1s_ease-in-out_both] delay-500">
                    <Button
                        onClick={handleNext}
                        disabled={
                            (step === 1 && !useCase) ||
                            (step === 2 && !workspaceName.trim()) ||
                            (step === 3 && (!projectName.trim() || !sprintName.trim() || isSettingUp))
                        }
                        size="lg"
                        className="h-16 px-12 rounded-full bg-slate-900 text-white font-bold shadow-2xl shadow-black/20 hover:bg-slate-800 transition-all disabled:opacity-50 disabled:shadow-none min-w-[220px] text-lg flex gap-3 items-center"
                    >
                        {step === 3 ? (isSettingUp ? "Initializing..." : "Enter floework.") : "Continue"}
                        <ArrowRight size={20} />
                    </Button>
                    
                    {step > 1 && !isSettingUp && (
                         <button 
                            onClick={() => setStep(step - 1)}
                            className="mt-6 text-slate-400 hover:text-slate-900 font-bold text-xs uppercase tracking-widest transition-colors"
                        >
                            Back
                        </button>
                    )}
                </div>

                <style>{`
                @keyframes in-slide-up {
                    0% { opacity: 0; transform: translateY(20px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                `}</style>
            </div>
        </div>
    );
}
