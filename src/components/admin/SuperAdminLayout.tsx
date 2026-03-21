import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Users, ScrollText, Database,
  Settings, LogOut, Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import corePlanLogo from '@/assets/core-plan-logo.png';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
  { label: 'Firmy', icon: Building2, path: '/admin/organizations' },
  { label: 'Użytkownicy', icon: Users, path: '/admin/users' },
  { label: 'Logi systemowe', icon: ScrollText, path: '/admin/logs' },
  { label: 'Backupy', icon: Database, path: '/admin/backups' },
  { label: 'Bezpieczeństwo', icon: Shield, path: '/admin/security' },
  { label: 'Ustawienia', icon: Settings, path: '/admin/settings' },
];

export const SuperAdminLayout = () => {
  const { signOut } = useAuth();
  const { pathname } = useLocation();

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <aside className="w-64 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border">
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <img src={corePlanLogo} alt="CorePlan logo" className="h-10 object-contain" />
          </div>
          <div className="mt-2 px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary/80">Super Admin</span>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const isActive = pathname === item.path || (item.path !== '/admin' && pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border space-y-2">
          <Link
            to="/app"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors"
          >
            <Building2 className="h-4 w-4" />
            Panel firmowy
          </Link>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Wyloguj
          </button>
          <div className="text-xs text-sidebar-foreground/40">CorePlan v1.0 – Super Admin</div>
        </div>
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-auto p-6 bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
