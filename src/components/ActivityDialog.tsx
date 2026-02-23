import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useApp } from '@/context/AppContext';
import { useProducts, useClients, usePackages } from '@/hooks/useData';
import { useCreateActivity } from '@/hooks/useActivities';
import { Channel, CampaignType, ActivityStatus, campaignTypeLabels } from '@/types/mediaplan';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatPLN = (n: number) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(n);

export const ActivityDialog = ({ open, onOpenChange }: Props) => {
  const { selectedClientId, selectedClient, budgetUsed } = useApp();
  const { data: clients = [] } = useClients();
  const createActivity = useCreateActivity();
  const [dialogClientId, setDialogClientId] = useState<string>('');
  const effectiveClientId = dialogClientId || selectedClientId;
  const { data: clientProducts = [] } = useProducts(effectiveClientId || undefined);
  const { data: packages = [] } = usePackages();

  const [name, setName] = useState('');
  const [channel, setChannel] = useState<Channel>('online');
  const [campaignType, setCampaignType] = useState<CampaignType>('display');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [packageId, setPackageId] = useState<string>('');
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState<ActivityStatus>('planned');
  const [note, setNote] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const priceNum = parseFloat(price) || 0;
  const annualBudget = selectedClient?.annual_budget || 0;
  const wouldExceed = annualBudget > 0 && (budgetUsed + priceNum > annualBudget);

  const handlePackageChange = (pkgId: string) => {
    setPackageId(pkgId);
    if (pkgId && pkgId !== 'none') {
      const pkg = packages.find(p => p.id === pkgId);
      if (pkg) setPrice(String(pkg.default_price));
    }
  };

  const handleSubmit = async () => {
    if (!name || !startDate || !endDate || !price || !effectiveClientId) return;
    if (wouldExceed && !confirmed) return;

    try {
      await createActivity.mutateAsync({
        client_id: effectiveClientId,
        name,
        channel,
        campaign_type: campaignType,
        start_date: startDate,
        end_date: endDate,
        product_ids: selectedProducts,
        package_id: packageId && packageId !== 'none' ? packageId : undefined,
        price: priceNum,
        status,
        note: note || undefined,
      });
      toast.success('Aktywność dodana');
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      toast.error('Błąd: ' + (err.message || 'Nie udało się dodać'));
    }
  };

  const resetForm = () => {
    setName(''); setChannel('online'); setCampaignType('display');
    setStartDate(''); setEndDate(''); setSelectedProducts([]);
    setPackageId(''); setPrice(''); setStatus('planned'); setNote('');
    setConfirmed(false); setDialogClientId('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dodaj aktywność</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nazwa</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nazwa kampanii" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Kanał</Label>
              <Select value={channel} onValueChange={v => setChannel(v as Channel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Typ kampanii</Label>
              <Select value={campaignType} onValueChange={v => setCampaignType(v as CampaignType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(campaignTypeLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data rozpoczęcia</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>Data zakończenia</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Klient (kategoria)</Label>
            <Select value={effectiveClientId} onValueChange={v => { setDialogClientId(v); setSelectedProducts([]); }}>
              <SelectTrigger><SelectValue placeholder="Wybierz klienta" /></SelectTrigger>
              <SelectContent>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {effectiveClientId && clientProducts.length > 0 && (
            <div>
              <Label>Produkty (opcjonalnie)</Label>
              <div className="space-y-2 mt-1 max-h-32 overflow-y-auto border border-border rounded-lg p-2">
                {clientProducts.map(p => (
                  <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={selectedProducts.includes(p.id)}
                      onCheckedChange={checked => {
                        setSelectedProducts(prev => checked ? [...prev, p.id] : prev.filter(x => x !== p.id));
                      }}
                    />
                    <span>{p.name}</span>
                    {p.ean && <span className="text-xs text-muted-foreground font-mono">({p.ean})</span>}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label>Pakiet (opcjonalnie)</Label>
            <Select value={packageId} onValueChange={handlePackageChange}>
              <SelectTrigger><SelectValue placeholder="Wybierz pakiet" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Brak pakietu</SelectItem>
                {packages.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name} ({formatPLN(p.default_price)})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Cena (PLN)</Label>
              <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={v => setStatus(v as ActivityStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Zaplanowane</SelectItem>
                  <SelectItem value="in_progress">W trakcie</SelectItem>
                  <SelectItem value="completed">Zrealizowane</SelectItem>
                  <SelectItem value="cancelled">Anulowane</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Notatka</Label>
            <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Dlaczego ta aktywność?" />
          </div>

          {wouldExceed && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-destructive">Przekroczenie budżetu!</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Dodanie tej aktywności przekroczy budżet roczny o {formatPLN(budgetUsed + priceNum - annualBudget)}.
                </div>
                <label className="flex items-center gap-2 mt-2 text-sm cursor-pointer">
                  <Checkbox checked={confirmed} onCheckedChange={v => setConfirmed(!!v)} />
                  Potwierdzam przekroczenie budżetu
                </label>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Anuluj</Button>
          <Button onClick={handleSubmit} disabled={!name || !startDate || !endDate || !price || (wouldExceed && !confirmed) || createActivity.isPending}>
            {createActivity.isPending ? 'Dodawanie...' : 'Dodaj'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
