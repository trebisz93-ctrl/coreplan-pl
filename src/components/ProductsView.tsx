import { useApp } from '@/context/AppContext';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag } from 'lucide-react';

const formatPLN = (n: number) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(n);

export const ProductsView = () => {
  const { clientProducts, allActivities, clients, selectedClientId } = useApp();
  const clientName = clients.find(c => c.id === selectedClientId)?.name ?? '';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Produkty</h2>
        <p className="text-sm text-muted-foreground mt-1">Klient: {clientName}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clientProducts.map(product => {
          const acts = allActivities.filter(a => a.productIds.includes(product.id) && a.status !== 'cancelled');
          const totalSpend = acts.reduce((s, a) => s + a.price, 0);
          return (
            <div key={product.id} className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center">
                  <ShoppingBag className="h-4 w-4 text-accent" />
                </div>
                <h3 className="font-bold text-base">{product.name}</h3>
              </div>
              <div className="border-t border-border pt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Aktywności:</span>
                  <span className="font-semibold">{acts.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Łączny budżet:</span>
                  <span className="font-semibold">{formatPLN(totalSpend)}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {acts.slice(0, 3).map(a => (
                  <Badge key={a.id} variant="outline" className="text-xs">{a.name}</Badge>
                ))}
                {acts.length > 3 && <Badge variant="secondary" className="text-xs">+{acts.length - 3}</Badge>}
              </div>
            </div>
          );
        })}
        {clientProducts.length === 0 && (
          <div className="col-span-full text-center text-muted-foreground py-12">Brak produktów dla wybranego klienta</div>
        )}
      </div>
    </div>
  );
};
