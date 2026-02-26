import { useState } from "react";
import { useAuth } from "../AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useLoginMutation, useGoogleLoginMutation } from "@/store/api";
import { GoogleLogin } from "@react-oauth/google";

export const LoginPage = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const { login: setAuthContext } = useAuth();
    const [loginApi, { isLoading }] = useLoginMutation();
    const [googleLogin] = useGoogleLoginMutation();
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            toast.error("Please enter both email and password.");
            return;
        }

        try {
            const response = await loginApi({ email, password }).unwrap();
            setAuthContext(response.data.token, {
                id: response.data.id,
                email: response.data.email,
                name: response.data.name,
                role: response.data.role.toLowerCase() as "admin" | "member"
            });
            toast.success("Successfully logged in!");
            navigate("/dashboard");
        } catch (error: any) {
            toast.error(error.data?.message || "Invalid credentials");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md bg-surface p-8 rounded-2xl shadow-card">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-foreground">Welcome to floework</h1>
                    <p className="text-sm text-text-muted mt-2">Sign in to sync your focus sessions</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
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
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password">Password</Label>
                            <a href="#" className="text-xs text-focus hover:underline">Forgot password?</a>
                        </div>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <Button type="submit" className="w-full bg-focus text-focus-foreground hover:bg-focus/90" disabled={isLoading}>
                        {isLoading ? "Signing in..." : "Sign In"}
                    </Button>
                </form>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-surface px-2 text-text-muted">Or continue with</span>
                    </div>
                </div>

                <div className="flex justify-center w-full mb-6">
                    <GoogleLogin
                        onSuccess={async (credentialResponse) => {
                            if (!credentialResponse.credential) return;
                            try {
                                const response = await googleLogin({ idToken: credentialResponse.credential }).unwrap();
                                setAuthContext(response.data.token, {
                                    id: response.data.id,
                                    email: response.data.email,
                                    name: response.data.name,
                                    role: response.data.role.toLowerCase() as "admin" | "member"
                                });
                                toast.success("Successfully logged in with Google!");
                                navigate("/onboarding");
                            } catch (error: any) {
                                toast.error(error.data?.message || "Google Authentication Failed");
                            }
                        }}
                        onError={() => toast.error("Google Login Failed")}
                        theme="outline"
                        size="large"
                    />
                </div>

                <div className="text-center text-sm">
                    <span className="text-text-muted">Don't have an account? </span>
                    <a href="/register" className="text-focus hover:underline font-medium">Sign up</a>
                </div>
            </div>
        </div>
    );
};
