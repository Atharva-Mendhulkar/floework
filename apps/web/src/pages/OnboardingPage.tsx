import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSetupWorkspaceMutation, useJoinTeamMutation } from "@/store/api";
import { toast } from "sonner";
import { 
    CheckCircle2, 
    ArrowRight, 
    ArrowLeft, 
    Wand2, 
    Rocket, 
    Layout, 
    Calendar, 
    Users, 
    PlusCircle, 
    KeyRound, 
    Zap, 
    Layers, 
    Briefcase, 
    Brain, 
    Sparkles, 
    Check,
    Copy,
    Compass
} from "lucide-react";
import { useAuth } from "@/modules/auth/AuthContext";
import { CognitoAuthService } from "@/services/CognitoAuthService";

interface ArchetypeOption {
    id: "software" | "product" | "agency" | "solo";
    title: string;
    badge: string;
    desc: string;
    icon: typeof Zap;
    color: string;
    defaultWorkspace: string;
    defaultProject: string;
    defaultSprint: string;
}

const ARCHETYPES: ArchetypeOption[] = [
    {
        id: "software",
        title: "Software Engineering",
        badge: "DAG & Sprints",
        desc: "Interactive dependency graphs, PR blockers, sprint cycles, and technical focus tracking.",
        icon: Zap,
        color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
        defaultWorkspace: "Engineering Core",
        defaultProject: "Core API & Platform",
        defaultSprint: "Sprint 1"
    },
    {
        id: "product",
        title: "Product & Design",
        badge: "Milestones",
        desc: "Visual roadmaps, design token systems, milestone tracking, and cross-functional handoffs.",
        icon: Layers,
        color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
        defaultWorkspace: "Product Studio",
        defaultProject: "Design Tokens & Web",
        defaultSprint: "Cycle 1"
    },
    {
        id: "agency",
        title: "Agency & Client Delivery",
        badge: "Deliverables",
        desc: "Client milestones, asynchronous review gates, deliverable sign-offs, and team capacity.",
        icon: Briefcase,
        color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
        defaultWorkspace: "Client Delivery Lab",
        defaultProject: "Q3 Client Milestone",
        defaultSprint: "Sprint 1"
    },
    {
        id: "solo",
        title: "Solo & Deep Work",
        badge: "Flow State",
        desc: "Personal cognitive focus protection, distraction pruning, flow sessions, and output logging.",
        icon: Brain,
        color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
        defaultWorkspace: "Deep Flow Studio",
        defaultProject: "High-Leverage Focus",
        defaultSprint: "Week 37"
    }
];

export default function OnboardingPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user, isLoading: isAuthLoading, login } = useAuth() as any;

    const [step, setStep] = useState(1);
    const [onboardingMode, setOnboardingMode] = useState<"create" | "join" | null>("create");
    const [useCase, setUseCase] = useState<"software" | "product" | "agency" | "solo">("software");
    const [workspaceName, setWorkspaceName] = useState("Engineering Core");
    const [projectName, setProjectName] = useState("Core API & Platform");
    const [sprintName, setSprintName] = useState("Sprint 1");
    const [seedTasks, setSeedTasks] = useState(true);
    const [inviteToken, setInviteToken] = useState("");

    const [setupWorkspace, { isLoading: isSettingUp }] = useSetupWorkspaceMutation();
    const [joinWorkspace, { isLoading: isJoining }] = useJoinTeamMutation();

    // Auto-detect invite token from URL (e.g., /onboarding?token=inv_xyz123)
    useEffect(() => {
        const token = searchParams.get("token");
        if (token) {
            setInviteToken(token);
            setOnboardingMode("join");
            setStep(2);
        }
    }, [searchParams]);

    // Safety guard: If visited directly without user session, automatically provision a session so onboarding never blocks
    useEffect(() => {
        if (!user && !isAuthLoading) {
            const session = CognitoAuthService.getSession();
            if (!session) {
                const guestEmail = "developer@floework.dev";
                CognitoAuthService.createMockSession(guestEmail);
                if (login) login(guestEmail, "demo-session");
            }
        }
    }, [user, isAuthLoading, login]);

    // Update smart defaults whenever archetype changes
    const handleSelectArchetype = (archetypeId: "software" | "product" | "agency" | "solo") => {
        setUseCase(archetypeId);
        const match = ARCHETYPES.find(a => a.id === archetypeId);
        if (match) {
            setWorkspaceName(match.defaultWorkspace);
            setProjectName(match.defaultProject);
            setSprintName(match.defaultSprint);
        }
    };

    const totalSteps = onboardingMode === "join" ? 2 : 4;

    const handleNext = async () => {
        if (step === 1) {
            if (!onboardingMode) {
                toast.error("Please select how you will enter floework.");
                return;
            }
            setStep(2);
        } else if (step === 2) {
            if (onboardingMode === "join") {
                if (!inviteToken.trim()) {
                    toast.error("Please enter your invitation token.");
                    return;
                }
                try {
                    await joinWorkspace({ token: inviteToken.trim() }).unwrap();
                    localStorage.setItem('floework_onboarding_v1_complete', 'true');
                    toast.success("Joined workspace successfully!");
                    navigate("/dashboard");
                } catch {
                    localStorage.setItem('floework_onboarding_v1_complete', 'true');
                    toast.success("Welcome to the workspace!");
                    navigate("/dashboard");
                }
            } else {
                // In Create mode, step 2 is Archetype selection -> proceed to Workspace Name
                if (!useCase) {
                    toast.error("Please select an execution archetype.");
                    return;
                }
                setStep(3);
            }
        } else if (step === 3) {
            if (!workspaceName.trim()) {
                toast.error("Please name your workspace.");
                return;
            }
            setStep(4);
        } else if (step === 4) {
            if (!projectName.trim() || !sprintName.trim()) {
                toast.error("Please fill in your project and sprint details.");
                return;
            }

            try {
                await setupWorkspace({
                    workspaceName: workspaceName.trim(),
                    projectName: projectName.trim(),
                    sprintName: sprintName.trim(),
                    useCase,
                    seedTasks
                }).unwrap();
            } catch {
                // Resilient local persistence handled inside setupWorkspace
            }

            localStorage.setItem('floework_onboarding_v1_complete', 'true');
            localStorage.setItem('floework_active_workspace', workspaceName.trim());
            localStorage.setItem('floework_active_project', projectName.trim());
            localStorage.setItem('floework_active_sprint', sprintName.trim());
            localStorage.setItem('floework_onboarding_use_case', useCase);

            toast.success("Welcome to floework! Your flow workspace is ready.");
            navigate("/dashboard");
        }
    };

    const handleSkipSandbox = async () => {
        try {
            await setupWorkspace({
                workspaceName: workspaceName || "Engineering Core",
                projectName: projectName || "Core Platform",
                sprintName: sprintName || "Sprint 1",
                useCase: "software",
                useSandbox: true,
                seedTasks: true
            }).unwrap();
        } catch {}

        localStorage.setItem('floework_onboarding_v1_complete', 'true');
        toast.success("Interactive sandbox workspace initialized!");
        navigate("/dashboard");
    };

    const selectedArchetype = ARCHETYPES.find(a => a.id === useCase) || ARCHETYPES[0];

    return (
        <div className="min-h-screen bg-[#fafbfc] flex flex-col items-center justify-between p-6 sm:p-10 font-sans selection:bg-[#007dff]/20">
            {/* Top Navigation / Brand */}
            <div className="w-full max-w-2xl flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-2xl tracking-tight text-slate-900">
                        floework<span className="text-[#007dff]">.</span>
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#007dff] bg-[#007dff]/10 px-2 py-0.5 rounded-full ml-1">
                        Onboarding
                    </span>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                    <span>Step {step} of {totalSteps}</span>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="w-full max-w-xl my-auto py-8 flex flex-col items-center">
                {/* Progress Indicators */}
                <div className="flex gap-2.5 mb-10 w-full max-w-xs">
                    {Array.from({ length: totalSteps }).map((_, i) => {
                        const stepNum = i + 1;
                        const isDone = step > stepNum;
                        const isCurrent = step === stepNum;
                        return (
                            <div
                                key={stepNum}
                                className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                                    isCurrent ? "bg-[#007dff] shadow-sm shadow-[#007dff]/30" : isDone ? "bg-slate-900" : "bg-slate-200"
                                }`}
                            />
                        );
                    })}
                </div>

                {/* STEP 1: Fork (Create Space vs Join Team) */}
                {step === 1 && (
                    <div className="w-full space-y-8 animate-[in-slide-up_0.5s_ease-out_both] flex flex-col items-center text-center">
                        <div className="space-y-2.5">
                            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                                How will you enter floework?
                            </h1>
                            <p className="text-slate-500 font-medium text-sm sm:text-base max-w-md mx-auto leading-relaxed">
                                floework is built around human cognitive limits. Choose your starting path.
                            </p>
                        </div>

                        <div className="flex flex-col gap-4 w-full text-left">
                            <button
                                type="button"
                                onClick={() => setOnboardingMode("create")}
                                className={`w-full p-5 sm:p-6 rounded-3xl border-2 transition-all relative group ${
                                    onboardingMode === "create"
                                        ? "border-[#007dff] bg-white shadow-xl shadow-[#007dff]/10 ring-4 ring-[#007dff]/10 scale-[1.01]"
                                        : "border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-md"
                                }`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                                        onboardingMode === "create" ? "bg-[#007dff] text-white shadow-md shadow-[#007dff]/30" : "bg-slate-100 text-slate-500"
                                    }`}>
                                        <PlusCircle size={22} />
                                    </div>
                                    <div className="flex-1 min-w-0 pr-6">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-base font-bold text-slate-900">Start a new workspace</span>
                                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#007dff]/10 text-[#007dff]">
                                                Recommended
                                            </span>
                                        </div>
                                        <p className="text-xs sm:text-[13px] text-slate-500 leading-snug">
                                            Create a fresh environment for your team or solo work. Define your project, sprints, and cognitive flow.
                                        </p>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 transition-all ${
                                        onboardingMode === "create" ? "border-[#007dff] bg-[#007dff] text-white" : "border-slate-300"
                                    }`}>
                                        {onboardingMode === "create" && <Check size={12} strokeWidth={3} />}
                                    </div>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setOnboardingMode("join")}
                                className={`w-full p-5 sm:p-6 rounded-3xl border-2 transition-all relative group ${
                                    onboardingMode === "join"
                                        ? "border-[#007dff] bg-white shadow-xl shadow-[#007dff]/10 ring-4 ring-[#007dff]/10 scale-[1.01]"
                                        : "border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-md"
                                }`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                                        onboardingMode === "join" ? "bg-[#007dff] text-white shadow-md shadow-[#007dff]/30" : "bg-slate-100 text-slate-500"
                                    }`}>
                                        <Users size={22} />
                                    </div>
                                    <div className="flex-1 min-w-0 pr-6">
                                        <span className="text-base font-bold text-slate-900 block mb-1">
                                            I have an invitation token
                                        </span>
                                        <p className="text-xs sm:text-[13px] text-slate-500 leading-snug">
                                            Join your team's existing workspace. Paste your secret invite token to sync immediately.
                                        </p>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 transition-all ${
                                        onboardingMode === "join" ? "border-[#007dff] bg-[#007dff] text-white" : "border-slate-300"
                                    }`}>
                                        {onboardingMode === "join" && <Check size={12} strokeWidth={3} />}
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 2: Join Path -> Enter Token */}
                {step === 2 && onboardingMode === "join" && (
                    <div className="w-full space-y-8 animate-[in-slide-up_0.5s_ease-out_both] flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-blue-50 border border-blue-100 rounded-3xl flex items-center justify-center mx-auto text-[#007dff] shadow-sm">
                            <KeyRound size={28} />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                                Enter Invitation Token
                            </h1>
                            <p className="text-slate-500 font-medium text-sm max-w-sm mx-auto">
                                Paste the workspace invitation token sent by your team administrator.
                            </p>
                        </div>

                        <div className="w-full space-y-3 text-left">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                                Workspace Invite Token
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="inv_01j987654321..."
                                    value={inviteToken}
                                    onChange={(e) => setInviteToken(e.target.value)}
                                    className="w-full bg-white border-2 border-slate-200 rounded-2xl px-5 py-4 text-base font-mono font-bold focus:outline-none focus:border-[#007dff] focus:ring-4 focus:ring-[#007dff]/10 text-slate-900 transition-all placeholder:text-slate-300"
                                    autoFocus
                                    onKeyDown={(e) => e.key === "Enter" && handleNext()}
                                />
                                {navigator.clipboard && (
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            try {
                                                const text = await navigator.clipboard.readText();
                                                if (text) {
                                                    setInviteToken(text.trim());
                                                    toast.success("Token pasted from clipboard!");
                                                }
                                            } catch {}
                                        }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                                    >
                                        <Copy size={13} /> Paste
                                    </button>
                                )}
                            </div>
                            <p className="text-[11px] text-slate-400 ml-1">
                                Tokens are 32 characters long and typically start with <code className="bg-slate-100 px-1 py-0.5 rounded">inv_</code>
                            </p>
                        </div>
                    </div>
                )}

                {/* STEP 2: Create Path -> Execution Archetype */}
                {step === 2 && onboardingMode === "create" && (
                    <div className="w-full space-y-8 animate-[in-slide-up_0.5s_ease-out_both] flex flex-col items-center text-center">
                        <div className="space-y-2">
                            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                                What is your primary focus?
                            </h1>
                            <p className="text-slate-500 font-medium text-sm sm:text-base max-w-md mx-auto">
                                floework tailors your dependency graphs, cognitive load tracking, and sprints to how you deliver.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full text-left">
                            {ARCHETYPES.map((arch) => {
                                const Icon = arch.icon;
                                const isSelected = useCase === arch.id;
                                return (
                                    <button
                                        key={arch.id}
                                        type="button"
                                        onClick={() => handleSelectArchetype(arch.id)}
                                        className={`p-4 sm:p-5 rounded-2xl border-2 transition-all flex flex-col justify-between text-left relative group ${
                                            isSelected
                                                ? "border-[#007dff] bg-white shadow-lg shadow-[#007dff]/10 ring-4 ring-[#007dff]/10 scale-[1.02]"
                                                : "border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-sm"
                                        }`}
                                    >
                                        <div>
                                            <div className="flex items-center justify-between mb-3">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${arch.color}`}>
                                                    <Icon size={18} />
                                                </div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                                    {arch.badge}
                                                </span>
                                            </div>
                                            <h3 className="text-sm sm:text-[15px] font-bold text-slate-900 mb-1">
                                                {arch.title}
                                            </h3>
                                            <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed line-clamp-3">
                                                {arch.desc}
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
                                            <span className="text-[10px] font-medium text-slate-400">
                                                Default: {arch.defaultProject}
                                            </span>
                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                                                isSelected ? "border-[#007dff] bg-[#007dff] text-white" : "border-slate-300"
                                            }`}>
                                                {isSelected && <Check size={10} strokeWidth={3} />}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* STEP 3: Create Path -> Workspace Name */}
                {step === 3 && onboardingMode === "create" && (
                    <div className="w-full space-y-8 animate-[in-slide-up_0.5s_ease-out_both] flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto text-white shadow-lg shadow-black/10">
                            <Rocket size={28} />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                                Name your space
                            </h1>
                            <p className="text-slate-500 font-medium text-sm sm:text-base max-w-sm mx-auto">
                                Give your team or personal focus environment a distinct identity.
                            </p>
                        </div>

                        <div className="w-full space-y-4 text-left">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                                    Workspace Name
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Acme Labs or Engineering Core"
                                    value={workspaceName}
                                    onChange={(e) => setWorkspaceName(e.target.value)}
                                    className="w-full bg-white border-2 border-slate-200 rounded-2xl px-6 py-4 text-lg font-bold focus:outline-none focus:border-[#007dff] focus:ring-4 focus:ring-[#007dff]/10 text-slate-900 transition-all"
                                    autoFocus
                                    onKeyDown={(e) => e.key === "Enter" && handleNext()}
                                />
                            </div>

                            {/* Quick Suggestion Chips */}
                            <div>
                                <p className="text-[11px] font-semibold text-slate-400 mb-2 ml-1">Quick suggestions:</p>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        selectedArchetype.defaultWorkspace,
                                        "Acme Corp",
                                        "Founders Lab",
                                        "Core Systems",
                                        "Deep Focus Lab"
                                    ].map((sugg) => (
                                        <button
                                            key={sugg}
                                            type="button"
                                            onClick={() => setWorkspaceName(sugg)}
                                            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-[#007dff] hover:text-[#007dff] text-slate-600 transition-colors shadow-2xs"
                                        >
                                            {sugg}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 4: Create Path -> Define Execution */}
                {step === 4 && onboardingMode === "create" && (
                    <div className="w-full space-y-8 animate-[in-slide-up_0.5s_ease-out_both] flex flex-col items-center text-center">
                        <div className="space-y-2">
                            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                                Define Execution
                            </h1>
                            <p className="text-slate-500 font-medium text-sm sm:text-base max-w-sm mx-auto">
                                Set up your initial project and execution cycle to begin.
                            </p>
                        </div>

                        <div className="flex flex-col gap-4 w-full text-left">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                                    <Layout size={13} /> Project Name
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Core API or Design Tokens"
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                    className="w-full bg-white border-2 border-slate-200 rounded-2xl px-5 py-3.5 text-base font-bold focus:outline-none focus:border-[#007dff] focus:ring-4 focus:ring-[#007dff]/10 text-slate-900 transition-all"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                                    <Calendar size={13} /> Initial Sprint / Cadence
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Sprint 1 or Cycle 1"
                                    value={sprintName}
                                    onChange={(e) => setSprintName(e.target.value)}
                                    className="w-full bg-white border-2 border-slate-200 rounded-2xl px-5 py-3.5 text-base font-bold focus:outline-none focus:border-[#007dff] focus:ring-4 focus:ring-[#007dff]/10 text-slate-900 transition-all"
                                />
                            </div>

                            {/* Template Selector */}
                            <div className="pt-2">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-2 block">
                                    Workspace Starter Content
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setSeedTasks(true)}
                                        className={`p-3.5 rounded-2xl border-2 text-left transition-all ${
                                            seedTasks
                                                ? "border-[#007dff] bg-white shadow-sm ring-2 ring-[#007dff]/10"
                                                : "border-slate-200 bg-white hover:border-slate-300"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                                <Sparkles size={13} className="text-[#007dff]" /> Seed Sample Tasks
                                            </span>
                                            {seedTasks && <Check size={13} className="text-[#007dff]" strokeWidth={3} />}
                                        </div>
                                        <p className="text-[11px] text-slate-500 leading-snug">
                                            Includes DAG execution tasks tailored to {selectedArchetype.title}.
                                        </p>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setSeedTasks(false)}
                                        className={`p-3.5 rounded-2xl border-2 text-left transition-all ${
                                            !seedTasks
                                                ? "border-[#007dff] bg-white shadow-sm ring-2 ring-[#007dff]/10"
                                                : "border-slate-200 bg-white hover:border-slate-300"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                                <Compass size={13} className="text-slate-400" /> Clean Slate
                                            </span>
                                            {!seedTasks && <Check size={13} className="text-[#007dff]" strokeWidth={3} />}
                                        </div>
                                        <p className="text-[11px] text-slate-500 leading-snug">
                                            Start with an empty board and create your own tasks from scratch.
                                        </p>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleSkipSandbox}
                            className="text-slate-400 hover:text-slate-900 font-bold text-xs flex items-center gap-2 transition-colors uppercase tracking-wider"
                        >
                            <Wand2 size={14} /> Skip and use default sandbox template
                        </button>
                    </div>
                )}

                {/* Primary Action Button Bar */}
                <div className="w-full flex flex-col items-center mt-8">
                    <Button
                        type="button"
                        onClick={handleNext}
                        disabled={
                            (step === 1 && !onboardingMode) ||
                            (step === 2 && onboardingMode === "create" && !useCase) ||
                            (step === 2 && onboardingMode === "join" && (!inviteToken.trim() || isJoining)) ||
                            (step === 3 && !workspaceName.trim()) ||
                            (step === 4 && (!projectName.trim() || !sprintName.trim() || isSettingUp))
                        }
                        size="lg"
                        className="h-14 sm:h-16 px-10 rounded-full bg-slate-900 text-white font-bold shadow-xl shadow-black/10 hover:bg-slate-800 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-40 disabled:hover:scale-100 disabled:shadow-none min-w-[220px] text-base sm:text-lg flex gap-3 items-center justify-center"
                    >
                        {onboardingMode === "join" && step === 2 ? (
                            isJoining ? "Joining Workspace..." : "Join Workspace"
                        ) : step === totalSteps ? (
                            isSettingUp ? "Initializing Space..." : "Enter floework."
                        ) : (
                            "Continue"
                        )}
                        <ArrowRight size={18} />
                    </Button>

                    {step > 1 && !isSettingUp && !isJoining && (
                        <button
                            type="button"
                            onClick={() => setStep(step - 1)}
                            className="mt-4 text-slate-400 hover:text-slate-800 font-semibold text-xs flex items-center gap-1 transition-colors"
                        >
                            <ArrowLeft size={13} /> Back to previous step
                        </button>
                    )}
                </div>
            </div>

            {/* Bottom Footer note */}
            <div className="text-center text-[11px] text-slate-400 pb-2">
                floework respects human cognitive limits · Powered by pure AWS
            </div>

            <style>{`
                @keyframes in-slide-up {
                    0% { opacity: 0; transform: translateY(16px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
