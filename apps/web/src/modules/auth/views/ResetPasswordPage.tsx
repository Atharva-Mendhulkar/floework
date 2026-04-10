import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useResetPasswordMutation } from "@/store/api";

export const ResetPasswordPage = () => {
    const { token } = useParams<{ token: string }>();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [resetPasswordApi, { isLoading }] = useResetPasswordMutation();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!password) {
            toast.error("Please enter a new password");
            return;
        }
        
        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        if (password.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        try {
            const response = await resetPasswordApi({ token: token as string, password }).unwrap();
            toast.success(response.message || "Password updated successfully");
            navigate("/login");
        } catch (error: any) {
            toast.error(error.data?.message || "Invalid or expired token");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md bg-surface p-8 rounded-2xl shadow-card">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-foreground">Set New Password</h1>
                    <p className="text-sm text-text-muted mt-2">Create a new secure password</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="password">New Password</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>

                    <Button type="submit" className="w-full bg-focus text-focus-foreground hover:bg-focus/90" disabled={isLoading}>
                        {isLoading ? "Updating..." : "Update Password"}
                    </Button>
                </form>
            </div>
        </div>
    );
};
