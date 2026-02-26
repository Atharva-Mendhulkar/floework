import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCreateTeamMutation } from "@/store/api";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

export default function OnboardingPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [useCase, setUseCase] = useState<string | null>(null);
    const [hasTeam, setHasTeam] = useState<boolean | null>(null);

    const [teamName, setTeamName] = useState("");
    const [createTeam, { isLoading: isCreating }] = useCreateTeamMutation();

    const handleNext = async () => {
        if (step === 1) {
            if (!useCase) return;
            if (useCase === "solo") {
                // Skip team creation entirely
                toast.success("Welcome to Floework");
                navigate("/dashboard");
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
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 sm:p-12 animate-in fade-in zoom-in duration-500">
            <div className="w-full max-w-md flex flex-col items-center">
                {/* Step 1: Use Case */}
                {step === 1 && (
                    <div className="w-full space-y-8 animate-in slide-in-from-bottom-4 fade-in duration-500">
                        <h1 className="text-3xl font-medium text-foreground text-center">How are you using floework?</h1>

                        <div className="flex flex-col gap-4 w-full">
                            {['solo', 'team', 'student'].map((caseType) => (
                                <button
                                    key={caseType}
                                    onClick={() => setUseCase(caseType)}
                                    className={`w-full p-4 rounded-2xl border text-left transition-all ${useCase === caseType
                                        ? "border-focus bg-focus/5 shadow-sm"
                                        : "border-border hover:border-focus/40 bg-surface"
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-lg font-medium text-foreground capitalize">
                                            {caseType === 'solo' ? 'Solo' : caseType === 'team' ? 'Small Team' : 'Student Project'}
                                        </span>
                                        {useCase === caseType && <CheckCircle2 className="text-focus" size={20} />}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 2: Team Question */}
                {step === 2 && (
                    <div className="w-full space-y-8 animate-in slide-in-from-right-8 fade-in duration-500">
                        <h1 className="text-3xl font-medium text-foreground text-center">Do you already have a team?</h1>

                        <div className="flex flex-col gap-4 w-full">
                            <button
                                onClick={() => setHasTeam(true)}
                                className={`w-full p-4 rounded-2xl border text-left transition-all ${hasTeam === true ? "border-focus bg-focus/5 shadow-sm" : "border-border hover:border-focus/40 bg-surface"
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-lg font-medium text-foreground">Yes, I need to join them</span>
                                    {hasTeam === true && <CheckCircle2 className="text-focus" size={20} />}
                                </div>
                            </button>

                            <button
                                onClick={() => setHasTeam(false)}
                                className={`w-full p-4 rounded-2xl border text-left transition-all ${hasTeam === false ? "border-focus bg-focus/5 shadow-sm" : "border-border hover:border-focus/40 bg-surface"
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-lg font-medium text-foreground">Not yet</span>
                                    {hasTeam === false && <CheckCircle2 className="text-focus" size={20} />}
                                </div>
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Create Team Workspace */}
                {step === 3 && (
                    <div className="w-full space-y-8 animate-in slide-in-from-right-8 fade-in duration-500">
                        <h1 className="text-3xl font-medium text-foreground text-center">Name your workspace</h1>
                        <p className="text-text-secondary text-center">You can change this later or invite members anytime.</p>

                        <input
                            type="text"
                            placeholder="e.g. Design Team or Alpha Project"
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            className="w-full flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-focus text-foreground"
                            autoFocus
                        />
                    </div>
                )}

                {/* Action Bar */}
                <div className="w-full flex justify-end mt-12">
                    <Button
                        onClick={handleNext}
                        disabled={
                            (step === 1 && !useCase) ||
                            (step === 2 && hasTeam === null) ||
                            (step === 3 && (!teamName.trim() || isCreating))
                        }
                        size="lg"
                        className="w-full sm:w-auto px-8"
                    >
                        {step === 3 ? (isCreating ? "Preparing..." : "Enter floework") : "Continue"}
                    </Button>
                </div>

            </div>
        </div>
    );
}
