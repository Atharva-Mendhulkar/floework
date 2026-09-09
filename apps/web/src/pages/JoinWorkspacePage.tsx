import { useState } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/modules/auth/AuthContext";
import { useGetInviteDetailsQuery, useJoinTeamMutation } from "@/store/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/UserAvatar";
import { Users, CheckCircle2, ArrowRight, Shield, AlertCircle, Sparkles, Loader2, LogIn, UserPlus } from "lucide-react";
import { toast } from "sonner";

export default function JoinWorkspacePage() {
    const { token: routeToken } = useParams<{ token?: string }>();
    const [searchParams] = useSearchParams();
    const queryToken = searchParams.get("token");
    const activeToken = routeToken || queryToken || "";

    const [manualToken, setManualToken] = useState("");
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();

    const currentToken = activeToken || manualToken;
    const { data: inviteRes, isLoading: isCheckingInvite, error: inviteError } = useGetInviteDetailsQuery(currentToken, {
        skip: !currentToken,
    });

    const [joinTeam, { isLoading: isJoining }] = useJoinTeamMutation();

    const inviteData = inviteRes?.data;
    const workspace = inviteData?.workspace || {
        id: inviteData?.team_id || "default-team",
        name: inviteData?.team_name || "Floework Workspace",
        description: "Shared engineering & delivery workspace on Floework."
    };

    const handleJoin = async () => {
        if (!currentToken) {
            toast.error("Invitation token is required");
            return;
        }

        try {
            await joinTeam({ token: currentToken }).unwrap();
            toast.success(`Successfully joined ${workspace.name}!`);
            setTimeout(() => {
                navigate("/dashboard");
                window.location.reload();
            }, 600);
        } catch (err: any) {
            toast.error(err?.data?.message || err?.data || "Failed to join workspace. The invite may be expired.");
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col justify-center items-center p-4">
            {/* Header / Logo */}
            <div className="mb-6 text-center">
                <Link to="/" className="inline-flex items-center gap-2">
                    <span className="text-2xl font-black tracking-tight text-slate-900">
                        floework<span className="text-[#007dff]">.</span>
                    </span>
                </Link>
                <p className="text-xs text-slate-500 mt-1 font-medium">Collaborative Execution Platform</p>
            </div>

            <Card className="w-full max-w-md bg-white border border-slate-200/80 shadow-xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="h-2 bg-gradient-to-r from-[#007dff] via-blue-400 to-indigo-500" />

                {/* Token input mode if no token in URL */}
                {!activeToken && !inviteData && (
                    <>
                        <CardHeader className="text-center pt-6 pb-2">
                            <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 text-[#007dff] flex items-center justify-center mb-2">
                                <Users size={24} />
                            </div>
                            <CardTitle className="text-xl font-bold text-slate-900">Join a Workspace</CardTitle>
                            <CardDescription className="text-xs text-slate-500">
                                Enter your invitation token or paste the invite link below.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                                    Invitation Token
                                </label>
                                <Input
                                    value={manualToken}
                                    onChange={(e) => {
                                        let val = e.target.value.trim();
                                        if (val.includes("token=")) {
                                            const match = val.match(/token=([a-zA-Z0-9_-]+)/);
                                            if (match) val = match[1];
                                        }
                                        setManualToken(val);
                                    }}
                                    placeholder="inv_xxxxxxxxxxxx"
                                    className="h-10 text-sm font-mono bg-slate-50 border-slate-200 focus:bg-white"
                                />
                                <p className="text-[11px] text-slate-400">
                                    You can paste the entire invitation link or just the token code.
                                </p>
                            </div>
                        </CardContent>
                    </>
                )}

                {/* Loading State */}
                {currentToken && isCheckingInvite && (
                    <CardContent className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                        <Loader2 size={32} className="text-[#007dff] animate-spin" />
                        <p className="text-sm font-medium text-slate-700">Verifying invitation...</p>
                        <p className="text-xs text-slate-400">Checking permissions and workspace details</p>
                    </CardContent>
                )}

                {/* Invalid Invite State */}
                {currentToken && !isCheckingInvite && (inviteError || !inviteData) && (
                    <CardContent className="py-8 flex flex-col items-center justify-center text-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center">
                            <AlertCircle size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Invitation Not Found</h3>
                        <p className="text-xs text-slate-500 max-w-xs">
                            This invitation link is invalid, expired, or has already been used. Please request a new invite link from your workspace administrator.
                        </p>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setManualToken("");
                                navigate("/join");
                            }}
                            className="mt-2 text-xs rounded-xl"
                        >
                            Try Another Token
                        </Button>
                    </CardContent>
                )}

                {/* Valid Invite Details Card */}
                {inviteData && (
                    <>
                        <CardHeader className="text-center pt-6 pb-2">
                            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-blue-50 to-indigo-100 border border-blue-100 flex items-center justify-center mb-2 shadow-inner">
                                <Users size={26} className="text-[#007dff]" />
                            </div>
                            <span className="text-xs font-semibold text-[#007dff] uppercase tracking-wider">
                                Workspace Invitation
                            </span>
                            <CardTitle className="text-2xl font-bold text-slate-900 mt-1">
                                {workspace.name}
                            </CardTitle>
                            <CardDescription className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                                {workspace.description || "You've been invited to collaborate with the team on Floework."}
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-4 pt-4">
                            {/* Role badge */}
                            <div className="flex items-center justify-center gap-2">
                                <Badge variant="secondary" className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                                    Role: <span className="font-bold text-slate-900 ml-1">{inviteData.role || "Member"}</span>
                                </Badge>
                            </div>

                            {/* Logged in state */}
                            {isAuthenticated ? (
                                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-3">
                                    <UserAvatar name={user?.name} avatarUrl={user?.avatarUrl} size="sm" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-semibold text-slate-800 truncate">
                                            Joining as {user?.name || "You"}
                                        </p>
                                        <p className="text-[11px] text-slate-500 truncate">
                                            {user?.email || "Authenticated User"}
                                        </p>
                                    </div>
                                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                                </div>
                            ) : (
                                <div className="p-3 bg-amber-50/80 border border-amber-200/60 rounded-xl space-y-1">
                                    <p className="text-xs font-bold text-amber-800">Account Required</p>
                                    <p className="text-[11px] text-amber-700">
                                        You need to log in or create an account to accept this invitation.
                                    </p>
                                </div>
                            )}
                        </CardContent>

                        <CardFooter className="flex flex-col gap-2 pt-2 pb-6">
                            {isAuthenticated ? (
                                <Button
                                    onClick={handleJoin}
                                    disabled={isJoining}
                                    className="w-full bg-[#007dff] hover:bg-[#0066cc] text-white font-semibold h-10 rounded-xl shadow-sm flex items-center justify-center gap-2"
                                >
                                    {isJoining ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            <span>Joining Workspace...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Accept & Join Workspace</span>
                                            <ArrowRight size={16} />
                                        </>
                                    )}
                                </Button>
                            ) : (
                                <div className="grid grid-cols-2 gap-2 w-full">
                                    <Button
                                        onClick={() => navigate(`/login?redirect=${encodeURIComponent(`/join?token=${currentToken}`)}`)}
                                        className="bg-[#007dff] hover:bg-[#0066cc] text-white text-xs font-semibold h-10 rounded-xl"
                                    >
                                        <LogIn size={14} className="mr-1.5" /> Log In
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => navigate(`/register?redirect=${encodeURIComponent(`/join?token=${currentToken}`)}`)}
                                        className="border-slate-200 text-slate-700 text-xs font-semibold h-10 rounded-xl"
                                    >
                                        <UserPlus size={14} className="mr-1.5" /> Sign Up
                                    </Button>
                                </div>
                            )}

                            <Button
                                variant="ghost"
                                onClick={() => navigate(isAuthenticated ? "/dashboard" : "/")}
                                className="w-full text-xs text-slate-500 hover:text-slate-800 h-8 mt-1"
                            >
                                Cancel & Return
                            </Button>
                        </CardFooter>
                    </>
                )}
            </Card>
        </div>
    );
}
