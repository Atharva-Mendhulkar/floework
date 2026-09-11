import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { 
  useGetNarrativesQuery, 
  useGetCurrentEffortNarrativeQuery,
  useRegenerateNarrativeMutation,
  useUpdateNarrativeMutation,
  useShareNarrativeMutation,
  useRevokeNarrativeShareMutation,
  useGetProjectsQuery
} from "@/store/api";
import { 
  FileText, 
  Edit2, 
  Share2, 
  Copy, 
  Check, 
  Clock, 
  Globe, 
  Sparkles, 
  RefreshCw, 
  Download, 
  CheckCircle2, 
  Flame, 
  Zap, 
  ShieldAlert, 
  ExternalLink,
  Trash2,
  Plus,
  X
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function NarrativePage() {
  const { data: projectsRes } = useGetProjectsQuery();
  const projects = projectsRes?.data || [];
  
  const [selectedProjectId, setSelectedProjectId] = useState<string>("proj-default-1");
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("sprint");

  // Keep project selection in sync once projects load
  useEffect(() => {
    if (projects.length > 0 && selectedProjectId === "proj-default-1") {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects]);

  const { data: currentRes, isLoading: isNarrativeLoading, refetch } = useGetCurrentEffortNarrativeQuery(selectedProjectId);
  const { data: pastRes, isLoading: isPastLoading } = useGetNarrativesQuery();

  const [regenerateNarrative, { isLoading: isRegenerating }] = useRegenerateNarrativeMutation();
  const [updateNarrative] = useUpdateNarrativeMutation();
  const [shareNarrative, { isLoading: isSharing }] = useShareNarrativeMutation();
  const [revokeShare, { isLoading: isRevoking }] = useRevokeNarrativeShareMutation();

  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState("");
  const [highlights, setHighlights] = useState<string[]>([]);
  const [newHighlight, setNewHighlight] = useState("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "">("");
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [openPastId, setOpenPastId] = useState<string | null>(null);

  const debouncer = useRef<NodeJS.Timeout>();
  const narrative = currentRes?.data;
  const pastNarratives = pastRes?.data || [];

  // Initialize or update local editable state when current narrative updates
  useEffect(() => {
    if (narrative && !isEditing) {
      setEditBody(narrative.body || "");
      setHighlights(narrative.highlights || []);
    }
  }, [narrative, isEditing]);

  // Debounced auto-save handler for narrative body
  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextBody = e.target.value;
    setEditBody(nextBody);
    setSaveStatus("saving");

    if (debouncer.current) clearTimeout(debouncer.current);
    debouncer.current = setTimeout(async () => {
      try {
        await updateNarrative({
          id: narrative?.id,
          projectId: selectedProjectId,
          body: nextBody,
          highlights
        }).unwrap();
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus(""), 2000);
      } catch (err) {
        console.error("Narrative auto-save failed", err);
        setSaveStatus("");
      }
    }, 800);
  };

  // Add new highlight
  const handleAddHighlight = async () => {
    if (!newHighlight.trim()) return;
    const updated = [...highlights, newHighlight.trim()];
    setHighlights(updated);
    setNewHighlight("");
    try {
      await updateNarrative({
        id: narrative?.id,
        projectId: selectedProjectId,
        body: editBody,
        highlights: updated
      }).unwrap();
      toast.success("Highlight added");
    } catch {}
  };

  // Remove a highlight
  const handleRemoveHighlight = async (index: number) => {
    const updated = highlights.filter((_, i) => i !== index);
    setHighlights(updated);
    try {
      await updateNarrative({
        id: narrative?.id,
        projectId: selectedProjectId,
        body: editBody,
        highlights: updated
      }).unwrap();
    } catch {}
  };

  // Trigger on-demand AI regeneration
  const handleRegenerate = async () => {
    try {
      const res = await regenerateNarrative({
        projectId: selectedProjectId,
        timeframe: selectedTimeframe
      }).unwrap();
      if (res?.data) {
        setEditBody(res.data.body || "");
        setHighlights(res.data.highlights || []);
      }
      toast.success("Fresh executive narrative generated successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate fresh narrative. Serving resilient fallback.");
    }
  };

  // Copy narrative markdown
  const handleCopyMarkdown = () => {
    if (!narrative) return;
    const md = `# Floework Executive Effort Narrative - ${narrative.weekLabel}\nGenerated: ${new Date(narrative.generatedAt).toLocaleDateString()}\n\n${editBody}\n\n## Key Highlights\n${highlights.map(h => `- ${h}`).join("\n")}\n\n## Metrics Summary\n- Deep Focus Time: ${narrative.stats?.focusHours || 0}h\n- Completed Milestones: ${narrative.stats?.completedTasks || 0}\n- Focus Density: ${narrative.stats?.focusDensityScore || 0}%\n- Velocity: ${narrative.stats?.velocityIndex || "Optimal"}\n`;
    navigator.clipboard.writeText(md);
    toast.success("Executive markdown report copied to clipboard!");
  };

  // Export report as .md file
  const handleExportMarkdown = () => {
    if (!narrative) return;
    const md = `# Floework Executive Effort Narrative - ${narrative.weekLabel}\nGenerated: ${new Date(narrative.generatedAt).toLocaleDateString()}\n\n${editBody}\n\n## Key Highlights\n${highlights.map(h => `- ${h}`).join("\n")}\n`;
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `narrative-${narrative.weekLabel.toLowerCase().replace(/[^a-z0-9]/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded executive narrative report (.md)");
  };

  // Share handler
  const handleShareClick = async () => {
    if (!narrative) return;
    if (narrative.shareToken) {
      setIsShareModalOpen(true);
      return;
    }
    try {
      const res = await shareNarrative({
        ...narrative,
        body: editBody,
        highlights,
        projectId: selectedProjectId
      }).unwrap();
      navigator.clipboard.writeText(res.shareUrl);
      setIsShareModalOpen(true);
      toast.success("Public share link created and copied to clipboard!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate share link");
    }
  };

  // Revoke share handler
  const handleRevokeShare = async () => {
    if (!narrative?.shareToken) return;
    try {
      await revokeShare(narrative.shareToken).unwrap();
      setIsShareModalOpen(false);
      refetch();
      toast.success("Public share link revoked successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to revoke share link");
    }
  };

  const stats = narrative?.stats || {
    focusHours: 6.5,
    completedTasks: 7,
    activeTasks: 3,
    focusDensityScore: 88,
    velocityIndex: "Optimal"
  };

  const shareUrl = narrative?.shareToken 
    ? `${window.location.origin}/narrative/shared/${narrative.shareToken}`
    : `${window.location.origin}/narrative/shared/demo-token-123`;

  return (
    <div className="flex-1 overflow-y-auto w-full max-w-[840px] mx-auto px-4 sm:px-8 py-8">
      
      {/* Top Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#007dff] to-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Sparkles size={16} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Effort Narrative</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-lg leading-relaxed">
            Autonomous AI synthesis of engineering velocity, focus density, and milestone progression.
          </p>
        </div>

        {/* Project & Timeframe Selectors + Action */}
        <div className="flex flex-wrap items-center gap-2">
          {projects.length > 0 && (
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-[150px] h-9 text-xs bg-white border-slate-200 font-medium">
                <SelectValue placeholder="Select Project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-[130px] h-9 text-xs bg-white border-slate-200 font-medium">
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sprint" className="text-xs">Current Sprint</SelectItem>
              <SelectItem value="7d" className="text-xs">Past 7 Days</SelectItem>
              <SelectItem value="14d" className="text-xs">Past 14 Days</SelectItem>
              <SelectItem value="30d" className="text-xs">Full Month</SelectItem>
            </SelectContent>
          </Select>

          <button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#007dff] hover:bg-[#0066cc] active:scale-95 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition-all"
            title="Re-analyze task telemetry and generate fresh executive narrative"
          >
            <RefreshCw size={13} className={isRegenerating ? "animate-spin" : ""} />
            <span>{isRegenerating ? "Synthesizing..." : "Regenerate"}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            <span className="flex items-center gap-1.5"><Flame size={14} className="text-amber-500" /> Deep Focus</span>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">{stats.focusHours}h</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Uninterrupted focus logged</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-500" /> Resolved</span>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">{stats.completedTasks} tasks</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{stats.activeTasks} in flight</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            <span className="flex items-center gap-1.5"><Zap size={14} className="text-[#007dff]" /> Focus Density</span>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">{stats.focusDensityScore}%</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Context switch resilience</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            <span className="flex items-center gap-1.5"><Clock size={14} className="text-indigo-500" /> Velocity</span>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">{stats.velocityIndex || "Optimal"}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Sprint throughput pace</p>
        </div>
      </div>

      {/* Main Narrative Card */}
      {isNarrativeLoading ? (
        <div className="h-72 bg-slate-50 animate-pulse rounded-2xl border border-slate-200/80 mb-6" />
      ) : !narrative ? (
        <div className="bg-white border border-slate-200 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center mb-6">
          <div className="w-12 h-12 bg-blue-50 text-[#007dff] rounded-2xl flex items-center justify-center mb-3">
            <FileText size={22} />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 mb-1">No execution summaries yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mb-4 leading-relaxed">
            Run deep focus sessions or complete task milestones to let the AI synthesis engine summarize your engineering progress.
          </p>
          <button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="px-4 py-2 bg-[#007dff] hover:bg-[#0066cc] text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
          >
            Generate Initial Narrative
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs flex flex-col overflow-hidden mb-6">
          {/* Card Action Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <div className="flex items-center gap-2">
                <Globe className="text-[#007dff]" size={16} />
                <h2 className="text-sm font-bold text-slate-900">
                  Week of {narrative.weekLabel}
                </h2>
                <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
                  Active Sprint
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                  <Clock size={12} /> Generated {new Date(narrative.generatedAt).toLocaleDateString()}
                </span>
                {saveStatus === "saving" && <span className="text-[11px] text-amber-600 font-semibold ml-2 animate-pulse">Saving...</span>}
                {saveStatus === "saved" && <span className="text-[11px] text-emerald-600 font-semibold ml-2 transition-opacity">Saved ✓</span>}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className={`p-1.5 rounded-xl border flex items-center gap-1.5 transition-all px-3 text-xs font-semibold active:scale-95
                  ${isEditing ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-xs' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
              >
                {isEditing ? <Check size={13} /> : <Edit2 size={13} />}
                {isEditing ? 'Done Editing' : 'Edit Brief'}
              </button>
              
              <button 
                onClick={handleCopyMarkdown}
                className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-95 transition-all flex items-center gap-1.5 px-3 text-xs font-semibold"
                title="Copy markdown report"
              >
                <Copy size={13} /> Copy
              </button>

              <button 
                onClick={handleExportMarkdown}
                className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-95 transition-all flex items-center gap-1.5 px-3 text-xs font-semibold"
                title="Export report (.md)"
              >
                <Download size={13} /> Export
              </button>
              
              <button 
                onClick={handleShareClick}
                disabled={isSharing}
                className={`p-1.5 rounded-xl border flex items-center gap-1.5 transition-all px-3 text-xs font-semibold active:scale-95
                  ${narrative.shareToken ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
              >
                <Share2 size={13} />
                {narrative.shareToken ? 'Shared Link' : 'Share'}
              </button>
            </div>
          </div>

          {/* Active Share Banner if active */}
          {narrative.shareToken && (
            <div className="mx-5 mt-4 text-xs font-medium text-emerald-700 bg-emerald-50/80 p-3 rounded-xl border border-emerald-200/80 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Globe size={14} className="text-emerald-600" />
                <span>Public stakeholder share link is active (read-only, auto-expires in 7 days).</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                    toast.success("Share link copied!");
                  }}
                  className="font-semibold text-emerald-700 hover:text-emerald-900 underline text-xs"
                >
                  Copy Link
                </button>
                <span className="text-emerald-300">•</span>
                <a 
                  href={shareUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="font-semibold text-emerald-700 hover:text-emerald-900 underline flex items-center gap-1 text-xs"
                >
                  Preview <ExternalLink size={11} />
                </a>
              </div>
            </div>
          )}

          {/* Narrative Canvas */}
          <div className="p-6 sm:p-7 flex flex-col gap-5">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Executive Synthesis
              </span>

              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={editBody}
                    onChange={handleBodyChange}
                    placeholder="Write or refine the executive effort narrative summary..."
                    className="w-full text-sm leading-relaxed text-slate-800 bg-slate-50/80 border border-slate-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-[#007dff]/20 focus:border-[#007dff] min-h-[180px] resize-y font-normal transition-all"
                  />
                  <p className="text-[11px] text-slate-400 text-right">Changes are automatically saved</p>
                </div>
              ) : (
                <p className="text-[14px] leading-relaxed text-slate-800 whitespace-pre-wrap">
                  {editBody}
                </p>
              )}
            </div>

            {/* Key Execution Highlights */}
            <div className="pt-4 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-3">
                Key Execution Highlights
              </span>
              
              <div className="space-y-2">
                {highlights.map((item: string, idx: number) => (
                  <div key={idx} className="flex items-start justify-between gap-2 text-xs text-slate-700 bg-slate-50/70 border border-slate-100 rounded-xl p-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#007dff] mt-1.5 shrink-0" />
                      <span className="leading-relaxed">{item}</span>
                    </div>
                    {isEditing && (
                      <button 
                        onClick={() => handleRemoveHighlight(idx)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ))}

                {isEditing && (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="text"
                      value={newHighlight}
                      onChange={(e) => setNewHighlight(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAddHighlight(); }}
                      placeholder="Add another highlight achievement..."
                      className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-[#007dff]/20 focus:border-[#007dff]"
                    />
                    <button
                      onClick={handleAddHighlight}
                      className="px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-all flex items-center gap-1"
                    >
                      <Plus size={12} /> Add
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Watchpoints & Bottlenecks */}
            {narrative.warnings && narrative.warnings.length > 0 && (
              <div className="pt-4 border-t border-slate-100">
                <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                  <ShieldAlert size={14} className="text-amber-500" /> Risk Watchpoints
                </span>
                <div className="space-y-1.5">
                  {narrative.warnings.map((warn: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50/70 border border-amber-200/70 rounded-xl p-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                      <span>{warn}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Historical Summaries Archive */}
      {pastNarratives.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock size={16} className="text-slate-400" />
              Historical Sprint Summaries
            </h3>
            <span className="text-xs text-slate-400">{pastNarratives.length} archived cycles</span>
          </div>

          <div className="flex flex-col gap-3">
            {pastNarratives.map((item: any) => {
              const isOpen = openPastId === item.id;
              return (
                <div 
                  key={item.id} 
                  className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs transition-all hover:border-slate-300"
                >
                  <button
                    onClick={() => setOpenPastId(isOpen ? null : item.id)}
                    className="w-full px-5 py-3.5 flex items-center justify-between text-left bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <span className="text-[13px] font-semibold text-slate-800">{item.weekLabel}</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {item.generatedAt ? new Date(item.generatedAt).toLocaleDateString() : 'Historical archive'} • {item.stats?.focusHours || 6.5}h focus logged
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                        {isOpen ? 'Collapse' : 'Expand'}
                      </span>
                    </div>
                  </button>
                  
                  {isOpen && (
                    <div className="p-5 border-t border-slate-100 space-y-3">
                      <p className="text-[13px] text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {item.body}
                      </p>
                      {item.highlights && item.highlights.length > 0 && (
                        <div className="pt-2 border-t border-slate-100/80">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Highlights</p>
                          <ul className="space-y-1.5">
                            {item.highlights.map((h: string, i: number) => (
                              <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                                <span className="text-[#007dff] font-bold">•</span>
                                <span>{h}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(item.body);
                            toast.success("Copied past summary to clipboard");
                          }}
                          className="text-[11px] font-semibold text-slate-700 hover:text-slate-900 px-3 py-1 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-1.5"
                        >
                          <Copy size={12} /> Copy text
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Share Management Modal */}
      <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Globe className="text-[#007dff]" size={18} /> Public Executive Share Link
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Anyone with this link can view the read-only narrative summary, key milestones, and effort telemetry without logging in.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-3">
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-700 font-mono select-all focus:outline-none"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  toast.success("Share link copied to clipboard!");
                }}
                className="px-3.5 py-2.5 bg-[#007dff] hover:bg-[#0066cc] text-white rounded-xl text-xs font-semibold transition-all shrink-0"
              >
                Copy
              </button>
            </div>

            <div className="text-[11px] text-slate-400 bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock size={12} /> Link active for 7 days
              </span>
              <a
                href={shareUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[#007dff] hover:underline font-semibold flex items-center gap-1"
              >
                Open Preview <ExternalLink size={10} />
              </a>
            </div>
          </div>

          <DialogFooter className="flex sm:justify-between items-center w-full gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={handleRevokeShare}
              disabled={isRevoking}
              className="text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Trash2 size={12} />
              {isRevoking ? "Revoking..." : "Revoke Public Link"}
            </button>
            <button
              type="button"
              onClick={() => setIsShareModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
            >
              Close
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
