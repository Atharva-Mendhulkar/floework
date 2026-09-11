import SidebarNavigation from "@/components/SidebarNavigation";
import TopHeader from "@/components/TopHeader";
import { Outlet } from "react-router-dom";

interface DashboardLayoutProps {
  children?: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <div className="flex h-screen bg-background p-3 gap-3">
      <SidebarNavigation />
      <div className="flex flex-col flex-1 gap-3 min-w-0">
        <TopHeader />
        <main className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-3">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
