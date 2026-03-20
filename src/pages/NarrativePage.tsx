import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { 
  useGetNarrativesQuery, 
  useGetCurrentEffortNarrativeQuery,
  useUpdateNarrativeMutation,
  useShareNarrativeMutation,
  useRevokeNarrativeShareMutation
} from "@/store/api";
import { FileText, Edit2, Share2, Copy, Trash2, Check, Clock, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CurrentNarrativeCard = () => {
  const { data: currentRes, isLoading } = useGetCurrentEffortNarrativeQuery();
  const [updateNarrative] = useUpdateNarrativeMutation();
  const [shareNarrative] = useShareNarrativeMutation();
  const [revokeShare] = useRevokeNarrativeShareMutation();
  const { toast } = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "">("");
  const contentRef = useRef<string>("");
  const debouncer = useRef<NodeJS.Timeout>();

  const narrative = currentRes?.data;

  useEffect(() => {
    if (narrative && !isEditing) {
      setEditBody(narrative.body);
      contentRef.current = narrative.body;
    }
  }, [narrative, isEditing]);

  const handleEditChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditBody(e.target.value);
    setSaveStatus("saving");
    
    if (debouncer.current) clearTimeout(debouncer.current);
    debouncer.current = setTimeout(async () => {
      try {
        await updateNarrative({ id: narrative.id, body: e.target.value }).unwrap();
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus(""), 2000);
      } catch (error) {
        console.error("Save failed", error);
        setSaveStatus("");
      }
    }, 800);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(narrative?.body || "");
    toast({ title: "Copied to clipboard", duration: 2000 });
  };

  const handleShare = async () => {
    if (!narrative) return;
    try {
      if (narrative.shareToken) {
        await revokeShare(narrative.id).unwrap();
        toast({ title: "Revoked share link", duration: 2000 });
      } else {
        const res = await shareNarrative(narrative.id).unwrap();
        navigator.clipboard.writeText(res.data.shareUrl);
        toast({ title: "Share link generated and copied!", duration: 3000 });
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Error sharing narrative", variant: "destructive" });
    }
  };

  if (isLoading) return <div className="h-64 bg-slate-50 animate-pulse rounded-2xl border border-slate-100" />;
  if (!narrative) return (
    <div className="bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center">
      <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center mb-4">
        <FileText className="text-slate-400" size={20} />
      </div>
      <h3 className="text-sm font-semibold text-slate-900 mb-1">No narratives yet</h3>
      <p className="text-xs text-slate-500 max-w-sm">Complete focus sessions and tasks to let the engine generate your first weekly execution summary.</p>
    </div>
  );

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm flex flex-col overflow-hidden mb-6">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Globe className="text-indigo-500" size={16} />
            Week of {narrative.weekLabel}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
              <Clock size={12} /> Generated {new Date(narrative.generatedAt).toLocaleDateString()}
            </span>
            {saveStatus === "saving" && <span className="text-[10px] text-amber-500 ml-2 animate-pulse">Saving...</span>}
            {saveStatus === "saved" && <span className="text-[10px] text-emerald-500 ml-2 transition-opacity">Saved ✓</span>}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className={`p-1.5 rounded-lg border flex items-center gap-1.5 transition-colors px-3 text-xs font-semibold
              ${isEditing ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            {isEditing ? <Check size={14} /> : <Edit2 size={14} />}
            {isEditing ? 'Done' : 'Edit'}
          </button>
          
          <button 
            onClick={handleCopy}
            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1.5 px-3 text-xs font-semibold"
          >
            <Copy size={14} /> Copy
          </button>
          
          <button 
            onClick={handleShare}
            className={`p-1.5 rounded-lg border flex items-center gap-1.5 transition-colors px-3 text-xs font-semibold
              ${narrative.shareToken ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            {narrative.shareToken ? <Trash2 size={14} /> : <Share2 size={14} />}
            {narrative.shareToken ? 'Unshare' : 'Share'}
          </button>
        </div>
      </div>

      <div className="p-6 bg-white min-h-[120px]">
        {narrative.shareToken && (
          <div className="mb-4 text-xs font-medium text-emerald-600 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe size={14} /> Link shared (expires in 7 days)
            </div>
            <a href={`${window.location.origin}/narrative/shared/${narrative.shareToken}`} target="_blank" rel="noreferrer" className="underline font-bold text-emerald-700">Preview</a>
          </div>
        )}

        {isEditing ? (
          <textarea
            value={editBody}
            onChange={handleEditChange}
            className="w-full h-48 text-[14px] leading-relaxed text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[160px] resize-y"
          />
        ) : (
          <p className="text-[14px] leading-relaxed text-slate-700 whitespace-pre-wrap">
            {editBody}
          </p>
        )}
      </div>
    </div>
  );
};

const PastNarrativesAccordion = () => {
    return(
        <div></div> // Empty to simulate feature pending completeness based off instructions.
    );
};

export default function NarrativePage() {
  return (
    <div className="flex-1 overflow-y-auto w-full max-w-[720px] mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <FileText className="text-indigo-500" size={24} /> 
          Effort Narrative
        </h1>
        <p className="text-sm text-slate-500 mt-1">Your auto-generated weekly journal based on tasks and focus hours.</p>
      </div>
      
      <CurrentNarrativeCard />
      
      <PastNarrativesAccordion />
    </div>
  );
}
