import { Home, ListTodo, Target, BarChart3, Settings, Send, AlertTriangle, Star, Share2, Copy } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Share2, label: "Flow", path: "/" },
  { icon: Copy, label: "Boards", path: "/" },
  { icon: Star, label: "Starred", path: "/" },
  { icon: ListTodo, label: "Tasks", path: "/" },
  { icon: Target, label: "Focus", path: "/focus" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
  { icon: Send, label: "Messages", path: "/" },
];

const bottomItems = [
  { icon: AlertTriangle, label: "Alerts", badge: true },
  { icon: Settings, label: "Settings" },
];

const SidebarNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="flex flex-col items-center justify-between w-16 py-6 bg-surface rounded-2xl shadow-card h-full">
      <nav className="flex flex-col items-center gap-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path && (item.label === "Home" || item.path !== "/");
          const isHomeActive = item.label === "Home" && location.pathname === "/";
          const active = isActive || isHomeActive;

          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-colors ${
                active
                  ? "bg-focus text-focus-foreground"
                  : "text-text-secondary hover:bg-secondary hover:text-foreground"
              }`}
              title={item.label}
            >
              <item.icon size={20} />
            </button>
          );
        })}
      </nav>

      <div className="flex flex-col items-center gap-1">
        {bottomItems.map((item) => (
          <button
            key={item.label}
            className="relative flex items-center justify-center w-10 h-10 rounded-xl text-text-secondary hover:bg-secondary hover:text-foreground transition-colors"
            title={item.label}
          >
            <item.icon size={20} />
            {item.badge && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-warning rounded-full" />
            )}
          </button>
        ))}
      </div>
    </aside>
  );
};

export default SidebarNavigation;
