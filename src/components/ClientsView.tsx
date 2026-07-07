import { useState } from 'react';
import { useClients, useCreateClient, useUpdateClient, useDeleteClient, useUpdateClientBudget, useProducts } from '@/hooks/useData';
import { useCanEdit } from '@/hooks/useRole';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Building2, Package, Plus, Pencil, Trash2, Check, X, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const formatPLN = (n: number) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(n);

export const ClientsView = () => {
  const { data: clients = [], isLoading } = useClients();
  const { data: allProducts = [] } = useProducts();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const updateBudget = useUpdateClientBudget();
  const canEdit = useCanEdit();

  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editBudget, setEditBudget] = useState('');

  const handleCreate = async () => {
    if (!newName.trim()) { toast.error('Podaj nazwę klienta'); return; }
    try {
      await createClient.mutateAsync(newName.trim());
      setNewName('');
      toast.success('Klient dodany');
    } catch (e: any) { toast.error('Nie udało się zapisać: ' + (e.message || 'Nieznany błąd')); }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await updateClient.mutateAsync({ id, name: editName.trim() });
      setEditingId(null);
      toast.success('Klient zaktualizowany');
    } catch (e: any) { toast.error('Nie udało się zapisać: ' + (e.message || 'Nieznany błąd')); }
  };

  const handleBudgetSave = async (id: string) => {
    const val = parseFloat(editBudget);
    if (isNaN(val) || val < 0) { toast.error('Podaj poprawną kwotę (≥ 0)'); return; }
    try {
      await updateBudget.mutateAsync({ id, annual_budget: val });
      setEditingBudgetId(null);
      toast.success('Budżet zaktualizowany');
    } catch (e: any) { toast.error('Nie udało się zapisać: ' + (e.message || 'Nieznany błąd')); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteClient.mutateAsync(id);
      toast.success('Klient usunięty');
    } catch (e: any) { toast.error('Nie udało się usunąć: ' + (e.message || 'Nieznany błąd')); }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <h2 className="text-xl font-bold">Klienci</h2>

        {canEdit && (
          <div className="flex gap-2">
            <Input
              placeholder="Nazwa nowego klienta..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              className="max-w-sm"
            />
            <Button onClick={handleCreate} disabled={createClient.isPending} className="gap-2">
              <Plus className="h-4 w-4" /> Dodaj
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map(client => {
            const clientProducts = allProducts.filter(p => p.client_id === client.id);
            const isEditing = editingId === client.id;
            const isEditingBudget = editingBudgetId === client.id;
            const budget = client.annual_budget ?? 0;

            return (
              <div key={client.id} className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex gap-1">
                        <Input value={editName} onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleUpdate(client.id)} className="h-8 text-sm" autoFocus />
                        <Tooltip><TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" aria-label="Zapisz zmiany" onClick={() => handleUpdate(client.id)}><Check className="h-3 w-3" /></Button>
                        </TooltipTrigger><TooltipContent>Zapisz</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" aria-label="Anuluj edycję" onClick={() => setEditingId(null)}><X className="h-3 w-3" /></Button>
                        </TooltipTrigger><TooltipContent>Anuluj</TooltipContent></Tooltip>
                      </div>
                    ) : (
                      <h3 className="font-bold text-base truncate">{client.name}</h3>
                    )}
                  </div>
                </div>

                {/* Budget */}
                <div className="bg-secondary/50 rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> Budżet roczny</span>
                    {!isEditingBudget && canEdit && (
                      <button className="text-primary hover:underline text-xs" onClick={() => { setEditingBudgetId(client.id); setEditBudget(String(budget)); }}>
                        Zmień
                      </button>
                    )}
                  </div>
                  {isEditingBudget ? (
                    <div className="flex gap-1">
                      <Input type="number" value={editBudget} onChange={e => setEditBudget(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleBudgetSave(client.id)} className="h-8 text-sm" autoFocus min="0" />
                      <Tooltip><TooltipTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" aria-label="Zapisz budżet" onClick={() => handleBudgetSave(client.id)}><Check className="h-3 w-3" /></Button>
                      </TooltipTrigger><TooltipContent>Zapisz</TooltipContent></Tooltip>
                      <Tooltip><TooltipTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" aria-label="Anuluj edycję budżetu" onClick={() => setEditingBudgetId(null)}><X className="h-3 w-3" /></Button>
                      </TooltipTrigger><TooltipContent>Anuluj</TooltipContent></Tooltip>
                    </div>
                  ) : (
                    <div className="text-lg font-bold">{formatPLN(budget)}</div>
                  )}
                </div>

                {/* Products */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Package className="h-3 w-3" />
                  <span>{clientProducts.length} produktów</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {clientProducts.slice(0, 5).map(p => (
                    <Badge key={p.id} variant="secondary" className="text-xs">{p.name}</Badge>
                  ))}
                  {clientProducts.length > 5 && <Badge variant="outline" className="text-xs">+{clientProducts.length - 5}</Badge>}
                </div>

                {/* Actions */}
                {canEdit && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="gap-1"
                      onClick={() => { setEditingId(client.id); setEditName(client.name); }}>
                      <Pencil className="h-3 w-3" /> Edytuj
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="gap-1 text-destructive hover:text-destructive">
                          <Trash2 className="h-3 w-3" /> Usuń
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Usunąć klienta?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Usunięcie klienta "{client.name}" spowoduje usunięcie wszystkich jego produktów. Tej operacji nie można cofnąć.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Anuluj</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(client.id)}>Usuń</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {clients.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            Brak klientów. Dodaj pierwszego klienta powyżej.
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};
