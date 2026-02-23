import { useClients, useProducts } from '@/hooks/useData';
import { Building2, Package, DollarSign } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const formatPLN = (n: number) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(n);

export const DashboardView = () => {
  const { data: clients = [], isLoading: loadingClients } = useClients();
  const { data: allProducts = [], isLoading: loadingProducts } = useProducts();

  if (loadingClients || loadingProducts) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const totalBudget = clients.reduce((s, c) => s + (c.annual_budget ?? 0), 0);
  const totalProducts = allProducts.length;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Panel centralny</h2>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Klienci</div>
          <div className="text-2xl font-bold mt-1">{clients.length}</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Produkty łącznie</div>
          <div className="text-2xl font-bold mt-1">{totalProducts}</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Suma budżetów</div>
          <div className="text-2xl font-bold mt-1">{formatPLN(totalBudget)}</div>
        </div>
      </div>

      {/* Client cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map(client => {
          const clientProducts = allProducts.filter(p => p.client_id === client.id);
          const budget = client.annual_budget ?? 0;
          // TODO: when activities are in DB, calculate real usage
          const budgetUsed = 0;
          const pct = budget > 0 ? (budgetUsed / budget) * 100 : 0;

          return (
            <div key={client.id} className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-bold text-base">{client.name}</h3>
              </div>

              {/* Budget bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> Budżet roczny</span>
                  <span className="font-semibold text-foreground">{formatPLN(budget)}</span>
                </div>
                <Progress value={pct} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Wykorzystane: {formatPLN(budgetUsed)}</span>
                  <span>Pozostało: {formatPLN(budget - budgetUsed)}</span>
                </div>
              </div>

              {/* Products count */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Package className="h-3 w-3" />
                <span>{clientProducts.length} produktów</span>
              </div>
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
