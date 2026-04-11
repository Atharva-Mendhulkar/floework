import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from "recharts";
import { useGetAnalyticsDashboardQuery, useGetBurnoutTrendQuery } from "@/store/api";
import { useState } from "react";
import FocusStabilityMap from "@/components/FocusStabilityMap";
import BottleneckPanel from "@/components/BottleneckPanel";
import FocusReportCard from "@/components/analytics/FocusReportCard";
import EstimationAccuracyTab from "@/components/analytics/EstimationAccuracyTab";
import PeakFocusWindows from "@/components/analytics/PeakFocusWindows";

const BLUE = "#007dff";
const BLUE_LIGHT = "#60a5fa";
const RED = "#f87171";

const tooltipStyle = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
  fontSize: 12,
};

const BurnoutTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-slate-200 shadow-xl rounded-xl p-3 w-[220px]">
        <p className="text-[12px] font-bold text-slate-700 mb-2">{label}</p>
        <div className="flex flex-col gap-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
                {entry.name}
              </span>
              <span className="text-[11px] font-bold" style={{ color: entry.color }}>
                {entry.value}{entry.name.includes("Risk") ? "%" : ""}
              </span>
            </div>
          ))}
        </div>
        {data.factors?.length > 0 && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex flex-col gap-1.5">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Risk Factors</p>
            {(data.factors || []).map((f: string, i: number) => (
              <p key={i} className="text-[11px] font-medium text-red-500/90 leading-snug flex items-start">
                <span className="mr-1.5">•</span><span>{f}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    );
  }
  return null;
};

type Tab = 'focus' | 'burnout' | 'signals' | 'estimation';

const TABS: { id: Tab; label: string }[] = [
  { id: 'focus', label: 'Focus' },
  { id: 'burnout', label: 'Burnout & Health' },
  { id: 'signals', label: 'Execution Signals' },
  { id: 'estimation', label: 'Estimation' },
];

const EmptyChart = ({ msg }: { msg: string }) => (
  <div className="h-full flex items-center justify-center text-[12px] text-slate-400">{msg}</div>
);

const AnalyticsPage = () => {
  const [activeTab, setActiveTab] = useState<Tab>('focus');

  const { data: dashboardRes, isLoading } = useGetAnalyticsDashboardQuery();
  const { data: burnoutRes } = useGetBurnoutTrendQuery();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#007dff] border-t-transparent rounded-full animate-spin" />
          <p className="text-[13px] text-slate-400 font-medium">Loading analytics…</p>
        </div>
      </div>
    );
  }

  const barData = (dashboardRes?.data?.barData || []) as any[];
  const burnoutData = ((burnoutRes?.data?.length ?? 0) > 0 ? burnoutRes!.data : dashboardRes?.data?.burnoutData || []) as any[];

  return (
    <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1">
      {/* Header */}
      <div>
        <h2 className="text-[15px] font-semibold text-slate-900">Analytics</h2>
        <p className="text-[12px] text-slate-400">Deep-dive into your focus patterns, signals, and health.</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap
              ${activeTab === tab.id
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Focus Tab ── */}
      {activeTab === 'focus' && (
        <div className="flex flex-col gap-4">
          <FocusReportCard />

          {/* Focus Hours chart */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5 flex flex-col gap-4">
            <div>
              <h3 className="text-[13px] font-semibold text-slate-900">Focus Hours vs Tasks Completed</h3>
              <p className="text-[11px] text-slate-400">Daily breakdown this week</p>
            </div>
            <div className="h-56">
              {barData.length === 0 ? (
                <EmptyChart msg="No focus data yet — complete a session to see your chart." />
              ) : (
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
              )}
            </div>
          </div>

          {/* Peak Focus Windows */}
          <PeakFocusWindows />

          {/* Focus Stability Heatmap */}
          <FocusStabilityMap />
        </div>
      )}

      {/* ── Burnout & Health Tab ── */}
      {activeTab === 'burnout' && (
        <div className="flex flex-col gap-4">
          {/* Burnout Trend */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5 flex flex-col gap-4">
            <div>
              <h3 className="text-[13px] font-semibold text-slate-900">Burnout Risk Trend</h3>
              <p className="text-[11px] text-slate-400">4-week rolling analysis of interruption and after-hours load</p>
            </div>
            <div className="h-60">
              {burnoutData.length === 0 ? (
                <EmptyChart msg="No burnout data yet — accumulates after a few weeks of usage." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={burnoutData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<BurnoutTooltip />} cursor={{ stroke: '#f1f5f9', strokeWidth: 2 }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="interrupts" name="Interrupts" stroke={BLUE} strokeWidth={2} dot={{ r: 3, fill: BLUE }} />
                    <Line type="monotone" dataKey="burnoutRisk" name="Burnout Risk %" stroke={RED} strokeWidth={2.5} dot={{ r: 3, fill: RED }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Bottleneck Report */}
          <BottleneckPanel />
        </div>
      )}

      {/* ── Execution Signals Tab ── */}
      {activeTab === 'signals' && (
        <div className="flex flex-col gap-4">
          <FocusStabilityMap />
          <BottleneckPanel />
        </div>
      )}

      {/* ── Estimation Tab ── */}
      {activeTab === 'estimation' && (
        <EstimationAccuracyTab />
      )}
    </div>
  );
};

export default AnalyticsPage;
