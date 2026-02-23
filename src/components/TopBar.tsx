import { useApp } from '@/context/AppContext';
import { BudgetBar } from './BudgetBar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { ActivityDialog } from './ActivityDialog';

export const TopBar = () => {
  const {
    clients, selectedClientId, setSelectedClientId,
    clientPlans, selectedPlanId, setSelectedPlanId,
    channelFilter, setChannelFilter,
    searchQuery, setSearchQuery,
  } = useApp();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <div className="bg-card border-b border-border px-6 py-3 space-y-3">
        <div className="flex items-center gap-4 flex-wrap">
          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Klient" />
            </SelectTrigger>
            <SelectContent>
              {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Plan" />
            </SelectTrigger>
            <SelectContent>
              {clientPlans.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.version})</SelectItem>)}
            </SelectContent>
          </Select>

          <div className="flex-1">
            <BudgetBar />
          </div>

          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Dodaj aktywność
          </Button>
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
