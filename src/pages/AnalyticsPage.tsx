import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from "recharts";
import { team } from "@/data/mockData";

const barData = [
  { day: "Mon", focusHrs: 5.2, tasksCompleted: 4 },
  { day: "Tue", focusHrs: 6.1, tasksCompleted: 5 },
  { day: "Wed", focusHrs: 3.8, tasksCompleted: 2 },
  { day: "Thu", focusHrs: 7.0, tasksCompleted: 6 },
  { day: "Fri", focusHrs: 4.5, tasksCompleted: 3 },
];

const burnoutData = [
  { week: "W1", interrupts: 8, burnoutRisk: 22 },
  { week: "W2", interrupts: 12, burnoutRisk: 35 },
  { week: "W3", interrupts: 18, burnoutRisk: 52 },
  { week: "W4", interrupts: 14, burnoutRisk: 45 },
  { week: "W5", interrupts: 22, burnoutRisk: 68 },
  { week: "W6", interrupts: 16, burnoutRisk: 55 },
];

const teamStatus = [
  { member: team[0], status: "In Focus", task: "Design system tokens" },
  { member: team[1], status: "Available", task: null },
  { member: team[2], status: "In Focus", task: "Implement auth module" },
  { member: team[3], status: "Available", task: null },
  { member: team[4], status: "In Focus", task: "Resolve merge conflicts" },
  { member: team[5], status: "Available", task: null },
];

const AnalyticsPage = () => {
  return (
    <div className="flex-1 overflow-y-auto flex flex-col gap-3">
      <h2 className="text-base font-semibold text-foreground px-1">Analytics & Burnout</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Focus Hours vs Tasks */}
        <div className="bg-surface rounded-2xl shadow-card p-5 flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-foreground">Focus Hours vs Tasks Completed</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "hsl(218, 11%, 46%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(218, 11%, 46%)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(0, 0%, 100%)",
                    border: "1px solid hsl(220, 13%, 91%)",
                    borderRadius: 12,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.04)",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="focusHrs" name="Focus Hrs" fill="hsl(216, 38%, 68%)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="tasksCompleted" name="Tasks Done" fill="hsl(152, 50%, 50%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Burnout Risk */}
        <div className="bg-surface rounded-2xl shadow-card p-5 flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-foreground">Burnout Risk Trend</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={burnoutData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                <XAxis dataKey="week" tick={{ fontSize: 12, fill: "hsl(218, 11%, 46%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(218, 11%, 46%)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(0, 0%, 100%)",
                    border: "1px solid hsl(220, 13%, 91%)",
                    borderRadius: 12,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.04)",
                    fontSize: 12,
                  }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="interrupts" name="Interrupts" stroke="hsl(216, 38%, 68%)" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="burnoutRisk" name="Burnout Risk %" stroke="hsl(0, 42%, 61%)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Team Status */}
      <div className="bg-surface rounded-2xl shadow-card p-5 flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-foreground">Team Status</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {teamStatus.map((ts) => (
            <div
              key={ts.member.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-border hover:shadow-card transition-shadow"
            >
              <div className={`w-9 h-9 rounded-lg ${ts.member.color} flex items-center justify-center text-xs font-semibold text-foreground`}>
                {ts.member.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{ts.member.name}</p>
                {ts.task && (
                  <p className="text-xs text-text-muted truncate">{ts.task}</p>
                )}
              </div>
              <span
                className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md ${
                  ts.status === "In Focus"
                    ? "bg-focus/15 text-focus"
                    : "bg-secondary text-text-secondary"
                }`}
              >
                {ts.status === "In Focus" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-focus animate-pulse-soft" />
                )}
                {ts.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
