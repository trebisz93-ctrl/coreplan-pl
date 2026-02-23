import { useApp } from '@/context/AppContext';
import { BudgetBar } from './BudgetBar';
import { useCanEdit, useIsAdmin } from '@/hooks/useRole';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Users, X } from 'lucide-react';
import { useState } from 'react';
import { ActivityDialog } from './ActivityDialog';

export const TopBar = () => {
  const {
    clients, selectedClientId, setSelectedClientId,
    channelFilter, setChannelFilter,
    searchQuery, setSearchQuery,
    multiClientMode, setMultiClientMode,
    selectedClientIds, setSelectedClientIds,
  } = useApp();
  const canEdit = useCanEdit();
  const isAdmin = useIsAdmin();
  const [dialogOpen, setDialogOpen] = useState(false);

  const toggleClientId = (id: string) => {
    setSelectedClientIds(
      selectedClientIds.includes(id)
        ? selectedClientIds.filter(c => c !== id)
        : [...selectedClientIds, id]
    );
  };

  return (
    <>
      <div className="bg-card border-b border-border px-6 py-3 space-y-3">
        <div className="flex items-center gap-4 flex-wrap">
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

          <div className="flex-1">
            <BudgetBar />
          </div>

          {canEdit && !multiClientMode && (
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Dodaj aktywność
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex rounded-lg border border-border overflow-hidden text-sm">
            {(['all', 'online', 'offline'] as const).map(ch => (
              <button
                key={ch}
                onClick={() => setChannelFilter(ch)}
                className={`px-3 py-1.5 transition-colors ${
                  channelFilter === ch
                    ? ch === 'online' ? 'bg-online text-primary-foreground'
                    : ch === 'offline' ? 'bg-offline text-primary-foreground'
                    : 'bg-primary text-primary-foreground'
                    : 'bg-card text-muted-foreground hover:bg-secondary'
                }`}
              >
                {ch === 'all' ? 'Wszystkie' : ch === 'online' ? 'Online' : 'Offline'}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj aktywności..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
        </div>
      </div>
      <ActivityDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
};
