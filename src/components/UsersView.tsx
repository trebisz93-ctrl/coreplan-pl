import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useProfiles, useUserRoles, useSetUserRole, useClients } from '@/hooks/useData';
import { usePendingProfiles, useApproveUser } from '@/hooks/useProfileStatus';
import { useClientAssignments, useSetClientAssignments } from '@/hooks/useClientAssignments';
import { useIsAdmin } from '@/hooks/useRole';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { User, CheckCircle, XCircle, Clock, Building2, Search, UserX, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const roleLabels: Record<string, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  user: 'Użytkownik',
  viewer: 'Viewer',
};

const jobRoleLabels: Record<string, string> = {
  kam: 'KAM',
  marketing: 'Marketing',
  admin: 'Admin',
  other: 'Inne',
};

export const UsersView = () => {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const { data: profiles = [] } = useProfiles();
  const { data: roles = [] } = useUserRoles();
  const { data: clients = [] } = useClients();
  const { data: pendingProfiles = [] } = usePendingProfiles();
  const { data: allAssignments = [] } = useClientAssignments();
  const setUserRole = useSetUserRole();
  const approveUser = useApproveUser();
  const setClientAssignments = useSetClientAssignments();
  const qc = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [approvalDialog, setApprovalDialog] = useState<{ userId: string; displayName: string } | null>(null);
  const [approvalRole, setApprovalRole] = useState<'manager' | 'user' | 'viewer'>('user');
  const [approvalClients, setApprovalClients] = useState<string[]>([]);
  const [editingAssignments, setEditingAssignments] = useState<string | null>(null);
  const [tempAssignments, setTempAssignments] = useState<string[]>([]);

  if (!isAdmin) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <Shield className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p>Brak uprawnień do zarządzania użytkownikami.</p>
      </div>
    );
  }

  const getUserRole = (userId: string) => roles.find(r => r.user_id === userId)?.role ?? 'user';
  const getUserAssignments = (userId: string) => allAssignments.filter(a => a.user_id === userId);

  const activeProfiles = profiles.filter((p: any) => p.status === 'active');
  const deactivatedProfiles = profiles.filter((p: any) => p.status === 'deactivated');

  const filteredActive = activeProfiles.filter((p: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (p.display_name?.toLowerCase().includes(q) ||
      p.first_name?.toLowerCase().includes(q) ||
      p.last_name?.toLowerCase().includes(q) ||
      p.user_id.includes(q));
  });

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await setUserRole.mutateAsync({ userId, role: role as any });
      toast.success('Rola zaktualizowana');
    } catch (e: any) { toast.error('Błąd: ' + e.message); }
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
    } catch (e: any) { toast.error('Błąd: ' + e.message); }
  };

  const handleReject = async (userId: string) => {
    try {
      await approveUser.mutateAsync({ userId, status: 'rejected' });
      toast.success('Użytkownik odrzucony');
    } catch (e: any) { toast.error('Błąd: ' + e.message); }
  };

  const handleDeactivate = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'deactivated' } as any)
        .eq('user_id', userId);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Użytkownik zdezaktywowany');
    } catch (e: any) { toast.error('Błąd: ' + e.message); }
  };

  const handleReactivate = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'active' } as any)
        .eq('user_id', userId);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Użytkownik reaktywowany');
    } catch (e: any) { toast.error('Błąd: ' + e.message); }
  };

  const handleSaveAssignments = async (userId: string, clientIds: string[]) => {
    try {
      await setClientAssignments.mutateAsync({ userId, clientIds });
      toast.success('Przypisania zaktualizowane');
    } catch (e: any) { toast.error('Błąd: ' + e.message); }
  };

  const renderUserRow = (profile: any, showDeactivate = true) => {
    const role = getUserRole(profile.user_id);
    const isSelf = profile.user_id === user?.id;
    const assignments = getUserAssignments(profile.user_id);
    const isEditing = editingAssignments === profile.user_id;

    return (
      <div key={profile.id} className="py-4 border-b border-border last:border-0 space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">
                  {profile.first_name && profile.last_name
                    ? `${profile.first_name} ${profile.last_name}`
                    : profile.display_name || 'Bez nazwy'}
                </p>
                {isSelf && <Badge variant="outline" className="text-[10px] shrink-0">Ty</Badge>}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {profile.job_role && <span>{jobRoleLabels[profile.job_role] || profile.job_role}</span>}
                <span>•</span>
                <span>{profile.display_name || profile.user_id.slice(0, 8)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Select
              value={role}
              onValueChange={v => handleRoleChange(profile.user_id, v)}
              disabled={isSelf}
            >
              <SelectTrigger className="w-40 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrator</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="user">Użytkownik</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            {showDeactivate && !isSelf && (
              <Button size="sm" variant="ghost" onClick={() => handleDeactivate(profile.user_id)} className="text-destructive hover:text-destructive">
                <UserX className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {role !== 'admin' && (
          <div className="pl-12">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Klienci:</span>
              {!isEditing && (
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
            {isEditing ? (
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
                  <Button size="sm" onClick={() => { handleSaveAssignments(profile.user_id, tempAssignments); setEditingAssignments(null); }}>Zapisz</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingAssignments(null)}>Anuluj</Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {assignments.length === 0 ? (
                  <span className="text-xs text-muted-foreground italic">Wszyscy klienci</span>
                ) : (
                  assignments.map(a => {
                    const client = clients.find(c => c.id === a.client_id);
                    return client ? <Badge key={a.id} variant="secondary" className="text-xs">{client.name}</Badge> : null;
                  })
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold">Użytkownicy</h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj użytkowników..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 w-64"
          />
        </div>
      </div>

      {/* Pending approvals */}
      {pendingProfiles.length > 0 && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-primary" /> Oczekujące na zatwierdzenie
              <Badge variant="destructive" className="ml-2">{pendingProfiles.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingProfiles.map((profile: any) => (
              <div key={profile.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {profile.first_name && profile.last_name
                        ? `${profile.first_name} ${profile.last_name}`
                        : profile.display_name || 'Bez nazwy'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(profile.created_at).toLocaleDateString('pl-PL')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => {
                    setApprovalDialog({ userId: profile.user_id, displayName: profile.display_name || 'Bez nazwy' });
                    setApprovalRole('user');
                    setApprovalClients([]);
                  }} className="gap-1">
                    <CheckCircle className="h-3 w-3" /> Zatwierdź
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleReject(profile.user_id)} className="gap-1">
                    <XCircle className="h-3 w-3" /> Odrzuć
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Active users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Aktywni użytkownicy
            <Badge variant="secondary">{filteredActive.length}</Badge>
          </CardTitle>
          <CardDescription>Zarządzaj rolami, przypisaniami klientów i dostępem</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredActive.length === 0 ? (
            <p className="text-sm text-muted-foreground">Brak użytkowników.</p>
          ) : (
            filteredActive.map((p: any) => renderUserRow(p))
          )}
        </CardContent>
      </Card>

      {/* Deactivated users */}
      {deactivatedProfiles.length > 0 && (
        <Card className="opacity-75">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-muted-foreground">
              <UserX className="h-4 w-4" /> Zdezaktywowani
              <Badge variant="outline">{deactivatedProfiles.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deactivatedProfiles.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : p.display_name || 'Bez nazwy'}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleReactivate(p.user_id)}>
                  Reaktywuj
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Approval dialog */}
      <Dialog open={!!approvalDialog} onOpenChange={open => !open && setApprovalDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Zatwierdź: {approvalDialog?.displayName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Rola</label>
              <Select value={approvalRole} onValueChange={v => setApprovalRole(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="user">Użytkownik</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
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
                        setApprovalClients(prev => checked ? [...prev, c.id] : prev.filter(x => x !== c.id));
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
    </div>
  );
};
