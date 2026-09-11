import { useState, useEffect, useRef } from "react";
import { 
    useGetProfileQuery, 
    useUpdateProfileMutation, 
    useDisconnectGitHubMutation, 
    useGetGoogleCalendarStatusQuery, 
    useDisconnectGoogleCalendarMutation 
} from "@/store/api";
import { CognitoAuthService } from "@/services/CognitoAuthService";
import { toast } from "sonner";
import { 
    User as UserIcon, 
    Lock, 
    Mail, 
    Save, 
    Github, 
    Calendar, 
    Bell, 
    Camera, 
    Loader2, 
    Upload, 
    Trash2, 
    Sparkles, 
    Check, 
    Shield, 
    CheckCheck
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/UserAvatar";
import { getTheme, setTheme, ThemeName } from "@/lib/theme";

interface MascotPreset {
    id: string;
    name: string;
    url: string;
    theme: ThemeName;
    badge: string;
}

const MASCOT_PRESETS: MascotPreset[] = [
    { 
        id: "mascot-1", 
        name: "Atlas Blue", 
        url: "/assets/one.png", 
        theme: "blue", 
        badge: "Classic"
    },
    { 
        id: "mascot-2", 
        name: "Pulse Green", 
        url: "/assets/two.png", 
        theme: "green", 
        badge: "Velocity"
    },
    { 
        id: "mascot-3", 
        name: "Nova Purple", 
        url: "/assets/three.png", 
        theme: "purple", 
        badge: "Creative"
    },
    { 
        id: "mascot-4", 
        name: "Spark Red", 
        url: "/assets/four.png", 
        theme: "red", 
        badge: "Sprint"
    },
];

export default function ProfilePage() {
    const { data: profileRes, isLoading: isLoadingProfile, refetch } = useGetProfileQuery();
    const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();
    const [disconnectGitHub, { isLoading: isDisconnecting }] = useDisconnectGitHubMutation();
    const { data: gcalRes, refetch: refetchGcal } = useGetGoogleCalendarStatusQuery();
    const [disconnectGoogleCalendar, { isLoading: isDisconnectingGcal }] = useDisconnectGoogleCalendarMutation();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [weeklyReport, setWeeklyReport] = useState(true);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [activeTheme, setActiveTheme] = useState<ThemeName>(() => getTheme());
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Synchronize active theme from global state & system events
    useEffect(() => {
        setActiveTheme(getTheme());
        const handleThemeChange = (e: any) => {
            if (e.detail?.theme) {
                setActiveTheme(e.detail.theme);
            }
        };
        window.addEventListener('floework:themechange', handleThemeChange);
        return () => window.removeEventListener('floework:themechange', handleThemeChange);
    }, []);

    useEffect(() => {
        if (profileRes?.data) {
            setName(profileRes.data.name || "");
            setEmail(profileRes.data.email || "");
            setWeeklyReport(profileRes.data.weeklyReportEnabled ?? true);
        }
    }, [profileRes]);

    const profile = profileRes?.data as any;
    const gcalData = gcalRes?.data;
    const currentAvatarUrl = profile?.avatarUrl || null;

    const handleSwitchTheme = (newTheme: ThemeName) => {
        setTheme(newTheme);
        setActiveTheme(newTheme);
        const label = newTheme === 'green' ? 'Pulse Green' : newTheme === 'purple' ? 'Nova Purple' : newTheme === 'red' ? 'Spark Red' : 'Atlas Blue';
        toast.success(`UI theme updated to ${label}!`);
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload: any = { name, email };
            if (password) payload.password = password;
            await updateProfile(payload).unwrap();
            toast.success("Profile details updated successfully");
            setPassword("");
            refetch();
        } catch (error) {
            toast.error("Failed to update profile details");
        }
    };

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            toast.error('Please upload a JPEG, PNG, or WebP image.');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            toast.error('Image must be smaller than 2MB.');
            return;
        }

        setIsUploadingAvatar(true);
        try {
            const res = await updateProfile({ avatarFile: file } as any).unwrap();
            const session = CognitoAuthService.getSession();
            if (session && res?.data?.avatarUrl) {
                session.user.avatarUrl = res.data.avatarUrl;
                localStorage.setItem('floework_cognito_session', JSON.stringify(session));
            }
            toast.success('Custom profile picture updated!');
            refetch();
        } catch {
            toast.error('Failed to upload avatar image.');
        } finally {
            setIsUploadingAvatar(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSelectPreset = async (preset: MascotPreset) => {
        setIsUploadingAvatar(true);
        // Seamlessly switch global theme to match selected mascot
        handleSwitchTheme(preset.theme);

        try {
            await updateProfile({ avatarUrl: preset.url } as any).unwrap();
            const session = CognitoAuthService.getSession();
            if (session && session.user) {
                session.user.avatarUrl = preset.url;
                localStorage.setItem('floework_cognito_session', JSON.stringify(session));
            }
            toast.success(`${preset.name} selected! Theme set to ${preset.name}.`);
            refetch();
        } catch {
            toast.error("Failed to update mascot avatar");
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    const handleRemoveAvatar = async () => {
        setIsUploadingAvatar(true);
        try {
            await updateProfile({ avatarUrl: null as any } as any).unwrap();
            const session = CognitoAuthService.getSession();
            if (session && session.user) {
                session.user.avatarUrl = null as any;
                localStorage.setItem('floework_cognito_session', JSON.stringify(session));
            }
            toast.success("Profile photo removed. Reverted to default initials.");
            refetch();
        } catch {
            toast.error("Failed to remove avatar");
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    const handleWeeklyReportToggle = async () => {
        const next = !weeklyReport;
        setWeeklyReport(next);
        try {
            await updateProfile({ weeklyReportEnabled: next } as any).unwrap();
            toast.success(next ? "Weekly focus report enabled" : "Weekly focus report disabled");
        } catch {
            setWeeklyReport(!next);
            toast.error("Failed to update notification preference");
        }
    };

    const handleConnectGitHub = () => {
        const token = CognitoAuthService.getToken();
        if (!token) { toast.error("Please log in first"); return; }
        const baseUrl = window.location.origin;
        const popup = window.open(`${baseUrl}/api/auth/github?token=${token}`, 'github-oauth', 'width=600,height=700');
        window.addEventListener('message', (e) => {
            if (e.data === 'github:connected') {
                popup?.close();
                toast.success("GitHub connected successfully!");
                refetch();
            }
        }, { once: true });
    };

    const handleConnectGoogleCalendar = () => {
        const token = CognitoAuthService.getToken();
        if (!token) { toast.error("Please log in first"); return; }
        const baseUrl = window.location.origin;
        const popup = window.open(`${baseUrl}/api/auth/google-calendar?token=${token}`, 'gcal-oauth', 'width=600,height=700');
        window.addEventListener('message', (e) => {
            if (e.data === 'gcal:connected') {
                popup?.close();
                toast.success("Google Calendar connected!");
                refetchGcal();
                refetch();
            }
        }, { once: true });
    };

    if (isLoadingProfile) {
        return (
            <div className="flex-1 flex items-center justify-center p-12 text-slate-500">
                <Loader2 size={24} className="animate-spin text-[#007dff] mr-2" />
                <span className="text-sm font-medium">Loading profile and workspace settings...</span>
            </div>
        );
    }

    return (
        <div className="flex-1 w-full max-w-7xl mx-auto flex flex-col gap-6 p-2 sm:p-4 pb-16 no-scrollbar animate-in fade-in duration-300">
            {/* Page Header with Mascot / Theme Indicator */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">User Profile Settings</h1>
                        <Badge variant="outline" className="text-xs font-semibold capitalize bg-white border-slate-200 shadow-2xs">
                            <Shield size={11} className="mr-1 text-[#007dff]" />
                            {profile?.role || "Member"}
                        </Badge>
                    </div>
                    <p className="text-slate-500 text-sm mt-1">
                        Manage your account credentials, mascot persona, and connected developer tools.
                    </p>
                </div>

                {/* Quick Theme Status Badge */}
                <div className="flex items-center gap-2.5 self-start sm:self-auto bg-white border border-slate-200/80 rounded-xl px-3.5 py-1.5 shadow-xs">
                    <span className="text-xs text-slate-500 font-medium">Active Theme:</span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold capitalize text-slate-800">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                            activeTheme === 'green' ? 'bg-emerald-500 ring-2 ring-emerald-200' :
                            activeTheme === 'purple' ? 'bg-purple-500 ring-2 ring-purple-200' :
                            activeTheme === 'red' ? 'bg-rose-500 ring-2 ring-rose-200' :
                            'bg-[#007dff] ring-2 ring-blue-200'
                        }`} />
                        {activeTheme === 'blue' ? 'Atlas Blue' : activeTheme === 'green' ? 'Pulse Green' : activeTheme === 'purple' ? 'Nova Purple' : 'Spark Red'}
                    </span>
                </div>
            </div>

            {/* 2-Column Responsive Dashboard Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* =========================================================================
                    LEFT COLUMN: Identity & Official Floework Mascots (lg:col-span-5)
                    ========================================================================= */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                    
                    {/* Identity & Profile Photo Card */}
                    <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-5 sm:p-6 space-y-5">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <Camera size={18} className="text-[#007dff]" />
                                    Profile Identity
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Your public avatar across boards, narratives, and comments.
                                </p>
                            </div>
                            {currentAvatarUrl && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleRemoveAvatar}
                                    disabled={isUploadingAvatar}
                                    className="text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 flex items-center gap-1.5"
                                >
                                    <Trash2 size={13} />
                                    Reset
                                </Button>
                            )}
                        </div>

                        {/* Avatar Hero Display */}
                        <div className="flex items-center gap-5">
                            <div 
                                className="relative group cursor-pointer shrink-0" 
                                onClick={() => fileInputRef.current?.click()}
                                title="Click to upload custom picture"
                            >
                                <UserAvatar
                                    name={name || profile?.name}
                                    avatarUrl={currentAvatarUrl}
                                    size="lg"
                                    className="w-20 h-20 shadow-md ring-4 ring-slate-100 group-hover:ring-[#007dff]/30 transition-all"
                                />
                                <div className="absolute inset-0 rounded-full bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white backdrop-blur-[1px]">
                                    {isUploadingAvatar ? (
                                        <Loader2 size={20} className="animate-spin text-white" />
                                    ) : (
                                        <>
                                            <Camera size={18} />
                                            <span className="text-[10px] font-medium mt-0.5">Change</span>
                                        </>
                                    )}
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={handleAvatarChange}
                                    className="hidden"
                                />
                            </div>

                            <div className="space-y-1.5 flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-bold text-slate-900 truncate">{name || profile?.name || "User"}</h3>
                                </div>
                                <p className="text-xs text-slate-500 truncate">{email || profile?.email || "dev@floework.dev"}</p>
                                
                                <div className="flex items-center gap-2 pt-1">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploadingAvatar}
                                        className="h-7 text-xs border-slate-200 text-slate-700 hover:text-[#007dff] hover:bg-blue-50/50 flex items-center gap-1.5"
                                    >
                                        <Upload size={12} />
                                        Upload Image
                                    </Button>
                                    <span className="text-[11px] text-slate-400">Max 2MB</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Official Mascots Card (Large photos, no white circle ring, auto theme switch) */}
                    <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-5 sm:p-6 space-y-4">
                        <div className="border-b border-slate-100 pb-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <Sparkles size={18} className="text-[#007dff]" />
                                    Floework Mascots
                                </h2>
                                <Badge variant="secondary" className="text-[10px] font-semibold bg-slate-100 text-slate-700">
                                    Syncs Theme & Avatar
                                </Badge>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                Select a mascot to customize your persona and transform the UI accent theme.
                            </p>
                        </div>

                        {/* 4 Mascot Cards in a 2x2 Grid */}
                        <div className="grid grid-cols-2 gap-3.5">
                            {MASCOT_PRESETS.map((preset) => {
                                const isCurrentAvatar = currentAvatarUrl === preset.url;
                                const isCurrentTheme = activeTheme === preset.theme;
                                const isSelected = isCurrentAvatar || isCurrentTheme;
                                
                                return (
                                    <button
                                        key={preset.id}
                                        type="button"
                                        onClick={() => handleSelectPreset(preset)}
                                        disabled={isUploadingAvatar}
                                        className={`flex flex-col items-center justify-between p-4 rounded-2xl border transition-all relative group text-center cursor-pointer ${
                                            isSelected 
                                                ? "border-[#007dff] bg-blue-50/50 ring-2 ring-[#007dff]/25 shadow-sm" 
                                                : "border-slate-200/90 bg-white hover:bg-slate-50/60 hover:border-slate-300 shadow-2xs"
                                        }`}
                                    >
                                        {isSelected && (
                                            <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[#007dff] text-white flex items-center justify-center shadow-xs">
                                                <Check size={12} className="stroke-[3]" />
                                            </span>
                                        )}

                                        {/* Large mascot artwork with NO white ring/circle container */}
                                        <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center my-1">
                                            <img
                                                src={preset.url}
                                                alt={preset.name}
                                                className="w-full h-full object-contain drop-shadow-md transition-transform duration-200 group-hover:scale-110"
                                            />
                                        </div>

                                        <div className="w-full mt-2">
                                            <p className="text-[13px] font-bold text-slate-900 leading-snug">{preset.name}</p>
                                            <span className={`inline-block text-[11px] font-semibold mt-1 px-2.5 py-0.5 rounded-full ${
                                                isSelected 
                                                    ? "bg-[#007dff]/10 text-[#007dff]" 
                                                    : "bg-slate-100 text-slate-500 group-hover:bg-slate-200/70"
                                            }`}>
                                                {preset.badge}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* =========================================================================
                    RIGHT COLUMN: Account Form, Notifications, Connected Tools (lg:col-span-7)
                    ========================================================================= */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                    
                    {/* Account Details Form */}
                    <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-5 sm:p-6">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
                            <div>
                                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <UserIcon size={18} className="text-[#007dff]" />
                                    Account Details
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Update your name, contact email, and authentication credentials.
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleUpdateProfile} className="space-y-4">
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                                        <UserIcon size={13} className="text-slate-400" /> Full Name
                                    </label>
                                    <Input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Your Name"
                                        className="h-10 text-sm bg-slate-50/60 border-slate-200 focus:bg-white"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                                        <Mail size={13} className="text-slate-400" /> Email Address
                                    </label>
                                    <Input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        className="h-10 text-sm bg-slate-50/60 border-slate-200 focus:bg-white"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5 pt-3 border-t border-slate-100">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                                        <Lock size={13} className="text-slate-400" /> Change Password
                                    </label>
                                    <span className="text-[11px] text-slate-400">Optional</span>
                                </div>
                                <Input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Leave blank to keep your current password"
                                    className="h-10 text-sm bg-slate-50/60 border-slate-200 focus:bg-white"
                                />
                                <p className="text-[11px] text-slate-400">Must be at least 8 characters with letters and digits.</p>
                            </div>

                            <div className="pt-2 flex justify-end">
                                <Button
                                    type="submit"
                                    disabled={isUpdating}
                                    className="bg-[#007dff] hover:bg-[#0066cc] text-white font-semibold h-9 px-5 rounded-xl shadow-xs flex items-center gap-2"
                                >
                                    {isUpdating ? (
                                        <>
                                            <Loader2 size={15} className="animate-spin" />
                                            Saving Changes...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={15} />
                                            Save Account Details
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>

                    {/* Notifications & Weekly Focus Report */}
                    <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-5 sm:p-6 space-y-4">
                        <div className="border-b border-slate-100 pb-3">
                            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <Bell size={18} className="text-[#007dff]" />
                                Notifications & Communication
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Manage automated email digest alerts and sprint focus stability reports.
                            </p>
                        </div>

                        <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/40">
                            <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#007dff] flex items-center justify-center shrink-0">
                                    <Bell size={18} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-slate-900 text-sm">Weekly Focus & Effort Digest</h3>
                                        {weeklyReport && (
                                            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                                Active
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Automated sprint velocity analysis, bottleneck warnings, and focus density summary delivered every Monday at 9:00 AM.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleWeeklyReportToggle}
                                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                                    weeklyReport ? 'bg-[#007dff]' : 'bg-slate-200'
                                }`}
                                title="Toggle weekly focus report"
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                                        weeklyReport ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                />
                            </button>
                        </div>
                    </div>

                    {/* Integrations & Connected Tools */}
                    <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-5 sm:p-6 space-y-4">
                        <div className="border-b border-slate-100 pb-3">
                            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <Github size={18} className="text-[#007dff]" />
                                Connected Developer Integrations
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Connect version control and calendar scheduling to automate task causal tracking.
                            </p>
                        </div>

                        {/* GitHub Integration Card */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/40 gap-3">
                            <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
                                    <Github size={20} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-slate-900 text-sm">GitHub Repository Link</h3>
                                        {profile?.gitHubConnection && (
                                            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                                <CheckCheck size={11} /> Linked
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {profile?.gitHubConnection 
                                            ? `Authenticated as @${profile.gitHubConnection.githubLogin}. Pull requests and commits link automatically to tasks.` 
                                            : "Link PRs, branch updates, and code reviews directly to sprint backlog nodes."}
                                    </p>
                                </div>
                            </div>

                            <div className="self-end sm:self-auto shrink-0">
                                {profile?.gitHubConnection ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs text-slate-600 border-slate-200 hover:text-red-600 hover:border-red-200"
                                        disabled={isDisconnecting}
                                        onClick={async () => {
                                            await disconnectGitHub().unwrap();
                                            toast.success("Disconnected GitHub repository");
                                            refetch();
                                        }}
                                    >
                                        Disconnect
                                    </Button>
                                ) : (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleConnectGitHub}
                                        className="h-8 text-xs border-slate-200 text-slate-700 hover:text-[#007dff] hover:bg-blue-50 font-medium"
                                    >
                                        Connect GitHub
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Google Calendar Integration Card */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/40 gap-3">
                            <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 shadow-xs">
                                    <Calendar size={20} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-slate-900 text-sm">Google Calendar Sync</h3>
                                        {gcalData?.connected && (
                                            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                                <CheckCheck size={11} /> Synced
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {gcalData?.connected 
                                            ? `Connected with ${gcalData.googleEmail}. Deep work execution slots populate into your personal agenda.` 
                                            : "Sync deep work sessions and focus stability blocks directly into your work calendar."}
                                    </p>
                                </div>
                            </div>

                            <div className="self-end sm:self-auto shrink-0">
                                {gcalData?.connected ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs text-slate-600 border-slate-200 hover:text-red-600 hover:border-red-200"
                                        disabled={isDisconnectingGcal}
                                        onClick={async () => {
                                            await disconnectGoogleCalendar().unwrap();
                                            toast.success("Disconnected Google Calendar");
                                            refetchGcal();
                                            refetch();
                                        }}
                                    >
                                        Disconnect
                                    </Button>
                                ) : (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleConnectGoogleCalendar}
                                        className="h-8 text-xs border-slate-200 text-slate-700 hover:text-[#007dff] hover:bg-blue-50 font-medium"
                                    >
                                        Connect Calendar
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
