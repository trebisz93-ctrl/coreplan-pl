import { useMemo, useState, useCallback, useRef } from 'react';
import { OrgOnboarding } from '@/components/OrgOnboarding';
import { useApp } from '@/context/AppContext';
import { useCanEdit } from '@/hooks/useRole';
import { useProducts, DbProduct } from '@/hooks/useData';
import { Activity, statusLabels, campaignTypeLabels } from '@/types/mediaplan';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ChevronDown, ChevronRight, Plus, Search, FileDown,
  Calendar, LayoutGrid, List, EyeOff, Eye, Tag
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ActivityDetailDrawer } from './ActivityDetailDrawer';
import { ActivityDialog } from './ActivityDialog';
// exportMediaPlanPDF is lazy-loaded inside the export handler to keep
// jsPDF/html2canvas out of the initial /app bundle.

// ── Constants ──

const months = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];
const formatPLN = (n: number) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(n);

const STATUS_LEFT_COLORS: Record<string, string> = {
  planned: 'hsl(var(--muted-foreground))',
  in_progress: 'hsl(var(--primary))',
  completed: 'hsl(var(--status-completed))',
  cancelled: 'hsl(var(--destructive))',
};

const statusBadgeClass: Record<string, string> = {
  planned: 'bg-status-planned text-primary-foreground',
  in_progress: 'bg-status-in-progress text-primary-foreground',
  completed: 'bg-status-completed text-primary-foreground',
  cancelled: 'bg-status-cancelled text-primary-foreground',
};

const BASE_COLORS = [
  'hsl(221, 83%, 53%)', 'hsl(24, 90%, 52%)', 'hsl(142, 71%, 45%)',
  'hsl(0, 84%, 60%)', 'hsl(25, 95%, 53%)', 'hsl(38, 92%, 50%)',
  'hsl(200, 80%, 50%)', 'hsl(173, 58%, 39%)', 'hsl(12, 76%, 48%)',
  'hsl(190, 70%, 45%)', 'hsl(50, 90%, 45%)', 'hsl(158, 60%, 42%)',
];

const TAG_COLORS = [
  'hsl(24, 60%, 54%)', 'hsl(142, 60%, 45%)', 'hsl(221, 70%, 55%)',
  'hsl(200, 65%, 50%)', 'hsl(0, 70%, 55%)', 'hsl(38, 80%, 48%)',
  'hsl(173, 50%, 42%)', 'hsl(12, 70%, 52%)',
];

const quarterRanges: Record<string, [string, string]> = {
  Q1: ['01-01', '03-31'], Q2: ['04-01', '06-30'],
  Q3: ['07-01', '09-30'], Q4: ['10-01', '12-31'],
  C1: ['01-01', '04-30'], C2: ['05-01', '08-31'], C3: ['09-01', '12-31'],
  year: ['01-01', '12-31'],
};

function lightenHsl(hsl: string, amount: number): string {
  const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return hsl;
  const h = parseInt(match[1]);
  const s = Math.max(0, parseInt(match[2]) - amount * 0.4);
  const l = Math.min(92, parseInt(match[3]) + amount);
  return `hsl(${h}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}

function darkenHsl(hsl: string, amount: number): string {
  const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return hsl;
  const h = parseInt(match[1]);
  const s = parseInt(match[2]);
  const l = Math.max(15, parseInt(match[3]) - amount);
  return `hsl(${h}, ${s}%, ${Math.round(l)}%)`;
}

// ── Component ──

export const YearView = () => {
  const {
    filteredActivities: allFilteredActivities, selectedClientId, clients,
    multiClientMode, selectedClientIds, channelFilter, setChannelFilter,
    searchQuery, setSearchQuery,
  } = useApp();
  const canEdit = useCanEdit();
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [hoveredBarId, setHoveredBarId] = useState<string | null>(null);
  const [selectedBarId, setSelectedBarId] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [viewMode, setViewMode] = useState<'monthly' | 'weekly'>('monthly');
  const [showPrices, setShowPrices] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [dateFrom, setDateFrom] = useState(`${year}-01-01`);
  const [dateTo, setDateTo] = useState(`${year}-12-31`);
  const [activePeriod, setActivePeriod] = useState<string>('year');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');

  const { data: fetchedProducts = [] } = useProducts(multiClientMode ? undefined : (selectedClientId || undefined));
  const effectiveProducts = useMemo(() => {
    if (!multiClientMode) return fetchedProducts;
    return fetchedProducts.filter(p => selectedClientIds.includes(p.client_id));
  }, [multiClientMode, fetchedProducts, selectedClientIds]);
  const productMap = useMemo(() => {
    const m = new Map<string, DbProduct>();
    effectiveProducts.forEach(p => m.set(p.id, p));
    return m;
  }, [effectiveProducts]);
  const clientMap = useMemo(() => {
    const m = new Map<string, string>();
    clients.forEach(c => m.set(c.id, c.name));
    return m;
  }, [clients]);

  const setPeriod = (key: string) => {
    const [from, to] = quarterRanges[key];
    setDateFrom(`${year}-${from}`);
    setDateTo(`${year}-${to}`);
    setActivePeriod(key);
  };

  const filteredActivities = useMemo(() => {
    let acts = allFilteredActivities.filter(a => !(a.endDate < dateFrom || a.startDate > dateTo));
    if (categoryFilter !== 'all') {
      acts = acts.filter(a => a.productIds.some(pid => {
        const p = productMap.get(pid);
        return p && p.category === categoryFilter;
      }));
    }
    if (subcategoryFilter !== 'all') {
      acts = acts.filter(a => a.productIds.some(pid => {
        const p = productMap.get(pid);
        return p && p.subcategory === subcategoryFilter;
      }));
    }
    if (tagFilter !== 'all') {
      acts = acts.filter(a => a.tags?.includes(tagFilter));
    }
    return acts;
  }, [allFilteredActivities, dateFrom, dateTo, categoryFilter, subcategoryFilter, productMap, tagFilter]);

  const visibleMonths = useMemo(() => {
    const s = parseInt(dateFrom.slice(5, 7)) - 1;
    const e = parseInt(dateTo.slice(5, 7)) - 1;
    return months.slice(s, e + 1);
  }, [dateFrom, dateTo]);

  const getISOWeek = useCallback((date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  }, []);

  const visibleWeeks = useMemo(() => {
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    const weeks: { label: string; start: Date; end: Date; monthIdx: number }[] = [];
    const d = new Date(start);
    const day = d.getDay();
    d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
    while (d <= end) {
      const ws = new Date(d);
      const we = new Date(d); we.setDate(we.getDate() + 6);
      const weekNum = getISOWeek(ws);
      const midWeek = new Date(ws.getTime() + 3 * 86400000);
      weeks.push({ label: `W${weekNum}`, start: ws, end: we, monthIdx: midWeek.getMonth() });
      d.setDate(d.getDate() + 7);
    }
    return weeks;
  }, [dateFrom, dateTo, getISOWeek]);

  const weeksPerMonth = useMemo(() => {
    const startMonth = parseInt(dateFrom.slice(5, 7)) - 1;
    const endMonth = parseInt(dateTo.slice(5, 7)) - 1;
    const result: { month: string; weeks: typeof visibleWeeks }[] = [];
    for (let m = startMonth; m <= endMonth; m++) {
      const mWeeks = visibleWeeks.filter(w => w.monthIdx === m);
      result.push({ month: months[m], weeks: mWeeks });
    }
    return result;
  }, [dateFrom, dateTo, visibleWeeks]);

  const gridColumns = viewMode === 'weekly' ? visibleWeeks.length : visibleMonths.length;
  const gridHeaders = viewMode === 'weekly' ? visibleWeeks.map(w => w.label) : visibleMonths;

  // ── Available categories, subcategories, tags for filters ──
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    effectiveProducts.forEach(p => { if (p.category) cats.add(p.category); });
    return [...cats].sort();
  }, [effectiveProducts]);

  const availableSubcategories = useMemo(() => {
    const subs = new Set<string>();
    effectiveProducts.forEach(p => { if (p.subcategory) subs.add(p.subcategory); });
    return [...subs].sort();
  }, [effectiveProducts]);

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    allFilteredActivities.forEach(a => a.tags?.forEach(t => tags.add(t)));
    return [...tags].sort();
  }, [allFilteredActivities]);

  // ── Expand/collapse state ──
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());

  const toggleActivity = (id: string) =>
    setExpandedActivities(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // ── Bar position calc ──
  const getBarStyle = useCallback((startDate: string, endDate: string) => {
    const rangeStart = new Date(dateFrom).getTime();
    const rangeEnd = new Date(dateTo).getTime() + 86400000;
    const dur = rangeEnd - rangeStart;
    const cs = Math.max(new Date(startDate).getTime(), rangeStart);
    const ce = Math.min(new Date(endDate).getTime() + 86400000, rangeEnd);
    const left = ((cs - rangeStart) / dur) * 100;
    const width = ((ce - cs) / dur) * 100;
    return { left: `${left}%`, width: `${Math.max(width, 0.5)}%` };
  }, [dateFrom, dateTo]);

  // ── Brand label ──
  const getActivityBrandLabel = useCallback((activity: Activity) => {
    const prods = activity.productIds.map(pid => productMap.get(pid)).filter(Boolean) as DbProduct[];
    const brands = [...new Set(prods.map(p => p.brand).filter(Boolean))] as string[];
    if (brands.length === 0) return activity.name;
    if (brands.length === 1) return brands[0];
    return `${brands[0]} +${brands.length - 1}`;
  }, [productMap]);

  // ── Sub-rows: products assigned to activity ──
  const getSubRows = useCallback((activity: Activity) => {
    return activity.productIds
      .map(pid => productMap.get(pid))
      .filter(Boolean)
      .map((p, i) => ({
        id: `${activity.id}__prod__${i}`,
        name: p!.name,
        brand: p!.brand,
        startDate: activity.startDate,
        endDate: activity.endDate,
      }));
  }, [productMap]);

  // ── Flat activity groups (by tag or ungrouped) ──
  const activityGroups = useMemo(() => {
    // Sort activities by start date
    const sorted = [...filteredActivities].sort((a, b) => a.startDate.localeCompare(b.startDate));
    return sorted;
  }, [filteredActivities]);

  // ── Grupowanie do wizualizacji osi czasu (NIE dotyczy PDF, patrz activityGroups powyżej) ──
  const timelineRows = useMemo(() => {
    const map = new Map<string, Activity[]>();
    activityGroups.forEach(activity => {
      const key = activity.name;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(activity);
    });
    return Array.from(map.entries()).map(([name, activities]) => {
      const sorted = [...activities].sort((a, b) => a.startDate.localeCompare(b.startDate));
      return {
        name,
        activities: sorted,
        totalPrice: sorted.reduce((sum, a) => sum + a.price, 0),
        earliestStart: sorted[0].startDate,
        tags: sorted[0].tags,
        clientId: sorted[0].clientId,
      };
    });
  }, [activityGroups]);

  // ── PDF Export ──
  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const activeClientName = selectedClientId
        ? clients.find(c => c.id === selectedClientId)?.name
        : undefined;
      const activeClientNames = multiClientMode
        ? selectedClientIds.map(id => clients.find(c => c.id === id)?.name).filter(Boolean) as string[]
        : undefined;

      const prodInfo = new Map<string, { id: string; name: string; brand: string | null }>();
      effectiveProducts.forEach(p => prodInfo.set(p.id, { id: p.id, name: p.name, brand: p.brand }));

      // Convert to flat groups for PDF
      const packageGroups = [{
        packageId: '__all__',
        packageName: 'Aktywności',
        activities: activityGroups,
      }];

      const { exportMediaPlanPDF } = await import('@/lib/exportPdfVector');
      await exportMediaPlanPDF({
        dateFrom,
        dateTo,
        year,
        packageGroups,
        productMap: prodInfo,
        clientName: activeClientName,
        clientNames: activeClientNames,
        multiClient: multiClientMode,
        showPrices,
      });
    } catch (e) { console.error('PDF export error:', e); }
    finally { setExporting(false); }
  };

  // ── Render helpers ──

  const renderGridLines = () => (
    <div className="absolute inset-0 grid pointer-events-none" style={{ gridTemplateColumns: `repeat(${gridColumns}, 1fr)` }}>
      {gridHeaders.map((_, i) => (
        <div key={i} className={i > 0 ? 'border-l border-border/50' : ''} />
      ))}
    </div>
  );

  const renderPrimaryBar = (activity: Activity, baseColor: string) => {
    const pos = getBarStyle(activity.startDate, activity.endDate);
    const brandLabel = getActivityBrandLabel(activity);
    const isHovered = hoveredBarId === activity.id;
    const isSelected = selectedBarId === activity.id;

    return (
      <TooltipProvider key={activity.id} delayDuration={120}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="absolute cursor-pointer transition-all duration-150 z-10"
              style={{
                ...pos,
                top: 11,
                height: 14,
                borderRadius: 6,
                backgroundColor: isHovered ? darkenHsl(baseColor, 8) : baseColor,
                boxShadow: isHovered
                  ? '0 4px 12px -2px rgba(0,0,0,0.25)'
                  : isSelected
                    ? `0 0 0 2px ${baseColor}, 0 0 8px ${baseColor}40`
                    : '0 1px 3px rgba(0,0,0,0.12)',
                outline: isSelected ? `2px solid ${baseColor}` : 'none',
                outlineOffset: isSelected ? 1 : 0,
              }}
              onMouseEnter={() => setHoveredBarId(activity.id)}
              onMouseLeave={() => setHoveredBarId(null)}
              onClick={() => {
                setSelectedBarId(activity.id);
                setSelectedActivity(activity);
                setDrawerOpen(true);
              }}
            >
              <span className="text-[9px] leading-[14px] px-1.5 font-semibold truncate block text-white drop-shadow-sm">
                {brandLabel}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs p-3 space-y-1.5">
            <div className="font-semibold text-sm">{activity.name}</div>
            <div className="flex gap-1.5 flex-wrap">
              <Badge className={statusBadgeClass[activity.status]} variant="secondary">{statusLabels[activity.status]}</Badge>
              <Badge variant="outline">{campaignTypeLabels[activity.campaignType]}</Badge>
              <Badge variant="outline" className={activity.channel === 'online' ? 'border-online text-online' : 'border-offline text-offline'}>
                {activity.channel}
              </Badge>
              {activity.tags?.map(tag => (
                <Badge key={tag} variant="outline" className="border-primary/40 text-primary text-[9px]">🏷 {tag}</Badge>
              ))}
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <div>📅 {activity.startDate} → {activity.endDate}</div>
              {showPrices && <div>💰 {formatPLN(activity.price)}</div>}
              {activity.note && <div>📝 {activity.note}</div>}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const renderSecondaryBar = (subId: string, startDate: string, endDate: string, name: string, baseColor: string) => {
    // (retained for backward compat; not used in the grouped timeline view)
    const pos = getBarStyle(startDate, endDate);
    const lightColor = lightenHsl(baseColor, 30);
    const isHovered = hoveredBarId === subId;

    return (
      <TooltipProvider key={subId} delayDuration={120}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="absolute cursor-default transition-all duration-150 z-[5]"
              style={{
                ...pos,
                top: 14,
                height: 8,
                borderRadius: 4,
                backgroundColor: isHovered ? darkenHsl(lightColor, 5) : lightColor,
                opacity: isHovered ? 0.85 : 0.7,
                outline: isHovered ? `1px solid ${baseColor}` : 'none',
              }}
              onMouseEnter={() => setHoveredBarId(subId)}
              onMouseLeave={() => setHoveredBarId(null)}
            >
              <span className="text-[7px] leading-[8px] px-1 truncate block" style={{ color: darkenHsl(baseColor, 20) }}>
                {name}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs p-2 space-y-1">
            <div className="font-medium text-xs">{name}</div>
            <div className="text-[11px] text-muted-foreground">
              📅 {startDate} → {endDate}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const renderGroupMarkers = (row: typeof timelineRows[number], baseColor: string) => {
    return row.activities.map((activity) => {
      const pos = getBarStyle(activity.startDate, activity.endDate);
      const isHovered = hoveredBarId === activity.id;
      const isSelected = selectedBarId === activity.id;
      const channelColor = baseColor;
      return (
        <TooltipProvider key={activity.id} delayDuration={120}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="absolute cursor-pointer transition-all duration-150 z-10 flex items-center justify-center"
                style={{
                  ...pos,
                  top: 8,
                  height: 20,
                  borderRadius: 6,
                  backgroundColor: isHovered ? darkenHsl(channelColor, 8) : channelColor,
                  boxShadow: isHovered
                    ? '0 4px 12px -2px rgba(0,0,0,0.25)'
                    : isSelected
                      ? `0 0 0 2px ${channelColor}, 0 0 8px ${channelColor}40`
                      : '0 1px 3px rgba(0,0,0,0.12)',
                  outline: isSelected ? `2px solid ${channelColor}` : 'none',
                  outlineOffset: isSelected ? 1 : 0,
                }}
                onMouseEnter={() => setHoveredBarId(activity.id)}
                onMouseLeave={() => setHoveredBarId(null)}
                onClick={() => {
                  setSelectedBarId(activity.id);
                  setSelectedActivity(activity);
                  setDrawerOpen(true);
                }}
              >
                <span className="text-[9px] leading-none px-1.5 font-semibold truncate block text-white drop-shadow-sm">
                  {campaignTypeLabels[activity.campaignType] ?? activity.campaignType}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs p-3 space-y-1.5">
              <div className="font-semibold text-sm">{activity.name}</div>
              <div className="flex gap-1.5 flex-wrap">
                <Badge className={statusBadgeClass[activity.status]} variant="secondary">{statusLabels[activity.status]}</Badge>
                <Badge variant="outline">{campaignTypeLabels[activity.campaignType] ?? activity.campaignType}</Badge>
                <Badge variant="outline" className={activity.channel === 'online' ? 'border-online text-online' : 'border-offline text-offline'}>
                  {activity.channel}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <div>📅 {activity.startDate} → {activity.endDate}</div>
                {showPrices && <div>💰 {formatPLN(activity.price)}</div>}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    });
  };

  const hasContent = filteredActivities.length > 0;
  const totalBudget = filteredActivities.reduce((s, a) => s + a.price, 0);

  return (
    <div className="space-y-4">
      <OrgOnboarding />
      {/* ── Controls ── */}
      <div className="flex items-center gap-3 flex-wrap">
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
          <Button size="sm" variant="outline" onClick={() => { const y = year - 1; setYear(y); setDateFrom(`${y}-01-01`); setDateTo(`${y}-12-31`); setActivePeriod('year'); }} className="text-xs px-1.5 h-8">←</Button>
          <span className="text-xs font-semibold min-w-[3rem] text-center">{year}</span>
          <Button size="sm" variant="outline" onClick={() => { const y = year + 1; setYear(y); setDateFrom(`${y}-01-01`); setDateTo(`${y}-12-31`); setActivePeriod('year'); }} className="text-xs px-1.5 h-8">→</Button>
          <div className="w-px bg-border mx-0.5" />
          <Button size="sm" variant="outline"
            onClick={() => setViewMode(v => v === 'monthly' ? 'weekly' : 'monthly')}
            className="text-xs px-2 h-8 gap-1"
          >
            {viewMode === 'monthly' ? <List className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />}
            {viewMode === 'monthly' ? 'Tyg.' : 'Mies.'}
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setActivePeriod(''); }} className="w-36 h-8 text-xs" />
          <span className="text-xs text-muted-foreground">→</span>
          <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setActivePeriod(''); }} className="w-36 h-8 text-xs" />
        </div>

        <div className="flex rounded-lg border border-border overflow-hidden text-sm">
          {(['all', 'online', 'offline'] as const).map(ch => (
            <button key={ch} onClick={() => setChannelFilter(ch)}
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

        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj po nazwie, produkcie, marce..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-8 text-xs"
          />
        </div>
        {availableCategories.length > 0 && (
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Kategoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie kategorie</SelectItem>
              {availableCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {availableSubcategories.length > 0 && (
          <Select value={subcategoryFilter} onValueChange={setSubcategoryFilter}>
            <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Subkategoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie subkategorie</SelectItem>
              {availableSubcategories.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {availableTags.length > 0 && (
          <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <Tag className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie tagi</SelectItem>
              {availableTags.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <Switch id="show-prices" checked={showPrices} onCheckedChange={setShowPrices} />
          <Label htmlFor="show-prices" className="text-xs cursor-pointer flex items-center gap-1">
            {showPrices ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            Ceny
          </Label>
        </div>

        <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={exporting} className="gap-1.5 h-8">
          <FileDown className="h-4 w-4" />
          {exporting ? 'Eksport...' : 'PDF'}
        </Button>

        {canEdit && !multiClientMode && (
          <Button onClick={() => setDialogOpen(true)} className="gap-2 h-8" size="sm">
            <Plus className="h-4 w-4" />Dodaj aktywność
          </Button>
        )}
      </div>

      {/* ── Gantt Chart ── */}
      <div ref={chartRef} className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {/* Header row */}
        <div className="border-b border-border sticky top-0 z-20 bg-card">
          <div className="flex">
            <div className="w-72 shrink-0 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Aktywność
            </div>
            <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${gridColumns}, 1fr)` }}>
              {gridHeaders.map((label, i) => (
                <div key={i} className={`text-center text-xs font-semibold py-2 text-muted-foreground whitespace-nowrap ${i > 0 ? 'border-l border-border/50' : ''}`}>
                  {label}
                </div>
              ))}
            </div>
          </div>
          {viewMode === 'monthly' && (
            <div className="flex border-t border-border/40">
              <div className="w-72 shrink-0" />
              <div className="flex-1 flex">
                {weeksPerMonth.map((mp, mIdx) => (
                  <div key={mIdx} className="flex-1 flex" style={{ borderLeft: mIdx > 0 ? '1px solid hsl(var(--border) / 0.5)' : 'none' }}>
                    {mp.weeks.map((w, wIdx) => (
                      <div key={wIdx} className="flex-1 text-center text-[10px] py-1 text-muted-foreground/70 border-l border-border/20 first:border-l-0">
                        {w.label}
                      </div>
                    ))}
                    {mp.weeks.length === 0 && <div className="flex-1" />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Activity Rows (grouped by name) ── */}
        {timelineRows.map((row, aIdx) => {
          const baseColor = BASE_COLORS[aIdx % BASE_COLORS.length];
          const isActSelected = row.activities.some(a => a.id === selectedBarId);
          const rowKey = `${row.name}__${aIdx}`;

          return (
            <div key={rowKey}>
              {/* ── ACTIVITY ROW ── */}
              <div
                className="flex border-b border-border/60 transition-colors hover:bg-muted/30"
                style={{
                  backgroundColor: isActSelected ? `${baseColor}08` : aIdx % 2 === 0 ? 'transparent' : 'hsl(var(--secondary) / 0.06)',
                }}
              >
                <div className="w-72 shrink-0 flex items-center gap-1.5 relative">
                  <div className="flex items-center gap-1.5 pl-4 pr-2 py-2.5 w-full text-left">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: baseColor }} />
                    <span className="text-xs font-semibold truncate">{row.name}</span>
                    {row.activities.length > 1 && (
                      <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5 shrink-0">
                        ×{row.activities.length}
                      </Badge>
                    )}
                    {row.tags?.map((tag, ti) => (
                      <Badge key={tag} variant="outline" className="text-[8px] px-1 py-0 h-3.5 shrink-0" style={{ borderColor: TAG_COLORS[ti % TAG_COLORS.length] + '60', color: TAG_COLORS[ti % TAG_COLORS.length] }}>
                        {tag}
                      </Badge>
                    ))}
                    {row.clientId && clientMap.get(row.clientId) && (
                      <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 shrink-0 border-muted-foreground/20 text-muted-foreground">
                        {clientMap.get(row.clientId)}
                      </Badge>
                    )}
                    <span className="text-[9px] text-muted-foreground ml-auto whitespace-nowrap shrink-0">
                      {row.earliestStart.slice(5)}
                      {showPrices ? ` • ${formatPLN(row.totalPrice)}` : ''}
                    </span>
                  </div>
                </div>
                <div className="flex-1 relative" style={{ minHeight: 36 }}>
                  {renderGridLines()}
                  {renderGroupMarkers(row, baseColor)}
                </div>
              </div>
            </div>
          );
        })}

        {!hasContent && (
          <div className="p-12 text-center text-muted-foreground">
            {multiClientMode
              ? (selectedClientIds.length > 0 ? 'Brak aktywności dla wybranych klientów.' : 'Wybierz klientów na górze.')
              : (selectedClientId ? 'Brak aktywności. Dodaj aktywność przyciskiem powyżej.' : 'Wybierz klienta na górze.')}
          </div>
        )}

        {/* Summary bar */}
        {hasContent && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30">
            <span className="text-xs text-muted-foreground">
              {filteredActivities.length} aktywności
            </span>
            {showPrices && (
              <span className="text-xs font-semibold">
                Łączny budżet: {formatPLN(totalBudget)}
              </span>
            )}
          </div>
        )}
      </div>

      <ActivityDetailDrawer activity={selectedActivity} open={drawerOpen} onOpenChange={setDrawerOpen} clientId={selectedClientId} />
      <ActivityDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
};
