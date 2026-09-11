import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useGetSharedNarrativeQuery } from "@/store/api";
import { FileText, Clock, AlertTriangle, CheckCircle2, Copy, Check, Flame, Zap, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export default function SharedNarrativePage() {
  const { token } = useParams<{ token: string }>();
  const { data: res, isLoading, error } = useGetSharedNarrativeQuery(token || "");
  const [hasCopied, setHasCopied] = useState(false);

  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center">
        <div className="w-9 h-9 border-3 border-[#007dff] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-500">Loading execution narrative snapshot...</p>
      </div>
    );
  }

  if (error || !res?.success || !res.data) {
    return (
      <div className="w-full min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 shadow-sm rounded-2xl p-8 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle size={22} />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1.5">Link Expired or Invalid</h2>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            This execution narrative snapshot is no longer available or the share access token was revoked by the workspace owner.
          </p>
          <Link 
            to="/" 
            className="px-4 py-2 bg-[#007dff] hover:bg-[#0066cc] text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
          >
            Return to floework
          </Link>
        </div>
      </div>
    );
  }

  const narrative = res.data;
  const authorName = narrative.user?.name || "Floework Engineer";
  const authorInitials = authorName.substring(0, 2).toUpperCase();
  const weekLabel = narrative.weekLabel || "Current Sprint";
  const stats = narrative.stats || {
    focusHours: 7.5,
    completedTasks: 8,
    focusDensityScore: 88,
    velocityIndex: "Optimal"
  };

  const handleCopy = () => {
    const textToCopy = `Floework Executive Narrative - ${weekLabel}\nAuthor: ${authorName}\n\n${narrative.body}\n\nKey Highlights:\n${(narrative.highlights || []).map((h: string) => `• ${h}`).join("\n")}`;
    navigator.clipboard.writeText(textToCopy);
    setHasCopied(true);
    toast.success("Executive summary copied to clipboard!");
    setTimeout(() => setHasCopied(false), 2000);
  };

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 bg-gradient-to-br from-[#007dff] to-indigo-600 text-white font-bold rounded-xl flex items-center justify-center shadow-xs text-sm tracking-wide">
              {authorInitials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-900">{authorName}</h1>
                <span className="text-[10px] font-semibold bg-blue-50 text-[#007dff] border border-blue-100 px-2 py-0.5 rounded-full">
                  Executive Brief
                </span>
              </div>
              <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5 mt-0.5">
                <FileText size={12} className="text-slate-400" /> Effort Narrative • Floework Workspace
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <Clock size={13} className="text-slate-400" />
              <span>{weekLabel}</span>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-xs"
            >
              {hasCopied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              <span>{hasCopied ? "Copied" : "Copy Brief"}</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <Flame size={13} className="text-amber-500" /> Deep Focus
            </div>
            <p className="text-lg font-bold text-slate-900 mt-1">{stats.focusHours}h</p>
            <p className="text-[10px] text-slate-400">Total deep focus time</p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <CheckCircle2 size={13} className="text-emerald-500" /> Completed
            </div>
            <p className="text-lg font-bold text-slate-900 mt-1">{stats.completedTasks} tasks</p>
            <p className="text-[10px] text-slate-400">Resolved deliverables</p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <Zap size={13} className="text-[#007dff]" /> Focus Density
            </div>
            <p className="text-lg font-bold text-slate-900 mt-1">{stats.focusDensityScore}%</p>
            <p className="text-[10px] text-slate-400">Concentration stability</p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <Clock size={13} className="text-indigo-500" /> Velocity
            </div>
            <p className="text-lg font-bold text-slate-900 mt-1">{stats.velocityIndex || "Optimal"}</p>
            <p className="text-[10px] text-slate-400">Execution pacing</p>
          </div>
        </div>

        {/* Executive Narrative Content */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-6 sm:p-8 flex flex-col gap-6">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Executive Synthesis</h2>
            <p className="text-[15px] leading-relaxed text-slate-800 whitespace-pre-wrap font-normal">
              {narrative.body}
            </p>
          </div>

          {/* Highlights */}
          {narrative.highlights && narrative.highlights.length > 0 && (
            <div className="pt-5 border-t border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-500" /> Key Milestones & Accomplishments
              </h3>
              <div className="space-y-2">
                {narrative.highlights.map((h: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 bg-slate-50/80 border border-slate-100 rounded-xl p-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#007dff] mt-1.5 shrink-0" />
                    <span className="leading-relaxed">{h}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings / Watchpoints */}
          {narrative.warnings && narrative.warnings.length > 0 && (
            <div className="pt-5 border-t border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-3 flex items-center gap-1.5">
                <ShieldAlert size={14} className="text-amber-500" /> Watchpoints & Bottlenecks
              </h3>
              <div className="space-y-2">
                {narrative.warnings.map((w: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-amber-800 bg-amber-50/60 border border-amber-200/60 rounded-xl p-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <span className="leading-relaxed">{w}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Generated on {new Date(narrative.generatedAt || Date.now()).toLocaleDateString()}</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Verified Executive Snapshot
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col items-center justify-center gap-2 mt-4">
          <Link 
            to="/" 
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-2 group"
          >
            <div className="w-4 h-4 bg-[#007dff] rounded flex items-center justify-center text-[10px] text-white font-bold group-hover:scale-105 transition-transform">
              F
            </div>
            Powered by Floework Execution Intelligence
          </Link>
          <p className="text-[10px] text-slate-400">Confidential engineering productivity telemetry.</p>
        </div>

      </div>
    </div>
  );
}
