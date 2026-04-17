import { Search, Bell, ChevronDown, LogOut, Zap, User as UserIcon, Settings, Users, UserPlus } from "lucide-react";
import { useAuth } from "@/modules/auth/AuthContext";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSearchQuery } from "@/store/slices/dashboardSlice";
import { ProjectSelector } from "./ProjectSelector";
import { SprintSelector } from "./SprintSelector";
import { ManageWorkspaceModal } from "./ManageWorkspaceModal";
import { JoinWorkspaceModal } from "./JoinWorkspaceModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGetAlertsQuery } from "@/store/api";

const TopHeader = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const searchQuery = useAppSelector((state) => state.dashboard.searchQuery);
  const { data: alertsRes } = useGetAlertsQuery(undefined, { skip: !user });
  const alerts = alertsRes?.data || [];
  const unreadCount = alerts.filter((a: any) => !a.is_read).length;

  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  // Helper for time ago
  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const initials = (user?.name || "")
    ? (user?.name || "").split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
    : "US";

  return (
    <header className="flex items-center justify-between h-14 px-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm">

      {/* Left — brand + breadcrumb */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Zap size={15} className="text-[#007dff]" fill="#007dff" />
          <span className="font-bold text-[15px] tracking-tight text-slate-900">
            floework<span className="text-[#007dff]">.</span>
          </span>
        </div>

        <span className="text-slate-300 mx-1 select-none">/</span>
        <ProjectSelector />

        <span className="text-slate-300 mx-1 select-none">/</span>
        <SprintSelector />
      </div>

      {/* Center — search */}
      <div className="flex-1 max-w-lg flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-[#007dff]/20 focus-within:bg-white transition-all border border-transparent focus-within:border-[#007dff]/30">
        <Search size={14} className="text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Search tasks, people…"
          value={searchQuery}
          onChange={(e) => dispatch(setSearchQuery(e.target.value))}
          className="bg-transparent text-[13px] text-slate-700 placeholder:text-slate-400 outline-none w-full"
        />
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-2">
        {/* Bell */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative flex items-center justify-center w-9 h-9 rounded-xl hover:bg-slate-100 transition-colors text-slate-500 focus:outline-none">
              <Bell size={17} />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-amber-400 rounded-full" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-[300px] overflow-y-auto">
              {alerts.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-slate-400 text-xs">No notifications yet</p>
                </div>
              ) : (
                alerts.map((alert: any) => (
                  <div key={alert.id} className={`px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 transition-colors ${!alert.is_read ? "bg-blue-50/30" : ""}`}>
                    <p className="text-sm font-medium text-slate-900">{alert.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{alert.description}</p>
                    <p className="text-[10px] text-slate-400 mt-2">{getTimeAgo(alert.created_at)}</p>
                  </div>
                ))
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="w-full text-center text-xs text-[#007dff] cursor-pointer" onClick={() => navigate("/alerts")}>
              <span className="w-full">View all alerts</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Divider */}
        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* User chip */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 cursor-pointer hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#007dff]/20">
              <div className="w-6 h-6 rounded-lg bg-[#007dff] flex items-center justify-center text-white text-[10px] font-bold">
                {initials}
              </div>
              <span className="text-[13px] font-medium text-slate-700 max-w-[100px] truncate">
                {user?.name ?? "User"}
              </span>
              <ChevronDown size={12} className="text-slate-400" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-1 rounded-xl shadow-lg border-slate-200">
            <DropdownMenuLabel className="font-semibold text-slate-900">My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer text-slate-700 font-medium py-2">
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer text-slate-700 font-medium py-2">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/workspace/settings")} className="cursor-pointer text-slate-700 font-medium py-2">
              <Users className="mr-2 h-4 w-4" />
              <span>Workspace Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsJoinModalOpen(true)} className="cursor-pointer text-slate-700 font-medium py-2">
              <UserPlus className="mr-2 h-4 w-4" />
              <span>Join Workspace</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 font-medium focus:text-red-700 focus:bg-red-50 cursor-pointer py-2">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ManageWorkspaceModal isOpen={isManageModalOpen} onClose={() => setIsManageModalOpen(false)} />
      <JoinWorkspaceModal isOpen={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} />
    </header>
  );
};

export default TopHeader;
