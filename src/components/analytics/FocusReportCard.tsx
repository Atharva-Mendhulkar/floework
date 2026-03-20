import React from 'react';
import { useGetCurrentFocusReportQuery } from '@/store/api';
import { Target, ZapOff, Clock, AlertTriangle } from 'lucide-react';

export default function FocusReportCard() {
  const { data: res, isLoading } = useGetCurrentFocusReportQuery();

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm min-h-[140px] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const report = res?.data;

  // Empty state if no report or < 3 sessions
  if (!report || report.sessionCount < 3) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
          <Target className="text-indigo-500" size={18} />
        </div>
        <div>
          <h3 className="text-[13px] font-semibold text-slate-900">Context-Switch Audit</h3>
          <p className="text-[12px] text-slate-500 mt-0.5">Complete at least 3 focus sessions this week to generate an execution audit.</p>
        </div>
      </div>
    );
  }

  const isLastWeek = !!report.isLastWeek;
  const isPersonalBest = report.bestWeekHours > 0 && report.deepFocusHours >= report.bestWeekHours;

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-[14px] font-semibold text-slate-900 flex items-center gap-2">
            Weekly Focus Audit
            {isLastWeek && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 uppercase">Last Week</span>}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">Deep work sessions (≥25m, ≤2 interrupts)</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-indigo-600 tracking-tight">{report.deepFocusHours.toFixed(1)} <span className="text-sm font-medium text-slate-400">hrs</span></p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-1">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100/50 flex flex-col gap-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Sessions</span>
          <span className="text-[14px] font-bold text-slate-800 flex items-center gap-1.5">
            <Clock size={13} className="text-slate-400" />
            {report.sessionCount} total
          </span>
        </div>
        
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100/50 flex flex-col gap-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Status</span>
          <span className={`text-[13px] font-bold flex items-center gap-1.5 ${isPersonalBest ? 'text-emerald-500' : 'text-slate-600'}`}>
            <Target size={13} className={isPersonalBest ? "text-emerald-500" : "text-slate-400"} />
            {isPersonalBest ? "Personal Best!" : `${report.avgSessionMins.toFixed(0)}m avg`}
          </span>
        </div>
      </div>

      {report.topFragmentor && (
        <div className="mt-1 flex items-start gap-2.5 p-3 rounded-lg bg-red-50/50 border border-red-100">
          <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-[11px] font-medium text-red-800/90 leading-snug">
            <span className="font-bold">Fragmentation alert:</span> {report.topFragmentor}.
          </p>
        </div>
      )}
    </div>
  );
}
