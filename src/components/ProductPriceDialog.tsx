import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProductPriceHistory, useAddProductPrice } from '@/hooks/useProductPrices';
import { toast } from 'sonner';

interface Props {
  productId: string;
  productName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Cennik jest insert-only — dodanie nowej ceny NIE nadpisuje poprzedniej,
// tylko dokłada nowy wiersz z datą obowiązywania. Stara cena zostaje w historii
// i nadal jest wykorzystywana przez estymacje utworzone przed jej zmianą.
export const ProductPriceDialog = ({ productId, productName, open, onOpenChange }: Props) => {
  const { data: history = [], isLoading } = useProductPriceHistory(productId);
  const addPrice = useAddProductPrice();

  const [newPrice, setNewPrice] = useState('');
  const [newEffectiveFrom, setNewEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));

  const handleAdd = async () => {
    const priceNum = parseFloat(newPrice);
    if (isNaN(priceNum) || priceNum < 0) { toast.error('Podaj poprawną cenę'); return; }
    if (!newEffectiveFrom) { toast.error('Podaj datę obowiązywania'); return; }
    try {
      await addPrice.mutateAsync({ productId, price: priceNum, effectiveFrom: newEffectiveFrom });
      toast.success('Cena dodana');
      setNewPrice('');
    } catch (err: any) {
      toast.error('Nie udało się dodać ceny: ' + (err.message || 'Nieznany błąd'));
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const currentPrice = history.find(p => p.effectiveFrom <= today);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cennik — {productName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {currentPrice && (
            <div className="text-sm bg-accent text-accent-foreground rounded-md px-3 py-2">
              Aktualna cena: <strong>{currentPrice.price} zł</strong> · obowiązuje od {currentPrice.effectiveFrom}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <Label className="text-xs">Nowa cena (zł)</Label>
              <Input type="number" min="0" value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label className="text-xs">Obowiązuje od</Label>
              <Input type="date" value={newEffectiveFrom} onChange={e => setNewEffectiveFrom(e.target.value)} />
            </div>
          </div>
          <Button size="sm" onClick={handleAdd} disabled={addPrice.isPending} className="w-full">
            {addPrice.isPending ? 'Dodawanie...' : 'Dodaj cenę'}
          </Button>
          <p className="text-xs text-muted-foreground">
            Dodanie nowej ceny nie zmienia poprzedniej — stare estymacje zostają przy cenie, która obowiązywała w momencie ich utworzenia.
          </p>

          <div className="border-t pt-3">
            <Label className="text-xs text-muted-foreground">Historia cen</Label>
            {isLoading ? (
              <p className="text-xs text-muted-foreground mt-2">Wczytywanie…</p>
            ) : history.length === 0 ? (
              <p className="text-xs text-muted-foreground mt-2">Brak cen — dodaj pierwszą powyżej.</p>
            ) : (
              <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                {history.map(p => (
                  <div key={p.id} className="flex justify-between text-xs py-1 border-b border-border/50 last:border-0">
                    <span>{p.price} zł</span>
                    <span className="text-muted-foreground">od {p.effectiveFrom}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
