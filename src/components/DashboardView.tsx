import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { mediaPackages } from '@/data/mockData';

const formatPLN = (n: number) => new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 }).format(n) + ' zł';
const COLORS = ['hsl(221,83%,53%)', 'hsl(142,71%,45%)', 'hsl(220,14%,86%)', 'hsl(38,92%,50%)', 'hsl(271,81%,56%)', 'hsl(173,58%,39%)'];

export const DashboardView = () => {
  const { selectedPlan, allActivities, budgetUsed, budgetPlanned, budgetCompleted, onlineSpend, offlineSpend, clientProducts } = useApp();

  const monthlyData = useMemo(() => {
    if (!selectedPlan) return [];
    const months = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];
    return months.map((name, i) => {
      const monthActivities = allActivities.filter(a => {
        if (a.status === 'cancelled') return false;
        const start = new Date(a.startDate);
        const end = new Date(a.endDate);
        const monthStart = new Date(selectedPlan.year, i, 1);
        const monthEnd = new Date(selectedPlan.year, i + 1, 0);
        return start <= monthEnd && end >= monthStart;
      });
      const total = monthActivities.reduce((s, a) => {
        const start = new Date(a.startDate);
        const end = new Date(a.endDate);
        const days = Math.max(1, (end.getTime() - start.getTime()) / 86400000);
        const monthStart = new Date(selectedPlan.year, i, 1);
        const monthEnd = new Date(selectedPlan.year, i + 1, 0);
        const overlapStart = Math.max(start.getTime(), monthStart.getTime());
        const overlapEnd = Math.min(end.getTime(), monthEnd.getTime());
        const overlapDays = Math.max(0, (overlapEnd - overlapStart) / 86400000);
        return s + (a.price * overlapDays / days);
      }, 0);
      return { name, value: Math.round(total) };
    });
  }, [allActivities, selectedPlan]);

  const productData = useMemo(() => {
    return clientProducts.map(p => {
      const total = allActivities.filter(a => a.status !== 'cancelled' && a.productIds.includes(p.id)).reduce((s, a) => s + a.price / a.productIds.length, 0);
      return { name: p.name, value: Math.round(total) };
    }).sort((a, b) => b.value - a.value);
  }, [allActivities, clientProducts]);

  const packageData = useMemo(() => {
    return mediaPackages.map(pkg => {
      const acts = allActivities.filter(a => a.packageId === pkg.id && a.status !== 'cancelled');
      return { name: pkg.name, value: acts.reduce((s, a) => s + a.price, 0), count: acts.length };
    }).filter(p => p.value > 0);
  }, [allActivities]);

  if (!selectedPlan) return <div className="text-muted-foreground">Wybierz plan</div>;

  const remaining = Math.max(0, selectedPlan.annualBudget - budgetUsed);
  const pct = selectedPlan.annualBudget > 0 ? (budgetUsed / selectedPlan.annualBudget * 100) : 0;

  const donutData = [
    { name: 'Zrealizowane', value: budgetCompleted },
    { name: 'Zaplanowane', value: budgetPlanned },
    { name: 'Pozostałe', value: remaining },
  ];

  const channelData = [
    { name: 'Online', value: onlineSpend },
    { name: 'Offline', value: offlineSpend },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Budżet roczny', value: formatPLN(selectedPlan.annualBudget), sub: `Plan ${selectedPlan.year}` },
          { label: 'Wykorzystanie', value: `${pct.toFixed(1)}%`, sub: formatPLN(budgetUsed) },
          { label: 'Online', value: formatPLN(onlineSpend), sub: `${selectedPlan.annualBudget > 0 ? (onlineSpend / selectedPlan.annualBudget * 100).toFixed(0) : 0}% budżetu` },
          { label: 'Offline', value: formatPLN(offlineSpend), sub: `${selectedPlan.annualBudget > 0 ? (offlineSpend / selectedPlan.annualBudget * 100).toFixed(0) : 0}% budżetu` },
        ].map((kpi, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-5 shadow-sm">
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{kpi.label}</div>
            <div className="text-2xl font-bold mt-1">{kpi.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget Donut */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <h3 className="font-semibold mb-4">Wykorzystanie budżetu</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={donutData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" paddingAngle={2}>
                {donutData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => formatPLN(v)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Online vs Offline */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <h3 className="font-semibold mb-4">Online vs Offline</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={channelData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatPLN(v)} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                <Cell fill="hsl(173,58%,39%)" />
                <Cell fill="hsl(25,95%,53%)" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <h3 className="font-semibold mb-4">Budżet per miesiąc</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatPLN(v)} />
              <Line type="monotone" dataKey="value" stroke="hsl(221,83%,53%)" strokeWidth={2} dot={{ fill: 'hsl(221,83%,53%)' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Product Ranking */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <h3 className="font-semibold mb-4">Budżet per produkt</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={productData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis type="number" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => formatPLN(v)} />
              <Bar dataKey="value" fill="hsl(221,83%,53%)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Package Distribution */}
        {packageData.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-5 shadow-sm lg:col-span-2">
            <h3 className="font-semibold mb-4">Pakiety – udział w budżecie</h3>
            <div className="flex items-center gap-8">
              <ResponsiveContainer width="50%" height={250}>
                <PieChart>
                  <Pie data={packageData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {packageData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatPLN(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3">
                {packageData.map((pkg, i) => (
                  <div key={pkg.name} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{pkg.name}</div>
                      <div className="text-xs text-muted-foreground">{pkg.count} użyć · {formatPLN(pkg.value)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
