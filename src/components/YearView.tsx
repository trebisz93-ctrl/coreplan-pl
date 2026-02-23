import { useMemo, useState, useCallback, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useCanEdit } from '@/hooks/useRole';
import { useProducts, DbProduct } from '@/hooks/useData';
import { Activity, statusLabels, campaignTypeLabels } from '@/types/mediaplan';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronRight, Palette, Plus, Search, FileDown, Calendar, LayoutGrid, List } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ActivityDetailDrawer } from './ActivityDetailDrawer';
import { ActivityDialog } from './ActivityDialog';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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

const quarterRanges: Record<string, [string, string]> = {
  Q1: ['01-01', '03-31'],
  Q2: ['04-01', '06-30'],
  Q3: ['07-01', '09-30'],
  Q4: ['10-01', '12-31'],
  C1: ['01-01', '04-30'],
  C2: ['05-01', '08-31'],
  C3: ['09-01', '12-31'],
  year: ['01-01', '12-31'],
};

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
  const { filteredActivities: allFilteredActivities, selectedClientId, clients, multiClientMode, selectedClientIds, channelFilter, setChannelFilter, searchQuery, setSearchQuery } = useApp();
  const canEdit = useCanEdit();
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [viewMode, setViewMode] = useState<'monthly' | 'weekly'>('monthly');
  // Period selection
  const year = 2026;
  const [dateFrom, setDateFrom] = useState(`${year}-01-01`);
  const [dateTo, setDateTo] = useState(`${year}-12-31`);
  const [activePeriod, setActivePeriod] = useState<string>('year');

  const setPeriod = (key: string) => {
    const [from, to] = quarterRanges[key];
    setDateFrom(`${year}-${from}`);
    setDateTo(`${year}-${to}`);
    setActivePeriod(key);
  };

  // Filter activities by date range
  const filteredActivities = useMemo(() => {
    return allFilteredActivities.filter(a => {
      if (a.endDate < dateFrom || a.startDate > dateTo) return false;
      return true;
    });
  }, [allFilteredActivities, dateFrom, dateTo]);

  // Determine visible months based on date range
  const visibleMonths = useMemo(() => {
    const startMonth = parseInt(dateFrom.slice(5, 7)) - 1;
    const endMonth = parseInt(dateTo.slice(5, 7)) - 1;
    return months.slice(startMonth, endMonth + 1);
  }, [dateFrom, dateTo]);

  // Compute visible weeks (ISO week numbers)
  const visibleWeeks = useMemo(() => {
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    const weeks: { label: string; start: Date; end: Date }[] = [];

    // Find the Monday of the week containing 'start'
    const d = new Date(start);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    d.setDate(diff);

    while (d <= end) {
      const weekStart = new Date(d);
      const weekEnd = new Date(d);
      weekEnd.setDate(weekEnd.getDate() + 6);

      // ISO week number
      const jan4 = new Date(weekStart.getFullYear(), 0, 4);
      const dayOfYear = Math.floor((weekStart.getTime() - jan4.getTime()) / 86400000) + jan4.getDay();
      const weekNum = Math.ceil((dayOfYear + 1) / 7);

      weeks.push({ label: `W${weekNum}`, start: weekStart, end: weekEnd });
      d.setDate(d.getDate() + 7);
    }
    return weeks;
  }, [dateFrom, dateTo]);

  const gridColumns = viewMode === 'weekly' ? visibleWeeks.length : visibleMonths.length;
  const gridHeaders = viewMode === 'weekly' ? visibleWeeks.map(w => w.label) : visibleMonths;

  // In multi mode, fetch ALL products; in single mode, fetch for selected client
  const { data: fetchedProducts = [] } = useProducts(multiClientMode ? undefined : (selectedClientId || undefined));

  const effectiveProducts = useMemo(() => {
    if (!multiClientMode) return fetchedProducts;
    return fetchedProducts.filter(p => selectedClientIds.includes(p.client_id));
  }, [multiClientMode, fetchedProducts, selectedClientIds]);

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
    const rangeStart = new Date(dateFrom).getTime();
    const rangeEnd = new Date(dateTo).getTime() + 86400000; // include end day
    const dur = rangeEnd - rangeStart;
    const clampedStart = Math.max(start.getTime(), rangeStart);
    const clampedEnd = Math.min(end.getTime() + 86400000, rangeEnd);
    const left = ((clampedStart - rangeStart) / dur) * 100;
    const width = ((clampedEnd - clampedStart) / dur) * 100;
    return { left: `${left}%`, width: `${Math.max(width, 0.8)}%` };
  };

  // PDF Export
  const handleExportPDF = async () => {
    if (!chartRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(chartRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgRatio = canvas.width / canvas.height;
      const pdfRatio = pdfWidth / pdfHeight;
      let drawW = pdfWidth - 10;
      let drawH = drawW / imgRatio;
      if (drawH > pdfHeight - 20) {
        drawH = pdfHeight - 20;
        drawW = drawH * imgRatio;
      }
      pdf.setFontSize(10);
      pdf.text(`Media Plan — ${dateFrom} → ${dateTo}`, 5, 7);
      pdf.addImage(imgData, 'PNG', 5, 12, drawW, drawH);
      pdf.save(`mediaplan-${dateFrom}-${dateTo}.pdf`);
    } catch (e) {
      console.error('PDF export error:', e);
    } finally {
      setExporting(false);
    }
  };

  const renderActivityBars = (acts: Activity[], color: string) => {
    const rowHeight = Math.max(40, acts.length * 28 + 12);
    return (
      <div className="flex-1 relative" style={{ minHeight: rowHeight }}>
        <div className={`absolute inset-0 grid pointer-events-none`} style={{ gridTemplateColumns: `repeat(${gridColumns}, 1fr)` }}>
          {gridHeaders.map((_, i) => (
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
      <div className={`absolute inset-0 grid pointer-events-none`} style={{ gridTemplateColumns: `repeat(${gridColumns}, 1fr)` }}>
        {gridHeaders.map((_, i) => (
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

  // Activities without any product assigned
  const unassignedActivities = useMemo(() => {
    return filteredActivities.filter(a => !a.productIds || a.productIds.length === 0);
  }, [filteredActivities]);

  const hasProducts = effectiveProducts.length > 0;
  const hasContent = hasProducts || unassignedActivities.length > 0;

  return (
    <div className="space-y-4">
      {/* Controls: period + channel + search + actions */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Period presets */}
        <div className="flex gap-1">
          {['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
            <Button key={q} size="sm" variant={activePeriod === q ? 'default' : 'outline'} onClick={() => setPeriod(q)} className="text-xs px-2 h-8">{q}</Button>
          ))}
          <div className="w-px bg-border mx-0.5" />
          {['C1', 'C2', 'C3'].map(q => (
            <Button key={q} size="sm" variant={activePeriod === q ? 'default' : 'outline'} onClick={() => setPeriod(q)} className="text-xs px-2 h-8">{q}</Button>
          ))}
          <div className="w-px bg-border mx-0.5" />
          <Button size="sm" variant={activePeriod === 'year' ? 'default' : 'outline'} onClick={() => setPeriod('year')} className="text-xs px-2 h-8">Rok</Button>
          <div className="w-px bg-border mx-0.5" />
          <Button
            size="sm"
            variant="outline"
            onClick={() => setViewMode(v => v === 'monthly' ? 'weekly' : 'monthly')}
            className="text-xs px-2 h-8 gap-1"
            title={viewMode === 'monthly' ? 'Przełącz na widok tygodniowy' : 'Przełącz na widok miesięczny'}
          >
            {viewMode === 'monthly' ? <List className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />}
            {viewMode === 'monthly' ? 'Tyg.' : 'Mies.'}
          </Button>
        </div>

        {/* Date range */}
        <div className="flex items-center gap-1">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setActivePeriod(''); }} className="w-36 h-8 text-xs" />
          <span className="text-xs text-muted-foreground">→</span>
          <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setActivePeriod(''); }} className="w-36 h-8 text-xs" />
        </div>

        {/* Channel filter */}
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
            className="pl-9 w-52 h-8 text-xs"
          />
        </div>

        <div className="flex-1" />

        {/* Export PDF */}
        <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={exporting} className="gap-1.5 h-8">
          <FileDown className="h-4 w-4" />
          {exporting ? 'Eksport...' : 'PDF'}
        </Button>

        {canEdit && !multiClientMode && (
          <Button onClick={() => setDialogOpen(true)} className="gap-2 h-8" size="sm">
            <Plus className="h-4 w-4" />
            Dodaj aktywność
          </Button>
        )}
      </div>

      <div ref={chartRef} className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {/* Month header */}
        <div className="flex border-b border-border">
          <div className="w-52 shrink-0 px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {multiClientMode ? 'Klient / Subkat. / Produkt' : 'Subkategoria / Produkt'}
          </div>
          <div className="flex-1 grid overflow-x-auto" style={{ gridTemplateColumns: `repeat(${gridColumns}, 1fr)` }}>
            {gridHeaders.map((label, i) => (
              <div key={i} className={`text-center text-xs font-semibold py-3 text-muted-foreground whitespace-nowrap ${i > 0 ? 'border-l border-border' : ''}`}>
                {typeof label === 'string' ? label : label}
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

        {/* Unassigned activities (no products) */}
        {unassignedActivities.length > 0 && (
          <div>
            <div className="flex border-b border-border bg-muted/30">
              <div className="w-52 shrink-0 px-4 flex items-center gap-2">
                <span className="text-sm font-semibold text-muted-foreground">Bez produktów</span>
                <span className="text-xs text-muted-foreground">({unassignedActivities.length})</span>
              </div>
              {renderActivityBars(unassignedActivities, 'hsl(var(--muted-foreground))')}
            </div>
          </div>
        )}

        {!hasContent && (
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
      <ActivityDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
};
