import { Search, Bell, ChevronDown, LogOut, Zap, User as UserIcon, Settings, Users, UserPlus, X, LayoutDashboard, Kanban, FileText, BarChart3, Star, MessageSquare, CreditCard, CheckCircle2, CornerDownLeft, ArrowRight } from "lucide-react";
import { useAuth } from "@/modules/auth/AuthContext";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSearchQuery, setActiveTask } from "@/store/slices/dashboardSlice";
import { selectTask } from "@/store/slices/projectSlice";
import { ProjectSelector } from "./ProjectSelector";
import { SprintSelector } from "./SprintSelector";
import { ManageWorkspaceModal } from "./ManageWorkspaceModal";
import { JoinWorkspaceModal } from "./JoinWorkspaceModal";
import { InviteToWorkspaceModal } from "./InviteToWorkspaceModal";
import { UserAvatar } from "./UserAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGetAlertsQuery, api } from "@/store/api";

const NAVIGATION_PAGES = [
  { id: "page-dashboard", title: "Dashboard", subtitle: "Execution telemetry, metrics & activity", path: "/dashboard", icon: LayoutDashboard },
  { id: "page-boards", title: "Execution Graph & Boards", subtitle: "Kanban board & causal graph view", path: "/boards", icon: Kanban },
  { id: "page-focus", title: "Focus Zone", subtitle: "Deep work sessions, timer & stability", path: "/focus", icon: Zap },
  { id: "page-narrative", title: "Effort Narrative", subtitle: "AI sprint synthesis & executive review", path: "/narrative", icon: FileText },
  { id: "page-analytics", title: "Analytics & Trends", subtitle: "Velocity, fragmentation & bottlenecks", path: "/analytics", icon: BarChart3 },
  { id: "page-starred", title: "Starred Deliverables", subtitle: "Priority bookmarked deliverable nodes", path: "/starred", icon: Star },
  { id: "page-messages", title: "Messages & Threads", subtitle: "Team discussions and task updates", path: "/messages", icon: MessageSquare },
  { id: "page-profile", title: "Profile & Mascots", subtitle: "Personal credentials, mascots & UI themes", path: "/profile", icon: UserIcon },
  { id: "page-settings", title: "Workspace Settings", subtitle: "Team members & permissions", path: "/workspace/settings", icon: Settings },
  { id: "page-billing", title: "Billing & Plans", subtitle: "Subscription & invoice management", path: "/billing", icon: CreditCard },
  { id: "page-alerts", title: "Alerts & Notifications", subtitle: "System alerts & activity notices", path: "/alerts", icon: Bell },
];

const TopHeader = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const searchQuery = useAppSelector((state) => state.dashboard.searchQuery);
  const { data: profileRes } = api.useGetProfileQuery(undefined, { skip: !user });
  const profile = profileRes?.data || user;
  const { data: alertsRes } = useGetAlertsQuery(undefined, { skip: !user });
  const alerts = alertsRes?.data || [];
  const unreadCount = alerts.filter((a: any) => !a.is_read).length;

  const { data: tasksRes } = api.useGetTasksQuery(undefined, { skip: !user });
  const tasks = (tasksRes?.data || []) as any[];

  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Search Palette State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Global keyboard shortcut: Ctrl+` (or Cmd+`)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === '`' || e.code === 'Backquote')) {
        e.preventDefault();
        setIsSearchOpen(true);
        setTimeout(() => {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }, 10);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Dismiss on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Search Results Computation
  const query = (searchQuery || "").trim().toLowerCase();

  const filteredPages = query
    ? NAVIGATION_PAGES.filter(p => p.title.toLowerCase().includes(query) || p.subtitle.toLowerCase().includes(query))
    : NAVIGATION_PAGES.slice(0, 5);

  const filteredTasks = query
    ? tasks.filter(t => (t.title && t.title.toLowerCase().includes(query)) || (t.description && t.description.toLowerCase().includes(query))).slice(0, 8)
    : [];

  const allResults: Array<
    | { type: 'page'; id: string; data: typeof NAVIGATION_PAGES[0] }
    | { type: 'task'; id: string; data: any }
  > = [
    ...filteredPages.map(p => ({ type: 'page' as const, id: p.id, data: p })),
    ...filteredTasks.map(t => ({ type: 'task' as const, id: t.id, data: t })),
  ];

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  const handleSelectItem = (item: typeof allResults[0]) => {
    if (item.type === 'page') {
      navigate(item.data.path);
    } else if (item.type === 'task') {
      dispatch(selectTask(item.data));
      dispatch(setActiveTask(item.data.id));
      navigate('/boards');
    }
    setIsSearchOpen(false);
    dispatch(setSearchQuery(''));
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (allResults.length > 0) {
        setSelectedIndex(prev => (prev + 1) % allResults.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (allResults.length > 0) {
        setSelectedIndex(prev => (prev - 1 + allResults.length) % allResults.length);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allResults.length > 0 && allResults[selectedIndex]) {
        handleSelectItem(allResults[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsSearchOpen(false);
      searchInputRef.current?.blur();
    }
  };

  return (
    <header className="flex items-center justify-between h-14 px-5 bg-white/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-sm sticky top-0 z-50">

      {/* Left — brand + breadcrumb */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[15px] tracking-tight text-slate-900">
            floework<span className="text-[#007dff]">.</span>
          </span>
        </div>

        <span className="text-slate-300 mx-1 select-none">/</span>
        <ProjectSelector />

        <span className="text-slate-300 mx-1 select-none">/</span>
        <SprintSelector />
      </div>

      {/* Center — Interactive Usable Search Bar with Ctrl+` */}
      <div className="relative flex-1 max-w-lg mx-3" ref={searchContainerRef}>
        <div 
          onClick={() => {
            setIsSearchOpen(true);
            searchInputRef.current?.focus();
          }}
          className="flex items-center gap-2 bg-slate-100/90 hover:bg-slate-100 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-[#007dff]/20 focus-within:bg-white transition-all border border-transparent focus-within:border-[#007dff]/30 cursor-text"
        >
          <Search size={14} className="text-slate-400 shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search tasks, views, commands…"
            value={searchQuery}
            onChange={(e) => {
              dispatch(setSearchQuery(e.target.value));
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            onKeyDown={handleSearchKeyDown}
            className="bg-transparent text-[13px] text-slate-700 placeholder:text-slate-400 outline-none w-full"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                dispatch(setSearchQuery(''));
                searchInputRef.current?.focus();
              }}
              className="text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X size={13} />
            </button>
          )}
          <kbd 
            onClick={(e) => {
              e.stopPropagation();
              setIsSearchOpen(true);
              searchInputRef.current?.focus();
            }}
            title="Press Ctrl+` to search anytime" 
            className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono font-semibold text-slate-400 bg-white border border-slate-200/90 px-1.5 py-0.5 rounded shadow-2xs select-none shrink-0"
          >
            Ctrl+`
          </kbd>
        </div>

        {/* Search Results Dropdown Popover */}
        {isSearchOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden z-50 max-h-[460px] flex flex-col animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="overflow-y-auto max-h-[400px] p-2 space-y-3 divide-y divide-slate-100 no-scrollbar">
              
              {/* Pages Section */}
              {filteredPages.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1">
                    {query ? "Navigation & Views" : "Quick Navigation"}
                  </p>
                  {filteredPages.map((page) => {
                    const itemIndex = allResults.findIndex(r => r.type === 'page' && r.id === page.id);
                    const isSelected = itemIndex === selectedIndex;
                    const IconComponent = page.icon;

                    return (
                      <div
                        key={page.id}
                        onClick={() => handleSelectItem({ type: 'page', id: page.id, data: page })}
                        onMouseEnter={() => setSelectedIndex(itemIndex)}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-colors ${
                          isSelected ? "bg-blue-50/80 text-[#007dff]" : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected ? "bg-[#007dff]/10 text-[#007dff]" : "bg-slate-100 text-slate-500"
                          }`}>
                            <IconComponent size={14} />
                          </div>
                          <div className="truncate">
                            <p className="font-semibold text-slate-900 truncate">{page.title}</p>
                            <p className="text-[11px] text-slate-400 truncate">{page.subtitle}</p>
                          </div>
                        </div>
                        {isSelected && <ArrowRight size={13} className="text-[#007dff] shrink-0 ml-2" />}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tasks Section */}
              {filteredTasks.length > 0 && (
                <div className="pt-2 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1">
                    Matching Tasks ({filteredTasks.length})
                  </p>
                  {filteredTasks.map((task) => {
                    const itemIndex = allResults.findIndex(r => r.type === 'task' && r.id === task.id);
                    const isSelected = itemIndex === selectedIndex;

                    return (
                      <div
                        key={task.id}
                        onClick={() => handleSelectItem({ type: 'task', id: task.id, data: task })}
                        onMouseEnter={() => setSelectedIndex(itemIndex)}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-colors ${
                          isSelected ? "bg-blue-50/80 text-[#007dff]" : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            task.status === 'done' ? "bg-emerald-50 text-emerald-600" :
                            task.status === 'in-progress' ? "bg-blue-50 text-[#007dff]" :
                            "bg-slate-100 text-slate-500"
                          }`}>
                            <CheckCircle2 size={14} />
                          </div>
                          <div className="truncate">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-slate-900 truncate">{task.title}</p>
                              {task.priority && (
                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                                  task.priority === 'high' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {task.priority}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 truncate">
                              Status: {task.status || "backlog"} · Project: {task.projectId || "workspace"}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">Open Task</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Empty State */}
              {allResults.length === 0 && query && (
                <div className="px-4 py-8 text-center text-slate-400">
                  <p className="text-xs font-medium">No results found for &ldquo;{query}&rdquo;</p>
                  <p className="text-[11px] mt-1 text-slate-400">Try searching for a different keyword, view, or task ID.</p>
                </div>
              )}
            </div>

            {/* Keyboard Footer */}
            <div className="bg-slate-50/80 border-t border-slate-100 px-3 py-1.5 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><kbd className="font-mono bg-white border border-slate-200 px-1 py-0.5 rounded text-[10px]">↑↓</kbd> navigate</span>
                <span className="flex items-center gap-1"><kbd className="font-mono bg-white border border-slate-200 px-1 py-0.5 rounded text-[10px]">↵</kbd> select</span>
                <span className="flex items-center gap-1"><kbd className="font-mono bg-white border border-slate-200 px-1 py-0.5 rounded text-[10px]">esc</kbd> close</span>
              </div>
              <span className="text-[10px] font-medium text-slate-400">Press Ctrl+` to toggle</span>
            </div>
          </div>
        )}
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

        {/* User chip */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 cursor-pointer hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#007dff]/20">
              <UserAvatar name={profile?.name} avatarUrl={profile?.avatarUrl} size="sm" />
              <span className="text-[13px] font-medium text-slate-700 max-w-[100px] truncate">
                {profile?.name ?? "User"}
              </span>
              <ChevronDown size={12} className="text-slate-400" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-1 rounded-xl shadow-lg border-slate-200">
            <DropdownMenuLabel className="font-semibold text-slate-900">My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer text-slate-700 font-medium py-2 focus:bg-slate-100 focus:text-slate-900">
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer text-slate-700 font-medium py-2 focus:bg-slate-100 focus:text-slate-900">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setIsInviteModalOpen(true)} className="cursor-pointer text-slate-700 font-medium py-2 focus:bg-slate-100 hover:bg-slate-100 focus:text-slate-900">
              <UserPlus className="mr-2 h-4 w-4 text-slate-600" />
              <span>Invite Members</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/workspace/settings")} className="cursor-pointer text-slate-700 font-medium py-2 focus:bg-slate-100 focus:text-slate-900">
              <Users className="mr-2 h-4 w-4" />
              <span>Workspace Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsJoinModalOpen(true)} className="cursor-pointer text-slate-700 font-medium py-2 focus:bg-slate-100 focus:text-slate-900">
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
      <InviteToWorkspaceModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} />
    </header>
  );
};

export default TopHeader;
