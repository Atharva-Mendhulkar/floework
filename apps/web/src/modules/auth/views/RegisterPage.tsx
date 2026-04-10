import { useState } from "react";
import { useAuth } from "../AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useRegisterMutation, useGoogleLoginMutation } from "@/store/api";
import { GoogleLogin } from "@react-oauth/google";

export const RegisterPage = () => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const { login: setAuthContext } = useAuth();
    const [registerApi, { isLoading }] = useRegisterMutation();
    const [googleLogin] = useGoogleLoginMutation();
    const navigate = useNavigate();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !email || !password) {
            toast.error("Please fill in all fields.");
            return;
        }

        try {
            const response = await registerApi({ name, email, password }).unwrap();
            setAuthContext(response.data.token, {
                id: response.data.id,
                email: response.data.email,
                name: response.data.name,
                role: response.data.role.toLowerCase() as "admin" | "member"
            });
            toast.success("Account created successfully!");
            navigate("/onboarding");
        } catch (error: any) {
            toast.error(error.data?.message || "Registration failed");
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
                            minLength={6}
                        />
                    </div>

                    <Button type="submit" className="w-full bg-focus text-focus-foreground hover:bg-focus/90" disabled={isLoading}>
                        {isLoading ? "Creating account..." : "Sign Up"}
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
                                toast.success("Successfully registered with Google!");
                                navigate("/onboarding");
                            } catch (error: any) {
                                toast.error(error.data?.message || "Google Registration Failed");
                            }
                        }}
                        onError={() => toast.error("Google Registration Failed")}
                        theme="outline"
                        size="large"
                    />
                </div>

                <div className="text-center text-sm">
                    <span className="text-text-muted">Already have an account? </span>
                    <a href="/login" className="text-focus hover:underline font-medium">Log in</a>
                </div>
            </div>
        </div>
    );
};
