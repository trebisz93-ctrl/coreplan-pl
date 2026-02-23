import { useApp } from '@/context/AppContext';
import { mediaPackages } from '@/data/mockData';
import { Badge } from '@/components/ui/badge';
import { useMemo } from 'react';

const formatPLN = (n: number) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(n);

export const PackagesView = () => {
  const { allActivities, selectedPlan } = useApp();

  const packageStats = useMemo(() => {
    return mediaPackages.map(pkg => {
      const acts = allActivities.filter(a => a.packageId === pkg.id && a.status !== 'cancelled');
      const totalValue = acts.reduce((s, a) => s + a.price, 0);
      const budgetShare = selectedPlan ? (totalValue / selectedPlan.annualBudget * 100) : 0;
      return { ...pkg, usageCount: acts.length, totalValue, budgetShare };
    });
  }, [allActivities, selectedPlan]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Pakiety reklamowe</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {packageStats.map(pkg => (
          <div key={pkg.id} className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-base">{pkg.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{pkg.description}</p>
              </div>
              <Badge variant="secondary" className="shrink-0">{formatPLN(pkg.defaultPrice)}</Badge>
            </div>
            <div className="space-y-1">
              {pkg.items.map(item => (
                <div key={item.id} className="flex justify-between text-xs text-muted-foreground">
                  <span>{item.name} ×{item.quantity}</span>
                  <span>{formatPLN(item.unitPrice)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Użycia w planie:</span>
                <span className="font-semibold">{pkg.usageCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Łączna wartość:</span>
                <span className="font-semibold">{formatPLN(pkg.totalValue)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Udział w budżecie:</span>
                <span className="font-semibold">{pkg.budgetShare.toFixed(1)}%</span>
              </div>
              {pkg.usageCount > 0 && (
                <div className="h-2 rounded-full bg-secondary overflow-hidden mt-2">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(pkg.budgetShare, 100)}%` }} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
