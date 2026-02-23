import { useApp } from '@/context/AppContext';

const formatPLN = (n: number) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(n);

export const BudgetBar = () => {
  const { selectedClient, budgetUsed, budgetPlanned, budgetCompleted, multiClientMode, multiClientBudgets } = useApp();

  // Multi-client aggregated view
  if (multiClientMode) {
    if (multiClientBudgets.length === 0) return (
      <div className="text-xs text-muted-foreground">Wybierz klientów do porównania budżetów</div>
    );

    const totalBudget = multiClientBudgets.reduce((s, b) => s + (b.client.annual_budget || 0), 0);
    const totalUsed = multiClientBudgets.reduce((s, b) => s + b.budgetUsed, 0);
    const totalPlanned = multiClientBudgets.reduce((s, b) => s + b.budgetPlanned, 0);
    const totalCompleted = multiClientBudgets.reduce((s, b) => s + b.budgetCompleted, 0);
    const totalRemaining = totalBudget - totalUsed;

    return (
      <div className="space-y-2">
        <div className="flex gap-3 text-xs whitespace-nowrap flex-wrap">
          <span className="text-muted-foreground">Suma plan: <strong className="text-foreground">{formatPLN(totalBudget)}</strong></span>
          <span className="text-muted-foreground">Zaplanowane: <strong className="text-foreground">{formatPLN(totalPlanned)}</strong></span>
          <span className="text-muted-foreground">Zrealizowane: <strong className="text-foreground">{formatPLN(totalCompleted)}</strong></span>
          <span className="text-muted-foreground">Zostało: <strong className={totalRemaining < 0 ? 'text-destructive' : 'text-foreground'}>{formatPLN(totalRemaining)}</strong></span>
        </div>
        <div className="flex gap-3 flex-wrap">
          {multiClientBudgets.map(b => {
            const budget = b.client.annual_budget || 0;
            const pct = budget > 0 ? (b.budgetUsed / budget) * 100 : 0;
            const barColor = pct > 90 ? 'bg-budget-danger' : pct > 70 ? 'bg-budget-warning' : 'bg-budget-safe';
            return (
              <div key={b.client.id} className="flex items-center gap-1.5 text-xs">
                <span className="font-medium truncate max-w-20">{b.client.name}</span>
                <div className="w-14 h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <span className="text-muted-foreground">{pct.toFixed(0)}%</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Single client mode
  if (!selectedClient) return null;

  const annualBudget = selectedClient.annual_budget || 0;
  if (annualBudget === 0) return (
    <div className="text-xs text-muted-foreground">Ustaw budżet roczny dla klienta w zakładce Klienci</div>
  );

  const remaining = annualBudget - budgetUsed;
  const pct = annualBudget > 0 ? (budgetUsed / annualBudget) * 100 : 0;
  const barColor = pct > 90 ? 'bg-budget-danger' : pct > 70 ? 'bg-budget-warning' : 'bg-budget-safe';

  return (
    <div className="flex items-center gap-4">
      <div className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
        BUDŻET {selectedClient.name}
      </div>
      <div className="flex-1 min-w-32">
        <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
      </div>
      <div className="flex gap-3 text-xs whitespace-nowrap">
        <span className="text-muted-foreground">Plan: <strong className="text-foreground">{formatPLN(annualBudget)}</strong></span>
        <span className="text-muted-foreground">Zaplanowane: <strong className="text-foreground">{formatPLN(budgetPlanned)}</strong></span>
        <span className="text-muted-foreground">Zrealizowane: <strong className="text-foreground">{formatPLN(budgetCompleted)}</strong></span>
        <span className="text-muted-foreground">Zostało: <strong className={remaining < 0 ? 'text-destructive' : 'text-foreground'}>{formatPLN(remaining)}</strong></span>
        <span className="font-bold" style={{ color: pct > 90 ? 'hsl(0,84%,60%)' : pct > 70 ? 'hsl(38,92%,50%)' : 'hsl(142,71%,45%)' }}>
          {pct.toFixed(0)}%
        </span>
      </div>
    </div>
  );
};
