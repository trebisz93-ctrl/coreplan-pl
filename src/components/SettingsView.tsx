import { useState, forwardRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useMyRole } from '@/hooks/useData';
import { useCampaignTypes, useCreateCampaignType, useUpdateCampaignType, useDeleteCampaignType } from '@/hooks/useCampaignTypes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, Mail, Shield, Plus, Pencil, Trash2, Check, X, Tag } from 'lucide-react';
import { MfaSetup } from './MfaSetup';
import { toast } from 'sonner';
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
  const { data: myRole } = useMyRole();
  const isAdmin = myRole === 'admin';

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
              <Badge variant={isAdmin ? 'default' : 'secondary'}>{roleLabels[myRole || 'user'] || myRole}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <MfaSetup />

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
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleUpdateCT(ct.id)}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingCT(null)}>
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
                          <Button size="icon" variant="ghost" className="h-7 w-7"
                            onClick={() => { setEditingCT(ct.id); setEditCTName(ct.name); setEditCTLabel(ct.label); }}>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aplikacja</CardTitle>
          <CardDescription>Informacje o aplikacji</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>MediaPlan CRM v1.0</p>
          <p>© 2026 MediaPlan CRM. Wszelkie prawa zastrzeżone.</p>
        </CardContent>
      </Card>
    </div>
  );
});
SettingsView.displayName = 'SettingsView';
