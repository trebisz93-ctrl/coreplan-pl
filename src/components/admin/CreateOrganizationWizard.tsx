import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Building2, User, CheckCircle2, ArrowRight, ArrowLeft, Loader2, Package, Plus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface QuickClient { name: string; budget: string }
interface QuickProduct { name: string; brand: string }

export const CreateOrganizationWizard = ({ open, onOpenChange }: Props) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  // Step 1 - Org
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [orgEmail, setOrgEmail] = useState('');
  const [orgPhone, setOrgPhone] = useState('');
  const [orgNip, setOrgNip] = useState('');
  const [orgAddress, setOrgAddress] = useState('');
  const [orgNote, setOrgNote] = useState('');

  // Step 2 - User
  const [userFirstName, setUserFirstName] = useState('');
  const [userLastName, setUserLastName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');

  // Step 3 - Quick add
  const [clients, setClients] = useState<QuickClient[]>([]);
  const [products, setProducts] = useState<QuickProduct[]>([]);
  const [newClientName, setNewClientName] = useState('');
  const [newClientBudget, setNewClientBudget] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [newProductBrand, setNewProductBrand] = useState('');

  // Result
  const [createdOrgId, setCreatedOrgId] = useState<string | null>(null);
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);
  const [createdUserEmail, setCreatedUserEmail] = useState('');

  const resetForm = () => {
    setStep(1);
    setOrgName(''); setOrgSlug(''); setOrgEmail(''); setOrgPhone('');
    setOrgNip(''); setOrgAddress(''); setOrgNote('');
    setUserFirstName(''); setUserLastName(''); setUserEmail(''); setUserPassword('');
    setClients([]); setProducts([]);
    setNewClientName(''); setNewClientBudget(''); setNewProductName(''); setNewProductBrand('');
    setCreatedOrgId(null); setCreatedUserId(null); setCreatedUserEmail('');
  };

  const handleCreateOrg = async () => {
    if (!orgName.trim()) return;
    setLoading(true);
    try {
      const slug = orgSlug.trim() || orgName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
      const { data, error } = await supabase.from('organizations').insert({
        name: orgName.trim(), slug, created_by: user!.id, status: 'configuring',
        email: orgEmail || null, phone: orgPhone || null, nip: orgNip || null,
        address: orgAddress || null, internal_note: orgNote || null, onboarding_completed: false,
      } as any).select().single();
      if (error) throw error;
      setCreatedOrgId(data.id);
      setStep(2);
    } catch (err: any) {
      toast({ title: 'Błąd', description: err.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const handleCreateUser = async () => {
    if (!userEmail.trim() || !userPassword.trim() || !createdOrgId) return;
    setLoading(true);
    try {
      const res = await supabase.functions.invoke('create-org-user', {
        body: {
          email: userEmail.trim(), password: userPassword,
          first_name: userFirstName.trim(), last_name: userLastName.trim(),
          organization_id: createdOrgId, org_role: 'org_admin',
        },
      });
      if (res.error) throw new Error(res.error.message || 'Błąd tworzenia użytkownika');
      if (res.data?.error) throw new Error(res.data.error);
      setCreatedUserId(res.data?.user_id || null);
      setCreatedUserEmail(userEmail.trim());
      setStep(3);
      qc.invalidateQueries({ queryKey: ['organizations'] });
      qc.invalidateQueries({ queryKey: ['global_profiles'] });
    } catch (err: any) {
      toast({ title: 'Błąd', description: err.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const addClient = () => {
    if (!newClientName.trim()) return;
    setClients(prev => [...prev, { name: newClientName.trim(), budget: newClientBudget || '0' }]);
    setNewClientName(''); setNewClientBudget('');
  };

  const addProduct = () => {
    if (!newProductName.trim()) return;
    setProducts(prev => [...prev, { name: newProductName.trim(), brand: newProductBrand.trim() }]);
    setNewProductName(''); setNewProductBrand('');
  };

  const handleSaveStep3 = async () => {
    if (!createdOrgId || !createdUserId) return;
    setLoading(true);
    try {
      // Create clients
      for (const c of clients) {
        const { data: clientData, error: clientErr } = await supabase.from('clients').insert({
          name: c.name, annual_budget: Number(c.budget) || 0, user_id: createdUserId,
        } as any).select().single();
        if (clientErr) throw clientErr;
        // Link to org
        await supabase.from('organization_clients').insert({
          organization_id: createdOrgId, client_id: clientData.id,
        } as any);
      }
      // Create products
      for (const p of products) {
        await supabase.from('products').insert({
          name: p.name, brand: p.brand || null, user_id: createdUserId, organization_id: createdOrgId,
        } as any);
      }
      setStep(4);
    } catch (err: any) {
      toast({ title: 'Błąd', description: err.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const handleClose = () => { resetForm(); onOpenChange(false); };

  const totalSteps = 4;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 1 && <><Building2 className="h-5 w-5" /> Krok 1: Dane firmy</>}
            {step === 2 && <><User className="h-5 w-5" /> Krok 2: Pierwszy administrator</>}
            {step === 3 && <><Package className="h-5 w-5" /> Krok 3: Klienci i produkty</>}
            {step === 4 && <><CheckCircle2 className="h-5 w-5 text-primary" /> Podsumowanie</>}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 pb-2">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map(s => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Nazwa firmy *</Label>
              <Input value={orgName} onChange={e => { setOrgName(e.target.value); setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-')); }} placeholder="Nazwa firmy" />
            </div>
            <div>
              <Label>Slug (URL)</Label>
              <Input value={orgSlug} onChange={e => setOrgSlug(e.target.value)} placeholder="nazwa-firmy" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>E-mail</Label><Input value={orgEmail} onChange={e => setOrgEmail(e.target.value)} placeholder="firma@email.pl" type="email" /></div>
              <div><Label>Telefon</Label><Input value={orgPhone} onChange={e => setOrgPhone(e.target.value)} placeholder="+48..." /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>NIP</Label><Input value={orgNip} onChange={e => setOrgNip(e.target.value)} placeholder="Opcjonalnie" /></div>
              <div><Label>Adres</Label><Input value={orgAddress} onChange={e => setOrgAddress(e.target.value)} placeholder="Opcjonalnie" /></div>
            </div>
            <div>
              <Label>Notatka wewnętrzna</Label>
              <Textarea value={orgNote} onChange={e => setOrgNote(e.target.value)} placeholder="Notatki widoczne tylko dla Super Admina" rows={2} />
            </div>
            <Button onClick={handleCreateOrg} disabled={loading || !orgName.trim()} className="w-full gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Utwórz firmę i przejdź dalej
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Utwórz pierwszego administratora firmy <strong>{orgName}</strong>.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Imię *</Label><Input value={userFirstName} onChange={e => setUserFirstName(e.target.value)} placeholder="Jan" /></div>
              <div><Label>Nazwisko *</Label><Input value={userLastName} onChange={e => setUserLastName(e.target.value)} placeholder="Kowalski" /></div>
            </div>
            <div><Label>E-mail *</Label><Input value={userEmail} onChange={e => setUserEmail(e.target.value)} placeholder="admin@firma.pl" type="email" /></div>
            <div><Label>Hasło *</Label><Input value={userPassword} onChange={e => setUserPassword(e.target.value)} placeholder="Min. 6 znaków" type="password" /></div>
            <Badge variant="outline">Rola: Admin Firmy</Badge>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-1"><ArrowLeft className="h-4 w-4" /> Wróć</Button>
              <Button onClick={handleCreateUser} disabled={loading || !userEmail.trim() || !userPassword.trim() || !userFirstName.trim() || !userLastName.trim()} className="flex-1 gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Utwórz administratora
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Opcjonalnie dodaj pierwszych klientów i produkty dla firmy <strong>{orgName}</strong>.</p>

            {/* Clients */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Klienci</Label>
              {clients.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-sm bg-muted/50 rounded px-3 py-1.5">
                  <span className="flex-1">{c.name}</span>
                  <span className="text-muted-foreground">{c.budget} PLN</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setClients(prev => prev.filter((_, j) => j !== i))}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input placeholder="Nazwa klienta" value={newClientName} onChange={e => setNewClientName(e.target.value)} className="flex-1" />
                <Input placeholder="Budżet" value={newClientBudget} onChange={e => setNewClientBudget(e.target.value)} className="w-28" type="number" />
                <Button variant="outline" size="sm" onClick={addClient} disabled={!newClientName.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Products */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Produkty</Label>
              {products.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-sm bg-muted/50 rounded px-3 py-1.5">
                  <span className="flex-1">{p.name}</span>
                  {p.brand && <span className="text-muted-foreground">{p.brand}</span>}
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setProducts(prev => prev.filter((_, j) => j !== i))}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input placeholder="Nazwa produktu" value={newProductName} onChange={e => setNewProductName(e.target.value)} className="flex-1" />
                <Input placeholder="Marka" value={newProductBrand} onChange={e => setNewProductBrand(e.target.value)} className="w-28" />
                <Button variant="outline" size="sm" onClick={addProduct} disabled={!newProductName.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setStep(4); }} className="gap-1">Pomiń</Button>
              <Button onClick={handleSaveStep3} disabled={loading || (clients.length === 0 && products.length === 0)} className="flex-1 gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Zapisz i przejdź dalej
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 text-center py-4">
            <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Firma utworzona!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Firma <strong>{orgName}</strong> została utworzona z administratorem <strong>{createdUserEmail}</strong>.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Firma:</span><span className="font-medium">{orgName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Admin:</span><span className="font-medium">{createdUserEmail}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Klienci:</span><span className="font-medium">{clients.length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Produkty:</span><span className="font-medium">{products.length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status:</span><Badge variant="secondary">W konfiguracji</Badge></div>
            </div>
            <Button onClick={handleClose} className="w-full">Zamknij</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
