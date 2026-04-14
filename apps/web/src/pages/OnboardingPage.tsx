import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSetupWorkspaceMutation, useJoinTeamMutation } from "@/store/api";
import { toast } from "sonner";
import { CheckCircle2, ArrowRight, Wand2, Rocket, Layout, Calendar, Users, PlusCircle, KeyRound } from "lucide-react";

export default function OnboardingPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [step, setStep] = useState(1);
    const [onboardingMode, setOnboardingMode] = useState<"create" | "join" | null>(null);
    const [useCase, setUseCase] = useState<string | null>(null);
    const [workspaceName, setWorkspaceName] = useState("");
    const [projectName, setProjectName] = useState("");
    const [sprintName, setSprintName] = useState("Sprint 1");
    const [inviteToken, setInviteToken] = useState("");

    const [setupWorkspace, { isLoading: isSettingUp }] = useSetupWorkspaceMutation();
    const [joinWorkspace, { isLoading: isJoining }] = useJoinTeamMutation();

    // Auto-detect invite token from URL
    useEffect(() => {
        const token = searchParams.get("token");
        if (token) {
            setInviteToken(token);
            setOnboardingMode("join");
            setStep(2); // Jump straight to join verification
        }
    }, [searchParams]);

    const handleNext = async () => {
        if (step === 1) {
            if (!onboardingMode) {
                toast.error("Please select how you will execute.");
                return;
            }
            if (onboardingMode === "create") {
                setStep(2);
            } else {
                setStep(2); // In Join mode, Step 2 is Enter Token
            }
        } else if (step === 2) {
            if (onboardingMode === "create") {
                if (!workspaceName.trim()) {
                    toast.error("Please name your workspace.");
                    return;
                }
                setStep(3);
            } else {
                // Handle JOIN path
                if (!inviteToken.trim()) {
                    toast.error("Please enter your invitation token.");
                    return;
                }
                try {
                    await joinWorkspace({ token: inviteToken }).unwrap();
                    toast.success("Successfully joined the workspace!");
                    navigate("/dashboard");
                } catch (err: any) {
                    toast.error(err?.data?.message || "Invalid or expired token.");
                }
            }
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
                {!isJoining && (
                    <div className="flex gap-2 mb-12">
                        {[1, 2, 3].map((s) => (
                            <div 
                                key={s} 
                                className={`h-1.5 w-12 rounded-full transition-all duration-500 ${step >= s ? "bg-slate-900" : "bg-slate-100"}`}
                            />
                        ))}
                    </div>
                )}

                {/* Step 1: Fork */}
                {step === 1 && (
                    <div className="w-full space-y-10 animate-[in-slide-up_0.6s_ease-out_both] flex flex-col items-center text-center">
                        <div className="space-y-4">
                            <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight">How will you execute?</h1>
                            <p className="text-slate-500 font-medium text-base max-w-sm mx-auto">
                                floework is built to respect human cognitive limits. Choose your starting path.
                            </p>
                        </div>

                        <div className="flex flex-col gap-4 w-full">
                            <button
                                onClick={() => setOnboardingMode("create")}
                                className={`w-full p-6 rounded-3xl border-2 text-left transition-all ${onboardingMode === "create"
                                    ? "border-[#007dff] bg-[#007dff]/5 shadow-sm shadow-[#007dff]/10 scale-[1.02]"
                                    : "border-slate-100 hover:border-slate-300 hover:bg-slate-50"
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${onboardingMode === "create" ? "bg-[#007dff] text-white" : "bg-slate-50 text-slate-500"}`}>
                                        <PlusCircle size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <span className="text-base font-bold text-slate-900 block">I'm starting a new space</span>
                                        <span className="text-[12px] text-slate-500 font-medium">Create a workspace for your team or solo work.</span>
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={() => setOnboardingMode("join")}
                                className={`w-full p-6 rounded-3xl border-2 text-left transition-all ${onboardingMode === "join"
                                    ? "border-[#007dff] bg-[#007dff]/5 shadow-sm shadow-[#007dff]/10 scale-[1.02]"
                                    : "border-slate-100 hover:border-slate-300 hover:bg-slate-50"
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${onboardingMode === "join" ? "bg-[#007dff] text-white" : "bg-slate-50 text-slate-500"}`}>
                                        <Users size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <span className="text-base font-bold text-slate-900 block">I have an invitation</span>
                                        <span className="text-[12px] text-slate-500 font-medium">Paste your token to join a workspace.</span>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Create (Name) or Join (Token) */}
                {step === 2 && (
                    <div className="w-full space-y-10 animate-[in-slide-up_0.6s_ease-out_both] flex flex-col items-center">
                        {onboardingMode === "create" ? (
                            <>
                                <div className="text-center space-y-4">
                                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                        <Rocket className="text-slate-900" size={32} />
                                    </div>
                                    <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight">Name your space</h1>
                                    <p className="text-slate-500 font-medium text-lg max-w-sm mx-auto">Give your workspace a unique identity.</p>
                                </div>
                                <div className="w-full space-y-2">
                                    <input
                                        type="text"
                                        placeholder="e.g. Acme Corp"
                                        value={workspaceName}
                                        onChange={(e) => setWorkspaceName(e.target.value)}
                                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-6 py-5 text-xl font-bold focus:outline-none focus:border-[#007dff] focus:bg-white text-slate-900 transition-all"
                                        autoFocus
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="text-center space-y-4">
                                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                        <KeyRound className="text-[#007dff]" size={32} />
                                    </div>
                                    <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight">Enter Token</h1>
                                    <p className="text-slate-500 font-medium text-lg max-w-sm mx-auto">Paste the invitation token provided by your admin.</p>
                                </div>
                                <div className="w-full space-y-2">
                                    <input
                                        type="text"
                                        placeholder="Paste token here..."
                                        value={inviteToken}
                                        onChange={(e) => setInviteToken(e.target.value)}
                                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-6 py-5 text-xl font-bold focus:outline-none focus:border-[#007dff] focus:bg-white text-slate-900 transition-all font-mono text-center"
                                        autoFocus
                                    />
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Step 3: Define Execution (Create path only) */}
                {onboardingMode === "create" && step === 3 && (
                    <div className="w-full space-y-10 animate-[in-slide-up_0.6s_ease-out_both] flex flex-col items-center">
                        <div className="text-center space-y-4">
                            <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight">Define Execution</h1>
                            <p className="text-slate-500 font-medium text-lg max-w-sm mx-auto">Create your first project and sprint cycle.</p>
                        </div>

                        <div className="flex flex-col gap-6 w-full">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <Layout size={14} /> Project Name
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Core API"
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                    className="w-full bg-slate-100/50 border-2 border-slate-200 rounded-2xl px-6 py-4 text-base font-bold focus:outline-none focus:border-[#007dff] focus:bg-white text-slate-900 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <Calendar size={14} /> Initial Sprint
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Sprint 1"
                                    value={sprintName}
                                    onChange={(e) => setSprintName(e.target.value)}
                                    className="w-full bg-slate-100/50 border-2 border-slate-200 rounded-2xl px-6 py-4 text-base font-bold focus:outline-none focus:border-[#007dff] focus:bg-white text-slate-900 transition-all"
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
                            (step === 1 && !onboardingMode) ||
                            (step === 2 && onboardingMode === "create" && !workspaceName.trim()) ||
                            (step === 2 && onboardingMode === "join" && (!inviteToken.trim() || isJoining)) ||
                            (step === 3 && (!projectName.trim() || !sprintName.trim() || isSettingUp))
                        }
                        size="lg"
                        className="h-16 px-12 rounded-full bg-slate-900 text-white font-bold shadow-2xl shadow-black/20 hover:bg-slate-800 transition-all disabled:opacity-50 disabled:shadow-none min-w-[220px] text-lg flex gap-3 items-center"
                    >
                        {onboardingMode === "join" && step === 2 
                            ? (isJoining ? "Joining..." : "Join Workspace") 
                            : step === 3 ? (isSettingUp ? "Initializing..." : "Enter floework.") : "Continue"}
                        <ArrowRight size={20} />
                    </Button>
                    
                    {step > 1 && !isSettingUp && !isJoining && (
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
