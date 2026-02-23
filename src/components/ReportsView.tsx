import { useApp } from '@/context/AppContext';
import { useProducts } from '@/hooks/useData';
import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';
import { statusLabels, campaignTypeLabels } from '@/types/mediaplan';

const formatPLN = (n: number) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(n);

export const ReportsView = () => {
  const { allActivities, selectedClientId, selectedClient } = useApp();
  const { data: clientProducts = [] } = useProducts(selectedClientId || undefined);

  const exportCSV = () => {
    const headers = ['Nazwa', 'Kanał', 'Typ', 'Start', 'Koniec', 'Cena', 'Status', 'Produkty', 'Notatka'];
    const rows = allActivities.map(a => [
      a.name, a.channel, campaignTypeLabels[a.campaignType],
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
    a.download = `raport-${selectedClient?.name || 'mediaplan'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Raporty</h2>
        <Button onClick={exportCSV} className="gap-2">
          <Download className="h-4 w-4" />
          Eksportuj CSV
        </Button>
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
              {allActivities.map((a, i) => (
                <tr key={a.id} className={`border-b border-border last:border-0 ${i % 2 ? 'bg-secondary/20' : ''}`}>
                  <td className="px-4 py-3 font-medium">{a.name}</td>
                  <td className="px-4 py-3">
                    <span className={a.channel === 'online' ? 'text-online' : 'text-offline'}>{a.channel}</span>
                  </td>
                  <td className="px-4 py-3">{campaignTypeLabels[a.campaignType]}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{a.startDate} → {a.endDate}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatPLN(a.price)}</td>
                  <td className="px-4 py-3">{statusLabels[a.status]}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{a.productIds.map(pid => clientProducts.find(p => p.id === pid)?.name).filter(Boolean).join(', ')}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-32 truncate">{a.note || '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-secondary/50 border-t border-border">
                <td className="px-4 py-3 font-bold" colSpan={4}>SUMA</td>
                <td className="px-4 py-3 text-right font-bold">{formatPLN(allActivities.filter(a => a.status !== 'cancelled').reduce((s, a) => s + a.price, 0))}</td>
                <td colSpan={3} className="px-4 py-3 text-muted-foreground text-xs">
                  <FileText className="inline h-3 w-3 mr-1" />
                  {allActivities.length} aktywności
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
