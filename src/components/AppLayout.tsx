import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';

export const AppLayout = () => (
  <div className="flex h-screen w-full overflow-hidden">
    <AppSidebar />
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopBar />
      <main className="flex-1 overflow-auto p-6 bg-background">
        <Outlet />
      </main>
    </div>
  </div>
);
