import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useProducts } from '@/hooks/useData';
import { useCampaignTypes } from '@/hooks/useCampaignTypes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Search } from 'lucide-react';
import { statusLabels, campaignTypeLabels, Activity } from '@/types/mediaplan';
import { ActivityDetailDrawer } from './ActivityDetailDrawer';

const formatPLN = (n: number) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(n);

export const ReportsView = () => {
  const { allActivities, filteredActivities, selectedClientId, selectedClient, channelFilter, setChannelFilter, searchQuery, setSearchQuery } = useApp();
  const { data: clientProducts = [] } = useProducts(selectedClientId || undefined);
  const { data: campaignTypes = [] } = useCampaignTypes();
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const getCampaignLabel = (type: string) => {
    const custom = campaignTypes.find(ct => ct.name === type);
    if (custom) return custom.label;
    return campaignTypeLabels[type as keyof typeof campaignTypeLabels] || type;
  };

  const exportCSV = () => {
    const headers = ['Nazwa', 'Kanał', 'Typ', 'Start', 'Koniec', 'Cena', 'Status', 'Produkty', 'Notatka'];
    const rows = filteredActivities.map(a => [
      a.name, a.channel, getCampaignLabel(a.campaignType),
      a.startDate, a.endDate, a.price.toString(),
      statusLabels[a.status],
      a.productIds.map(pid => clientProducts.find(p => p.id === pid)?.name || pid).join('; '),
      a.note || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `raport-${selectedClient?.name || 'coreplan'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold">Raporty</h2>
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
          <Button onClick={exportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Eksportuj CSV
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left px-4 py-3 font-semibold">Nazwa</th>
                <th className="text-left px-4 py-3 font-semibold">Kanał</th>
                <th className="text-left px-4 py-3 font-semibold">Typ</th>
                <th className="text-left px-4 py-3 font-semibold">Okres</th>
                <th className="text-right px-4 py-3 font-semibold">Cena</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Produkty</th>
                <th className="text-left px-4 py-3 font-semibold">Notatka</th>
              </tr>
            </thead>
            <tbody>
              {filteredActivities.map((a, i) => (
                <tr
                  key={a.id}
                  className={`border-b border-border last:border-0 cursor-pointer hover:bg-secondary/40 transition-colors ${i % 2 ? 'bg-secondary/20' : ''}`}
                  onClick={() => { setSelectedActivity(a); setDrawerOpen(true); }}
                >
                  <td className="px-4 py-3 font-medium">{a.name}</td>
                  <td className="px-4 py-3">
                    <span className={a.channel === 'online' ? 'text-online' : 'text-offline'}>{a.channel}</span>
                  </td>
                  <td className="px-4 py-3">{getCampaignLabel(a.campaignType)}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{a.startDate} → {a.endDate}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatPLN(a.price)}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs">{statusLabels[a.status]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{a.productIds.map(pid => clientProducts.find(p => p.id === pid)?.name).filter(Boolean).join(', ')}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-32 truncate">{a.note || '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-secondary/50 border-t border-border">
                <td className="px-4 py-3 font-bold" colSpan={4}>SUMA</td>
                <td className="px-4 py-3 text-right font-bold">{formatPLN(filteredActivities.filter(a => a.status !== 'cancelled').reduce((s, a) => s + a.price, 0))}</td>
                <td colSpan={3} className="px-4 py-3 text-muted-foreground text-xs">
                  <FileText className="inline h-3 w-3 mr-1" />
                  {filteredActivities.length} aktywności
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <ActivityDetailDrawer
        activity={selectedActivity}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        clientId={selectedClientId}
      />
    </div>
  );
};
