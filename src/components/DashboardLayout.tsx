import SidebarNavigation from "@/components/SidebarNavigation";
import TopHeader from "@/components/TopHeader";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <div className="flex h-screen bg-background p-3 gap-3">
      <SidebarNavigation />
      <div className="flex flex-col flex-1 gap-3 min-w-0">
        <TopHeader />
        <main className="flex-1 overflow-y-auto flex flex-col gap-3">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
