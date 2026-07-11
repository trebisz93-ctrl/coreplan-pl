import { useState, forwardRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useIsAdmin, useIsSuperAdminRole } from '@/hooks/useRole';
import { useCampaignTypes, useCreateCampaignType, useUpdateCampaignType, useDeleteCampaignType } from '@/hooks/useCampaignTypes';
import { useAppSetting, useUpdateAppSetting, useDemoRequests, useMarkDemoRead } from '@/hooks/useAppSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, Mail, Shield, Plus, Pencil, Trash2, Check, X, Tag, Settings2, Eye, EyeOff, Building2 } from 'lucide-react';
import { MfaSetup } from './MfaSetup';
import { BackupSection } from './BackupSection';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const roleLabels: Record<string, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  user: 'Użytkownik',
  viewer: 'Viewer (tylko podgląd)',
};

export const SettingsView = forwardRef<HTMLDivElement>((_, ref) => {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const isSuperAdmin = useIsSuperAdminRole();

  // Campaign types
  const { data: campaignTypes = [] } = useCampaignTypes();
  const createCT = useCreateCampaignType();
  const updateCT = useUpdateCampaignType();
  const deleteCT = useDeleteCampaignType();

  const [newCTName, setNewCTName] = useState('');
  const [newCTLabel, setNewCTLabel] = useState('');
  const [editingCT, setEditingCT] = useState<string | null>(null);
  const [editCTName, setEditCTName] = useState('');
  const [editCTLabel, setEditCTLabel] = useState('');

  // Demo email settings (admin only)
  const { data: demoEmail } = useAppSetting('demo_notification_email');
  const updateSetting = useUpdateAppSetting();
  const { data: demoRequests = [] } = useDemoRequests();
  const markRead = useMarkDemoRead();
  const [editDemoEmail, setEditDemoEmail] = useState('');
  const [editingDemoEmail, setEditingDemoEmail] = useState(false);

  const handleTestInsert = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const sessionUserId = sessionData.session?.user?.id;
    const contextUserId = user?.id;
    toast.info(`ctx=${contextUserId ?? 'null'} | session=${sessionUserId ?? 'null'}`);
    if (!sessionUserId) {
      toast.error('Brak aktywnej sesji');
      return;
    }
    const { data, error } = await (supabase as any)
      .from('clients_test')
      .insert({ name: 'test', user_id: sessionUserId })
      .select();
    if (error) {
      toast.error(`clients_test FAIL: ${error.code ?? ''} ${error.message}`);
      console.error('[clients_test] error', error);
    } else {
      toast.success(`clients_test OK: ${JSON.stringify(data)}`);
      console.log('[clients_test] inserted', data);
    }
  };

  const handleCreateCT = async () => {
    if (!newCTName.trim() || !newCTLabel.trim()) { toast.error('Podaj nazwę i etykietę'); return; }
    try {
      await createCT.mutateAsync({ name: newCTName.trim().toLowerCase().replace(/\s+/g, '_'), label: newCTLabel.trim() });
      setNewCTName(''); setNewCTLabel('');
      toast.success('Typ kampanii dodany');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleUpdateCT = async (id: string) => {
    if (!editCTName.trim() || !editCTLabel.trim()) { toast.error('Podaj nazwę i etykietę'); return; }
    try {
      await updateCT.mutateAsync({ id, name: editCTName.trim(), label: editCTLabel.trim() });
      setEditingCT(null);
      toast.success('Typ kampanii zaktualizowany');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDeleteCT = async (id: string) => {
    try {
      await deleteCT.mutateAsync(id);
      toast.success('Typ kampanii usunięty');
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div ref={ref} className="space-y-6 max-w-3xl">
      <h2 className="text-xl font-bold">Ustawienia</h2>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" /> Konto
          </CardTitle>
          <CardDescription>Informacje o Twoim koncie</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">E-mail</p>
              <p className="text-sm text-muted-foreground">{user?.email ?? '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Rola</p>
              <Badge variant={isAdmin ? 'default' : 'secondary'}>{isAdmin ? 'Administrator' : 'Użytkownik'}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <MfaSetup />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">🔬 Diagnostyka RLS (tymczasowe)</CardTitle>
          <CardDescription>Insert do clients_test (WITH CHECK true) z user_id z sesji</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleTestInsert}>
            Test insert do clients_test
          </Button>
        </CardContent>
      </Card>

      {/* Campaign Types CRUD */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Tag className="h-4 w-4" /> Typy kampanii
          </CardTitle>
          <CardDescription>Zarządzaj typami kampanii dostępnymi przy tworzeniu aktywności</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Add new */}
          <div className="flex gap-2 items-end">
            <Input placeholder="Nazwa (klucz)" value={newCTName} onChange={e => setNewCTName(e.target.value)} className="max-w-32" />
            <Input placeholder="Etykieta" value={newCTLabel} onChange={e => setNewCTLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateCT()} className="max-w-48" />
            <Button size="sm" onClick={handleCreateCT} disabled={createCT.isPending} className="gap-1">
              <Plus className="h-3 w-3" /> Dodaj
            </Button>
          </div>

          {/* List */}
          {campaignTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Brak niestandardowych typów kampanii. Domyślne typy (Display, Social Media, itp.) są zawsze dostępne.</p>
          ) : (
            <div className="space-y-1">
              {campaignTypes.map(ct => {
                const isEditing = editingCT === ct.id;
                return (
                  <div key={ct.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    {isEditing ? (
                      <div className="flex gap-2 flex-1">
                        <Input value={editCTName} onChange={e => setEditCTName(e.target.value)} className="h-8 text-sm max-w-32" />
                        <Input value={editCTLabel} onChange={e => setEditCTLabel(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleUpdateCT(ct.id)} className="h-8 text-sm max-w-48" />
                        <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Zapisz typ kampanii" onClick={() => handleUpdateCT(ct.id)}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Anuluj edycję" onClick={() => setEditingCT(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs font-mono">{ct.name}</Badge>
                          <span className="text-sm">{ct.label}</span>
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Edytuj typ kampanii"
                            onClick={() => { setEditingCT(ct.id); setEditCTName(ct.name); setEditCTLabel(ct.label); }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" aria-label="Usuń typ kampanii">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Usunąć typ kampanii?</AlertDialogTitle>
                                <AlertDialogDescription>Usunięcie "{ct.label}" jest nieodwracalne.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteCT(ct.id)}>Usuń</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {isSuperAdmin && <BackupSection />}

      {/* Demo form settings - admin only */}
      {isSuperAdmin && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings2 className="h-4 w-4" /> Formularz demo
              </CardTitle>
              <CardDescription>Konfiguruj adres e-mail na który trafiają zgłoszenia demo z landing page</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">E-mail powiadomień demo</p>
                  {editingDemoEmail ? (
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        value={editDemoEmail}
                        onChange={e => setEditDemoEmail(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            updateSetting.mutate({ key: 'demo_notification_email', value: editDemoEmail }, {
                              onSuccess: () => { setEditingDemoEmail(false); toast.success('Email zaktualizowany'); },
                              onError: (err: any) => toast.error(err.message),
                            });
                          }
                        }}
                        className="h-8 text-sm max-w-xs"
                      />
                      <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Zapisz email" onClick={() => {
                        updateSetting.mutate({ key: 'demo_notification_email', value: editDemoEmail }, {
                          onSuccess: () => { setEditingDemoEmail(false); toast.success('Email zaktualizowany'); },
                          onError: (err: any) => toast.error(err.message),
                        });
                      }}>
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Anuluj edycję emaila" onClick={() => setEditingDemoEmail(false)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">{demoEmail ?? 'admin@coreplan.pl'}</p>
                      <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Edytuj email powiadomień demo" onClick={() => {
                        setEditDemoEmail(demoEmail ?? 'admin@coreplan.pl');
                        setEditingDemoEmail(true);
                      }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" /> Zgłoszenia demo
                {demoRequests.filter(d => !d.is_read).length > 0 && (
                  <Badge variant="default" className="ml-2">{demoRequests.filter(d => !d.is_read).length} nowe</Badge>
                )}
              </CardTitle>
              <CardDescription>Ostatnie zgłoszenia z formularza na stronie głównej</CardDescription>
            </CardHeader>
            <CardContent>
              {demoRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Brak zgłoszeń demo.</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {demoRequests.map(req => (
                    <div key={req.id} className={`flex items-center justify-between py-2 px-3 rounded-lg border ${req.is_read ? 'border-border' : 'border-primary/30 bg-primary/5'}`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{req.name}</span>
                          {req.company && <span className="text-xs text-muted-foreground">• {req.company}</span>}
                          {!req.is_read && <Badge variant="secondary" className="text-xs">Nowe</Badge>}
                        </div>
                        <a href={`mailto:${req.email}`} className="text-xs text-primary hover:underline">{req.email}</a>
                        <p className="text-xs text-muted-foreground">{format(new Date(req.created_at), 'dd.MM.yyyy HH:mm')}</p>
                      </div>
                      {!req.is_read && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" aria-label="Oznacz jako przeczytane" onClick={() => markRead.mutate(req.id)} title="Oznacz jako przeczytane">
                          <Eye className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aplikacja</CardTitle>
          <CardDescription>Informacje o aplikacji</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>CorePlan v1.0</p>
          <p>© 2026 CorePlan. Wszelkie prawa zastrzeżone.</p>
          <div className="flex gap-4 pt-2">
            <a href="/polityka-prywatnosci" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Polityka prywatności
            </a>
            <a href="/regulamin" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Regulamin
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
SettingsView.displayName = 'SettingsView';
