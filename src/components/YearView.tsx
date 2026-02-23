import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Activity, campaignColors, statusLabels, campaignTypeLabels } from '@/types/mediaplan';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';

const months = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];
const formatPLN = (n: number) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(n);

const statusBadgeClass: Record<string, string> = {
  planned: 'bg-status-planned text-primary-foreground',
  in_progress: 'bg-status-in-progress text-primary-foreground',
  completed: 'bg-status-completed text-primary-foreground',
  cancelled: 'bg-status-cancelled text-primary-foreground',
};

export const YearView = () => {
  const { filteredActivities, clientProducts, selectedPlan } = useApp();
  const year = selectedPlan?.year || 2026;

  const activitiesByProduct = useMemo(() => {
    const map: Record<string, Activity[]> = {};
    clientProducts.forEach(p => { map[p.id] = []; });
    filteredActivities.forEach(a => {
      a.productIds.forEach(pid => {
        if (map[pid]) map[pid].push(a);
      });
    });
    return map;
  }, [filteredActivities, clientProducts]);

  const getBarStyle = (activity: Activity) => {
    const start = new Date(activity.startDate);
    const end = new Date(activity.endDate);
    const yearStart = new Date(year, 0, 1).getTime();
    const yearEnd = new Date(year + 1, 0, 1).getTime();
    const dur = yearEnd - yearStart;
    const left = Math.max(0, (start.getTime() - yearStart) / dur * 100);
    const width = Math.min(100, (end.getTime() - yearStart) / dur * 100) - left;
    return { left: `${left}%`, width: `${Math.max(width, 0.8)}%` };
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Month header */}
      <div className="flex border-b border-border">
        <div className="w-44 shrink-0 px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Produkt
        </div>
        <div className="flex-1 grid grid-cols-12">
          {months.map((m, i) => (
            <div key={m} className={`text-center text-xs font-semibold py-3 text-muted-foreground ${i > 0 ? 'border-l border-border' : ''}`}>
              {m}
            </div>
          ))}
        </div>
      </div>

      {/* Product rows */}
      {clientProducts.map((product, rowIdx) => {
        const acts = activitiesByProduct[product.id] || [];
        const rowHeight = Math.max(56, acts.length * 28 + 16);
        return (
          <div key={product.id} className={`flex border-b border-border last:border-b-0 ${rowIdx % 2 === 0 ? '' : 'bg-secondary/30'}`}>
            <div className="w-44 shrink-0 px-4 flex items-center">
              <span className="text-sm font-medium truncate">{product.name}</span>
            </div>
            <div className="flex-1 relative" style={{ minHeight: rowHeight }}>
              {/* Grid lines */}
              <div className="absolute inset-0 grid grid-cols-12 pointer-events-none">
                {months.map((_, i) => (
                  <div key={i} className={i > 0 ? 'border-l border-border' : ''} />
                ))}
              </div>
              {/* Activity bars */}
              {acts.map((activity, idx) => {
                const pos = getBarStyle(activity);
                return (
                  <HoverCard key={activity.id} openDelay={100} closeDelay={50}>
                    <HoverCardTrigger asChild>
                      <div
                        className="absolute rounded-md cursor-pointer hover:brightness-110 transition-all shadow-sm hover:shadow-md z-10"
                        style={{
                          ...pos,
                          top: 8 + idx * 28,
                          height: 22,
                          backgroundColor: campaignColors[activity.campaignType],
                        }}
                      >
                        <span className="text-[10px] leading-[22px] px-2 font-medium truncate block" style={{ color: 'white' }}>
                          {activity.name}
                        </span>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-72 p-4 space-y-2" side="top">
                      <div className="font-semibold text-sm">{activity.name}</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={statusBadgeClass[activity.status]} variant="secondary">
                          {statusLabels[activity.status]}
                        </Badge>
                        <Badge variant="outline">{campaignTypeLabels[activity.campaignType]}</Badge>
                        <Badge variant="outline" className={activity.channel === 'online' ? 'border-online text-online' : 'border-offline text-offline'}>
                          {activity.channel}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>📅 {activity.startDate} → {activity.endDate}</div>
                        <div>💰 {formatPLN(activity.price)}</div>
                        <div>📦 Produkty: {activity.productIds.map(pid => clientProducts.find(p => p.id === pid)?.name).filter(Boolean).join(', ')}</div>
                        {activity.note && <div>📝 {activity.note}</div>}
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                );
              })}
            </div>
          </div>
        );
      })}

      {clientProducts.length === 0 && (
        <div className="p-12 text-center text-muted-foreground">Brak produktów dla wybranego klienta</div>
      )}
    </div>
  );
};
