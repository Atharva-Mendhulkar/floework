import { useState, useEffect } from "react";
import { useGetProfileQuery, useUpdateProfileMutation } from "@/store/api";
import { toast } from "sonner";
import { User as UserIcon, Lock, Mail, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
    const { data: profileRes, isLoading: isLoadingProfile } = useGetProfileQuery();
    const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    useEffect(() => {
        if (profileRes?.data) {
            setName(profileRes.data.name || "");
            setEmail(profileRes.data.email || "");
        }
    }, [profileRes]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload: any = { name, email };
            if (password) {
                payload.password = password;
            }
            await updateProfile(payload).unwrap();
            toast.success("Profile updated successfully");
            setPassword(""); // Clear password field after update
        } catch (error) {
            toast.error("Failed to update profile");
            console.error(error);
        }
    };

    if (isLoadingProfile) {
        return <div className="p-4 text-text-muted">Loading profile settings...</div>;
    }

    return (
        <div className="flex-1 overflow-y-auto w-full max-w-2xl flex flex-col gap-6">
            <div>
                <h2 className="text-2xl font-bold text-foreground">User Profile Settings</h2>
                <p className="text-text-secondary mt-1">Manage your account details and security preferences.</p>
            </div>

            <div className="bg-surface rounded-2xl shadow-card border border-border p-6">
                <form onSubmit={handleUpdateProfile} className="flex flex-col gap-5">
                    <div className="flex items-center gap-4 pb-4 border-b border-border">
                        <div className="w-16 h-16 rounded-2xl bg-focus/10 text-focus flex items-center justify-center text-xl font-bold border-2 border-focus/20">
                            {name ? name.substring(0, 2).toUpperCase() : <UserIcon size={32} />}
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground text-lg">{profileRes?.data?.name || "User"}</h3>
                            <p className="text-sm text-text-muted">{profileRes?.data?.role || "Member"}</p>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <UserIcon size={14} className="text-text-muted" /> Full Name
                        </label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your Name"
                            className="max-w-md"
                        />
                    </div>

                    <div className="grid gap-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Mail size={14} className="text-text-muted" /> Email Address
                        </label>
                        <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="max-w-md"
                        />
                    </div>

                    <div className="grid gap-2 pt-4 border-t border-border">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Lock size={14} className="text-text-muted" /> New Password (Optional)
                        </label>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Leave blank to keep current password"
                            className="max-w-md"
                        />
                    </div>

                    <div className="pt-2">
                        <Button type="submit" disabled={isUpdating} className="bg-focus hover:bg-focus/90 text-white">
                            <Save size={16} className="mr-2" />
                            {isUpdating ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
