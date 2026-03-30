import { Link, useLocation } from 'react-router-dom';
import { CalendarDays, BarChart3, Package, FileText, Settings, LogOut, Building2, ShoppingBag, Users, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useIsAdmin, useIsSuperAdminRole } from '@/hooks/useRole';
import { useOrganization } from '@/context/OrganizationContext';
import corePlanLogo from '@/assets/core-plan-logo.png';

const baseNavItems = [
  { label: 'Media plan', icon: CalendarDays, path: '/app' },
  { label: 'Dashboard', icon: BarChart3, path: '/dashboard' },
  { label: 'Klienci', icon: Building2, path: '/clients' },
  { label: 'Produkty', icon: ShoppingBag, path: '/products' },
  { label: 'Pakiety', icon: Package, path: '/packages' },
  { label: 'Raporty', icon: FileText, path: '/reports' },
];

const adminNavItems = [
  { label: 'Użytkownicy', icon: Users, path: '/users' },
];

const bottomNavItems = [
  { label: 'Ustawienia', icon: Settings, path: '/settings' },
];

export const AppSidebar = () => {
  const { signOut } = useAuth();
  const { pathname } = useLocation();
  const isAdmin = useIsAdmin();
  const isSuperAdmin = useIsSuperAdminRole();
  const { currentOrg } = useOrganization();

  const navItems = [...baseNavItems, ...(isAdmin ? adminNavItems : []), ...bottomNavItems];
  return (
    <aside className="hidden md:flex w-60 shrink-0 bg-sidebar text-sidebar-foreground flex-col border-r border-sidebar-border">
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center">
          <img src={corePlanLogo} alt="CorePlan logo" className="h-10 object-contain" />
        </div>
        {currentOrg && (
          <div className="mt-2 px-1">
            <span className="text-xs font-medium text-muted-foreground">{currentOrg.name}</span>
          </div>
        )}
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(item => {
          const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-btn text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground border-l-[3px] border-primary -ml-[3px]'
                  : 'text-sidebar-foreground/70 hover:bg-secondary hover:text-sidebar-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-sidebar-border space-y-2">
        {isSuperAdmin && (
          <Link
            to="/admin"
            className="flex items-center gap-3 px-3 py-2.5 rounded-btn text-sm font-medium text-primary hover:bg-sidebar-accent transition-all duration-150"
          >
            <Shield className="h-4 w-4" />
            Panel Super Admina
          </Link>
        )}
        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 px-3 py-2.5 rounded-btn text-sm font-medium w-full text-sidebar-foreground/70 hover:bg-secondary hover:text-sidebar-foreground transition-all duration-150"
        >
          <LogOut className="h-4 w-4" />
          Wyloguj
        </button>
        <div className="text-xs text-muted-foreground/50">CorePlan v1.0</div>
      </div>
    </aside>
  );
};
