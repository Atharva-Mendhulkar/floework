import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CognitoAuthService } from "@/services/CognitoAuthService";

export const ForgotPasswordPage = () => {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) { toast.error("Please enter your email."); return; }

        setIsLoading(true);
        try {
            await CognitoAuthService.forgotPassword(email);
            setSent(true);
            toast.success("Password recovery instructions sent to your verified email.");
        } catch (error: any) {
            toast.error(error.message || "Failed to initiate password recovery");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md bg-surface p-8 rounded-2xl shadow-card">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-foreground">Reset Password</h1>
                    <p className="text-sm text-text-muted mt-2">Enter your email and Amazon Cognito will send recovery instructions</p>
                </div>
                {sent ? (
                    <div className="space-y-4 text-center">
                        <p className="text-sm text-emerald-600 font-medium">Check your inbox for the password reset code.</p>
                        <a href="/reset-password" className="inline-block text-sm text-focus hover:underline font-medium">Enter reset code</a>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                        </div>
                        <Button type="submit" className="w-full bg-focus text-focus-foreground hover:bg-focus/90" disabled={isLoading}>
                            {isLoading ? "Sending..." : "Send Reset Instructions"}
                        </Button>
                    </form>
                )}
                <div className="text-center text-sm mt-6">
                    <a href="/login" className="text-focus hover:underline font-medium">Back to login</a>
                </div>
            </div>
        </div>
    );
};
