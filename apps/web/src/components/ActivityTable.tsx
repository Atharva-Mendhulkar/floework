import { useGetRecentActivityQuery, useGetProjectsQuery, useGetProjectSprintsQuery } from "@/store/api";
import { Plus, Upload, Calendar, Star } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { useState } from "react";
import { TaskCreateModal } from "./TaskCreateModal";
import { toast } from "sonner";

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

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { data: projectsRes } = useGetProjectsQuery();
  const activeProjectId = useAppSelector((state) => state.dashboard.activeProjectId);
  const activeSprintId = useAppSelector((state) => state.dashboard.activeSprintId);
  const { data: sprintsRes } = useGetProjectSprintsQuery(activeProjectId!, { skip: !activeProjectId });
  
  const activeProject = projectsRes?.data?.find(p => p.id === (activeProjectId || projectsRes?.data?.[0]?.id));
  const activeSprint = sprintsRes?.data?.find(s => s.id === activeSprintId);
  const effectiveProjectId = activeProjectId || projectsRes?.data?.[0]?.id;

  const handleExport = () => {
    if (filteredActivities.length === 0) return toast.error("No data to export");
    const headers = ["Subject", "Status", "Start", "End", "Assigned"].join(",");
    const rows = filteredActivities.map(a => 
      `"${a.subject}","${a.status}","${a.startDate}","${a.endDate}","${a.assignedUser}"`
    ).join("\n");
    const workspaceName = activeProject?.name?.replace(/\s+/g, '_') || "Workspace";
    const sprintName = activeSprint?.name?.replace(/\s+/g, '_') || (activeSprintId === null ? "Backlog" : "Sprint");
    const blob = new Blob([headers + "\n" + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${workspaceName}_${sprintName}_Activity_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Activity exported to CSV");
  };

  const handleCalendarExport = () => {
    if (filteredActivities.length === 0) return toast.error("No activities to sync");
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Floework//NONSGML v1.0//EN\n";
    filteredActivities.forEach(a => {
      const start = new Date(a.startDate).toISOString().replace(/[-:]/g, '').split('.')[0] + "Z";
      const end = new Date(a.endDate || a.startDate).toISOString().replace(/[-:]/g, '').split('.')[0] + "Z";
      icsContent += `BEGIN:VEVENT\nSUMMARY:${a.subject}\nDTSTART:${start}\nDTEND:${end}\nEND:VEVENT\n`;
    });
    icsContent += "END:VCALENDAR";
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', 'floework_schedule.ics');
    document.body.appendChild(link);
    link.click();
    toast.success("Calendar sync file generated");
  };

  return (
    <div className="bg-surface rounded-2xl shadow-card p-5 flex flex-col gap-4 flex-1 min-w-0">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors text-text-muted"
            title="Add Activity"
          >
            <Plus size={14} />
          </button>
          <button 
            onClick={handleExport}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors text-text-muted"
            title="Export Excel (CSV)"
          >
            <Upload size={14} />
          </button>
          <button 
            onClick={handleCalendarExport}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors text-text-muted"
            title="Sync to Calendar"
          >
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

      {effectiveProjectId && (
        <TaskCreateModal 
          isOpen={isCreateModalOpen} 
          onClose={() => setIsCreateModalOpen(false)} 
          projectId={effectiveProjectId} 
        />
      )}
    </div>
  );
};

export default ActivityTable;
