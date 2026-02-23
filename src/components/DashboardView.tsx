import { useState, useMemo } from 'react';
import { useClients, useProducts, DbProduct } from '@/hooks/useData';
import { useActivities } from '@/hooks/useActivities';
import { useApp } from '@/context/AppContext';
import { useUnreadCount } from '@/hooks/useNotifications';
import { Building2, Package, DollarSign, ChevronDown, ChevronRight, Calendar, TrendingUp, GitCompare, Bell } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { statusLabels, ActivityStatus } from '@/types/mediaplan';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const formatPLN = (n: number) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(n);
const months = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];

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

const statusColors: Record<string, string> = {
  planned: 'hsl(221, 83%, 53%)',
  in_progress: 'hsl(38, 92%, 50%)',
  completed: 'hsl(142, 71%, 45%)',
  cancelled: 'hsl(0, 84%, 60%)',
};

export const DashboardView = () => {
  const { clients, multiClientMode, selectedClientIds } = useApp();
  const { data: allProducts = [], isLoading: loadingProducts } = useProducts();
  const { data: allDbActivities = [] } = useActivities();
  const { data: unreadCount = 0 } = useUnreadCount();
  const [expandedClient, setExpandedClient] = useState<string | null>(null);

  // Date range
  const [year] = useState(2026);
  const [dateFrom, setDateFrom] = useState(`${year}-01-01`);
  const [dateTo, setDateTo] = useState(`${year}-12-31`);

  // YoY comparison
  const [yoyEnabled, setYoyEnabled] = useState(false);

  // Category/subcategory filters
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>('all');

  const categories = useMemo(() => [...new Set(allProducts.map(p => p.category).filter(Boolean))] as string[], [allProducts]);
  const subcategories = useMemo(() => {
    const filtered = categoryFilter !== 'all' ? allProducts.filter(p => p.category === categoryFilter) : allProducts;
    return [...new Set(filtered.map(p => p.subcategory).filter(Boolean))] as string[];
  }, [allProducts, categoryFilter]);

  const setQuarter = (q: string) => {
    const [from, to] = quarterRanges[q];
    setDateFrom(`${year}-${from}`);
    setDateTo(`${year}-${to}`);
  };

  // Filter activities by date range, clients, and product category
  const filterActivities = (acts: typeof allDbActivities, from: string, to: string) => {
    const clientIds = multiClientMode ? new Set(selectedClientIds) : new Set(clients.map(c => c.id));

    // Get product IDs matching category/subcategory filters
    let matchingProductIds: Set<string> | null = null;
    if (categoryFilter !== 'all' || subcategoryFilter !== 'all') {
      const filtered = allProducts.filter(p => {
        if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
        if (subcategoryFilter !== 'all' && p.subcategory !== subcategoryFilter) return false;
        return true;
      });
      matchingProductIds = new Set(filtered.map(p => p.id));
    }

    return acts.filter(a => {
      if (!clientIds.has(a.client_id)) return false;
      if (a.end_date < from || a.start_date > to) return false;
      if (matchingProductIds && !a.product_ids.some(pid => matchingProductIds!.has(pid))) return false;
      return true;
    });
  };

  const filteredActivities = useMemo(() =>
    filterActivities(allDbActivities, dateFrom, dateTo),
    [allDbActivities, dateFrom, dateTo, multiClientMode, selectedClientIds, clients, categoryFilter, subcategoryFilter, allProducts]
  );

  // YoY previous year activities
  const prevYearFrom = `${year - 1}-${dateFrom.slice(5)}`;
  const prevYearTo = `${year - 1}-${dateTo.slice(5)}`;
  const prevYearActivities = useMemo(() => {
    if (!yoyEnabled) return [];
    return filterActivities(allDbActivities, prevYearFrom, prevYearTo);
  }, [yoyEnabled, allDbActivities, prevYearFrom, prevYearTo, multiClientMode, selectedClientIds, clients, categoryFilter, subcategoryFilter, allProducts]);

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { planned: 0, in_progress: 0, completed: 0, cancelled: 0 };
    filteredActivities.forEach(a => { counts[a.status] = (counts[a.status] || 0) + 1; });
    return counts;
  }, [filteredActivities]);

  // Monthly trend data
  const monthlyData = useMemo(() => {
    return months.map((m, i) => {
      const monthActivities = filteredActivities.filter(a => parseInt(a.start_date.slice(5, 7)) === i + 1);
      const entry: any = {
        name: m,
        Zaplanowane: monthActivities.filter(a => a.status === 'planned').length,
        'W trakcie': monthActivities.filter(a => a.status === 'in_progress').length,
        Zrealizowane: monthActivities.filter(a => a.status === 'completed').length,
        Anulowane: monthActivities.filter(a => a.status === 'cancelled').length,
      };
      if (yoyEnabled) {
        const prevMonthActs = prevYearActivities.filter(a => parseInt(a.start_date.slice(5, 7)) === i + 1);
        entry['Poprzedni rok'] = prevMonthActs.length;
      }
      return entry;
    });
  }, [filteredActivities, yoyEnabled, prevYearActivities]);

  // Status bar chart data
  const statusBarData = useMemo(() => {
    return Object.entries(statusCounts).map(([key, count]) => ({
      name: statusLabels[key as ActivityStatus],
      count,
      fill: statusColors[key],
    }));
  }, [statusCounts]);

  // Budget totals
  const totalBudget = clients.reduce((s, c) => s + (c.annual_budget ?? 0), 0);
  const totalUsed = filteredActivities.filter(a => a.status !== 'cancelled').reduce((s, a) => s + Number(a.price), 0);
  const totalPlanned = filteredActivities.filter(a => a.status === 'planned' || a.status === 'in_progress').reduce((s, a) => s + Number(a.price), 0);
  const totalCompleted = filteredActivities.filter(a => a.status === 'completed').reduce((s, a) => s + Number(a.price), 0);

  if (loadingProducts) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification widget */}
      {unreadCount > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Masz {unreadCount} nieprzeczytanych powiadomień</p>
              <p className="text-xs text-muted-foreground">Kliknij dzwonek w pasku nawigacji, aby sprawdzić szczegóły</p>
            </div>
          </div>
          <Badge variant="destructive" className="text-sm px-3 py-1">{unreadCount}</Badge>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold">Dashboard</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1">
            {['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
              <Button key={q} size="sm" variant="outline" onClick={() => setQuarter(q)} className="text-xs px-2">{q}</Button>
            ))}
            <div className="w-px bg-border mx-1" />
            {['C1', 'C2', 'C3'].map(q => (
              <Button key={q} size="sm" variant="outline" onClick={() => setQuarter(q)} className="text-xs px-2">{q}</Button>
            ))}
            <div className="w-px bg-border mx-1" />
            <Button size="sm" variant="outline" onClick={() => setQuarter('year')} className="text-xs px-2">Rok</Button>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 h-8 text-xs" />
            <span className="text-xs text-muted-foreground">→</span>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 h-8 text-xs" />
          </div>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-3 flex-wrap">
        {categories.length > 0 && (
          <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v); setSubcategoryFilter('all'); }}>
            <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Kategoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie kategorie</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {subcategories.length > 0 && (
          <Select value={subcategoryFilter} onValueChange={setSubcategoryFilter}>
            <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Subkategoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie subkategorie</SelectItem>
              {subcategories.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <div className="flex items-center gap-2">
          <Switch id="yoy" checked={yoyEnabled} onCheckedChange={setYoyEnabled} />
          <Label htmlFor="yoy" className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1">
            <GitCompare className="h-3.5 w-3.5" /> Porównaj z {year - 1}
          </Label>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Zaplanowane', count: statusCounts.planned, color: 'text-blue-500' },
          { label: 'W trakcie', count: statusCounts.in_progress, color: 'text-yellow-500' },
          { label: 'Zrealizowane', count: statusCounts.completed, color: 'text-green-500' },
          { label: 'Anulowane', count: statusCounts.cancelled, color: 'text-red-500' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-card rounded-xl border border-border p-5 shadow-sm">
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{kpi.label}</div>
            <div className={`text-3xl font-bold mt-1 ${kpi.color}`}>{kpi.count}</div>
          </div>
        ))}
      </div>

      {/* Budget Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Suma budżetów</div>
          <div className="text-2xl font-bold mt-1">{formatPLN(totalBudget)}</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Zaplanowane (PLN)</div>
          <div className="text-2xl font-bold mt-1">{formatPLN(totalPlanned)}</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Zrealizowane (PLN)</div>
          <div className="text-2xl font-bold mt-1">{formatPLN(totalCompleted)}</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Łączne aktywności</div>
          <div className="text-2xl font-bold mt-1">{filteredActivities.length}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Aktywności wg statusu
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusBarData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" name="Liczba" radius={[4, 4, 0, 0]}>
                  {statusBarData.map((entry, i) => (
                    <rect key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Trend miesięczny {yoyEnabled && `(vs ${year - 1})`}
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Zaplanowane" fill="hsl(221, 83%, 53%)" stackId="a" />
                <Bar dataKey="W trakcie" fill="hsl(38, 92%, 50%)" stackId="a" />
                <Bar dataKey="Zrealizowane" fill="hsl(142, 71%, 45%)" stackId="a" />
                <Bar dataKey="Anulowane" fill="hsl(0, 84%, 60%)" stackId="a" radius={[4, 4, 0, 0]} />
                {yoyEnabled && (
                  <Bar dataKey="Poprzedni rok" fill="hsl(var(--muted-foreground))" opacity={0.4} radius={[4, 4, 0, 0]} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Per-client cards */}
      <h3 className="text-lg font-semibold">Klienci</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map(client => {
          const clientProducts = allProducts.filter(p => p.client_id === client.id);
          const budget = client.annual_budget ?? 0;
          const clientActivities = filteredActivities.filter(a => a.client_id === client.id);
          const budgetUsed = clientActivities.filter(a => a.status !== 'cancelled').reduce((s, a) => s + Number(a.price), 0);
          const pct = budget > 0 ? (budgetUsed / budget) * 100 : 0;
          const isExpanded = expandedClient === client.id;

          return (
            <div key={client.id} className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-base">{client.name}</h3>
                  <div className="text-xs text-muted-foreground">{clientActivities.length} aktywności</div>
                </div>
              </div>

              {budget > 0 ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> Budżet</span>
                    <span className="font-semibold text-foreground">{formatPLN(budget)}</span>
                  </div>
                  <Progress value={Math.min(pct, 100)} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Wykorzystane: {formatPLN(budgetUsed)}</span>
                    <span>{pct.toFixed(0)}%</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground italic">Brak budżetu</div>
              )}

              <div className="flex flex-wrap gap-2">
                {(['planned', 'in_progress', 'completed', 'cancelled'] as const).map(s => {
                  const count = clientActivities.filter(a => a.status === s).length;
                  if (count === 0) return null;
                  return <Badge key={s} variant="outline" className="text-[10px]">{statusLabels[s]}: {count}</Badge>;
                })}
              </div>

              <button
                onClick={() => setExpandedClient(isExpanded ? null : client.id)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <Package className="h-3 w-3" />
                <span>{clientProducts.length} produktów</span>
              </button>
              {isExpanded && (
                <div className="pl-2 border-l-2 border-border space-y-0.5">
                  {clientProducts.slice(0, 10).map(p => (
                    <div key={p.id} className="text-xs text-muted-foreground truncate">{p.name}</div>
                  ))}
                  {clientProducts.length > 10 && (
                    <div className="text-xs text-muted-foreground">+{clientProducts.length - 10} więcej</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {clients.length === 0 && (
        <div className="text-center text-muted-foreground py-12">
          Brak klientów. Dodaj klientów w sekcji Klienci.
        </div>
      )}
    </div>
  );
};
