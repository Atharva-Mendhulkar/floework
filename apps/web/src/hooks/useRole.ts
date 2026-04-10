import { useGetProfileQuery } from "@/store/api";

export type UserRole = "ADMIN" | "MEMBER" | "OWNER";

export function useRole() {
    const { data: profileRes } = useGetProfileQuery();
    const role = (profileRes?.data?.role?.toUpperCase() || "MEMBER") as UserRole;

    return {
        role,
        isAdmin: role === "ADMIN" || role === "OWNER",
        isMember: role === "MEMBER",
        isOwner: role === "OWNER",
        can: (action: "create_task" | "delete_task" | "invite_member" | "manage_team" | "view_analytics") => {
            switch (action) {
                case "create_task": return true; // all roles
                case "delete_task": return role !== "MEMBER";
                case "invite_member": return role === "ADMIN" || role === "OWNER";
                case "manage_team": return role === "OWNER";
                case "view_analytics": return true;
                default: return false;
            }
        },
    };
}
