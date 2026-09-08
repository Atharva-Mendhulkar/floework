import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CognitoAuthService } from "@/services/CognitoAuthService";
import { useAuth } from "../AuthContext";

export const RegisterPage = () => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !email || !password) {
            toast.error("Please fill in all fields.");
            return;
        }

        setIsLoading(true);
        try {
            await CognitoAuthService.signUp(email, password, name);
            try {
                await login(email, password);
            } catch {
                // In demo/offline fallback, create session directly with user's name
                CognitoAuthService.createMockSession(email);
                await login(email, { id: 'usr-' + Date.now(), email, name, role: 'admin' });
            }
            localStorage.setItem('floework_onboarding_v1_complete', 'false');
            toast.success("Account created! Let's set up your workspace.");
            navigate("/onboarding");
        } catch (error: any) {
            toast.error(error.message || "Registration failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md bg-surface p-8 rounded-2xl shadow-card">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-foreground">Create an Account</h1>
                    <p className="text-sm text-text-muted mt-2">Join floework and align your productivity</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                            id="name"
                            type="text"
                            placeholder="Jane Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Work Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="jane@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={8}
                        />
                    </div>

                    <Button type="submit" className="w-full bg-focus text-focus-foreground hover:bg-focus/90" disabled={isLoading}>
                        {isLoading ? "Creating account..." : "Sign Up"}
                    </Button>
                </form>

                <div className="text-center text-sm mt-6">
                    <span className="text-text-muted">Already have an account? </span>
                    <a href="/login" className="text-focus hover:underline font-medium">Log in</a>
                </div>
            </div>
        </div>
    );
};
