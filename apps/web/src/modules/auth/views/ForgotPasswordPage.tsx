import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useForgotPasswordMutation } from "@/store/api";

export const ForgotPasswordPage = () => {
    const [email, setEmail] = useState("");
    const [forgotPasswordApi, { isLoading }] = useForgotPasswordMutation();
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            toast.error("Please enter your email");
            return;
        }

        try {
            const response = await forgotPasswordApi({ email }).unwrap();
            setSubmitted(true);
            
            // For development, we auto-toast the token so you can easily reset
            if (response.devResetToken) {
                toast.success(`Dev Token (copy it!): ${response.devResetToken}`, { duration: 10000 });
            } else {
                toast.success(response.message);
            }
        } catch (error: any) {
            toast.error(error.data?.message || "Failed to send reset link");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md bg-surface p-8 rounded-2xl shadow-card">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-foreground">Reset Password</h1>
                    <p className="text-sm text-text-muted mt-2">Enter your email to receive a reset link</p>
                </div>

                {submitted ? (
                    <div className="text-center space-y-4">
                        <div className="bg-focus/10 text-focus px-4 py-3 rounded text-sm mb-4">
                            If your email exists in our system, you will receive a password reset link.
                        </div>
                        <a href="/login" className="block w-full">
                            <Button variant="outline" className="w-full">Return to Login</Button>
                        </a>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <Button type="submit" className="w-full bg-focus text-focus-foreground hover:bg-focus/90" disabled={isLoading}>
                            {isLoading ? "Sending..." : "Send Reset Link"}
                        </Button>
                        
                        <div className="text-center mt-4">
                            <a href="/login" className="text-sm text-text-muted hover:text-foreground">Back to Login</a>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};
