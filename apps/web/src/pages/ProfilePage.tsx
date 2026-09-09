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
    CheckCircle2, 
    Calendar, 
    Bell, 
    Camera, 
    Loader2, 
    Upload, 
    Trash2, 
    Sparkles, 
    Check, 
    Shield, 
    Briefcase, 
    Copy 
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/UserAvatar";

const MASCOT_PRESETS = [
    { id: "mascot-1", name: "Atlas Blue", url: "/assets/one.png", color: "border-blue-400 bg-blue-50/50" },
    { id: "mascot-2", name: "Pulse Green", url: "/assets/two.png", color: "border-emerald-400 bg-emerald-50/50" },
    { id: "mascot-3", name: "Nova Purple", url: "/assets/three.png", color: "border-purple-400 bg-purple-50/50" },
    { id: "mascot-4", name: "Spark Red", url: "/assets/four.png", color: "border-rose-400 bg-rose-50/50" },
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
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload: any = { name, email };
            if (password) payload.password = password;
            await updateProfile(payload).unwrap();
            toast.success("Profile updated successfully");
            setPassword("");
            refetch();
        } catch (error) {
            toast.error("Failed to update profile");
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
            toast.success('Profile picture updated!');
            refetch();
        } catch {
            toast.error('Failed to upload avatar.');
        } finally {
            setIsUploadingAvatar(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSelectPreset = async (presetUrl: string) => {
        setIsUploadingAvatar(true);
        try {
            await updateProfile({ avatarUrl: presetUrl } as any).unwrap();
            const session = CognitoAuthService.getSession();
            if (session && session.user) {
                session.user.avatarUrl = presetUrl;
                localStorage.setItem('floework_cognito_session', JSON.stringify(session));
            }
            toast.success("Avatar updated with Floework mascot!");
            refetch();
        } catch {
            toast.error("Failed to update avatar");
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
            toast.error("Failed to update preference");
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
            <div className="flex items-center justify-center p-12 text-slate-500">
                <Loader2 size={24} className="animate-spin text-[#007dff] mr-2" />
                <span className="text-sm">Loading profile settings...</span>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto w-full max-w-3xl flex flex-col gap-8 pb-12">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">User Profile Settings</h1>
                <p className="text-slate-500 text-sm mt-1">
                    Manage your personal account, avatar, and connected integrations.
                </p>
            </div>

            {/* Profile Photo & Avatar Customization Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <Camera size={18} className="text-[#007dff]" />
                            Profile Photo
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Upload a custom avatar or choose from official Floework mascots.
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
                            Remove Photo
                        </Button>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                    {/* Main Avatar Preview */}
                    <div className="relative group cursor-pointer shrink-0" onClick={() => fileInputRef.current?.click()}>
                        <UserAvatar
                            name={name || profile?.name}
                            avatarUrl={currentAvatarUrl}
                            size="lg"
                            className="shadow-md ring-4 ring-slate-100 group-hover:ring-[#007dff]/20 transition-all"
                        />
                        {/* Overlay */}
                        <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                            {isUploadingAvatar ? (
                                <Loader2 size={22} className="animate-spin text-white" />
                            ) : (
                                <>
                                    <Camera size={20} />
                                    <span className="text-[10px] font-medium mt-1">Upload</span>
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

                    <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-bold text-slate-900">{profile?.name || "User"}</h3>
                            <Badge variant="outline" className="text-xs font-semibold capitalize bg-slate-50 border-slate-200">
                                <Shield size={11} className="mr-1 text-[#007dff]" />
                                {profile?.role || "Member"}
                            </Badge>
                        </div>
                        <p className="text-xs text-slate-500">
                            {profile?.email || "dev@floework.dev"}
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploadingAvatar}
                                className="h-8 text-xs border-slate-200 text-slate-700 hover:text-[#007dff] hover:bg-blue-50/50 flex items-center gap-1.5"
                            >
                                <Upload size={13} />
                                Upload Custom Image
                            </Button>
                            <span className="text-[11px] text-slate-400">JPG, PNG or WebP up to 2MB</span>
                        </div>
                    </div>
                </div>

                {/* Floework Mascot Presets */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                        <Sparkles size={13} className="text-[#007dff]" /> Choose a Floework Mascot
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {MASCOT_PRESETS.map((preset) => {
                            const isSelected = currentAvatarUrl === preset.url;
                            return (
                                <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => handleSelectPreset(preset.url)}
                                    disabled={isUploadingAvatar}
                                    className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left group ${
                                        isSelected 
                                            ? "border-[#007dff] bg-blue-50/60 ring-2 ring-[#007dff]/20 shadow-sm" 
                                            : "border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300"
                                    }`}
                                >
                                    <div className="relative w-10 h-10 rounded-full bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center shadow-inner">
                                        <img
                                            src={preset.url}
                                            alt={preset.name}
                                            className="w-8 h-8 object-contain transition-transform group-hover:scale-110"
                                        />
                                        {isSelected && (
                                            <div className="absolute inset-0 bg-[#007dff]/20 flex items-center justify-center">
                                                <Check size={14} className="text-[#007dff] font-bold" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-slate-800 truncate">{preset.name}</p>
                                        <p className="text-[10px] text-slate-400 truncate">Preset</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Profile Details Form */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6">
                <h2 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                    <UserIcon size={18} className="text-[#007dff]" />
                    Account Details
                </h2>

                <form onSubmit={handleUpdateProfile} className="space-y-5">
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

                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                            <Lock size={13} className="text-slate-400" /> New Password (Optional)
                        </label>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Leave blank to keep your current password"
                            className="h-10 text-sm bg-slate-50/60 border-slate-200 focus:bg-white max-w-md"
                        />
                    </div>

                    <div className="pt-3">
                        <Button
                            type="submit"
                            disabled={isUpdating}
                            className="bg-[#007dff] hover:bg-[#0066cc] text-white font-semibold h-9 px-5 rounded-xl shadow-sm flex items-center gap-2"
                        >
                            <Save size={15} />
                            {isUpdating ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </form>
            </div>

            {/* Notifications */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-4">
                <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
                    <Bell size={18} className="text-[#007dff]" />
                    Notifications & Communication
                </h2>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                            <Bell size={18} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-900 text-sm">Weekly Focus Report</h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Receive automated summaries of your team velocity and focus density every Monday morning.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleWeeklyReportToggle}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
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

            {/* Integrations */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-4">
                <h2 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
                    <Briefcase size={18} className="text-[#007dff]" />
                    Integrations & Connected Services
                </h2>

                {/* GitHub */}
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/40">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                            <Github size={20} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-900 text-sm">GitHub</h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {profile?.gitHubConnection ? `Connected as @${profile.gitHubConnection.githubLogin}` : "Link PRs to tasks and track branch execution state."}
                            </p>
                        </div>
                    </div>

                    {profile?.gitHubConnection ? (
                        <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                                <CheckCircle2 size={13} /> Connected
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs text-slate-600 border-slate-200"
                                disabled={isDisconnecting}
                                onClick={async () => {
                                    await disconnectGitHub().unwrap();
                                    toast.success("Disconnected GitHub");
                                    refetch();
                                }}
                            >
                                Disconnect
                            </Button>
                        </div>
                    ) : (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleConnectGitHub}
                            className="h-8 text-xs border-slate-200 text-slate-700 hover:text-[#007dff] hover:bg-blue-50"
                        >
                            Connect
                        </Button>
                    )}
                </div>

                {/* Google Calendar */}
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/40">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                            <Calendar size={20} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-900 text-sm">Google Calendar</h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {gcalData?.connected ? `Connected as ${gcalData.googleEmail}` : "Sync deep work sessions and execution windows directly with calendar."}
                            </p>
                        </div>
                    </div>

                    {gcalData?.connected ? (
                        <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                                <CheckCircle2 size={13} /> Connected
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs text-slate-600 border-slate-200"
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
                        </div>
                    ) : (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleConnectGoogleCalendar}
                            className="h-8 text-xs border-slate-200 text-slate-700 hover:text-[#007dff] hover:bg-blue-50"
                        >
                            Connect
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
