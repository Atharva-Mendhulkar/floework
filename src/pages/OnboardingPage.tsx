import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCreateTeamMutation, useSetupWorkspaceMutation } from "@/store/api";
import { toast } from "sonner";
import { CheckCircle2, ArrowRight, Wand2 } from "lucide-react";

export default function OnboardingPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [useCase, setUseCase] = useState<string | null>(null);
    const [hasTeam, setHasTeam] = useState<boolean | null>(null);

    const [teamName, setTeamName] = useState("");
    const [projectName, setProjectName] = useState("");
    const [sprintName, setSprintName] = useState("");

    const [createTeam, { isLoading: isCreating }] = useCreateTeamMutation();
    const [setupWorkspace, { isLoading: isSettingUp }] = useSetupWorkspaceMutation();

    const handleNext = async () => {
        if (step === 1) {
            if (!useCase) return;
            if (useCase === "solo") {
                setStep(4);
                return;
            }
            setStep(2);
        } else if (step === 2) {
            if (hasTeam === true) {
                toast.success("Please ask your admin for an invite link.");
                navigate("/dashboard");
            } else if (hasTeam === false) {
                setStep(3); // Go to team creation
            }
        } else if (step === 3) {
            if (!teamName.trim()) return;
            try {
                await createTeam({ name: teamName }).unwrap();
                toast.success("Workspace created!");
                navigate("/dashboard");
            } catch (err) {
                toast.error("Failed to create workspace");
            }
        } else if (step === 4) {
            if (!projectName.trim() || !sprintName.trim()) return;
            try {
                await setupWorkspace({ projectName, sprintName }).unwrap();
                toast.success("Workspace configured!");
                navigate("/dashboard");
            } catch (err) {
                toast.error("Failed to build custom workspace");
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
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 sm:p-12 transition-all duration-700">
            <div className="w-full max-w-lg flex flex-col items-center">
                {/* Step 1: Use Case */}
                {step === 1 && (
                    <div className="w-full space-y-10 animate-[in-slide-up_0.6s_ease-out_both] flex flex-col items-center">
                        <div className="text-center space-y-4">
                            <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight">How will you execute?</h1>
                            <p className="text-slate-500 font-medium text-lg max-w-sm mx-auto">
                                floework is built to respect human cognitive limits, whether alone or together.
                            </p>
                        </div>

                        <div className="flex flex-col gap-4 w-full">
                            {['solo', 'team', 'student'].map((caseType, idx) => (
                                <button
                                    key={caseType}
                                    onClick={() => setUseCase(caseType)}
                                    style={{ animationDelay: `${idx * 100 + 200}ms` }}
                                    className={`w-full p-5 rounded-3xl border-2 text-left transition-all animate-[in-slide-up_0.5s_ease-out_both] ${useCase === caseType
                                        ? "border-[#007dff] bg-[#007dff]/5 shadow-md shadow-[#007dff]/10 scale-[1.02]"
                                        : "border-slate-100 hover:border-slate-300 hover:bg-slate-50 hover:scale-[1.01]"
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-lg font-semibold text-slate-900 capitalize block mb-1">
                                                {caseType === 'solo' ? 'Individual Contributor' : caseType === 'team' ? 'Technical Team' : 'Student Project'}
                                            </span>
                                            <span className="text-[13px] text-slate-500 font-medium">
                                                {caseType === 'solo' ? 'Deep work without the noise.' : caseType === 'team' ? 'Align effort with delivery.' : 'Stay on track together.'}
                                            </span>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${useCase === caseType ? 'border-[#007dff] bg-[#007dff] text-white' : 'border-slate-300 text-transparent'}`}>
                                            <CheckCircle2 size={16} strokeWidth={3} />
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 2: Team Question */}
                {step === 2 && (
                    <div className="w-full space-y-10 animate-[in-slide-up_0.6s_ease-out_both] flex flex-col items-center">
                        <div className="text-center space-y-4">
                            <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight">Got a crew?</h1>
                            <p className="text-slate-500 font-medium text-lg max-w-sm mx-auto">
                                We can set up a new workspace for you to invite them later.
                            </p>
                        </div>

                        <div className="flex flex-col gap-4 w-full">
                            <button
                                onClick={() => setHasTeam(true)}
                                className={`w-full p-5 rounded-3xl border-2 text-left transition-all ${hasTeam === true ? "border-[#007dff] bg-[#007dff]/5 shadow-md scale-[1.02]" : "border-slate-100 hover:border-slate-300 hover:bg-slate-50 hover:scale-[1.01]"
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-lg font-semibold text-slate-900">Yes, I have an invite</span>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${hasTeam === true ? 'border-[#007dff] bg-[#007dff] text-white' : 'border-slate-300 text-transparent'}`}>
                                        <CheckCircle2 size={16} strokeWidth={3} />
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={() => setHasTeam(false)}
                                className={`w-full p-5 rounded-3xl border-2 text-left transition-all ${hasTeam === false ? "border-[#007dff] bg-[#007dff]/5 shadow-md scale-[1.02]" : "border-slate-100 hover:border-slate-300 hover:bg-slate-50 hover:scale-[1.01]"
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-lg font-semibold text-slate-900">Not yet, I'll start fresh</span>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${hasTeam === false ? 'border-[#007dff] bg-[#007dff] text-white' : 'border-slate-300 text-transparent'}`}>
                                        <CheckCircle2 size={16} strokeWidth={3} />
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Create Team Workspace */}
                {step === 3 && (
                    <div className="w-full space-y-10 animate-[in-slide-up_0.6s_ease-out_both] flex flex-col items-center">
                        <div className="text-center space-y-4">
                            <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight">Name your space</h1>
                            <p className="text-slate-500 font-medium text-lg max-w-sm mx-auto">
                                Give your new workspace an identity.
                            </p>
                        </div>

                        <div className="w-full relative">
                            <input
                                type="text"
                                placeholder="e.g. Acme Corp or Next Big Thing"
                                value={teamName}
                                onChange={(e) => setTeamName(e.target.value)}
                                className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-6 py-4 text-lg font-semibold focus:outline-none focus:border-[#007dff] focus:bg-white text-slate-900 transition-all placeholder:text-slate-400 placeholder:font-medium text-center"
                                autoFocus
                            />
                        </div>
                    </div>
                )}

                {/* Step 4: Individual Setup */}
                {step === 4 && (
                    <div className="w-full space-y-10 animate-[in-slide-up_0.6s_ease-out_both] flex flex-col items-center">
                        <div className="text-center space-y-4">
                            <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight">Design your space</h1>
                            <p className="text-slate-500 font-medium text-lg max-w-sm mx-auto">
                                Name your workspace and define your first Sprint.
                            </p>
                        </div>

                        <div className="flex flex-col gap-5 w-full">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 ml-2">Workspace Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. My startup side-project"
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-6 py-4 text-lg font-semibold focus:outline-none focus:border-[#007dff] focus:bg-white text-slate-900 transition-all placeholder:text-slate-400 placeholder:font-medium text-center"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 ml-2">Initial Sprint Tracker</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Sprint 1 or MVP Launch"
                                    value={sprintName}
                                    onChange={(e) => setSprintName(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-6 py-4 text-lg font-semibold focus:outline-none focus:border-[#007dff] focus:bg-white text-slate-900 transition-all placeholder:text-slate-400 placeholder:font-medium text-center"
                                />
                            </div>
                        </div>

                        <button onClick={handleSkipSandbox} className="mt-4 text-slate-500 hover:text-slate-800 font-medium text-sm flex items-center gap-2 transition-colors">
                            <Wand2 size={16} /> Skip & build me a sandbox template instead
                        </button>
                    </div>
                )}

                {/* Action Bar */}
                <div className="w-full flex justify-center mt-12 animate-[fade-in_1s_ease-in-out_both] delay-500">
                    <Button
                        onClick={handleNext}
                        disabled={
                            (step === 1 && !useCase) ||
                            (step === 2 && hasTeam === null) ||
                            (step === 3 && (!teamName.trim() || isCreating)) ||
                            (step === 4 && (!projectName.trim() || !sprintName.trim() || isSettingUp))
                        }
                        size="lg"
                        className="h-14 px-10 rounded-full bg-slate-900 text-white font-semibold shadow-lg shadow-black/10 hover:bg-slate-800 transition-all disabled:opacity-50 disabled:shadow-none min-w-[200px]"
                    >
                        {step === 3 || step === 4 ? ((isCreating || isSettingUp) ? "Preparing..." : "Enter floework") : "Continue"}
                    </Button>
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
