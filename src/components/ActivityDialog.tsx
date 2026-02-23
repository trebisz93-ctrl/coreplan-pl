import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useApp } from '@/context/AppContext';
import { Activity, Channel, CampaignType, ActivityStatus, campaignTypeLabels } from '@/types/mediaplan';
import { mediaPackages } from '@/data/mockData';
import { AlertTriangle } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatPLN = (n: number) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(n);

export const ActivityDialog = ({ open, onOpenChange }: Props) => {
  const { clientProducts, selectedPlanId, selectedPlan, addActivity, budgetUsed } = useApp();
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
  const wouldExceed = selectedPlan && (budgetUsed + priceNum > selectedPlan.annualBudget);

  const handlePackageChange = (pkgId: string) => {
    setPackageId(pkgId);
    if (pkgId && pkgId !== 'none') {
      const pkg = mediaPackages.find(p => p.id === pkgId);
      if (pkg) setPrice(pkg.defaultPrice.toString());
    }
  };

  const handleSubmit = () => {
    if (!name || !startDate || !endDate || selectedProducts.length === 0 || !price) return;
    if (wouldExceed && !confirmed) return;

    const activity: Activity = {
      id: `a-${Date.now()}`,
      planId: selectedPlanId,
      name,
      channel,
      campaignType,
      startDate,
      endDate,
      productIds: selectedProducts,
      packageId: packageId && packageId !== 'none' ? packageId : undefined,
      price: priceNum,
      status,
      note: note || undefined,
      confirmations: [],
    };
    addActivity(activity);
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setName(''); setChannel('online'); setCampaignType('display');
    setStartDate(''); setEndDate(''); setSelectedProducts([]);
    setPackageId(''); setPrice(''); setStatus('planned'); setNote(''); setConfirmed(false);
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
            <Label>Produkty</Label>
            <div className="space-y-2 mt-1 max-h-32 overflow-y-auto border border-border rounded-lg p-2">
              {clientProducts.map(p => (
                <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={selectedProducts.includes(p.id)}
                    onCheckedChange={checked => {
                      setSelectedProducts(prev => checked ? [...prev, p.id] : prev.filter(x => x !== p.id));
                    }}
                  />
                  {p.name}
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label>Pakiet (opcjonalnie)</Label>
            <Select value={packageId} onValueChange={handlePackageChange}>
              <SelectTrigger><SelectValue placeholder="Wybierz pakiet" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Brak pakietu</SelectItem>
                {mediaPackages.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name} ({formatPLN(p.defaultPrice)})</SelectItem>
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
                  Dodanie tej aktywności przekroczy budżet roczny o {formatPLN(budgetUsed + priceNum - selectedPlan!.annualBudget)}.
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
          <Button onClick={handleSubmit} disabled={!name || !startDate || !endDate || selectedProducts.length === 0 || !price || (wouldExceed && !confirmed)}>
            Dodaj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
