import { useState, useEffect, useRef } from "react";
import { useGetProfileQuery, useUpdateProfileMutation, useDisconnectGitHubMutation, useGetGoogleCalendarStatusQuery, useDisconnectGoogleCalendarMutation } from "@/store/api";
import { toast } from "sonner";
import { User as UserIcon, Lock, Mail, Save, Github, CheckCircle2, Calendar, Bell, Camera, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";

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

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload: any = { name, email };
            if (password) payload.password = password;
            await updateProfile(payload).unwrap();
            toast.success("Profile updated successfully");
            setPassword("");
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
            await updateProfile({ avatarFile: file } as any).unwrap();
            toast.success('Profile picture updated!');
            refetch();
        } catch {
            toast.error('Failed to upload avatar.');
        } finally {
            setIsUploadingAvatar(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
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
        const token = localStorage.getItem('floe_token'); // ← fixed token key
        if (!token) { toast.error("Please log in first"); return; }
        const popup = window.open(`http://localhost:5001/api/v1/auth/github?token=${token}`, 'github-oauth', 'width=600,height=700');
        window.addEventListener('message', (e) => {
            if (e.data === 'github:connected') {
                popup?.close();
                toast.success("GitHub connected successfully!");
                refetch();
            }
        }, { once: true });
    };

    const handleConnectGoogleCalendar = () => {
        const token = localStorage.getItem('floe_token');
        if (!token) { toast.error("Please log in first"); return; }
        const popup = window.open(`http://localhost:5001/api/v1/auth/google-calendar?token=${token}`, 'gcal-oauth', 'width=600,height=700');
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
        return <div className="p-4 text-text-muted">Loading profile settings...</div>;
    }

    const profile = profileRes?.data as any;
    const gcalData = gcalRes?.data;

    return (
        <div className="flex-1 overflow-y-auto w-full max-w-2xl flex flex-col gap-6">
            <div>
                <h2 className="text-2xl font-bold text-foreground">User Profile Settings</h2>
                <p className="text-text-secondary mt-1">Manage your account details and security preferences.</p>
            </div>

            {/* Profile form */}
            <div className="bg-surface rounded-2xl shadow-card border border-border p-6">
                <form onSubmit={handleUpdateProfile} className="flex flex-col gap-5">
                    <div className="flex items-center gap-4 pb-4 border-b border-border">
                        <div
                            className="relative group cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <UserAvatar
                                name={name || profile?.name}
                                avatarUrl={profile?.avatarUrl}
                                size="lg"
                            />
                            {/* Camera overlay */}
                            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                {isUploadingAvatar ? (
                                    <Loader2 size={20} className="text-white animate-spin" />
                                ) : (
                                    <Camera size={20} className="text-white" />
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
                        <div>
                            <h3 className="font-semibold text-foreground text-lg">{profile?.name || "User"}</h3>
                            <p className="text-sm text-text-muted">{profile?.role || "Member"}</p>
                            <p className="text-xs text-text-muted mt-0.5">Click avatar to change</p>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <UserIcon size={14} className="text-text-muted" /> Full Name
                        </label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your Name" className="max-w-md" />
                    </div>

                    <div className="grid gap-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Mail size={14} className="text-text-muted" /> Email Address
                        </label>
                        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="max-w-md" />
                    </div>

                    <div className="grid gap-2 pt-4 border-t border-border">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Lock size={14} className="text-text-muted" /> New Password (Optional)
                        </label>
                        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave blank to keep current password" className="max-w-md" />
                    </div>

                    <div className="pt-2">
                        <Button type="submit" disabled={isUpdating} className="bg-focus hover:bg-focus/90 text-white">
                            <Save size={16} className="mr-2" />
                            {isUpdating ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </form>
            </div>

            {/* Notifications */}
            <div>
                <h2 className="text-xl font-bold text-foreground">Notifications</h2>
                <p className="text-text-secondary mt-1">Control how Floework contacts you.</p>
            </div>
            <div className="bg-surface rounded-2xl shadow-card border border-border p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <Bell size={18} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground">Weekly Focus Report</h3>
                            <p className="text-sm text-text-muted mt-0.5">Receive a summary of your focus trends every Monday.</p>
                        </div>
                    </div>
                    <button
                        onClick={handleWeeklyReportToggle}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${weeklyReport ? 'bg-[#007dff]' : 'bg-slate-200'}`}
                        title="Toggle weekly focus report"
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${weeklyReport ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>

            {/* Integrations */}
            <div>
                <h2 className="text-xl font-bold text-foreground">Integrations</h2>
                <p className="text-text-secondary mt-1">Connect external services to Floework.</p>
            </div>

            {/* GitHub */}
            <div className="bg-surface rounded-2xl shadow-card border border-border p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
                            <Github size={20} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground">GitHub</h3>
                            <p className="text-sm text-text-muted mt-0.5">
                                {profile?.gitHubConnection ? `Connected as @${profile.gitHubConnection.githubLogin}` : "Link PRs to tasks and track blocked execution state."}
                            </p>
                        </div>
                    </div>

                    {profile?.gitHubConnection ? (
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                                <CheckCircle2 size={14} /> Connected
                            </span>
                            <Button variant="outline" size="sm" className="text-slate-500" disabled={isDisconnecting}
                                onClick={async () => {
                                    await disconnectGitHub().unwrap();
                                    toast.success("Disconnected GitHub");
                                    refetch();
                                }}>
                                Disconnect
                            </Button>
                        </div>
                    ) : (
                        <Button variant="outline" size="sm" onClick={handleConnectGitHub}>Connect</Button>
                    )}
                </div>
            </div>

            {/* Google Calendar */}
            <div className="bg-surface rounded-2xl shadow-card border border-border p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                            <Calendar size={20} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground">Google Calendar</h3>
                            <p className="text-sm text-text-muted mt-0.5">
                                {gcalData?.connected ? `Connected as ${gcalData.googleEmail}` : "Sync deep work windows to your calendar as recurring events."}
                            </p>
                        </div>
                    </div>

                    {gcalData?.connected ? (
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                                <CheckCircle2 size={14} /> Connected
                            </span>
                            <Button variant="outline" size="sm" className="text-slate-500" disabled={isDisconnectingGcal}
                                onClick={async () => {
                                    await disconnectGoogleCalendar().unwrap();
                                    toast.success("Disconnected Google Calendar");
                                    refetchGcal();
                                    refetch();
                                }}>
                                Disconnect
                            </Button>
                        </div>
                    ) : (
                        <Button variant="outline" size="sm" onClick={handleConnectGoogleCalendar}>Connect</Button>
                    )}
                </div>
            </div>
        </div>
    );
}
