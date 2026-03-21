import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Users, ScrollText, Database,
  Settings, LogOut, Shield, Trash2, Globe, ChevronDown, Activity, BarChart3,
  ShoppingCart, Key, Plug
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { AdminContextBar } from './AdminContextBar';
import corePlanLogo from '@/assets/core-plan-logo.png';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
  { label: 'Firmy', icon: Building2, path: '/admin/organizations' },
  { label: 'Użytkownicy', icon: Users, path: '/admin/users' },
  { label: 'Klienci globalni', icon: ShoppingCart, path: '/admin/clients' },
  { label: 'Aktywność', icon: Activity, path: '/admin/activity' },
  { label: 'Logi systemowe', icon: ScrollText, path: '/admin/logs' },
  { label: 'Backupy', icon: Database, path: '/admin/backups' },
  { label: 'Raporty', icon: BarChart3, path: '/admin/reports' },
  { label: 'Kosz', icon: Trash2, path: '/admin/trash' },
  { label: 'Role i uprawnienia', icon: Key, path: '/admin/roles' },
  { label: 'Bezpieczeństwo', icon: Shield, path: '/admin/security' },
  { label: 'Integracje', icon: Plug, path: '/admin/integrations' },
  { label: 'Ustawienia', icon: Settings, path: '/admin/settings' },
];

export const SuperAdminLayout = () => {
  const { signOut } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { organizations, currentOrg, viewMode, switchToOrg, switchToGlobal } = useOrganization();

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

        {/* Org Switcher */}
        <div className="p-3 border-b border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium bg-sidebar-accent/30 hover:bg-sidebar-accent/50 transition-colors">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span className="truncate">{viewMode === 'global' ? 'Widok globalny' : currentOrg?.name || 'Wybierz firmę'}</span>
              </div>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onClick={() => { switchToGlobal(); navigate('/admin'); }}>
                <Globe className="h-4 w-4 mr-2" /> Widok globalny
              </DropdownMenuItem>
              {organizations.length > 0 && <DropdownMenuSeparator />}
              {organizations.map(org => (
                <DropdownMenuItem key={org.id} onClick={() => { switchToOrg(org); navigate('/app'); }}>
                  <Building2 className="h-4 w-4 mr-2" /> {org.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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
        <AdminContextBar />
        <main className="flex-1 overflow-auto p-6 bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
