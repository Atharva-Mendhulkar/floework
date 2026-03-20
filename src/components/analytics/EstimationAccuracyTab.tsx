import React from 'react';
import { useGetEstimationAccuracyQuery } from '@/store/api';
import { Target, TrendingDown, TrendingUp, AlertCircle } from 'lucide-react';

export default function EstimationAccuracyTab() {
  const { data: res, isLoading } = useGetEstimationAccuracyQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { patterns = [], summary } = res?.data || {};

  if (patterns.length === 0) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-8 shadow-sm flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
          <Target className="text-slate-400" size={20} />
        </div>
        <h3 className="text-[14px] font-semibold text-slate-900">No estimation data yet</h3>
        <p className="text-[12px] text-slate-500 mt-1 max-w-sm">
          Complete tasks with focus sessions to build your accuracy profile. We track keywords against the base estimates.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-[14px] font-semibold text-slate-900">Pattern Accuracy</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Historical actuals vs baseline</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Effort</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Keyword</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tasks</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Expected</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Actual</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ratio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patterns.map((p: any) => {
                const getRowStyle = (ratio: number, samples: number) => {
                  if (samples < 3) return 'bg-white';
                  if (ratio > 1.4) return 'bg-yellow-50/50';
                  if (ratio < 0.8) return 'bg-emerald-50/30';
                  return 'bg-white';
                };
                return (
                  <tr key={p.id} className={`${getRowStyle(p.ratio, p.sampleSize)} hover:bg-slate-50/80 transition-colors`}>
                    <td className="px-4 py-3 text-[12px] font-semibold text-slate-700">{p.predictedEffort}</td>
                    <td className="px-4 py-3 text-[12px] font-medium text-slate-900">'{p.keyword}'</td>
                    <td className="px-4 py-3 text-[12px] text-slate-600 font-medium">{p.sampleSize}</td>
                    <td className="px-4 py-3 text-[12px] text-slate-600">
                      {p.predictedEffort === 'S' ? 2 : p.predictedEffort === 'M' ? 5 : 10}h
                    </td>
                    <td className="px-4 py-3 text-[12px] text-slate-600 font-medium">{p.actualAvgHours.toFixed(1)}h</td>
                    <td className="px-4 py-3 text-[12px]">
                      {p.sampleSize < 3 ? (
                        <span className="text-slate-400 font-medium text-[11px] italic">Collecting data...</span>
                      ) : (
                        <span className={`font-bold flex items-center gap-1.5 ${p.ratio > 1.4 ? 'text-amber-600' : p.ratio < 0.8 ? 'text-emerald-600' : 'text-slate-600'}`}>
                          {p.ratio.toFixed(1)}x
                          {p.ratio > 1.4 && <TrendingUp size={12} />}
                          {p.ratio < 0.8 && <TrendingDown size={12} />}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {summary && summary.worstKeyword && (
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm flex items-start gap-3">
          <AlertCircle className="text-indigo-500 mt-0.5 shrink-0" size={16} />
          <div>
            <p className="text-[12px] text-slate-700 leading-relaxed font-medium">
              Your most underestimated work type is <span className="font-bold text-slate-900">'{summary.worstKeyword}'</span> at <span className="font-bold text-slate-900">{summary.worstEffort}</span> level. 
              {summary.bestKeyword ? ` Your most accurate estimates are for '${summary.bestKeyword}' at ${summary.bestEffort} level.` : ''}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
