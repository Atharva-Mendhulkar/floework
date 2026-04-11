import { useEffect } from "react";
import SidebarNavigation from "@/components/SidebarNavigation";
import TopHeader from "@/components/TopHeader";
import ActivityTable from "@/components/ActivityTable";
import ProductivityChart from "@/components/ProductivityChart";
import { useAuth } from "@/modules/auth/AuthContext";
import { useGetProjectsQuery, useGetAnalyticsDashboardQuery, useGetTeamStatusQuery, useGetExecutionNarrativeQuery, useGetBurnoutTrendQuery, useGetCurrentFocusReportQuery } from "@/store/api";
import { Zap, TrendingUp, AlertTriangle, CheckCircle2, Info, ArrowRight, Rocket } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CreateWorkspaceModal, CreateProjectModal } from "@/components/CreateWorkspaceModal";

const MiniStatCard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) => (
  <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}14` }}>
      <Icon size={16} style={{ color }} />
    </div>
    <div>
      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-lg font-bold text-slate-900 leading-tight">{value}</p>
    </div>
  </div>
);

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect to onboarding if user has no projects yet
  const { data: projectsRes, isLoading: projectsLoading } = useGetProjectsQuery();
  useEffect(() => {
    if (!projectsLoading && projectsRes?.data && projectsRes.data.length === 0) {
      navigate('/onboarding', { replace: true });
    }
  }, [projectsRes, projectsLoading, navigate]);

  const { data: dashboardRes } = useGetAnalyticsDashboardQuery();
  const { data: teamStatusRes } = useGetTeamStatusQuery();
  const { data: narrativeRes } = useGetExecutionNarrativeQuery();
  const { data: burnoutRes } = useGetBurnoutTrendQuery();
  const { data: focusReportRes } = useGetCurrentFocusReportQuery();

  const barData = (dashboardRes?.data?.barData || []) as any[];
  const burnoutData = ((burnoutRes?.data?.length ?? 0) > 0 ? burnoutRes!.data : dashboardRes?.data?.burnoutData || []) as any[];
  const teamStatus = (teamStatusRes?.data || []) as any[];

  const totalFocusHrs = barData.reduce((s, d) => s + (d.focusHrs || 0), 0).toFixed(1);
  const totalTasks = barData.reduce((s, d) => s + (d.tasksCompleted || 0), 0);
  const latestBurnout = burnoutData.at(-1)?.burnoutRisk ?? 0;
  const inFocusNow = teamStatus.filter((ts) => ts.status === "In Focus").length;

  return (
    <div className="flex h-screen bg-background p-3 gap-3">
      <SidebarNavigation />

      <div className="flex flex-col flex-1 gap-3 min-w-0">
        <TopHeader />

        <main className="flex-1 overflow-y-auto flex flex-col gap-5 p-2 lg:p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                Welcome back, {user?.name?.split(' ')[0] || 'User'}!
              </h1>
              <p className="text-slate-500 font-medium mt-0.5">Here's what's happening in your workspace today.</p>
            </div>
            <div className="flex items-center gap-2">
              <CreateWorkspaceModal />
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MiniStatCard icon={Zap} label="Focus Hours" value={`${totalFocusHrs}h`} color="#007dff" />
            <MiniStatCard icon={TrendingUp} label="Tasks Done" value={String(totalTasks)} color="#10b981" />
            <MiniStatCard icon={AlertTriangle} label="Burnout Risk" value={`${latestBurnout}%`} color="#f59e0b" />
            <MiniStatCard icon={Zap} label="In Focus Now" value={`${inFocusNow} members`} color="#8b5cf6" />
          </div>

          {/* Weekly Focus Report banner */}
          {focusReportRes?.data && (
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider mb-1">
                  Weekly Focus Report — {focusReportRes.data.weekLabel}
                  {focusReportRes.data.isLastWeek && " (last week)"}
                </p>
                <p className="text-[13px] font-semibold text-slate-800">{focusReportRes.data.summaryText}</p>
              </div>
              <button
                onClick={() => navigate('/analytics')}
                className="shrink-0 flex items-center gap-1 text-[12px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors mt-0.5"
              >
                Full report <ArrowRight size={13} />
              </button>
            </div>
          )}

          {/* Main content grid */}
          <div className="flex gap-4 flex-col lg:flex-row items-start">
            {/* Left: Activity */}
            <div className="flex-1 w-full relative z-0 flex flex-col gap-4">
              <ActivityTable />

              {/* Execution Summary from narrative engine */}
              {narrativeRes?.data && (
                <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[13px] font-semibold text-slate-900">Execution Summary</h3>
                      <p className="text-[11px] text-slate-400">Auto-generated from your focus & task data</p>
                    </div>
                    <button
                      onClick={() => navigate('/narrative')}
                      className="text-[11px] font-semibold text-[#007dff] hover:underline flex items-center gap-1"
                    >
                      Full narrative <ArrowRight size={11} />
                    </button>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[13px] font-medium text-slate-700 leading-relaxed">{narrativeRes.data.summary}</p>
                  </div>
                  {(narrativeRes?.data?.highlights || []).length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      {(narrativeRes?.data?.highlights || []).slice(0, 3).map((h: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 bg-slate-50 border border-slate-100 p-2 rounded-xl">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                          <p className="text-[11px] text-slate-600 leading-tight font-medium">{h}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Watchpoints</p>
                    <div className="flex flex-col gap-1.5">
                      {(narrativeRes?.data?.warnings || []).slice(0, 2).map((w: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 bg-amber-50 border border-amber-100 p-2 rounded-xl">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                          <p className="text-[11px] text-amber-700 leading-tight font-medium">{w}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Productivity + Team Status */}
            <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 flex flex-col gap-4">
              <ProductivityChart />

              {/* Team Status — moved from Analytics */}
              {teamStatus.length > 0 && (
                <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[13px] font-semibold text-slate-900">Team Status</h3>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {teamStatus.map((ts: any) => (
                      <div
                        key={ts.member.id}
                        className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 transition-all bg-slate-50/50"
                      >
                        <div className={`w-8 h-8 rounded-lg ${ts.member.color} flex items-center justify-center text-[10px] font-bold text-slate-700 shrink-0`}>
                          {ts.member.initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold text-slate-800 truncate">{ts.member.name}</p>
                          {ts.task && <p className="text-[10px] text-slate-400 truncate">{ts.task}</p>}
                        </div>
                        <span className={`shrink-0 flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg
                          ${ts.status === "In Focus" ? "bg-[#007dff]/10 text-[#007dff]" : "bg-slate-100 text-slate-500"}`}>
                          {ts.status === "In Focus" && <span className="w-1.5 h-1.5 rounded-full bg-[#007dff] animate-pulse" />}
                          {ts.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
