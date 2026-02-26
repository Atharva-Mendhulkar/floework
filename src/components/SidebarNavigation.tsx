import { Home, Target, BarChart3, Settings, Send, AlertTriangle, Star, Layers, Zap } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useGetAlertsQuery } from "@/store/api";

const navItems = [
  { icon: Home, label: "Home", path: "/dashboard" },
  { icon: Layers, label: "Boards", path: "/dashboard" },
  { icon: Star, label: "Starred", path: "/starred" },
  { icon: Target, label: "Focus", path: "/focus" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
  { icon: Send, label: "Messages", path: "/messages" },
];

const bottomItems = [
  { icon: AlertTriangle, label: "Alerts", badge: true, path: "/alerts" },
  { icon: Settings, label: "Settings", path: "/profile" },
];

const SidebarNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: alertsRes } = useGetAlertsQuery();
  const unreadAlerts = alertsRes?.data?.filter((a: any) => !a.isRead).length || 0;

  return (
    <aside className="flex flex-col items-center justify-between w-[60px] py-5 bg-white border border-slate-200/80 rounded-2xl h-full gap-2 shadow-sm">

      {/* Brand mark */}
      <div className="flex flex-col items-center gap-4 w-full">
        <div className="w-8 h-8 rounded-xl bg-[#007dff] flex items-center justify-center mb-1 shrink-0">
          <Zap size={15} className="text-white" fill="white" />
        </div>

        {/* Nav items */}
        <nav className="flex flex-col items-center gap-1 w-full px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path && item.path !== "/dashboard"
              ? true
              : location.pathname === "/dashboard" && item.path === "/dashboard";

            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                title={item.label}
                className={`relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-150
                  ${isActive
                    ? "bg-[#007dff] text-white shadow-sm shadow-[#007dff]/30"
                    : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  }`}
              >
                <item.icon size={18} />
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom items */}
      <div className="flex flex-col items-center gap-1 px-2 w-full">
        {bottomItems.map((item) => (
          <button
            key={item.label}
            onClick={() => item.path && navigate(item.path)}
            title={item.label}
            className="relative flex items-center justify-center w-9 h-9 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <item.icon size={18} />
            {item.label === "Alerts" && unreadAlerts > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-400 rounded-full" />
            )}
          </button>
        ))}

        {/* User avatar placeholder */}
        <div className="w-8 h-8 rounded-full bg-[#007dff]/10 border-2 border-[#007dff]/20 flex items-center justify-center text-[11px] font-bold text-[#007dff] mt-1">
          U
        </div>
      </div>
    </aside>
  );
};

export default SidebarNavigation;
