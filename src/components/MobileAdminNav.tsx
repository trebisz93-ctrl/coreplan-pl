import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Building2, Users, MoreHorizontal, ScrollText, Database, Settings, LogOut, Shield, Trash2, Activity, BarChart3, ShoppingCart, Key, Plug } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useState } from 'react';

const mainTabs = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
  { label: 'Firmy', icon: Building2, path: '/admin/organizations' },
  { label: 'Użytkownicy', icon: Users, path: '/admin/users' },
];

const moreItems = [
  { label: 'Klienci globalni', icon: ShoppingCart, path: '/admin/clients' },
  { label: 'Aktywność', icon: Activity, path: '/admin/activity' },
  { label: 'Logi', icon: ScrollText, path: '/admin/logs' },
  { label: 'Backupy', icon: Database, path: '/admin/backups' },
  { label: 'Raporty', icon: BarChart3, path: '/admin/reports' },
  { label: 'Kosz', icon: Trash2, path: '/admin/trash' },
  { label: 'Role', icon: Key, path: '/admin/roles' },
  { label: 'Bezpieczeństwo', icon: Shield, path: '/admin/security' },
  { label: 'Integracje', icon: Plug, path: '/admin/integrations' },
  { label: 'Ustawienia', icon: Settings, path: '/admin/settings' },
];

export const MobileAdminNav = () => {
  const { signOut } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  const isMoreActive = moreItems.some(i => pathname.startsWith(i.path));

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t safe-area-bottom"
      style={{
        background: 'rgba(248,248,248,0.97)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTopColor: 'rgba(0,0,0,0.1)',
        borderTopWidth: '0.5px',
      }}
    >
      <nav className="flex items-stretch justify-around h-14">
        {mainTabs.map(tab => {
          const active = tab.path === '/admin'
            ? pathname === '/admin'
            : pathname.startsWith(tab.path);
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={cn(
                'flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-colors min-h-[44px]',
                active ? 'text-primary' : 'text-muted-foreground/50'
              )}
            >
              <tab.icon className={cn('h-5 w-5', active && 'stroke-[2.5]')} />
              {tab.label}
            </Link>
          );
        })}

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                'flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-colors min-h-[44px]',
                isMoreActive ? 'text-primary' : 'text-muted-foreground/50'
              )}
            >
              <MoreHorizontal className={cn('h-5 w-5', isMoreActive && 'stroke-[2.5]')} />
              Więcej
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl pb-8 max-h-[70vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Panel Super Admina</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-3 mt-4">
              {moreItems.map(item => {
                const active = pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-3 rounded-card transition-colors min-h-[44px]',
                      active ? 'bg-brand-bg text-primary' : 'text-muted-foreground hover:bg-muted'
                    )}
                  >
                    <item.icon className="h-6 w-6" />
                    <span className="text-xs font-medium text-center">{item.label}</span>
                  </Link>
                );
              })}
              <button
                onClick={() => { setOpen(false); signOut(); }}
                className="flex flex-col items-center gap-2 p-3 rounded-card text-muted-foreground hover:bg-muted min-h-[44px]"
              >
                <LogOut className="h-6 w-6" />
                <span className="text-xs font-medium">Wyloguj</span>
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  );
};
