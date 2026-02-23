import { useState, useMemo } from 'react';
import { useClients, useProducts, DbProduct } from '@/hooks/useData';
import { useActivities } from '@/hooks/useActivities';
import { useApp } from '@/context/AppContext';
import { Building2, Package, DollarSign, ChevronDown, ChevronRight, Calendar, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { statusLabels, ActivityStatus } from '@/types/mediaplan';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const formatPLN = (n: number) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(n);
const months = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];

const quarterRanges: Record<string, [string, string]> = {
  Q1: ['01-01', '03-31'],
  Q2: ['04-01', '06-30'],
  Q3: ['07-01', '09-30'],
  Q4: ['10-01', '12-31'],
  year: ['01-01', '12-31'],
};

const statusColors: Record<string, string> = {
  planned: 'hsl(221, 83%, 53%)',
  in_progress: 'hsl(38, 92%, 50%)',
  completed: 'hsl(142, 71%, 45%)',
  cancelled: 'hsl(0, 84%, 60%)',
};

export const DashboardView = () => {
  const { clients, multiClientMode, selectedClientIds, multiClientBudgets } = useApp();
  const { data: allProducts = [], isLoading: loadingProducts } = useProducts();
  const { data: allDbActivities = [] } = useActivities();
  const [expandedClient, setExpandedClient] = useState<string | null>(null);

  // Date range
  const [year] = useState(2026);
  const [dateFrom, setDateFrom] = useState(`${year}-01-01`);
  const [dateTo, setDateTo] = useState(`${year}-12-31`);

  const setQuarter = (q: string) => {
    const [from, to] = quarterRanges[q];
    setDateFrom(`${year}-${from}`);
    setDateTo(`${year}-${to}`);
  };

  // Filter activities by date range and selected clients
  const filteredActivities = useMemo(() => {
    const clientIds = multiClientMode ? new Set(selectedClientIds) : new Set(clients.map(c => c.id));
    return allDbActivities.filter(a => {
      if (!clientIds.has(a.client_id)) return false;
      if (a.end_date < dateFrom || a.start_date > dateTo) return false;
      return true;
    });
  }, [allDbActivities, dateFrom, dateTo, multiClientMode, selectedClientIds, clients]);

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { planned: 0, in_progress: 0, completed: 0, cancelled: 0 };
    filteredActivities.forEach(a => { counts[a.status] = (counts[a.status] || 0) + 1; });
    return counts;
  }, [filteredActivities]);

  // Monthly trend data
  const monthlyData = useMemo(() => {
    return months.map((m, i) => {
      const monthStr = String(i + 1).padStart(2, '0');
      const monthActivities = filteredActivities.filter(a => {
        const startMonth = parseInt(a.start_date.slice(5, 7));
        return startMonth === i + 1;
      });
      return {
        name: m,
        Zaplanowane: monthActivities.filter(a => a.status === 'planned').length,
        'W trakcie': monthActivities.filter(a => a.status === 'in_progress').length,
        Zrealizowane: monthActivities.filter(a => a.status === 'completed').length,
        Anulowane: monthActivities.filter(a => a.status === 'cancelled').length,
      };
    });
  }, [filteredActivities]);

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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold">Dashboard</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1">
            {['Q1', 'Q2', 'Q3', 'Q4', 'year'].map(q => (
              <Button key={q} size="sm" variant="outline" onClick={() => setQuarter(q)} className="text-xs px-2">
                {q === 'year' ? 'Rok' : q}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 h-8 text-xs" />
            <span className="text-xs text-muted-foreground">→</span>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 h-8 text-xs" />
          </div>
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
        {/* Status bar chart */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Aktywności wg statusu
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusBarData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="count" name="Liczba" radius={[4, 4, 0, 0]}>
                  {statusBarData.map((entry, i) => (
                    <rect key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly trend */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Trend miesięczny
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Zaplanowane" fill="hsl(221, 83%, 53%)" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="W trakcie" fill="hsl(38, 92%, 50%)" stackId="a" />
                <Bar dataKey="Zrealizowane" fill="hsl(142, 71%, 45%)" stackId="a" />
                <Bar dataKey="Anulowane" fill="hsl(0, 84%, 60%)" stackId="a" radius={[4, 4, 0, 0]} />
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
          const budgetUsed = clientActivities
            .filter(a => a.status !== 'cancelled')
            .reduce((s, a) => s + Number(a.price), 0);
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

              {/* Status breakdown */}
              <div className="flex flex-wrap gap-2">
                {(['planned', 'in_progress', 'completed', 'cancelled'] as const).map(s => {
                  const count = clientActivities.filter(a => a.status === s).length;
                  if (count === 0) return null;
                  return (
                    <Badge key={s} variant="outline" className="text-[10px]">
                      {statusLabels[s]}: {count}
                    </Badge>
                  );
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
