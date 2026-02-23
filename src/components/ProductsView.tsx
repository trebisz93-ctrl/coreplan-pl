import { useState } from 'react';
import { useClients, useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useSeedProducts } from '@/hooks/useData';
import { allSeedProducts } from '@/data/seedProducts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingBag, Plus, Pencil, Trash2, Check, X, Download } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from '@/components/ui/dialog';

export const ProductsView = () => {
  const { data: clients = [] } = useClients();
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const { data: products = [], isLoading } = useProducts(selectedClientId === 'all' ? undefined : selectedClientId);
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const seedProducts = useSeedProducts();

  const [newName, setNewName] = useState('');
  const [newEan, setNewEan] = useState('');
  const [newClientId, setNewClientId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEan, setEditEan] = useState('');
  const [seedClientId, setSeedClientId] = useState('');
  const [seedGroupIdx, setSeedGroupIdx] = useState(0);

  const handleCreate = async () => {
    const clientId = newClientId || (selectedClientId !== 'all' ? selectedClientId : '');
    if (!newName.trim() || !clientId) { toast.error('Podaj nazwę produktu i wybierz klienta'); return; }
    try {
      await createProduct.mutateAsync({ name: newName.trim(), clientId, ean: newEan.trim() || undefined });
      setNewName(''); setNewEan('');
      toast.success('Produkt dodany');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await updateProduct.mutateAsync({ id, name: editName.trim(), ean: editEan.trim() || undefined });
      setEditingId(null);
      toast.success('Produkt zaktualizowany');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteProduct.mutateAsync(id); toast.success('Produkt usunięty'); }
    catch (e: any) { toast.error(e.message); }
  };

  const handleSeed = async () => {
    if (!seedClientId) { toast.error('Wybierz klienta'); return; }
    const group = allSeedProducts[seedGroupIdx];
    try {
      await seedProducts.mutateAsync({ clientId: seedClientId, products: group.products });
      toast.success(`Zaimportowano ${group.products.length} produktów (${group.group})`);
    } catch (e: any) { toast.error(e.message); }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Produkty</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2"><Download className="h-4 w-4" /> Importuj produkty</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Importuj produkty startowe</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Select value={seedClientId} onValueChange={setSeedClientId}>
                <SelectTrigger><SelectValue placeholder="Wybierz klienta" /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={String(seedGroupIdx)} onValueChange={v => setSeedGroupIdx(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {allSeedProducts.map((g, i) => <SelectItem key={i} value={String(i)}>{g.group} ({g.products.length} szt.)</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Anuluj</Button></DialogClose>
              <Button onClick={handleSeed} disabled={seedProducts.isPending}>
                {seedProducts.isPending ? 'Importuję...' : 'Importuj'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter */}
      <Select value={selectedClientId} onValueChange={setSelectedClientId}>
        <SelectTrigger className="w-48"><SelectValue placeholder="Filtruj klienta" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Wszyscy klienci</SelectItem>
          {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
        </SelectContent>
      </Select>

      {/* Add */}
      <div className="flex gap-2 flex-wrap">
        <Input placeholder="Nazwa produktu..." value={newName} onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()} className="max-w-xs" />
        <Input placeholder="EAN (opcjonalnie)" value={newEan} onChange={e => setNewEan(e.target.value)}
          className="w-40" />
        {selectedClientId === 'all' && (
          <Select value={newClientId} onValueChange={setNewClientId}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Klient" /></SelectTrigger>
            <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        )}
        <Button onClick={handleCreate} disabled={createProduct.isPending} className="gap-2">
          <Plus className="h-4 w-4" /> Dodaj
        </Button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map(product => {
          const clientName = clients.find(c => c.id === product.client_id)?.name ?? '—';
          const isEditing = editingId === product.id;
          return (
            <div key={product.id} className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center">
                  <ShoppingBag className="h-4 w-4 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="space-y-1">
                      <div className="flex gap-1">
                        <Input value={editName} onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleUpdate(product.id)} className="h-8 text-sm" autoFocus />
                        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => handleUpdate(product.id)}><Check className="h-3 w-3" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => setEditingId(null)}><X className="h-3 w-3" /></Button>
                      </div>
                      <Input value={editEan} onChange={e => setEditEan(e.target.value)} placeholder="EAN" className="h-7 text-xs" />
                    </div>
                  ) : (
                    <>
                      <h3 className="font-bold text-sm leading-tight">{product.name}</h3>
                      {product.ean && <div className="text-xs text-muted-foreground font-mono mt-0.5">EAN: {product.ean}</div>}
                    </>
                  )}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Klient: <span className="font-medium text-foreground">{clientName}</span>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="gap-1"
                  onClick={() => { setEditingId(product.id); setEditName(product.name); setEditEan(product.ean || ''); }}>
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
                      <AlertDialogTitle>Usunąć produkt?</AlertDialogTitle>
                      <AlertDialogDescription>Usunięcie produktu "{product.name}" jest nieodwracalne.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Anuluj</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(product.id)}>Usuń</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          );
        })}
      </div>

      {products.length === 0 && (
        <div className="text-center text-muted-foreground py-12">
          {clients.length === 0 ? 'Najpierw dodaj klienta w sekcji Klienci.' : 'Brak produktów. Dodaj pierwszy produkt powyżej lub użyj importu.'}
        </div>
      )}
    </div>
  );
};
