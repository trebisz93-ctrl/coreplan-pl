import { useState } from 'react';
import { usePackages, useCreatePackage, useUpdatePackage, useDeletePackage } from '@/hooks/useData';
import { useCanEdit } from '@/hooks/useRole';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Pencil, Trash2, X, Package } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const formatPLN = (n: number) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(n);

interface PackageItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

const emptyItem = (): PackageItem => ({ id: `item-${Date.now()}-${Math.random()}`, name: '', quantity: 1, unitPrice: 0 });

export const PackagesView = () => {
  const { data: packages = [], isLoading } = usePackages();
  const createPackage = useCreatePackage();
  const updatePackage = useUpdatePackage();
  const deletePackage = useDeletePackage();
  const canEdit = useCanEdit();

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultPrice, setDefaultPrice] = useState('');
  const [items, setItems] = useState<PackageItem[]>([emptyItem()]);

  const openCreate = () => {
    setEditingId(null);
    setName(''); setDescription(''); setDefaultPrice('');
    setItems([emptyItem()]);
    setFormOpen(true);
  };

  const openEdit = (pkg: typeof packages[0]) => {
    setEditingId(pkg.id);
    setName(pkg.name);
    setDescription(pkg.description);
    setDefaultPrice(String(pkg.default_price));
    setItems(pkg.items?.length ? pkg.items : [emptyItem()]);
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error('Podaj nazwę pakietu'); return; }
    const priceVal = parseFloat(defaultPrice) || 0;
    if (priceVal < 0) { toast.error('Cena nie może być ujemna'); return; }
    const validItems = items.filter(i => i.name.trim());
    const payload = {
      name: name.trim(),
      description: description.trim(),
      default_price: priceVal,
      items: validItems,
    };
    try {
      if (editingId) {
        await updatePackage.mutateAsync({ id: editingId, ...payload });
        toast.success('Pakiet zaktualizowany');
      } else {
        await createPackage.mutateAsync(payload);
        toast.success('Pakiet dodany');
      }
      setFormOpen(false);
    } catch (e: any) { toast.error('Nie udało się zapisać: ' + (e.message || 'Nieznany błąd')); }
  };

  const handleDelete = async (id: string) => {
    try { await deletePackage.mutateAsync(id); toast.success('Pakiet usunięty'); }
    catch (e: any) { toast.error('Nie udało się usunąć: ' + (e.message || 'Nieznany błąd')); }
  };

  const updateItem = (idx: number, field: keyof PackageItem, value: string | number) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
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
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Pakiety reklamowe</h2>
          {canEdit && (
            <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Dodaj pakiet</Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map(pkg => (
            <div key={pkg.id} className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="font-bold text-base">{pkg.name}</h3>
                    {pkg.description && <p className="text-xs text-muted-foreground mt-0.5">{pkg.description}</p>}
                  </div>
                </div>
                <Badge variant="secondary">{formatPLN(pkg.default_price)}</Badge>
              </div>

              {pkg.items?.length > 0 && (
                <div className="space-y-1">
                  {pkg.items.map((item: PackageItem) => (
                    <div key={item.id} className="flex justify-between text-xs text-muted-foreground">
                      <span>{item.name} ×{item.quantity}</span>
                      <span>{formatPLN(item.unitPrice)}</span>
                    </div>
                  ))}
                </div>
              )}

              {canEdit && (
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => openEdit(pkg)}>
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
                        <AlertDialogTitle>Usunąć pakiet?</AlertDialogTitle>
                        <AlertDialogDescription>Usunięcie pakietu "{pkg.name}" jest nieodwracalne.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Anuluj</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(pkg.id)}>Usuń</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          ))}
        </div>

        {packages.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            Brak pakietów. Dodaj pierwszy pakiet powyżej.
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edytuj pakiet' : 'Dodaj pakiet'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nazwa</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nazwa pakietu" />
              </div>
              <div>
                <Label>Opis</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Opis pakietu" />
              </div>
              <div>
                <Label>Domyślna cena (PLN)</Label>
                <Input type="number" value={defaultPrice} onChange={e => setDefaultPrice(e.target.value)} placeholder="0" min="0" />
              </div>
              <div>
                <Label>Elementy pakietu</Label>
                <div className="space-y-2 mt-1">
                  {items.map((item, idx) => (
                    <div key={item.id} className="flex gap-2 items-center">
                      <Input placeholder="Nazwa elementu" value={item.name}
                        onChange={e => updateItem(idx, 'name', e.target.value)} className="flex-1" />
                      <Input type="number" placeholder="Ilość" value={item.quantity}
                        onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)} className="w-20" />
                      <Input type="number" placeholder="Cena jedn." value={item.unitPrice}
                        onChange={e => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)} className="w-28" />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                            onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}>
                            <X className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Usuń element</TooltipContent>
                      </Tooltip>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => setItems(prev => [...prev, emptyItem()])}>
                    <Plus className="h-3 w-3 mr-1" /> Dodaj element
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFormOpen(false)}>Anuluj</Button>
              <Button onClick={handleSubmit} disabled={createPackage.isPending || updatePackage.isPending}>
                {editingId ? 'Zapisz' : 'Dodaj'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};
