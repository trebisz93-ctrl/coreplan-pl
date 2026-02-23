import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useProfiles, useUserRoles, useMyRole, useSetUserRole, useClients } from '@/hooks/useData';
import { usePendingProfiles, useApproveUser } from '@/hooks/useProfileStatus';
import { useClientAssignments, useSetClientAssignments } from '@/hooks/useClientAssignments';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Mail, Shield, Users, CheckCircle, XCircle, Clock, Building2 } from 'lucide-react';
import { MfaSetup } from './MfaSetup';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';

const roleLabels: Record<string, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  user: 'Użytkownik',
  viewer: 'Viewer (tylko podgląd)',
};

export const SettingsView = () => {
  const { user } = useAuth();
  const { data: myRole } = useMyRole();
  const { data: profiles = [] } = useProfiles();
  const { data: roles = [] } = useUserRoles();
  const { data: clients = [] } = useClients();
  const { data: pendingProfiles = [] } = usePendingProfiles();
  const { data: allAssignments = [] } = useClientAssignments();
  const setUserRole = useSetUserRole();
  const approveUser = useApproveUser();
  const setClientAssignments = useSetClientAssignments();

  const isAdmin = myRole === 'admin';

  // Approval dialog state
  const [approvalDialog, setApprovalDialog] = useState<{ userId: string; displayName: string } | null>(null);
  const [approvalRole, setApprovalRole] = useState<'manager' | 'user' | 'viewer'>('user');
  const [approvalClients, setApprovalClients] = useState<string[]>([]);

  const handleRoleChange = async (userId: string, role: 'admin' | 'manager' | 'user' | 'viewer') => {
    try {
      await setUserRole.mutateAsync({ userId, role: role as any });
      toast.success('Rola zaktualizowana');
    } catch (e: any) { toast.error('Nie udało się zmienić roli: ' + (e.message || 'Nieznany błąd')); }
  };

  const getUserRole = (userId: string) => roles.find(r => r.user_id === userId)?.role ?? 'user';
  const getUserAssignments = (userId: string) => allAssignments.filter(a => a.user_id === userId);

  const openApproval = (userId: string, displayName: string) => {
    setApprovalDialog({ userId, displayName });
    setApprovalRole('user');
    setApprovalClients([]);
  };

  const handleApprove = async () => {
    if (!approvalDialog) return;
    try {
      await setUserRole.mutateAsync({ userId: approvalDialog.userId, role: approvalRole as any });
      if (approvalClients.length > 0) {
        await setClientAssignments.mutateAsync({ userId: approvalDialog.userId, clientIds: approvalClients });
      }
      await approveUser.mutateAsync({ userId: approvalDialog.userId, status: 'active' });
      toast.success('Użytkownik zatwierdzony');
      setApprovalDialog(null);
    } catch (e: any) { toast.error('Błąd: ' + (e.message || 'Nieznany błąd')); }
  };

  const handleReject = async (userId: string) => {
    try {
      await approveUser.mutateAsync({ userId, status: 'rejected' });
      toast.success('Użytkownik odrzucony');
    } catch (e: any) { toast.error('Błąd: ' + (e.message || 'Nieznany błąd')); }
  };

  const handleSaveAssignments = async (userId: string, clientIds: string[]) => {
    try {
      await setClientAssignments.mutateAsync({ userId, clientIds });
      toast.success('Przypisania klientów zaktualizowane');
    } catch (e: any) { toast.error('Błąd: ' + (e.message || 'Nieznany błąd')); }
  };

  // Client assignment editor state per user
  const [editingAssignments, setEditingAssignments] = useState<string | null>(null);
  const [tempAssignments, setTempAssignments] = useState<string[]>([]);

  return (
    <div className="space-y-6 max-w-3xl">
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

      {/* Pending approvals */}
      {isAdmin && pendingProfiles.length > 0 && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-primary" /> Konta oczekujące na zatwierdzenie
              <Badge variant="destructive" className="ml-2">{pendingProfiles.length}</Badge>
            </CardTitle>
            <CardDescription>Nowi użytkownicy czekają na zatwierdzenie</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingProfiles.map((profile: any) => (
                <div key={profile.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{profile.display_name || 'Bez nazwy'}</p>
                      <p className="text-xs text-muted-foreground">
                        Zarejestrowany: {new Date(profile.created_at).toLocaleDateString('pl-PL')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => openApproval(profile.user_id, profile.display_name || 'Bez nazwy')}
                      className="gap-1"
                    >
                      <CheckCircle className="h-3 w-3" /> Zatwierdź
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(profile.user_id)}
                      className="gap-1"
                    >
                      <XCircle className="h-3 w-3" /> Odrzuć
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* User management */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" /> Zarządzanie użytkownikami
            </CardTitle>
            <CardDescription>Zarządzaj kontami, rolami i przypisaniami klientów</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {profiles.filter((p: any) => p.status === 'active').map((profile: any) => {
                const role = getUserRole(profile.user_id);
                const isSelf = profile.user_id === user?.id;
                const assignments = getUserAssignments(profile.user_id);
                const isEditingThis = editingAssignments === profile.user_id;

                return (
                  <div key={profile.id} className="py-3 border-b border-border last:border-0 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{profile.display_name || 'Bez nazwy'}</p>
                          <p className="text-xs text-muted-foreground">{profile.user_id.slice(0, 8)}...</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isSelf && <Badge variant="outline" className="text-xs">Ty</Badge>}
                        <Select
                          value={role}
                          onValueChange={v => handleRoleChange(profile.user_id, v as any)}
                          disabled={isSelf}
                        >
                          <SelectTrigger className="w-44 h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrator</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="user">Użytkownik</SelectItem>
                            <SelectItem value="viewer">Viewer (tylko podgląd)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Client assignments (for non-admin users) */}
                    {role !== 'admin' && (
                      <div className="pl-11">
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Przypisani klienci:</span>
                          {!isEditingThis && (
                            <button
                              onClick={() => {
                                setEditingAssignments(profile.user_id);
                                setTempAssignments(assignments.map(a => a.client_id));
                              }}
                              className="text-xs text-primary hover:underline"
                            >
                              Zmień
                            </button>
                          )}
                        </div>
                        {isEditingThis ? (
                          <div className="space-y-2">
                            <div className="space-y-1 max-h-32 overflow-y-auto border border-border rounded-lg p-2">
                              {clients.map(c => (
                                <label key={c.id} className="flex items-center gap-2 text-xs cursor-pointer">
                                  <Checkbox
                                    checked={tempAssignments.includes(c.id)}
                                    onCheckedChange={checked => {
                                      setTempAssignments(prev =>
                                        checked ? [...prev, c.id] : prev.filter(x => x !== c.id)
                                      );
                                    }}
                                  />
                                  <span>{c.name}</span>
                                </label>
                              ))}
                            </div>
                            <div className="flex gap-1">
                              <Button size="sm" onClick={() => {
                                handleSaveAssignments(profile.user_id, tempAssignments);
                                setEditingAssignments(null);
                              }}>Zapisz</Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingAssignments(null)}>Anuluj</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {assignments.length === 0 ? (
                              <span className="text-xs text-muted-foreground italic">Wszyscy klienci (brak ograniczeń)</span>
                            ) : (
                              assignments.map(a => {
                                const client = clients.find(c => c.id === a.client_id);
                                return client ? (
                                  <Badge key={a.id} variant="secondary" className="text-xs">{client.name}</Badge>
                                ) : null;
                              })
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {profiles.filter((p: any) => p.status === 'active').length === 0 && (
                <p className="text-sm text-muted-foreground">Brak aktywnych użytkowników.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approval dialog */}
      <Dialog open={!!approvalDialog} onOpenChange={open => !open && setApprovalDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Zatwierdź użytkownika: {approvalDialog?.displayName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Rola</label>
              <Select value={approvalRole} onValueChange={v => setApprovalRole(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="user">Użytkownik</SelectItem>
                  <SelectItem value="viewer">Viewer (tylko podgląd)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Przypisz klientów</label>
              <div className="space-y-1 mt-1 max-h-40 overflow-y-auto border border-border rounded-lg p-2">
                {clients.map(c => (
                  <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={approvalClients.includes(c.id)}
                      onCheckedChange={checked => {
                        setApprovalClients(prev =>
                          checked ? [...prev, c.id] : prev.filter(x => x !== c.id)
                        );
                      }}
                    />
                    <span>{c.name}</span>
                  </label>
                ))}
                {clients.length === 0 && <p className="text-xs text-muted-foreground">Brak klientów</p>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialog(null)}>Anuluj</Button>
            <Button onClick={handleApprove} disabled={approveUser.isPending}>
              {approveUser.isPending ? 'Zatwierdzanie...' : 'Zatwierdź i aktywuj'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
};
