import { X, Clock, User, AlertTriangle, CheckCircle, Github, Link, UserCheck, Trash2, Edit3, Check } from "lucide-react";
import type { TaskNode } from "@/data/mockData";
import { useState } from "react";
import { useLinkPRMutation, useGetUsersQuery, useUpdateTaskMutation, useDeleteTaskMutation } from "@/store/api";
import { toast } from "sonner";
import TaskExecutionPanel from "@/components/TaskExecutionPanel";
import TaskReplayTimeline from "@/components/TaskReplayTimeline";
import { MemberProfileModal } from "@/components/MemberProfileModal";
import { UserAvatar } from "@/components/UserAvatar";

interface TaskDetailPanelProps {
  task: TaskNode | null;
  onClose: () => void;
}

const iconMap = {
  created: <CheckCircle size={14} className="text-text-muted" />,
  assigned: <User size={14} className="text-focus" />,
  focus: <Clock size={14} className="text-focus" />,
  interrupt: <AlertTriangle size={14} className="text-warning" />,
  bottleneck: <AlertTriangle size={14} className="text-warning" />,
  resolved: <CheckCircle size={14} className="text-emerald-500" />,
};

const statusStyle: Record<string, string> = {
  done: "bg-emerald-500/10 text-emerald-600",
  "in-progress": "bg-[#007dff]/10 text-[#007dff]",
  DONE: "bg-emerald-500/10 text-emerald-600",
  IN_PROGRESS: "bg-[#007dff]/10 text-[#007dff]",
  pending: "bg-slate-100 text-slate-500",
  PENDING: "bg-slate-100 text-slate-500",
};

const phaseOptions = [
  { id: "allocation", label: "Task Allocation", status: "pending" },
  { id: "focus", label: "Focus Sessions", status: "in-progress" },
  { id: "resolution", label: "Technical Resolution", status: "in-progress" },
  { id: "outcome", label: "Output & Outcome", status: "done" },
];

const TaskDetailPanel = ({ task, onClose }: TaskDetailPanelProps) => {
  const [prUrl, setPrUrl] = useState("");
  const [linkPR, { isLoading: isLinking }] = useLinkPRMutation();
  const [updateTask] = useUpdateTaskMutation();
  const [deleteTask, { isLoading: isDeleting }] = useDeleteTaskMutation();
  const { data: usersRes } = useGetUsersQuery();
  const team = usersRes?.data || [];

  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);

  // Inline editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editDesc, setEditDesc] = useState("");

  if (!task) return null;

  const handleOpenProfile = () => {
    if (!task.assignee) return;
    const matched = team.find(u => u.id === task.assignee?.id || u.name === task.assignee?.name);
    setSelectedMember(matched || {
      id: task.assignee.id,
      name: task.assignee.name,
      avatarUrl: (task.assignee as any).avatarUrl,
      role: 'member'
    });
    setIsMemberModalOpen(true);
  };

  const handleReassign = async (newAssigneeId: string) => {
    try {
      await updateTask({
        id: task.id,
        assigneeId: newAssigneeId === "unassigned" ? undefined : newAssigneeId,
        projectId: task.projectId
      }).unwrap();
      toast.success("Assignee updated");
    } catch {
      toast.error("Failed to reassign task");
    }
  };

  const handleLinkPR = async () => {
    if (!prUrl.trim()) return;
    try {
      await linkPR({ id: task.id, prUrl }).unwrap();
      toast.success("GitHub Pull Request linked successfully");
      setPrUrl("");
    } catch (e) {
      toast.error("Failed to link PR. Invalid URL or missing permissions.");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTask({ id: task.id, projectId: task.projectId }).unwrap();
      toast.success("Task deleted");
      onClose();
    } catch {
      toast.error("Failed to delete task");
    }
  };

  const handleSaveTitle = async () => {
    if (!editTitle.trim() || editTitle.trim() === task.title) {
      setIsEditingTitle(false);
      return;
    }
    try {
      await updateTask({ id: task.id, title: editTitle.trim(), projectId: task.projectId }).unwrap();
      toast.success("Title updated");
    } catch {
      toast.error("Failed to update title");
    }
    setIsEditingTitle(false);
  };

  const handleSaveDesc = async () => {
    try {
      await updateTask({ id: task.id, description: editDesc.trim(), projectId: task.projectId }).unwrap();
      toast.success("Description updated");
    } catch {
      toast.error("Failed to update description");
    }
    setIsEditingDesc(false);
  };

  const handlePhaseChange = async (newPhaseId: string) => {
    const phaseOpt = phaseOptions.find(p => p.id === newPhaseId);
    if (!phaseOpt || newPhaseId === task.phase) return;
    try {
      await updateTask({
        id: task.id,
        phase: newPhaseId,
        status: phaseOpt.status,
        projectId: task.projectId,
      }).unwrap();
      toast.success(`Moved to ${phaseOpt.label}`);
    } catch {
      toast.error("Failed to move task");
    }
  };

  const activePR = (task as any).linkedPRs?.[0];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200">

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-0.5">Task Detail</p>
            {isEditingTitle ? (
              <div className="flex items-center gap-1.5">
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTitle();
                    if (e.key === "Escape") setIsEditingTitle(false);
                  }}
                  className="text-[14px] font-semibold text-slate-900 leading-snug bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-[#007dff] flex-1"
                  autoFocus
                />
                <button onClick={handleSaveTitle} className="w-6 h-6 rounded-md bg-[#007dff] text-white flex items-center justify-center">
                  <Check size={12} />
                </button>
              </div>
            ) : (
              <h3
                className="text-[14px] font-semibold text-slate-900 leading-snug cursor-pointer hover:text-[#007dff] transition-colors group flex items-center gap-1.5"
                onClick={() => { setEditTitle(task.title); setIsEditingTitle(true); }}
              >
                {task.title}
                <Edit3 size={11} className="opacity-0 group-hover:opacity-60 transition-opacity" />
              </h3>
            )}
          </div>
          <div className="flex items-center gap-1 ml-2 shrink-0 mt-0.5">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors text-slate-400 hover:text-red-500 disabled:opacity-50"
              title="Delete task"
            >
              <Trash2 size={14} />
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 flex-wrap justify-between">
          <div className="flex items-center gap-2">
            {task.assignee ? (
              <button
                onClick={handleOpenProfile}
                className="flex items-center gap-2 p-1 -ml-1 rounded-lg hover:bg-slate-100 transition-colors group cursor-pointer"
                title={`View ${task.assignee.name}'s profile`}
              >
                <div className={`w-6 h-6 rounded-lg ${task.assignee.color || 'bg-[#007dff]'} flex items-center justify-center text-[9px] font-bold text-white shadow-sm`}>
                  {task.assignee.initials}
                </div>
                <span className="text-[12px] font-semibold text-slate-700 group-hover:text-[#007dff] transition-colors">
                  {task.assignee.name}
                </span>
              </button>
            ) : (
              <span className="text-xs text-slate-400 italic">Unassigned</span>
            )}

            {/* Quick Reassign Dropdown */}
            <select
              value={task.assignee?.id || "unassigned"}
              onChange={(e) => handleReassign(e.target.value)}
              className="h-6 px-1.5 text-[10px] bg-slate-50 border border-slate-200 rounded-md text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#007dff] cursor-pointer"
              title="Change Assignee"
            >
              <option value="unassigned">Assign...</option>
              {team.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg ${statusStyle[task.status] || statusStyle.pending}`}>
              {task.status.replace("_", " ")}
            </span>
            {task.priority && (
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg uppercase">
                {task.priority}
              </span>
            )}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">

          {/* Phase / Column Selector */}
          <div>
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1.5">Phase</p>
            <div className="flex gap-1.5 flex-wrap">
              {phaseOptions.map((po) => (
                <button
                  key={po.id}
                  onClick={() => handlePhaseChange(po.id)}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-colors ${
                    task.phase === po.id
                      ? "bg-[#007dff]/10 border-[#007dff]/30 text-[#007dff]"
                      : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  }`}
                >
                  {po.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1.5">Description</p>
            {isEditingDesc ? (
              <div className="flex flex-col gap-1.5">
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setIsEditingDesc(false);
                  }}
                  rows={3}
                  className="text-[13px] text-slate-600 leading-relaxed bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 outline-none focus:ring-1 focus:ring-[#007dff] resize-none"
                  autoFocus
                  placeholder="Add description..."
                />
                <div className="flex gap-1.5 justify-end">
                  <button onClick={() => setIsEditingDesc(false)} className="text-[11px] text-slate-500 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors">Cancel</button>
                  <button onClick={handleSaveDesc} className="text-[11px] text-white bg-[#007dff] px-2.5 py-1 rounded-md hover:bg-[#0070e8] transition-colors font-medium">Save</button>
                </div>
              </div>
            ) : (
              <p
                className="text-[13px] text-slate-600 leading-relaxed cursor-pointer hover:bg-slate-50 rounded-lg px-2 py-1.5 -mx-2 transition-colors group"
                onClick={() => { setEditDesc(task.description || ""); setIsEditingDesc(true); }}
              >
                {task.description || <span className="text-slate-400 italic">Click to add description...</span>}
                <Edit3 size={10} className="inline-block ml-1.5 opacity-0 group-hover:opacity-60 transition-opacity" />
              </p>
            )}
          </div>

          {/* PR Integration */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                 <Github size={14} className="text-slate-600" />
                 <span className="text-[12px] font-semibold text-slate-800">Linked Pull Request</span>
              </div>
              {activePR ? (
                  <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                         <a href={`https://github.com/${activePR.owner}/${activePR.repo}/pull/${activePR.prNumber}`} target="_blank" rel="noreferrer" className="text-[13px] font-medium text-indigo-600 hover:underline truncate">
                             {activePR.owner}/{activePR.repo}#{activePR.prNumber} — {activePR.prTitle || "Pending sync..."}
                         </a>
                         <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${activePR.state === 'merged' ? 'bg-purple-100 text-purple-700' : activePR.state === 'closed' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                             {activePR.state}
                         </span>
                      </div>
                  </div>
              ) : (
                  <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                          <Link size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                              type="text" 
                              value={prUrl}
                              onChange={(e) => setPrUrl(e.target.value)}
                              placeholder="Paste GitHub PR URL..." 
                              className="w-full pl-7 pr-3 py-1.5 text-[12px] bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                          />
                      </div>
                      <button 
                          onClick={handleLinkPR}
                          disabled={isLinking || !prUrl.trim()}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-[12px] font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                      >
                          {isLinking ? "Linking..." : "Link PR"}
                      </button>
                  </div>
              )}
          </div>

          {/* Execution Signals & History — live from backend */}
          <TaskExecutionPanel taskId={task.id} />
          <TaskReplayTimeline taskId={task.id} />

          {/* Danger Zone */}
          <div className="border-t border-slate-100 pt-4 mt-auto">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-[12px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              <Trash2 size={13} />
              {isDeleting ? "Deleting..." : "Delete this task"}
            </button>
          </div>
        </div>
      </div>

      <MemberProfileModal
        isOpen={isMemberModalOpen}
        onClose={() => {
          setIsMemberModalOpen(false);
          setSelectedMember(null);
        }}
        member={selectedMember}
        workspaceId={task.projectId || "proj-default-1"}
      />
    </>
  );
};

export default TaskDetailPanel;

