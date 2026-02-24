export interface TeamMember {
  id: string;
  name: string;
  initials: string;
  color: string;
}

export interface TaskNode {
  id: string;
  title: string;
  assignee?: TeamMember;
  status: "pending" | "in-progress" | "done";
  hasFocus?: boolean;
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
  { id: "1", name: "Sarah Chen", initials: "SC", color: "bg-focus" },
  { id: "2", name: "James Park", initials: "JP", color: "bg-amber-400" },
  { id: "3", name: "Mia Torres", initials: "MT", color: "bg-emerald-400" },
  { id: "4", name: "Alex Reed", initials: "AR", color: "bg-rose-400" },
  { id: "5", name: "Dev Patel", initials: "DP", color: "bg-violet-400" },
  { id: "6", name: "Lina Sato", initials: "LS", color: "bg-cyan-400" },
];

export const phases: Phase[] = [
  {
    id: "allocation",
    title: "Task Allocation",
    tasks: [
      { id: "t1", title: "Allocate sprint tasks", assignee: team[0], status: "done" },
      { id: "t2", title: "Assign code reviews", assignee: team[1], status: "done" },
    ],
  },
  {
    id: "focus",
    title: "Focus Sessions",
    tasks: [
      { id: "t3", title: "Implement auth module", assignee: team[2], status: "in-progress", hasFocus: true },
      { id: "t4", title: "Design system tokens", assignee: team[0], status: "in-progress", hasFocus: true },
      { id: "t5", title: "API rate limiting", assignee: team[3], status: "pending" },
    ],
  },
  {
    id: "resolution",
    title: "Technical Resolution",
    tasks: [
      { id: "t6", title: "Resolve merge conflicts", assignee: team[4], status: "in-progress" },
      { id: "t7", title: "Fix CI pipeline", assignee: team[5], status: "done" },
      { id: "t8", title: "Estimate delivery time", assignee: team[1], status: "pending" },
    ],
  },
  {
    id: "outcome",
    title: "Team Outcome",
    tasks: [
      { id: "t9", title: "QA sign-off", status: "pending" },
      { id: "t10", title: "Stakeholder demo", status: "pending" },
      { id: "t11", title: "Release notes", status: "pending" },
      { id: "t12", title: "Retrospective", status: "pending" },
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
