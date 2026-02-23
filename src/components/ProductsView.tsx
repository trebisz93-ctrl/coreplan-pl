import { useState, useMemo } from 'react';
import { useClients, useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useSeedProducts } from '@/hooks/useData';
import { useCanEdit } from '@/hooks/useRole';
import { allSeedProducts } from '@/data/seedProducts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingBag, Plus, Pencil, Trash2, Check, X, Download, Search, Tag } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export const ProductsView = () => {
  const { data: clients = [] } = useClients();
  const { data: products = [], isLoading } = useProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const seedProducts = useSeedProducts();
  const canEdit = useCanEdit();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>('all');

  // Create form
  const [newName, setNewName] = useState('');
  const [newEan, setNewEan] = useState('');
  const [newClientId, setNewClientId] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newSubcategory, setNewSubcategory] = useState('');

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEan, setEditEan] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editSubcategory, setEditSubcategory] = useState('');

  // Seed
  const [seedClientId, setSeedClientId] = useState('');
  const [seedGroupIdx, setSeedGroupIdx] = useState(0);

  // Computed
  const categories = useMemo(() => [...new Set(products.map(p => p.category).filter(Boolean))] as string[], [products]);
  const subcategories = useMemo(() => [...new Set(products.map(p => p.subcategory).filter(Boolean))] as string[], [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (clientFilter !== 'all' && p.client_id !== clientFilter) return false;
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (subcategoryFilter !== 'all' && p.subcategory !== subcategoryFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const clientName = clients.find(c => c.id === p.client_id)?.name?.toLowerCase() || '';
        if (
          !p.name.toLowerCase().includes(q) &&
          !(p.ean || '').toLowerCase().includes(q) &&
          !(p.category || '').toLowerCase().includes(q) &&
          !(p.subcategory || '').toLowerCase().includes(q) &&
          !clientName.includes(q)
        ) return false;
      }
      return true;
    });
  }, [products, clientFilter, categoryFilter, subcategoryFilter, searchQuery, clients]);

  const handleCreate = async () => {
    if (!newName.trim()) { toast.error('Podaj nazwę produktu'); return; }
    if (!newClientId) { toast.error('Wybierz klienta'); return; }
    try {
      await createProduct.mutateAsync({ name: newName.trim(), clientId: newClientId, ean: newEan.trim() || undefined });
      setNewName(''); setNewEan('');
      toast.success('Produkt dodany');
    } catch (e: any) { toast.error('Nie udało się zapisać: ' + (e.message || 'Nieznany błąd')); }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) { toast.error('Podaj nazwę produktu'); return; }
    try {
      await updateProduct.mutateAsync({ id, name: editName.trim(), ean: editEan.trim() || undefined });
      setEditingId(null);
      toast.success('Produkt zaktualizowany');
    } catch (e: any) { toast.error('Nie udało się zapisać: ' + (e.message || 'Nieznany błąd')); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteProduct.mutateAsync(id); toast.success('Produkt usunięty'); }
    catch (e: any) { toast.error('Nie udało się usunąć: ' + (e.message || 'Nieznany błąd')); }
  };

  const handleSeed = async () => {
    if (!seedClientId) { toast.error('Wybierz klienta'); return; }
    const group = allSeedProducts[seedGroupIdx];
    try {
      await seedProducts.mutateAsync({ clientId: seedClientId, products: group.products });
      toast.success(`Zaimportowano ${group.products.length} produktów (${group.group})`);
    } catch (e: any) { toast.error('Nie udało się zaimportować: ' + (e.message || 'Nieznany błąd')); }
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
        {canEdit && (
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
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj po nazwie, EAN, kategorii, kliencie..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={clientFilter} onValueChange={v => { setClientFilter(v); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Klient" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszyscy klienci</SelectItem>
            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {categories.length > 0 && (
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Kategoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie kategorie</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {subcategories.length > 0 && (
          <Select value={subcategoryFilter} onValueChange={setSubcategoryFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Subkategoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie subkategorie</SelectItem>
              {subcategories.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Add product */}
      {canEdit && (
        <div className="flex gap-2 flex-wrap items-end">
          <Input placeholder="Nazwa produktu..." value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()} className="max-w-xs" />
          <Input placeholder="EAN (opcjonalnie)" value={newEan} onChange={e => setNewEan(e.target.value)}
            className="w-36" />
          <Select value={newClientId} onValueChange={setNewClientId}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Klient" /></SelectTrigger>
            <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={handleCreate} disabled={createProduct.isPending} className="gap-2">
            <Plus className="h-4 w-4" /> Dodaj
          </Button>
        </div>
      )}

      {/* Products table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50">
                <TableHead className="font-semibold">Nazwa</TableHead>
                <TableHead className="font-semibold">SKU/EAN</TableHead>
                <TableHead className="font-semibold">Kategoria</TableHead>
                <TableHead className="font-semibold">Subkategoria</TableHead>
                <TableHead className="font-semibold">Klient</TableHead>
                <TableHead className="font-semibold">Marka</TableHead>
                {canEdit && <TableHead className="font-semibold w-28">Akcje</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product, i) => {
                const clientName = clients.find(c => c.id === product.client_id)?.name ?? '—';
                const isEditing = editingId === product.id;

                return (
                  <TableRow key={product.id} className={i % 2 ? 'bg-secondary/10' : ''}>
                    <TableCell>
                      {isEditing ? (
                        <Input value={editName} onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleUpdate(product.id)} className="h-8 text-sm" autoFocus />
                      ) : (
                        <span className="font-medium">{product.name}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input value={editEan} onChange={e => setEditEan(e.target.value)} className="h-8 text-sm w-28" />
                      ) : (
                        <span className="text-xs font-mono text-muted-foreground">{product.ean || '—'}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs">{product.category || '—'}</span>
                    </TableCell>
                    <TableCell>
                      {product.subcategory ? (
                        <Badge variant="outline" className="text-xs">{product.subcategory}</Badge>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{clientName}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs">{product.brand || '—'}</span>
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        {isEditing ? (
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleUpdate(product.id)}>
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7"
                              onClick={() => { setEditingId(product.id); setEditName(product.name); setEditEan(product.ean || ''); }}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Usunąć produkt?</AlertDialogTitle>
                                  <AlertDialogDescription>Usunięcie "{product.name}" jest nieodwracalne.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(product.id)}>Usuń</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center text-muted-foreground py-12">
          {products.length === 0
            ? (clients.length === 0 ? 'Najpierw dodaj klienta w sekcji Klienci.' : 'Brak produktów. Dodaj pierwszy produkt powyżej lub użyj importu.')
            : 'Brak wyników dla podanych filtrów.'}
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        Wyświetlono {filteredProducts.length} z {products.length} produktów
      </div>
    </div>
  );
};
