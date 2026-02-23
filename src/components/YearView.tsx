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

export const YearView = () => {
  const { filteredActivities: allFilteredActivities, selectedClientId, clients, multiClientMode, selectedClientIds, channelFilter, setChannelFilter, searchQuery, setSearchQuery } = useApp();
  const canEdit = useCanEdit();
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [viewMode, setViewMode] = useState<'monthly' | 'weekly'>('monthly');
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

  // Visible months / weeks
  const visibleMonths = useMemo(() => {
    const startMonth = parseInt(dateFrom.slice(5, 7)) - 1;
    const endMonth = parseInt(dateTo.slice(5, 7)) - 1;
    return months.slice(startMonth, endMonth + 1);
  }, [dateFrom, dateTo]);

  const visibleWeeks = useMemo(() => {
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    const weeks: { label: string; start: Date; end: Date }[] = [];
    const d = new Date(start);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    while (d <= end) {
      const weekStart = new Date(d);
      const weekEnd = new Date(d);
      weekEnd.setDate(weekEnd.getDate() + 6);
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

  // Products
  const { data: fetchedProducts = [] } = useProducts(multiClientMode ? undefined : (selectedClientId || undefined));

  const effectiveProducts = useMemo(() => {
    if (!multiClientMode) return fetchedProducts;
    return fetchedProducts.filter(p => selectedClientIds.includes(p.client_id));
  }, [multiClientMode, fetchedProducts, selectedClientIds]);

  // Build product map for quick lookup
  const productMap = useMemo(() => {
    const map = new Map<string, DbProduct>();
    effectiveProducts.forEach(p => map.set(p.id, p));
    return map;
  }, [effectiveProducts]);

  // State
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set());
  const [subColors, setSubColors] = useState<Record<string, string>>({});

  // All subcategory names for legend
  const allSubNames = useMemo(() => {
    const subs = new Set<string>();
    effectiveProducts.forEach(p => subs.add(p.subcategory || 'Inne'));
    return [...subs].sort();
  }, [effectiveProducts]);

  const getSubColor = useCallback((sub: string) => {
    if (subColors[sub]) return subColors[sub];
    const idx = allSubNames.indexOf(sub);
    return DEFAULT_SUB_COLORS[(idx >= 0 ? idx : 0) % DEFAULT_SUB_COLORS.length];
  }, [subColors, allSubNames]);

  const toggleActivity = (id: string) => {
    setExpandedActivities(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };
  const toggleSub = (key: string) => {
    setExpandedSubs(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  };

  // Get brand label for an activity
  const getActivityBrandLabel = useCallback((activity: Activity) => {
    const prods = activity.productIds.map(pid => productMap.get(pid)).filter(Boolean) as DbProduct[];
    const brands = [...new Set(prods.map(p => p.brand).filter(Boolean))] as string[];
    if (brands.length === 0) return activity.name;
    if (brands.length === 1) return brands[0];
    return `${brands[0]} +${brands.length - 1}`;
  }, [productMap]);

  // Get subcategory groups for an activity's products
  const getActivitySubcategoryGroups = useCallback((activity: Activity) => {
    const prods = activity.productIds.map(pid => productMap.get(pid)).filter(Boolean) as DbProduct[];
    const map = new Map<string, DbProduct[]>();
    prods.forEach(p => {
      const key = p.subcategory || 'Inne';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    return Array.from(map.entries())
      .map(([subcategory, products]) => ({ subcategory, products }))
      .sort((a, b) => a.subcategory.localeCompare(b.subcategory));
  }, [productMap]);

  const getBarStyle = (activity: Activity) => {
    const start = new Date(activity.startDate);
    const end = new Date(activity.endDate);
    const rangeStart = new Date(dateFrom).getTime();
    const rangeEnd = new Date(dateTo).getTime() + 86400000;
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
      const canvas = await html2canvas(chartRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgRatio = canvas.width / canvas.height;
      let drawW = pdfWidth - 10;
      let drawH = drawW / imgRatio;
      if (drawH > pdfHeight - 20) { drawH = pdfHeight - 20; drawW = drawH * imgRatio; }
      pdf.setFontSize(10);
      pdf.text(`Media Plan — ${dateFrom} → ${dateTo}`, 5, 7);
      pdf.addImage(imgData, 'PNG', 5, 12, drawW, drawH);
      pdf.save(`mediaplan-${dateFrom}-${dateTo}.pdf`);
    } catch (e) { console.error('PDF export error:', e); }
    finally { setExporting(false); }
  };

  const renderActivityBar = (activity: Activity, color: string, label: string) => {
    const pos = getBarStyle(activity);
    return (
      <HoverCard key={activity.id} openDelay={100} closeDelay={50}>
        <HoverCardTrigger asChild>
          <div
            className="absolute rounded-md cursor-pointer hover:brightness-110 transition-all shadow-sm hover:shadow-md z-10"
            style={{ ...pos, top: 6, height: 22, backgroundColor: color }}
            onClick={() => { setSelectedActivity(activity); setDrawerOpen(true); }}
          >
            <span className="text-[10px] leading-[22px] px-2 font-medium truncate block text-white">
              {label}
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
            <div>📦 Produkty: {activity.productIds.map(pid => productMap.get(pid)?.name).filter(Boolean).join(', ') || 'brak'}</div>
            {activity.note && <div>📝 {activity.note}</div>}
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  };

  const renderTimeline = (content?: React.ReactNode) => (
    <div className="flex-1 relative" style={{ minHeight: 36 }}>
      <div className="absolute inset-0 grid pointer-events-none" style={{ gridTemplateColumns: `repeat(${gridColumns}, 1fr)` }}>
        {gridHeaders.map((_, i) => (
          <div key={i} className={i > 0 ? 'border-l border-border' : ''} />
        ))}
      </div>
      {content}
    </div>
  );

  // Get color for activity based on its first product's subcategory
  const getActivityColor = useCallback((activity: Activity) => {
    const prods = activity.productIds.map(pid => productMap.get(pid)).filter(Boolean) as DbProduct[];
    if (prods.length === 0) return 'hsl(var(--muted-foreground))';
    const sub = prods[0].subcategory || 'Inne';
    return getSubColor(sub);
  }, [productMap, getSubColor]);

  const hasContent = filteredActivities.length > 0;

  return (
    <div className="space-y-4">
      {/* Controls */}
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
            size="sm" variant="outline"
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
          <Input placeholder="Szukaj aktywności..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 w-52 h-8 text-xs" />
        </div>

        <div className="flex-1" />

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
        {/* Header */}
        <div className="flex border-b border-border">
          <div className="w-52 shrink-0 px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Aktywność / Subkat. / Produkt
          </div>
          <div className="flex-1 grid overflow-x-auto" style={{ gridTemplateColumns: `repeat(${gridColumns}, 1fr)` }}>
            {gridHeaders.map((label, i) => (
              <div key={i} className={`text-center text-xs font-semibold py-3 text-muted-foreground whitespace-nowrap ${i > 0 ? 'border-l border-border' : ''}`}>
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Activity rows — new hierarchy: Activity > Subcategory > Product */}
        {filteredActivities.map((activity, idx) => {
          const isExpanded = expandedActivities.has(activity.id);
          const color = getActivityColor(activity);
          const brandLabel = getActivityBrandLabel(activity);
          const subGroups = getActivitySubcategoryGroups(activity);
          const hasProducts = activity.productIds.length > 0;

          return (
            <div key={activity.id}>
              {/* Activity row */}
              <div className={`flex border-b border-border ${idx % 2 === 0 ? '' : 'bg-secondary/30'}`}>
                <div className="w-52 shrink-0 px-4 flex items-center gap-2">
                  <button
                    onClick={() => hasProducts && toggleActivity(activity.id)}
                    className="flex items-center gap-1 text-sm font-semibold hover:text-primary transition-colors"
                  >
                    {hasProducts ? (
                      isExpanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />
                    ) : (
                      <span className="w-4" />
                    )}
                    <span className="truncate max-w-[140px]">{activity.name}</span>
                  </button>
                </div>
                {renderTimeline(renderActivityBar(activity, color, brandLabel))}
              </div>

              {/* Expanded: Subcategory > Product */}
              {isExpanded && subGroups.map(sg => {
                const subKey = `${activity.id}::${sg.subcategory}`;
                const isSubExpanded = expandedSubs.has(subKey);
                const subColor = getSubColor(sg.subcategory);

                return (
                  <div key={subKey}>
                    {/* Subcategory row */}
                    <div className="flex border-b border-border bg-secondary/10">
                      <div className="w-52 shrink-0 px-4 pl-10 flex items-center gap-2">
                        <button
                          onClick={() => toggleSub(subKey)}
                          className="flex items-center gap-1 text-xs font-semibold hover:text-primary transition-colors"
                        >
                          {isSubExpanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                          <div className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: subColor }} />
                          <span className="truncate">{sg.subcategory}</span>
                        </button>
                        <span className="text-[10px] text-muted-foreground">({sg.products.length})</span>
                      </div>
                      {renderTimeline()}
                    </div>

                    {/* Products under subcategory */}
                    {isSubExpanded && sg.products.map(product => (
                      <div key={product.id} className="flex border-b border-border bg-secondary/5">
                        <div className="w-52 shrink-0 px-4 pl-16 flex items-center">
                          <span className="text-xs text-muted-foreground truncate">{product.name}</span>
                        </div>
                        {renderTimeline()}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}

        {!hasContent && (
          <div className="p-12 text-center text-muted-foreground">
            {multiClientMode
              ? (selectedClientIds.length > 0 ? 'Brak aktywności dla wybranych klientów.' : 'Wybierz klientów na górze.')
              : (selectedClientId ? 'Brak aktywności dla wybranego klienta. Dodaj aktywność przyciskiem powyżej.' : 'Wybierz klienta na górze.')}
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
