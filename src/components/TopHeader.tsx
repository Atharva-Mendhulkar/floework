import { Search, Bell, ChevronDown, LogOut, Zap } from "lucide-react";
import { useAuth } from "@/modules/auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSearchQuery } from "@/store/slices/dashboardSlice";

const TopHeader = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const searchQuery = useAppSelector((state) => state.dashboard.searchQuery);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const initials = user?.name
    ? user.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
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

        <div className="flex items-center gap-1.5 cursor-pointer group">
          <span className="text-[13px] text-slate-500 group-hover:text-slate-800 transition-colors font-medium">Sprint 14</span>
          <ChevronDown size={13} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
        </div>
      </div>

      {/* Center — search */}
      <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2 w-56 focus-within:ring-2 focus-within:ring-[#007dff]/20 focus-within:bg-white transition-all border border-transparent focus-within:border-[#007dff]/30">
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
        <button className="relative flex items-center justify-center w-9 h-9 rounded-xl hover:bg-slate-100 transition-colors text-slate-500">
          <Bell size={17} />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-amber-400 rounded-full" />
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* User chip */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 cursor-pointer hover:bg-slate-100 transition-colors">
          <div className="w-6 h-6 rounded-lg bg-[#007dff] flex items-center justify-center text-white text-[10px] font-bold">
            {initials}
          </div>
          <span className="text-[13px] font-medium text-slate-700 max-w-[100px] truncate">
            {user?.name ?? "User"}
          </span>
          <ChevronDown size={12} className="text-slate-400" />
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-red-50 hover:text-red-500 text-slate-400 transition-colors"
          title="Log Out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
};

export default TopHeader;
