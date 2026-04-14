import { useGetRecentActivityQuery } from "@/store/api";
import { Plus, Upload, Calendar, Star } from "lucide-react";
import { useAppSelector } from "@/store/hooks";

const statusColors: Record<string, string> = {
  Executed: "bg-emerald-100 text-emerald-700",
  Scheduled: "bg-focus/15 text-focus",
  "In Progress": "bg-amber-100 text-amber-700",
  Blocked: "bg-warning/15 text-warning",
};

const ActivityTable = () => {
  const searchQuery = useAppSelector((state) => state.dashboard.searchQuery);
  const { data: activityRes, isLoading } = useGetRecentActivityQuery();
  const activities = activityRes?.data || [];
  
  const filteredActivities = activities.filter((a: any) =>
    !searchQuery ||
    a.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.assignedUser.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-surface rounded-2xl shadow-card p-5 flex flex-col gap-4 flex-1 min-w-0">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
        <div className="flex items-center gap-1">
          <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors text-text-muted">
            <Plus size={14} />
          </button>
          <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors text-text-muted">
            <Upload size={14} />
          </button>
          <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors text-text-muted">
            <Calendar size={14} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs text-text-muted border-b border-border">
              <th className="pb-2 pr-4 font-medium w-6"></th>
              <th className="pb-2 pr-4 font-medium">Subject</th>
              <th className="pb-2 pr-4 font-medium">Status</th>
              <th className="pb-2 pr-4 font-medium">Start</th>
              <th className="pb-2 pr-4 font-medium">End</th>
              <th className="pb-2 font-medium">Assigned</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm font-medium text-slate-400">
                  Loading activity...
                </td>
              </tr>
            ) : filteredActivities.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm font-medium text-slate-400">
                  No activity found matching your search.
                </td>
              </tr>
            ) : filteredActivities.map((a) => (
              <tr key={a.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/40 transition-colors">
                <td className="py-2.5 pr-2">
                  <Star size={13} className="text-text-muted" />
                </td>
                <td className="py-2.5 pr-4 text-sm font-medium text-foreground">{a.subject}</td>
                <td className="py-2.5 pr-4">
                  <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-md ${statusColors[a.status]}`}>
                    {a.status}
                  </span>
                </td>
                <td className="py-2.5 pr-4 text-xs text-text-secondary">{a.startDate}</td>
                <td className="py-2.5 pr-4 text-xs text-text-secondary">{a.endDate}</td>
                <td className="py-2.5 text-sm text-text-secondary">{a.assignedUser}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ActivityTable;
