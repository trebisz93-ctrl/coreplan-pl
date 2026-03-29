import { Link, useLocation } from 'react-router-dom';
import { CalendarDays, BarChart3, Building2, MoreHorizontal, ShoppingBag, Package, FileText, Settings, LogOut, Users, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useIsAdmin, useIsSuperAdminRole } from '@/hooks/useRole';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useState } from 'react';

const mainTabs = [
  { label: 'Media plan', icon: CalendarDays, path: '/app' },
  { label: 'Dashboard', icon: BarChart3, path: '/dashboard' },
  { label: 'Klienci', icon: Building2, path: '/clients' },
];

const moreItems = [
  { label: 'Produkty', icon: ShoppingBag, path: '/products' },
  { label: 'Pakiety', icon: Package, path: '/packages' },
  { label: 'Raporty', icon: FileText, path: '/reports' },
  { label: 'Ustawienia', icon: Settings, path: '/settings' },
];

const adminItems = [
  { label: 'Użytkownicy', icon: Users, path: '/users' },
];

export const MobileBottomNav = () => {
  const { signOut } = useAuth();
  const { pathname } = useLocation();
  const isAdmin = useIsAdmin();
  const isSuperAdmin = useIsSuperAdminRole();
  const [open, setOpen] = useState(false);

  const allMoreItems = [...moreItems, ...(isAdmin ? adminItems : [])];
  const isMoreActive = allMoreItems.some(i => pathname.startsWith(i.path));

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card border-t border-border safe-area-bottom">
      <nav className="flex items-stretch justify-around h-14">
        {mainTabs.map(tab => {
          const active = pathname === tab.path || (tab.path !== '/' && pathname.startsWith(tab.path));
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={cn(
                'flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-colors',
                active ? 'text-primary' : 'text-muted-foreground'
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
                'flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-colors',
                isMoreActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <MoreHorizontal className={cn('h-5 w-5', isMoreActive && 'stroke-[2.5]')} />
              Więcej
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl pb-8">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-3 mt-4">
              {allMoreItems.map(item => {
                const active = pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-3 rounded-xl transition-colors',
                      active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
                    )}
                  >
                    <item.icon className="h-6 w-6" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </Link>
                );
              })}
              {isSuperAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setOpen(false)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl text-primary hover:bg-primary/10"
                >
                  <Shield className="h-6 w-6" />
                  <span className="text-xs font-medium">Super Admin</span>
                </Link>
              )}
              <button
                onClick={() => { setOpen(false); signOut(); }}
                className="flex flex-col items-center gap-2 p-3 rounded-xl text-muted-foreground hover:bg-muted"
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
