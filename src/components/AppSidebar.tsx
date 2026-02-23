import { Link, useLocation } from 'react-router-dom';
import { CalendarDays, BarChart3, Package, FileText, Settings, LogOut, Building2, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

const navItems = [
  { label: 'Media plan', icon: CalendarDays, path: '/' },
  { label: 'Dashboard', icon: BarChart3, path: '/dashboard' },
  { label: 'Klienci', icon: Building2, path: '/clients' },
  { label: 'Produkty', icon: ShoppingBag, path: '/products' },
  { label: 'Pakiety', icon: Package, path: '/packages' },
  { label: 'Raporty', icon: FileText, path: '/reports' },
  { label: 'Ustawienia', icon: Settings, path: '/settings' },
];

export const AppSidebar = () => {
  const { signOut } = useAuth();
  const { pathname } = useLocation();

  return (
    <aside className="w-60 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border">
      <div className="p-5 border-b border-sidebar-border">
        <h1 className="text-lg font-bold text-sidebar-primary-foreground tracking-tight">
          📊 MediaPlan <span className="text-sidebar-primary">CRM</span>
        </h1>
        <p className="text-xs text-sidebar-foreground/60 mt-1">Zarządzanie mediaplanami</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(item => {
          const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
          const isExactActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                (isActive || isExactActive)
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
        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Wyloguj
        </button>
        <div className="text-xs text-sidebar-foreground/40">MediaPlan CRM v1.0</div>
      </div>
    </aside>
  );
};
