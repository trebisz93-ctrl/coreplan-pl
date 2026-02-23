import { useApp } from '@/context/AppContext';
import { Badge } from '@/components/ui/badge';
import { Building2, Package } from 'lucide-react';
import { products } from '@/data/mockData';

export const ClientsView = () => {
  const { clients, selectedClientId, setSelectedClientId } = useApp();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Klienci</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map(client => {
          const clientProducts = products.filter(p => p.clientId === client.id);
          const isSelected = client.id === selectedClientId;
          return (
            <div
              key={client.id}
              onClick={() => setSelectedClientId(client.id)}
              className={`bg-card rounded-xl border p-5 shadow-sm cursor-pointer transition-all hover:shadow-md ${
                isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base truncate">{client.name}</h3>
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Package className="h-3 w-3" />
                    <span>{clientProducts.length} produktów</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {clientProducts.map(p => (
                      <Badge key={p.id} variant="secondary" className="text-xs">{p.name}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              {isSelected && (
                <Badge className="mt-3" variant="default">Aktywny</Badge>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
