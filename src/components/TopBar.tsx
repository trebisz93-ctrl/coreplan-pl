import { useApp } from '@/context/AppContext';
import { useIsAdmin } from '@/hooks/useRole';
import { useUnreadCount } from '@/hooks/useNotifications';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Bell, Users, X } from 'lucide-react';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { NotificationCenter } from './NotificationCenter';

const routeTitles: Record<string, string> = {
  '/app': 'CorePlan',
  '/dashboard': 'Dashboard',
  '/clients': 'Klienci',
  '/products': 'Produkty',
  '/packages': 'Pakiety',
  '/reports': 'Raporty',
  '/users': 'Użytkownicy',
  '/settings': 'Ustawienia',
};

export const TopBar = () => {
  const {
    clients, selectedClientId, setSelectedClientId,
    multiClientMode, setMultiClientMode,
    selectedClientIds, setSelectedClientIds,
  } = useApp();
  const isAdmin = useIsAdmin();
  const { data: unreadCount = 0 } = useUnreadCount();
  const [notifOpen, setNotifOpen] = useState(false);
  const location = useLocation();

  const currentTitle = routeTitles[location.pathname] || 'CRM';

  const toggleClientId = (id: string) => {
    setSelectedClientIds(
      selectedClientIds.includes(id)
        ? selectedClientIds.filter(c => c !== id)
        : [...selectedClientIds, id]
    );
  };

  return (
    <>
      <div className="bg-card border-b border-border px-6 py-3">
        <div className="flex items-center gap-4">
          {/* Left: client selector */}
          <div className="flex items-center gap-3 shrink-0">
            {isAdmin && (
              <div className="flex items-center gap-2">
                <Switch
                  id="multi-mode"
                  checked={multiClientMode}
                  onCheckedChange={setMultiClientMode}
                />
                <Label htmlFor="multi-mode" className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap">
                  {multiClientMode ? 'Kilku klientów' : 'Jeden klient'}
                </Label>
              </div>
            )}

            {!multiClientMode ? (
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Wybierz klienta" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Users className="h-4 w-4" />
                    {selectedClientIds.length === 0 ? 'Wybierz klientów' : `${selectedClientIds.length} klient(ów)`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="start">
                  <div className="space-y-1">
                    <div className="text-sm font-medium mb-2">Wybierz klientów</div>
                    {clients.map(c => (
                      <label key={c.id} className="flex items-center gap-2 cursor-pointer hover:bg-secondary/50 rounded px-2 py-1.5">
                        <Checkbox
                          checked={selectedClientIds.includes(c.id)}
                          onCheckedChange={() => toggleClientId(c.id)}
                        />
                        <span className="text-sm">{c.name}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {multiClientMode && selectedClientIds.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {selectedClientIds.map(cid => {
                  const client = clients.find(c => c.id === cid);
                  return client ? (
                    <Badge key={cid} variant="secondary" className="gap-1">
                      {client.name}
                      <button onClick={() => toggleClientId(cid)} className="hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ) : null;
                })}
              </div>
            )}
          </div>

          {/* Center: dynamic title */}
          <div className="flex-1 text-center">
            <h1 className="text-lg font-semibold text-foreground">{currentTitle}</h1>
          </div>

          {/* Right: bell */}
          <div className="shrink-0">
            <Button variant="ghost" size="icon" className="relative" onClick={() => setNotifOpen(true)}>
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      <NotificationCenter open={notifOpen} onOpenChange={setNotifOpen} />
    </>
  );
};
