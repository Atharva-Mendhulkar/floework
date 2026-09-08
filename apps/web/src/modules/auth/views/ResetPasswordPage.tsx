import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CognitoAuthService } from "@/services/CognitoAuthService";

export const ResetPasswordPage = () => {
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !code || !password) {
            toast.error("Please fill in all fields.");
            return;
        }
        if (password.length < 8) {
            toast.error("Password must be at least 8 characters.");
            return;
        }

        setIsLoading(true);
        try {
            await CognitoAuthService.confirmForgotPassword(email, code, password);
            toast.success("Password updated successfully! Please log in.");
            navigate("/login");
        } catch (error: any) {
            toast.error(error.message || "Failed to reset password");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md bg-surface p-8 rounded-2xl shadow-card">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-foreground">Set New Password</h1>
                    <p className="text-sm text-text-muted mt-2">Enter your email, verification code, and new password</p>
                </div>
                <form onSubmit={handleReset} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="code">Verification Code</Label>
                        <Input id="code" type="text" placeholder="123456" value={code} onChange={e => setCode(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">New Password</Label>
                        <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
                    </div>
                    <Button type="submit" className="w-full bg-focus text-focus-foreground hover:bg-focus/90" disabled={isLoading}>
                        {isLoading ? "Updating..." : "Update Password"}
                    </Button>
                </form>
                <div className="text-center text-sm mt-6">
                    <a href="/login" className="text-focus hover:underline font-medium">Back to login</a>
                </div>
            </div>
        </div>
    );
};
