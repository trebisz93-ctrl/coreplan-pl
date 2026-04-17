import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { useProfiles, useClients } from '@/hooks/useData';
import { useOrgMembers, useSetOrgRole } from '@/hooks/useOrgMembers';
import { useClientAssignments, useSetClientAssignments } from '@/hooks/useClientAssignments';
import { useIsAdmin } from '@/hooks/useRole';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { User, Building2, Search, UserX, Shield, Plus, RotateCcw, CheckCircle2, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const roleLabels: Record<string, string> = {
  org_admin: 'Admin firmy',
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
  const { orgId, isSuperAdmin } = useOrganization();
  const isAdmin = useIsAdmin();
  const { data: profiles = [] } = useProfiles();
  const { data: orgMembers = [] } = useOrgMembers();
  const { data: clients = [] } = useClients();
  const { data: allAssignments = [] } = useClientAssignments();
  const setOrgRole = useSetOrgRole();
  const setClientAssignments = useSetClientAssignments();
  const qc = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingAssignments, setEditingAssignments] = useState<string | null>(null);
  const [tempAssignments, setTempAssignments] = useState<string[]>([]);

  // New user creation
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newOrgRole, setNewOrgRole] = useState('user');
  const [creating, setCreating] = useState(false);

  if (!isAdmin) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <Shield className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p>Brak uprawnień do zarządzania użytkownikami.</p>
      </div>
    );
  }

  // Build a map of org_role per user from organization_members
  const getOrgRole = (userId: string) => {
    const member = orgMembers.find(m => m.user_id === userId);
    return member?.org_role || 'user';
  };

  const getUserAssignments = (userId: string) => allAssignments.filter(a => a.user_id === userId);

  // Only show profiles that are members of this org
  const orgMemberUserIds = new Set(orgMembers.map(m => m.user_id));
  const orgProfiles = profiles.filter((p: any) => orgMemberUserIds.has(p.user_id));

  const activeProfiles = orgProfiles.filter((p: any) => p.status === 'active');
  const deactivatedProfiles = orgProfiles.filter((p: any) => p.status === 'deactivated');

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
      await setOrgRole.mutateAsync({ userId, orgRole: role });
      toast.success('Rola zaktualizowana');
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

  const handleResetOnboarding = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: false } as any)
        .eq('user_id', userId);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['profiles'] });
      qc.invalidateQueries({ queryKey: ['my_profile'] });
      toast.success('Onboarding zresetowany — użytkownik uzupełni dane przy następnym logowaniu');
    } catch (e: any) { toast.error('Błąd: ' + e.message); }
  };

  const handleSaveAssignments = async (userId: string, clientIds: string[]) => {
    try {
      await setClientAssignments.mutateAsync({ userId, clientIds });
      toast.success('Przypisania zaktualizowane');
    } catch (e: any) { toast.error('Błąd: ' + e.message); }
  };

  const handleCreateUser = async () => {
    if (!newEmail || !orgId) return;
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-org-member', {
        body: {
          email: newEmail,
          first_name: newFirstName,
          last_name: newLastName,
          organization_id: orgId,
          org_role: newOrgRole,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Zaproszenie wysłane');
      setShowCreateDialog(false);
      setNewEmail('');
      
      setNewFirstName('');
      setNewLastName('');
      setNewOrgRole('user');
      qc.invalidateQueries({ queryKey: ['profiles'] });
      qc.invalidateQueries({ queryKey: ['org_members'] });
    } catch (e: any) {
      toast.error('Błąd: ' + e.message);
    } finally {
      setCreating(false);
    }
  };

  // Available roles for org_admin to assign (cannot assign org_admin unless super_admin)
  const availableRoles = isSuperAdmin
    ? [
        { value: 'org_admin', label: 'Admin firmy' },
        { value: 'manager', label: 'Manager' },
        { value: 'user', label: 'Użytkownik' },
        { value: 'viewer', label: 'Viewer' },
      ]
    : [
        { value: 'manager', label: 'Manager' },
        { value: 'user', label: 'Użytkownik' },
        { value: 'viewer', label: 'Viewer' },
      ];

  const renderUserRow = (profile: any, showDeactivate = true) => {
    const role = getOrgRole(profile.user_id);
    const isSelf = profile.user_id === user?.id;
    const assignments = getUserAssignments(profile.user_id);
    const isEditing = editingAssignments === profile.user_id;
    const canChangeRole = !isSelf && (isSuperAdmin || role !== 'org_admin');

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
                <span>{roleLabels[role] || role}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  {profile.onboarding_completed ? (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <CheckCircle2 className="h-3 w-3" /> Onboarding OK
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1 text-xs">
                      <AlertCircle className="h-3 w-3" /> Wymaga uzupełnienia
                    </Badge>
                  )}
                </TooltipTrigger>
                <TooltipContent>
                  {profile.onboarding_completed
                    ? 'Profil uzupełniony przez użytkownika lub admina'
                    : 'Użytkownik zobaczy okno uzupełnij profil przy najbliższym logowaniu'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {!isSelf && profile.onboarding_completed && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleResetOnboarding(profile.user_id)}
                      className="h-8 w-8 p-0"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Resetuj onboarding</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {canChangeRole ? (
              <Select
                value={role}
                onValueChange={v => handleRoleChange(profile.user_id, v)}
              >
                <SelectTrigger className="w-40 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge variant="secondary" className="text-xs">{roleLabels[role] || role}</Badge>
            )}
            {showDeactivate && !isSelf && (
              <Button size="sm" variant="ghost" onClick={() => handleDeactivate(profile.user_id)} className="text-destructive hover:text-destructive">
                <UserX className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {role !== 'org_admin' && (
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
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj użytkowników..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-1">
            <Plus className="h-4 w-4" /> Dodaj użytkownika
          </Button>
        </div>
      </div>



      {/* Active users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Aktywni użytkownicy
            <Badge variant="secondary">{filteredActive.length}</Badge>
          </CardTitle>
          <CardDescription>Zarządzaj rolami w kontekście Twojej firmy, przypisaniami klientów i dostępem</CardDescription>
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

      {/* Create user dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dodaj nowego użytkownika</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Imię</label>
                <Input value={newFirstName} onChange={e => setNewFirstName(e.target.value)} placeholder="Jan" />
              </div>
              <div>
                <label className="text-sm font-medium">Nazwisko</label>
                <Input value={newLastName} onChange={e => setNewLastName(e.target.value)} placeholder="Kowalski" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="jan@firma.pl" />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground italic">
                Użytkownik otrzyma e-mail z linkiem do ustawienia hasła
              </label>
            </div>
            <div>
              <label className="text-sm font-medium">Rola w firmie</label>
              <Select value={newOrgRole} onValueChange={setNewOrgRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableRoles.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Anuluj</Button>
            <Button onClick={handleCreateUser} disabled={creating || !newEmail}>
              {creating ? 'Wysyłanie...' : 'Wyślij zaproszenie'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
