import { useState, useMemo } from 'react';
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
import { useCampaignTypes } from '@/hooks/useCampaignTypes';
import { Channel, CampaignType, ActivityStatus, campaignTypeLabels } from '@/types/mediaplan';
import { AlertTriangle, Search } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatPLN = (n: number) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(n);

export const ActivityDialog = ({ open, onOpenChange }: Props) => {
  const { selectedClientId, selectedClient, budgetUsed } = useApp();
  const { data: clients = [] } = useClients();
  const { data: campaignTypes = [] } = useCampaignTypes();
  const createActivity = useCreateActivity();
  const [dialogClientId, setDialogClientId] = useState<string>('');
  const effectiveClientId = dialogClientId || selectedClientId;
  // Fetch ALL products so user can pick from full catalog
  const { data: allProducts = [] } = useProducts();
  const { data: packages = [] } = usePackages();

  // Merge default + custom campaign types
  const allCampaignTypes = [
    ...Object.entries(campaignTypeLabels).map(([k, v]) => ({ name: k, label: v })),
    ...campaignTypes.filter(ct => !campaignTypeLabels[ct.name as CampaignType]).map(ct => ({ name: ct.name, label: ct.label })),
  ];

  const [name, setName] = useState('');
  const [channel, setChannel] = useState<Channel>('online');
  const [campaignType, setCampaignType] = useState<CampaignType>('display');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState('');
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

  const validate = (): string | null => {
    if (!name.trim()) return 'Podaj nazwę aktywności';
    if (!effectiveClientId) return 'Wybierz klienta';
    if (!startDate) return 'Podaj datę rozpoczęcia';
    if (!endDate) return 'Podaj datę zakończenia';
    if (endDate < startDate) return 'Data zakończenia musi być późniejsza niż data rozpoczęcia';
    if (!price) return 'Podaj cenę';
    if (priceNum < 0) return 'Cena nie może być ujemna';
    if (wouldExceed && !confirmed) return 'Potwierdź przekroczenie budżetu';
    return null;
  };

  const handleSubmit = async () => {
    const error = validate();
    if (error) { toast.error(error); return; }

    try {
      await createActivity.mutateAsync({
        client_id: effectiveClientId,
        name: name.trim(),
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
      toast.error('Nie udało się zapisać: ' + (err.message || 'Nieznany błąd'));
    }
  };

  const resetForm = () => {
    setName(''); setChannel('online'); setCampaignType('display');
    setStartDate(''); setEndDate(''); setSelectedProducts([]); setProductSearch('');
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
                  {allCampaignTypes.map(ct => (
                    <SelectItem key={ct.name} value={ct.name}>{ct.label}</SelectItem>
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
            <Label>Klient</Label>
            <Select value={effectiveClientId} onValueChange={v => { setDialogClientId(v); setSelectedProducts([]); }}>
              <SelectTrigger><SelectValue placeholder="Wybierz klienta" /></SelectTrigger>
              <SelectContent>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Products from full catalog */}
          <div>
            <Label>Produkty (opcjonalnie)</Label>
            <div className="relative mt-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Szukaj produktu po nazwie, EAN, marce..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <div className="space-y-1 mt-2 max-h-40 overflow-y-auto border border-border rounded-lg p-2">
              {allProducts
                .filter(p => {
                  if (!productSearch) return true;
                  const q = productSearch.toLowerCase();
                  return p.name.toLowerCase().includes(q)
                    || (p.ean && p.ean.toLowerCase().includes(q))
                    || (p.brand && p.brand.toLowerCase().includes(q))
                    || (p.category && p.category.toLowerCase().includes(q));
                })
                .map(p => (
                  <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer py-0.5">
                    <Checkbox
                      checked={selectedProducts.includes(p.id)}
                      onCheckedChange={checked => {
                        setSelectedProducts(prev => checked ? [...prev, p.id] : prev.filter(x => x !== p.id));
                      }}
                    />
                    <span className="truncate">{p.name}</span>
                    {p.brand && <span className="text-xs text-muted-foreground">{p.brand}</span>}
                    {p.ean && <span className="text-xs text-muted-foreground font-mono">({p.ean})</span>}
                  </label>
                ))}
              {allProducts.length === 0 && (
                <div className="text-xs text-muted-foreground py-2 text-center">Brak produktów w bazie</div>
              )}
            </div>
            {selectedProducts.length > 0 && (
              <div className="text-xs text-muted-foreground mt-1">Wybrano: {selectedProducts.length}</div>
            )}
          </div>

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
              <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" min="0" />
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
          <Button onClick={handleSubmit} disabled={createActivity.isPending}>
            {createActivity.isPending ? 'Dodawanie...' : 'Dodaj'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
