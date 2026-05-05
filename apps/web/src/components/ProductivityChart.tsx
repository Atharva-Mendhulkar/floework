import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useGetTasksQuery, useGetProjectsQuery } from "@/store/api";
import { useAppSelector } from "@/store/hooks";
import { Plus, Upload, Calendar } from "lucide-react";
import { useState } from "react";
import { TaskCreateModal } from "./TaskCreateModal";
import { toast } from "sonner";

const ProductivityChart = () => {
  const { data: tasksRes } = useGetTasksQuery();
  const tasks = tasksRes?.data || [];

  const stats = tasks.reduce((acc: any, t) => {
    const status = t.status || 'backlog';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const chartData = [
    { name: "Backlog", value: stats.backlog || 0, fill: "#94a3b8" },
    { name: "Focus", value: stats.in_progress || 0, fill: "#007dff" },
    { name: "Review", value: stats.review || 0, fill: "#8b5cf6" },
    { name: "Outcome", value: stats.done || 0, fill: "#10b981" },
  ];

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { data: projectsRes } = useGetProjectsQuery();
  const activeProjectId = useAppSelector((state) => state.dashboard.activeProjectId);
  const effectiveProjectId = activeProjectId || projectsRes?.data?.[0]?.id;

  const handleExport = () => {
    if (chartData.length === 0) return toast.error("No data to export");
    const headers = ["Category", "Count"].join(",");
    const rows = chartData.map(d => `"${d.name}",${d.value}`).join("\n");
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `floework_focus_distribution_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    toast.success("Focus distribution exported");
  };

  const handleCalendarSync = () => {
    // Generate a single event summarizing today's distribution
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Floework//NONSGML v1.0//EN\n";
    const start = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + "Z";
    const summary = chartData.map(d => `${d.name}: ${d.value}`).join(", ");
    icsContent += `BEGIN:VEVENT\nSUMMARY:Daily Focus Distribution: ${total} sessions\nDESCRIPTION:${summary}\nDTSTART:${start}\nDTEND:${start}\nEND:VEVENT\n`;
    icsContent += "END:VCALENDAR";
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', 'focus_summary.ics');
    document.body.appendChild(link);
    link.click();
    toast.success("Focus summary added to calendar");
  };

  return (
    <div className="bg-surface rounded-2xl shadow-card p-5 flex flex-col gap-4 flex-1 min-w-[280px]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Focus Distribution</h3>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors text-text-muted"
            title="Add Task"
          >
            <Plus size={14} />
          </button>
          <button 
            onClick={handleExport}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors text-text-muted"
            title="Export Distribution"
          >
            <Upload size={14} />
          </button>
          <button 
            onClick={handleCalendarSync}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors text-text-muted"
            title="Sync Summary"
          >
            <Calendar size={14} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="w-36 h-36 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={65}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-foreground">{total}</span>
            <span className="text-[10px] text-text-muted">sessions</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {chartData.map((entry) => (
            <div key={entry.name} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.fill }}
              />
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-foreground">{entry.value}</span>
                <span className="text-xs text-text-muted">{entry.name}</span>
              </div>
            </div>
          ))}
        </div>
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

export default ProductivityChart;
