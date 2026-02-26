import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from "recharts";
import { useGetAnalyticsDashboardQuery, useGetTeamStatusQuery } from "@/store/api";
import { TrendingUp, Users, Zap, AlertTriangle } from "lucide-react";

const BLUE = "#007dff";
const BLUE_LIGHT = "#60a5fa";
const RED = "#f87171";

const StatCard = ({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: string; sub?: string; color: string;
}) => (
  <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0`} style={{ background: `${color}18` }}>
      <Icon size={17} style={{ color }} />
    </div>
    <div>
      <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold text-slate-900 leading-tight">{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

const AnalyticsPage = () => {
  const { data: dashboardRes, isLoading: isLoadingDash } = useGetAnalyticsDashboardQuery();
  const { data: teamStatusRes, isLoading: isLoadingTeam } = useGetTeamStatusQuery();

  if (isLoadingDash || isLoadingTeam) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#007dff] border-t-transparent rounded-full animate-spin" />
          <p className="text-[13px] text-slate-400 font-medium">Loading analytics…</p>
        </div>
      </div>
    );
  }

  const { barData = [], burnoutData = [] } = dashboardRes?.data || {};
  const teamStatus = teamStatusRes?.data || [];

  const totalFocusHrs = (barData as any[]).reduce((s: number, d: any) => s + (d.focusHrs || 0), 0);
  const totalTasks = (barData as any[]).reduce((s: number, d: any) => s + (d.tasksCompleted || 0), 0);
  const inFocusNow = (teamStatus as any[]).filter((ts: any) => ts.status === "In Focus").length;
  const latestBurnout = (burnoutData as any[]).at(-1)?.burnoutRisk ?? 0;

  const tooltipStyle = {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
    fontSize: 12,
  };

  return (
    <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1">
      {/* Page title */}
      <div>
        <h2 className="text-[15px] font-semibold text-slate-900">Analytics</h2>
        <p className="text-[12px] text-slate-400">Focus patterns, effort signals, and team health.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Zap} label="Focus Hours" value={`${totalFocusHrs}h`} sub="This week" color={BLUE} />
        <StatCard icon={TrendingUp} label="Tasks Done" value={String(totalTasks)} sub="This week" color="#10b981" />
        <StatCard icon={Users} label="In Focus Now" value={String(inFocusNow)} sub="Team members" color="#8b5cf6" />
        <StatCard icon={AlertTriangle} label="Burnout Risk" value={`${latestBurnout}%`} sub="Current estimate" color="#f59e0b" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Focus Hours vs Tasks */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5 flex flex-col gap-4">
          <div>
            <h3 className="text-[13px] font-semibold text-slate-900">Focus Hours vs Tasks Completed</h3>
            <p className="text-[11px] text-slate-400">Daily breakdown this week</p>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} barGap={4} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="focusHrs" name="Focus Hrs" fill={BLUE} radius={[5, 5, 0, 0]} />
                <Bar dataKey="tasksCompleted" name="Tasks Done" fill={BLUE_LIGHT} radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Burnout Risk */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5 flex flex-col gap-4">
          <div>
            <h3 className="text-[13px] font-semibold text-slate-900">Burnout Risk Trend</h3>
            <p className="text-[11px] text-slate-400">Weekly rolling analysis</p>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={burnoutData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="interrupts" name="Interrupts" stroke={BLUE} strokeWidth={2} dot={{ r: 3, fill: BLUE }} />
                <Line type="monotone" dataKey="burnoutRisk" name="Burnout Risk %" stroke={RED} strokeWidth={2.5} dot={{ r: 3, fill: RED }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Team Status */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5 flex flex-col gap-4">
        <div>
          <h3 className="text-[13px] font-semibold text-slate-900">Team Status</h3>
          <p className="text-[11px] text-slate-400">Live execution state across the team</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {(teamStatus as any[]).map((ts: any) => (
            <div
              key={ts.member.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all bg-slate-50/50"
            >
              <div className={`w-9 h-9 rounded-xl ${ts.member.color} flex items-center justify-center text-[11px] font-bold text-slate-700 shrink-0`}>
                {ts.member.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-slate-800 truncate">{ts.member.name}</p>
                {ts.task && <p className="text-[11px] text-slate-400 truncate">{ts.task}</p>}
              </div>
              <span className={`shrink-0 flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-lg
                ${ts.status === "In Focus"
                  ? "bg-[#007dff]/10 text-[#007dff]"
                  : "bg-slate-100 text-slate-500"
                }`}
              >
                {ts.status === "In Focus" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#007dff] animate-pulse" />
                )}
                {ts.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
