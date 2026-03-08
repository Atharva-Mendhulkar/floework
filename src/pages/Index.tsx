import SidebarNavigation from "@/components/SidebarNavigation";
import TopHeader from "@/components/TopHeader";
import ActivityTable from "@/components/ActivityTable";
import ProductivityChart from "@/components/ProductivityChart";
import { useAuth } from "@/modules/auth/AuthContext";

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="flex h-screen bg-background p-3 gap-3">
      <SidebarNavigation />

      <div className="flex flex-col flex-1 gap-3 min-w-0">
        <TopHeader />

        <main className="flex-1 overflow-y-auto flex flex-col gap-6 p-2 lg:p-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Welcome back, {user?.name?.split(' ')[0] || 'User'}!</h1>
            <p className="text-slate-500 font-medium mt-1">Here is what's happening in your workspace today.</p>
          </div>

          <div className="flex gap-4 flex-col lg:flex-row items-start">
            <div className="flex-1 w-full relative z-0">
              <ActivityTable />
            </div>
            <div className="w-full lg:w-[400px] xl:w-[450px] shrink-0">
              <ProductivityChart />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
