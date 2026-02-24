import { useMemo, useState, useCallback, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useCanEdit } from '@/hooks/useRole';
import { useProducts, DbProduct, usePackages, DbPackage } from '@/hooks/useData';
import { useSeedDefaultPackages } from '@/hooks/useSeedDefaultPackages';
import { Activity, statusLabels, campaignTypeLabels } from '@/types/mediaplan';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ChevronDown, ChevronRight, Plus, Search, FileDown,
  Calendar, LayoutGrid, List, Package, Layers
} from 'lucide-react';
import { ActivityDetailDrawer } from './ActivityDetailDrawer';
import { ActivityDialog } from './ActivityDialog';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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

// Base colors for activities – each activity gets a unique one within its package
const BASE_COLORS = [
  'hsl(221, 83%, 53%)', 'hsl(271, 81%, 56%)', 'hsl(142, 71%, 45%)',
  'hsl(0, 84%, 60%)', 'hsl(25, 95%, 53%)', 'hsl(38, 92%, 50%)',
  'hsl(330, 81%, 60%)', 'hsl(173, 58%, 39%)', 'hsl(263, 70%, 50%)',
  'hsl(200, 80%, 50%)', 'hsl(50, 90%, 45%)', 'hsl(290, 60%, 55%)',
];

// Package accent colors (left border of group header)
const PACKAGE_ACCENTS = [
  'hsl(221, 70%, 55%)', 'hsl(142, 60%, 45%)', 'hsl(271, 65%, 55%)',
  'hsl(25, 80%, 50%)', 'hsl(0, 70%, 55%)', 'hsl(38, 80%, 48%)',
  'hsl(173, 50%, 42%)', 'hsl(330, 65%, 55%)',
];

const quarterRanges: Record<string, [string, string]> = {
  Q1: ['01-01', '03-31'], Q2: ['04-01', '06-30'],
  Q3: ['07-01', '09-30'], Q4: ['10-01', '12-31'],
  C1: ['01-01', '04-30'], C2: ['05-01', '08-31'], C3: ['09-01', '12-31'],
  year: ['01-01', '12-31'],
};

/** Lighten an HSL color string by mixing with white */
function lightenHsl(hsl: string, amount: number): string {
  const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return hsl;
  const h = parseInt(match[1]);
  const s = Math.max(0, parseInt(match[2]) - amount * 0.4);
  const l = Math.min(92, parseInt(match[3]) + amount);
  return `hsl(${h}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}

/** Darken an HSL color string */
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
  const year = 2026;
  const [dateFrom, setDateFrom] = useState(`${year}-01-01`);
  const [dateTo, setDateTo] = useState(`${year}-12-31`);
  const [activePeriod, setActivePeriod] = useState<string>('year');

  useSeedDefaultPackages();
  const { data: packages = [] } = usePackages();

  const setPeriod = (key: string) => {
    const [from, to] = quarterRanges[key];
    setDateFrom(`${year}-${from}`);
    setDateTo(`${year}-${to}`);
    setActivePeriod(key);
  };

  const filteredActivities = useMemo(() =>
    allFilteredActivities.filter(a => !(a.endDate < dateFrom || a.startDate > dateTo)),
    [allFilteredActivities, dateFrom, dateTo]
  );

  const visibleMonths = useMemo(() => {
    const s = parseInt(dateFrom.slice(5, 7)) - 1;
    const e = parseInt(dateTo.slice(5, 7)) - 1;
    return months.slice(s, e + 1);
  }, [dateFrom, dateTo]);

  const visibleWeeks = useMemo(() => {
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    const weeks: { label: string; start: Date; end: Date }[] = [];
    const d = new Date(start);
    const day = d.getDay();
    d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
    while (d <= end) {
      const ws = new Date(d);
      const we = new Date(d); we.setDate(we.getDate() + 6);
      const jan4 = new Date(ws.getFullYear(), 0, 4);
      const dayOfYear = Math.floor((ws.getTime() - jan4.getTime()) / 86400000) + jan4.getDay();
      const weekNum = Math.ceil((dayOfYear + 1) / 7);
      weeks.push({ label: `W${weekNum}`, start: ws, end: we });
      d.setDate(d.getDate() + 7);
    }
    return weeks;
  }, [dateFrom, dateTo]);

  const gridColumns = viewMode === 'weekly' ? visibleWeeks.length : visibleMonths.length;
  const gridHeaders = viewMode === 'weekly' ? visibleWeeks.map(w => w.label) : visibleMonths;

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

  const packageMap = useMemo(() => {
    const m = new Map<string, DbPackage>();
    packages.forEach(p => m.set(p.id, p));
    return m;
  }, [packages]);

  // ── Expand/collapse state ──
  const [expandedPackages, setExpandedPackages] = useState<Set<string>>(new Set());
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());

  const togglePackage = (id: string) =>
    setExpandedPackages(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
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

  // ── Sub-activities from package items ──
  const getSubActivities = useCallback((activity: Activity) => {
    if (!activity.packageId) return [];
    const pkg = packageMap.get(activity.packageId);
    if (!pkg) return [];
    const items = (pkg.items as any[]) || [];
    return items.map((item: any, i: number) => ({
      id: `${activity.id}__sub__${i}`,
      name: item.name || `Element ${i + 1}`,
      startDate: activity.startDate,
      endDate: activity.endDate,
    }));
  }, [packageMap]);

  // ── Package groups ──
  const packageGroups = useMemo(() => {
    const NO_PKG = '__no_package__';
    const groups = new Map<string, Activity[]>();
    filteredActivities.forEach(a => {
      const key = a.packageId || NO_PKG;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(a);
    });
    const sorted: { packageId: string; packageName: string; activities: Activity[]; pkg?: DbPackage }[] = [];
    groups.forEach((acts, key) => {
      if (key !== NO_PKG) {
        const pkg = packageMap.get(key);
        sorted.push({ packageId: key, packageName: pkg?.name || 'Nieznany pakiet', activities: acts, pkg });
      }
    });
    sorted.sort((a, b) => a.packageName.localeCompare(b.packageName));
    const noPkg = groups.get(NO_PKG);
    if (noPkg?.length) sorted.push({ packageId: NO_PKG, packageName: 'Bez pakietu', activities: noPkg });
    return sorted;
  }, [filteredActivities, packageMap]);

  // ── PDF Export ──
  const handleExportPDF = async () => {
    if (!chartRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(chartRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pW = pdf.internal.pageSize.getWidth();
      const pH = pdf.internal.pageSize.getHeight();
      const r = canvas.width / canvas.height;
      let dW = pW - 10, dH = dW / r;
      if (dH > pH - 20) { dH = pH - 20; dW = dH * r; }
      pdf.setFontSize(10);
      pdf.text(`Media Plan — ${dateFrom} → ${dateTo}`, 5, 7);
      pdf.addImage(imgData, 'PNG', 5, 12, dW, dH);
      pdf.save(`mediaplan-${dateFrom}-${dateTo}.pdf`);
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

  /** PRIMARY bar – main activity (height 14px, strong color, shadow) */
  const renderPrimaryBar = (activity: Activity, baseColor: string) => {
    const pos = getBarStyle(activity.startDate, activity.endDate);
    const brandLabel = getActivityBrandLabel(activity);
    const isHovered = hoveredBarId === activity.id;
    const isSelected = selectedBarId === activity.id;
    const subCount = getSubActivities(activity).length;

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
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <div>📅 {activity.startDate} → {activity.endDate}</div>
              <div>💰 {formatPLN(activity.price)}</div>
              {subCount > 0 && <div>📋 Pod-aktywności: {subCount}</div>}
              <div>📦 Typ: {activity.channel === 'online' ? 'Online' : activity.channel === 'offline' ? 'Offline' : 'Mix'}</div>
              {activity.note && <div>📝 {activity.note}</div>}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  /** SECONDARY bar – sub-activity (height 8px, lighter color, no shadow) */
  const renderSecondaryBar = (subId: string, startDate: string, endDate: string, name: string, baseColor: string) => {
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

  const hasContent = filteredActivities.length > 0;

  return (
    <div className="space-y-4">
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
            <Plus className="h-4 w-4" />Dodaj aktywność
          </Button>
        )}
      </div>

      {/* ── Gantt Chart ── */}
      <div ref={chartRef} className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {/* Header row */}
        <div className="flex border-b border-border sticky top-0 z-20 bg-card">
          <div className="w-64 shrink-0 px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Pakiet / Aktywność
          </div>
          <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${gridColumns}, 1fr)` }}>
            {gridHeaders.map((label, i) => (
              <div key={i} className={`text-center text-xs font-semibold py-3 text-muted-foreground whitespace-nowrap ${i > 0 ? 'border-l border-border/50' : ''}`}>
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* ── Rows ── */}
        {packageGroups.map((group, gIdx) => {
          const isExpanded = expandedPackages.has(group.packageId);
          const accentColor = PACKAGE_ACCENTS[gIdx % PACKAGE_ACCENTS.length];
          const totalPrice = group.activities.reduce((s, a) => s + a.price, 0);
          const totalActivities = group.activities.length;

          // Package date range
          const allStarts = group.activities.map(a => a.startDate).sort();
          const allEnds = group.activities.map(a => a.endDate).sort();
          const pkgDateRange = allStarts.length ? `${allStarts[0]} → ${allEnds[allEnds.length - 1]}` : '';
          const onlineCount = group.activities.filter(a => a.channel === 'online').length;
          const offlineCount = group.activities.filter(a => a.channel === 'offline').length;

          return (
            <div key={group.packageId}>
              {/* ── PACKAGE GROUP HEADER (no bar, neutral bg, colored left border) ── */}
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex border-b border-border bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="w-64 shrink-0 flex items-center gap-2 relative">
                        {/* Colored left accent bar */}
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-r" style={{ backgroundColor: accentColor }} />
                        <button
                          onClick={() => togglePackage(group.packageId)}
                          className="flex items-center gap-2 pl-4 pr-2 py-2.5 w-full text-left group"
                        >
                          {isExpanded
                            ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
                            : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
                          }
                          <Package className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="text-sm font-bold truncate">{group.packageName}</span>
                          <span className="text-[10px] text-muted-foreground ml-auto whitespace-nowrap shrink-0">
                            {totalActivities} akt.
                          </span>
                        </button>
                      </div>
                      {/* No bar on timeline for package */}
                      <div className="flex-1 relative" style={{ minHeight: 36 }}>
                        {renderGridLines()}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs p-3 space-y-1.5">
                    <div className="font-semibold text-sm">{group.packageName}</div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <div>💰 Budżet: {formatPLN(totalPrice)}</div>
                      <div>📋 Aktywności: {totalActivities}</div>
                      {pkgDateRange && <div>📅 Zakres: {pkgDateRange}</div>}
                      <div>🌐 Online: {onlineCount} / Offline: {offlineCount}</div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* ── Expanded activities ── */}
              {isExpanded && group.activities.map((activity, aIdx) => {
                const baseColor = BASE_COLORS[aIdx % BASE_COLORS.length];
                const isActExpanded = expandedActivities.has(activity.id);
                const subActivities = getSubActivities(activity);
                const hasSubs = subActivities.length > 0;
                const isActSelected = selectedBarId === activity.id;

                return (
                  <div key={activity.id}>
                    {/* ── ACTIVITY ROW (PRIMARY bar) ── */}
                    <div
                      className="flex border-b border-border/60 transition-colors"
                      style={{
                        backgroundColor: isActSelected ? `${baseColor}08` : aIdx % 2 === 0 ? 'transparent' : 'hsl(var(--secondary) / 0.06)',
                      }}
                    >
                      <div className="w-64 shrink-0 flex items-center gap-1.5 relative">
                        {/* Status indicator (3px left bar) */}
                        <div
                          className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r"
                          style={{ backgroundColor: STATUS_LEFT_COLORS[activity.status] || STATUS_LEFT_COLORS.planned }}
                        />
                        {/* Connector line from package accent */}
                        <div className="absolute left-1.5 top-0 bottom-0 w-px" style={{ backgroundColor: `${accentColor}30` }} />

                        <button
                          onClick={() => hasSubs && toggleActivity(activity.id)}
                          className="flex items-center gap-1.5 pl-7 pr-2 py-2 w-full text-left group"
                        >
                          {hasSubs ? (
                            isActExpanded
                              ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          ) : (
                            <span className="w-3.5 shrink-0" />
                          )}
                          <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: baseColor }} />
                          <span className="text-xs font-semibold truncate">{activity.name}</span>
                          {hasSubs && !isActExpanded && (
                            <span className="text-[9px] text-muted-foreground ml-auto shrink-0 bg-secondary/60 px-1.5 py-0.5 rounded-full">
                              {subActivities.length}
                            </span>
                          )}
                        </button>
                      </div>
                      <div className="flex-1 relative" style={{ minHeight: 36 }}>
                        {renderGridLines()}
                        {renderPrimaryBar(activity, baseColor)}
                      </div>
                    </div>

                    {/* ── SUB-ACTIVITIES (SECONDARY bars) ── */}
                    {isActExpanded && subActivities.map((sub) => (
                      <div key={sub.id} className="flex border-b border-border/30">
                        <div className="w-64 shrink-0 flex items-center relative">
                          {/* Vertical connector */}
                          <div className="absolute left-1.5 top-0 bottom-0 w-px" style={{ backgroundColor: `${accentColor}20` }} />
                          <div className="absolute left-[26px] top-0 bottom-0 w-px" style={{ backgroundColor: `${baseColor}20` }} />
                          <span className="text-[11px] text-muted-foreground truncate pl-11 pr-2 py-1.5">{sub.name}</span>
                        </div>
                        <div className="flex-1 relative" style={{ minHeight: 34 }}>
                          {renderGridLines()}
                          {renderSecondaryBar(sub.id, sub.startDate, sub.endDate, sub.name, baseColor)}
                        </div>
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
              : (selectedClientId ? 'Brak aktywności. Dodaj aktywność przyciskiem powyżej.' : 'Wybierz klienta na górze.')}
          </div>
        )}
      </div>

      {/* ── Drawers / Dialogs ── */}
      <ActivityDetailDrawer activity={selectedActivity} open={drawerOpen} onOpenChange={setDrawerOpen} clientId={selectedClientId} />
      <ActivityDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
};
