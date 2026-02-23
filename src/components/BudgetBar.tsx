import { useApp } from '@/context/AppContext';

const formatPLN = (n: number) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(n);

export const BudgetBar = () => {
  const { selectedClient, budgetUsed } = useApp();
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
      <div className="flex gap-4 text-xs whitespace-nowrap">
        <span className="text-muted-foreground">Plan: <strong className="text-foreground">{formatPLN(annualBudget)}</strong></span>
        <span className="text-muted-foreground">Użyte: <strong className="text-foreground">{formatPLN(budgetUsed)}</strong></span>
        <span className="text-muted-foreground">Zostało: <strong className={remaining < 0 ? 'text-destructive' : 'text-foreground'}>{formatPLN(remaining)}</strong></span>
        <span className="font-bold" style={{ color: pct > 90 ? 'hsl(0,84%,60%)' : pct > 70 ? 'hsl(38,92%,50%)' : 'hsl(142,71%,45%)' }}>
          {pct.toFixed(0)}%
        </span>
      </div>
    </div>
  );
};
