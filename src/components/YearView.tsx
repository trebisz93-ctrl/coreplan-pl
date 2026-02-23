import { useMemo, useState, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { useProducts, DbProduct } from '@/hooks/useData';
import { Activity, statusLabels, campaignTypeLabels } from '@/types/mediaplan';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Palette } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ActivityDetailDrawer } from './ActivityDetailDrawer';

const months = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];
const formatPLN = (n: number) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(n);

const statusBadgeClass: Record<string, string> = {
  planned: 'bg-status-planned text-primary-foreground',
  in_progress: 'bg-status-in-progress text-primary-foreground',
  completed: 'bg-status-completed text-primary-foreground',
  cancelled: 'bg-status-cancelled text-primary-foreground',
};

const DEFAULT_SUB_COLORS = [
  'hsl(221, 83%, 53%)', 'hsl(271, 81%, 56%)', 'hsl(142, 71%, 45%)',
  'hsl(0, 84%, 60%)', 'hsl(25, 95%, 53%)', 'hsl(38, 92%, 50%)',
  'hsl(330, 81%, 60%)', 'hsl(173, 58%, 39%)', 'hsl(263, 70%, 50%)',
  'hsl(200, 80%, 50%)', 'hsl(50, 90%, 45%)', 'hsl(290, 60%, 55%)',
];

const PRESET_COLORS = [
  'hsl(221, 83%, 53%)', 'hsl(271, 81%, 56%)', 'hsl(142, 71%, 45%)',
  'hsl(0, 84%, 60%)', 'hsl(25, 95%, 53%)', 'hsl(38, 92%, 50%)',
  'hsl(330, 81%, 60%)', 'hsl(173, 58%, 39%)', 'hsl(263, 70%, 50%)',
  'hsl(200, 80%, 50%)', 'hsl(50, 90%, 45%)', 'hsl(290, 60%, 55%)',
  'hsl(180, 60%, 40%)', 'hsl(10, 70%, 50%)', 'hsl(150, 50%, 50%)',
  'hsl(300, 50%, 50%)',
];

interface SubcategoryNode {
  subcategory: string;
  products: DbProduct[];
}

interface ClientGroup {
  clientId: string;
  clientName: string;
  subcategoryGroups: SubcategoryNode[];
}

export const YearView = () => {
  const { filteredActivities, selectedClientId, clients, multiClientMode, selectedClientIds } = useApp();
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // In multi mode, fetch ALL products (no client filter); in single mode, fetch for selected client
  const { data: fetchedProducts = [] } = useProducts(multiClientMode ? undefined : (selectedClientId || undefined));

  // Filter products to selected clients in multi mode
  const effectiveProducts = useMemo(() => {
    if (!multiClientMode) return fetchedProducts;
    return fetchedProducts.filter(p => selectedClientIds.includes(p.client_id));
  }, [multiClientMode, fetchedProducts, selectedClientIds]);

  const year = 2026;

  // Subcategory groups (single mode)
  const subcategoryGroups = useMemo(() => {
    if (multiClientMode) return [];
    const map = new Map<string, DbProduct[]>();
    effectiveProducts.forEach(p => {
      const key = p.subcategory || 'Inne';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    return Array.from(map.entries())
      .map(([subcategory, products]) => ({ subcategory, products }))
      .sort((a, b) => a.subcategory.localeCompare(b.subcategory));
  }, [effectiveProducts, multiClientMode]);

  // Client groups (multi mode)
  const clientGroupsList = useMemo<ClientGroup[]>(() => {
    if (!multiClientMode) return [];
    return selectedClientIds.map(cid => {
      const client = clients.find(c => c.id === cid);
      if (!client) return null;
      const products = effectiveProducts.filter(p => p.client_id === cid);
      const map = new Map<string, DbProduct[]>();
      products.forEach(p => {
        const key = p.subcategory || 'Inne';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(p);
      });
      return {
        clientId: cid,
        clientName: client.name,
        subcategoryGroups: Array.from(map.entries())
          .map(([subcategory, products]) => ({ subcategory, products }))
          .sort((a, b) => a.subcategory.localeCompare(b.subcategory)),
      };
    }).filter(Boolean) as ClientGroup[];
  }, [multiClientMode, selectedClientIds, effectiveProducts, clients]);

  // State
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set());
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [subColors, setSubColors] = useState<Record<string, string>>({});

  const allSubGroups = multiClientMode
    ? clientGroupsList.flatMap(cg => cg.subcategoryGroups)
    : subcategoryGroups;
  const allSubNames = useMemo(() => [...new Set(allSubGroups.map(g => g.subcategory))], [allSubGroups]);

  const getSubColor = useCallback((sub: string) => {
    if (subColors[sub]) return subColors[sub];
    const idx = allSubNames.indexOf(sub);
    return DEFAULT_SUB_COLORS[(idx >= 0 ? idx : 0) % DEFAULT_SUB_COLORS.length];
  }, [subColors, allSubNames]);

  const toggleClient = (id: string) => {
    setExpandedClients(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };
  const toggleSub = (key: string) => {
    setExpandedSubs(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  };
  const toggleProduct = (id: string) => {
    setExpandedProducts(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  // Activities indexed by product
  const activitiesByProduct = useMemo(() => {
    const map: Record<string, Activity[]> = {};
    effectiveProducts.forEach(p => { map[p.id] = []; });
    filteredActivities.forEach(a => {
      a.productIds.forEach(pid => {
        if (map[pid]) map[pid].push(a);
      });
    });
    return map;
  }, [filteredActivities, effectiveProducts]);

  const getSubcategoryActivities = useCallback((products: DbProduct[]) => {
    const productIds = new Set(products.map(p => p.id));
    const acts = filteredActivities.filter(a => a.productIds.some(pid => productIds.has(pid)));
    const seen = new Set<string>();
    return acts.filter(a => { if (seen.has(a.id)) return false; seen.add(a.id); return true; });
  }, [filteredActivities]);

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

  const renderActivityBars = (acts: Activity[], color: string) => {
    const rowHeight = Math.max(40, acts.length * 28 + 12);
    return (
      <div className="flex-1 relative" style={{ minHeight: rowHeight }}>
        <div className="absolute inset-0 grid grid-cols-12 pointer-events-none">
          {months.map((_, i) => (
            <div key={i} className={i > 0 ? 'border-l border-border' : ''} />
          ))}
        </div>
        {acts.map((activity, idx) => {
          const pos = getBarStyle(activity);
          return (
            <HoverCard key={activity.id} openDelay={100} closeDelay={50}>
              <HoverCardTrigger asChild>
                <div
                  className="absolute rounded-md cursor-pointer hover:brightness-110 transition-all shadow-sm hover:shadow-md z-10"
                  style={{ ...pos, top: 6 + idx * 28, height: 22, backgroundColor: color }}
                  onClick={() => { setSelectedActivity(activity); setDrawerOpen(true); }}
                >
                  <span className="text-[10px] leading-[22px] px-2 font-medium truncate block text-white">
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
                  <div>📦 Produkty: {activity.productIds.map(pid => effectiveProducts.find(p => p.id === pid)?.name).filter(Boolean).join(', ')}</div>
                  {activity.note && <div>📝 {activity.note}</div>}
                </div>
              </HoverCardContent>
            </HoverCard>
          );
        })}
      </div>
    );
  };

  const renderEmptyTimeline = () => (
    <div className="flex-1 relative" style={{ minHeight: 36 }}>
      <div className="absolute inset-0 grid grid-cols-12 pointer-events-none">
        {months.map((_, i) => (
          <div key={i} className={i > 0 ? 'border-l border-border' : ''} />
        ))}
      </div>
    </div>
  );

  const renderSubcategoryRows = (groups: SubcategoryNode[], subKeyPrefix = '', indentLevel = 0) => {
    return groups.map((group, groupIdx) => {
      const subKey = subKeyPrefix + group.subcategory;
      const isExpanded = expandedSubs.has(subKey);
      const subActs = getSubcategoryActivities(group.products);
      const color = getSubColor(group.subcategory);
      const paddingLeft = indentLevel > 0 ? 'pl-10' : '';

      return (
        <div key={subKey}>
          <div className={`flex border-b border-border ${groupIdx % 2 === 0 ? '' : 'bg-secondary/30'}`}>
            <div className={`w-52 shrink-0 px-4 flex items-center gap-2 ${paddingLeft}`}>
              <button onClick={() => toggleSub(subKey)} className="flex items-center gap-1 text-sm font-semibold hover:text-primary transition-colors">
                {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                <div className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                <span className="truncate">{group.subcategory}</span>
              </button>
              <span className="text-xs text-muted-foreground">({group.products.length})</span>
            </div>
            {renderActivityBars(subActs, color)}
          </div>

          {isExpanded && group.products.map(product => {
            const productActs = activitiesByProduct[product.id] || [];
            const isProductExpanded = expandedProducts.has(product.id);
            const productPl = indentLevel > 0 ? 'pl-16' : 'pl-10';
            return (
              <div key={product.id} className="flex border-b border-border bg-secondary/10">
                <div className={`w-52 shrink-0 px-4 flex items-center ${productPl}`}>
                  <button
                    onClick={() => toggleProduct(product.id)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {productActs.length > 0 ? (
                      isProductExpanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />
                    ) : (
                      <span className="w-3" />
                    )}
                    <span className="truncate">{product.name}</span>
                  </button>
                </div>
                {isProductExpanded ? renderActivityBars(productActs, color) : renderEmptyTimeline()}
              </div>
            );
          })}
        </div>
      );
    });
  };

  const hasProducts = effectiveProducts.length > 0;

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {/* Month header */}
        <div className="flex border-b border-border">
          <div className="w-52 shrink-0 px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {multiClientMode ? 'Klient / Subkat. / Produkt' : 'Subkategoria / Produkt'}
          </div>
          <div className="flex-1 grid grid-cols-12">
            {months.map((m, i) => (
              <div key={m} className={`text-center text-xs font-semibold py-3 text-muted-foreground ${i > 0 ? 'border-l border-border' : ''}`}>
                {m}
              </div>
            ))}
          </div>
        </div>

        {/* Multi-client mode */}
        {multiClientMode && clientGroupsList.map(cg => {
          const isClientExpanded = expandedClients.has(cg.clientId);
          const clientProds = effectiveProducts.filter(p => p.client_id === cg.clientId);
          const clientActs = getSubcategoryActivities(clientProds);

          return (
            <div key={cg.clientId}>
              <div className="flex border-b border-border bg-primary/5">
                <div className="w-52 shrink-0 px-4 flex items-center gap-2">
                  <button onClick={() => toggleClient(cg.clientId)} className="flex items-center gap-1 text-sm font-bold hover:text-primary transition-colors">
                    {isClientExpanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                    <span className="truncate">{cg.clientName}</span>
                  </button>
                  <Badge variant="outline" className="text-[10px]">{clientProds.length} prod.</Badge>
                </div>
                {renderActivityBars(clientActs, 'hsl(var(--primary))')}
              </div>
              {isClientExpanded && renderSubcategoryRows(cg.subcategoryGroups, `${cg.clientId}::`, 1)}
            </div>
          );
        })}

        {/* Single-client mode */}
        {!multiClientMode && renderSubcategoryRows(subcategoryGroups)}

        {!hasProducts && (
          <div className="p-12 text-center text-muted-foreground">
            {multiClientMode
              ? (selectedClientIds.length > 0 ? 'Brak produktów dla wybranych klientów.' : 'Wybierz klientów na górze.')
              : (selectedClientId ? 'Brak produktów dla wybranego klienta. Dodaj produkty w zakładce Produkty.' : 'Wybierz klienta na górze.')}
          </div>
        )}
      </div>

      {/* Legend */}
      {allSubNames.length > 0 && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Legenda subkategorii</h4>
          </div>
          <div className="flex flex-wrap gap-3">
            {allSubNames.map(sub => {
              const color = getSubColor(sub);
              const count = effectiveProducts.filter(p => (p.subcategory || 'Inne') === sub).length;
              return (
                <Popover key={sub}>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-2 text-xs px-2 py-1 rounded-md hover:bg-secondary/50 transition-colors border border-transparent hover:border-border">
                      <div className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                      <span>{sub}</span>
                      <span className="text-muted-foreground">({count})</span>
                      <Palette className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-3" side="top">
                    <div className="text-xs font-medium mb-2">Kolor dla: {sub}</div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {PRESET_COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => setSubColors(prev => ({ ...prev, [sub]: c }))}
                          className="h-6 w-6 rounded-md border-2 transition-all hover:scale-110"
                          style={{
                            backgroundColor: c,
                            borderColor: color === c ? 'hsl(var(--foreground))' : 'transparent',
                          }}
                        />
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              );
            })}
          </div>
        </div>
      )}

      {/* Activity detail drawer */}
      <ActivityDetailDrawer
        activity={selectedActivity}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        clientId={selectedClientId}
      />
    </div>
  );
};
