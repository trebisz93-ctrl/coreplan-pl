import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';
import { AdminContextBar } from './admin/AdminContextBar';
import { MobileBottomNav } from './MobileBottomNav';

export const AppLayout = () => (
  <div className="flex h-screen w-full overflow-hidden">
    <AppSidebar />
    <div className="flex flex-1 flex-col overflow-hidden">
      <AdminContextBar />
      <TopBar />
      <main className="flex-1 overflow-auto p-3 md:p-6 bg-background pb-20 md:pb-6">
        <Outlet />
      </main>
    </div>
    <MobileBottomNav />
  </div>
);
