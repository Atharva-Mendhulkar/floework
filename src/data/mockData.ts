export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  initials?: string;
  color?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  teamId: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  initials: string;
  color: string;
}

export interface TaskNode {
  id: string;
  title: string;
  description?: string;
  assignee?: TeamMember;
  status: "pending" | "in-progress" | "done" | string;
  phase: string;
  hasFocus?: boolean;
  dependencies?: string[]; // IDs of tasks that must be completed first
  dueDate?: string;
  priority?: string;
  isStarred?: boolean;
  projectId: string;
}

export interface Phase {
  id: string;
  title: string;
  tasks: TaskNode[];
}

export interface ActivityEntry {
  id: string;
  subject: string;
  status: "Executed" | "Scheduled" | "In Progress" | "Blocked";
  startDate: string;
  endDate: string;
  assignedUser: string;
}

export const team: TeamMember[] = [
  { id: "1", name: "Sarah Chen", role: "admin", initials: "SC", color: "bg-orange-500" },
  { id: "2", name: "Marcus Johnson", role: "member", initials: "MJ", color: "bg-blue-500" },
  { id: "3", name: "Lina Sato", role: "member", initials: "LS", color: "bg-pink-500" },
  { id: "4", name: "David Kim", role: "member", initials: "DK", color: "bg-indigo-500" },
  { id: "5", name: "Mia Torres", role: "member", initials: "MT", color: "bg-emerald-500" },
  { id: "6", name: "James Park", role: "member", initials: "JP", color: "bg-violet-500" },
];



export const phases: Phase[] = [
  {
    id: "allocation",
    title: "Task Allocation",
    tasks: [
      { id: "t1", title: "API Schema Design", assignee: team[0], status: "done", phase: "allocation", projectId: "d5b480c4-ce88-4a96-aeae-7386b436a8ac" },
      { id: "t2", title: "Auth Middleware", assignee: team[1], status: "in-progress", phase: "allocation", projectId: "d5b480c4-ce88-4a96-aeae-7386b436a8ac" },
    ],
  },
  {
    id: "focus",
    title: "Focus Sessions",
    tasks: [
      { id: "t3", title: "Component Library Pipeline", assignee: team[4], status: "in-progress", hasFocus: true, phase: "focus", projectId: "d5b480c4-ce88-4a96-aeae-7386b436a8ac" },
      { id: "t4", title: "Dashboard Layout", assignee: team[2], status: "in-progress", hasFocus: true, phase: "focus", projectId: "d5b480c4-ce88-4a96-aeae-7386b436a8ac" },
      { id: "t5", title: "Redux Setup", assignee: team[3], status: "pending", phase: "focus", projectId: "d5b480c4-ce88-4a96-aeae-7386b436a8ac" },
    ],
  },
  {
    id: "resolution",
    title: "Technical Resolution",
    tasks: [
      { id: "t6", title: "Fix iOS Safari visual bugs", assignee: team[5], status: "pending", phase: "resolution", projectId: "d5b480c4-ce88-4a96-aeae-7386b436a8ac" },
      { id: "t7", title: "Optimize build times", assignee: team[1], status: "in-progress", phase: "resolution", projectId: "d5b480c4-ce88-4a96-aeae-7386b436a8ac" },
      { id: "t8", title: "Update deps", assignee: team[0], status: "done", phase: "resolution", projectId: "d5b480c4-ce88-4a96-aeae-7386b436a8ac" },
    ],
  },
  {
    id: "outcome",
    title: "Output & Outcome",
    tasks: [
      { id: "t9", title: "Q1 Marketing Page", status: "done", phase: "outcome", projectId: "d5b480c4-ce88-4a96-aeae-7386b436a8ac" },
      { id: "t10", title: "Blog Template", status: "done", phase: "outcome", projectId: "d5b480c4-ce88-4a96-aeae-7386b436a8ac" },
      { id: "t11", title: "Email Campaign Assets", status: "done", phase: "outcome", projectId: "d5b480c4-ce88-4a96-aeae-7386b436a8ac" },
      { id: "t12", title: "SEO Audit", status: "done", phase: "outcome", projectId: "d5b480c4-ce88-4a96-aeae-7386b436a8ac" },
    ],
  },
];

export const activities: ActivityEntry[] = [
  { id: "a1", subject: "Design Sprint", status: "Executed", startDate: "2025-02-20", endDate: "2025-02-22", assignedUser: "Sarah Chen" },
  { id: "a2", subject: "API Integration", status: "In Progress", startDate: "2025-02-22", endDate: "2025-02-25", assignedUser: "Dev Patel" },
  { id: "a3", subject: "Auth Module", status: "Scheduled", startDate: "2025-02-24", endDate: "2025-02-28", assignedUser: "Mia Torres" },
  { id: "a4", subject: "Load Testing", status: "Blocked", startDate: "2025-02-18", endDate: "2025-02-20", assignedUser: "Alex Reed" },
  { id: "a5", subject: "CI/CD Pipeline", status: "Executed", startDate: "2025-02-15", endDate: "2025-02-17", assignedUser: "Lina Sato" },
];

export const chartData = [
  { name: "Focused", value: 42, fill: "hsl(216, 38%, 68%)" },
  { name: "Interrupted", value: 18, fill: "hsl(0, 42%, 61%)" },
  { name: "Idle", value: 12, fill: "hsl(220, 9%, 91%)" },
  { name: "Completed", value: 28, fill: "hsl(152, 50%, 50%)" },
];
