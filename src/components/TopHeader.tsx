import { Search, Bell, ChevronLeft } from "lucide-react";

const TopHeader = () => {
  return (
    <header className="flex items-center justify-between h-14 px-6 bg-surface rounded-2xl shadow-card">
      <div className="flex items-center gap-3">
        <button className="flex items-center justify-center w-8 h-8 rounded-xl hover:bg-secondary transition-colors text-text-secondary">
          <ChevronLeft size={18} />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">
            Floe<span className="text-focus">.state</span>
          </h1>
        </div>
        <span className="text-text-muted mx-2">/</span>
        <span className="text-sm text-text-secondary">Sprint 14</span>
        <span className="text-text-muted mx-1">/</span>
        <span className="text-sm font-medium text-foreground">Task Flow</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 bg-secondary rounded-xl px-3 py-2">
          <Search size={16} className="text-text-muted" />
          <input
            type="text"
            placeholder="Search tasks, people…"
            className="bg-transparent text-sm text-foreground placeholder:text-text-muted outline-none w-48"
          />
        </div>

        <button className="relative flex items-center justify-center w-9 h-9 rounded-xl hover:bg-secondary transition-colors text-text-secondary">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-warning rounded-full" />
        </button>

        <div className="w-9 h-9 rounded-xl bg-focus flex items-center justify-center text-focus-foreground text-sm font-semibold">
          SC
        </div>
      </div>
    </header>
  );
};

export default TopHeader;
