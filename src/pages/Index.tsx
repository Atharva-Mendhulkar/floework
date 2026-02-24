import { useState } from "react";
import SidebarNavigation from "@/components/SidebarNavigation";
import TopHeader from "@/components/TopHeader";
import FlowBoard from "@/components/FlowBoard";
import ActivityTable from "@/components/ActivityTable";
import ProductivityChart from "@/components/ProductivityChart";
import TaskDetailPanel from "@/components/TaskDetailPanel";
import type { TaskNode } from "@/data/mockData";

const Index = () => {
  const [selectedTask, setSelectedTask] = useState<TaskNode | null>(null);

  return (
    <div className="flex h-screen bg-background p-3 gap-3">
      <SidebarNavigation />

      <div className="flex flex-col flex-1 gap-3 min-w-0">
        <TopHeader />

        <main className="flex-1 overflow-y-auto flex flex-col gap-3">
          <FlowBoard onTaskClick={setSelectedTask} />

          <div className="flex gap-3 flex-col lg:flex-row">
            <ActivityTable />
            <ProductivityChart />
          </div>
        </main>
      </div>

      <TaskDetailPanel task={selectedTask} onClose={() => setSelectedTask(null)} />
    </div>
  );
};

export default Index;
