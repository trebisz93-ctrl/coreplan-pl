import { useState } from 'react';
import { useClients, useProducts, DbProduct } from '@/hooks/useData';
import { useActivities } from '@/hooks/useActivities';
import { Building2, Package, DollarSign, ChevronDown, ChevronRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

const formatPLN = (n: number) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(n);

interface SubcategoryGroup {
  subcategory: string;
  products: DbProduct[];
}

const groupBySubcategory = (products: DbProduct[]): SubcategoryGroup[] => {
  const map = new Map<string, DbProduct[]>();
  for (const p of products) {
    const key = p.subcategory || 'Inne';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  return Array.from(map.entries()).map(([subcategory, products]) => ({ subcategory, products })).sort((a, b) => a.subcategory.localeCompare(b.subcategory));
};

export const DashboardView = () => {
  const { data: clients = [], isLoading: loadingClients } = useClients();
  const { data: allProducts = [], isLoading: loadingProducts } = useProducts();
  const { data: allDbActivities = [] } = useActivities();
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [expandedSub, setExpandedSub] = useState<string | null>(null);

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map(client => {
          const clientProducts = allProducts.filter(p => p.client_id === client.id);
          const budget = client.annual_budget ?? 0;
          const clientActivities = allDbActivities.filter(a => a.client_id === client.id);
          const budgetUsed = clientActivities
            .filter(a => a.status !== 'cancelled')
            .reduce((s, a) => s + Number(a.price), 0);
          const pct = budget > 0 ? (budgetUsed / budget) * 100 : 0;
          const isExpanded = expandedClient === client.id;
          const subcategoryGroups = groupBySubcategory(clientProducts);

          return (
            <div key={client.id} className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-bold text-base">{client.name}</h3>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> Budżet roczny</span>
                  <span className="font-semibold text-foreground">{formatPLN(budget)}</span>
                </div>
                <Progress value={Math.min(pct, 100)} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Wykorzystane: {formatPLN(budgetUsed)}</span>
                  <span>Pozostało: {formatPLN(budget - budgetUsed)}</span>
                </div>
              </div>

              {/* Subcategory breakdown */}
              <div>
                <button
                  onClick={() => setExpandedClient(isExpanded ? null : client.id)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
                >
                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  <Package className="h-3 w-3" />
                  <span>{clientProducts.length} produktów · {subcategoryGroups.length} subkategorii</span>
                </button>

                {isExpanded && (
                  <div className="mt-2 space-y-1 pl-2 border-l-2 border-border">
                    {subcategoryGroups.map(group => {
                      const subKey = `${client.id}-${group.subcategory}`;
                      const isSubExpanded = expandedSub === subKey;
                      return (
                        <div key={group.subcategory}>
                          <button
                            onClick={() => setExpandedSub(isSubExpanded ? null : subKey)}
                            className="flex items-center gap-2 text-xs py-1 hover:text-foreground transition-colors w-full text-left"
                          >
                            {isSubExpanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                            <Badge variant="outline" className="text-xs font-normal">{group.subcategory}</Badge>
                            <span className="text-muted-foreground">({group.products.length})</span>
                          </button>
                          {isSubExpanded && (
                            <div className="pl-5 space-y-0.5 mb-1">
                              {group.products.map(p => (
                                <div key={p.id} className="text-xs text-muted-foreground truncate py-0.5">
                                  {p.name}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
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
