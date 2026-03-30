import { useState } from 'react';
import { useGlobalProfiles, useOrganizations } from '@/hooks/useSuperAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Building2, Shield, Users, Eye, UserPlus, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const ORG_ROLES = [
  { value: 'org_admin', label: 'Admin Firmy', icon: Shield, color: 'text-primary' },
  { value: 'manager', label: 'Manager', icon: Users, color: 'text-status-in-progress' },
  { value: 'user', label: 'Użytkownik', icon: UserPlus, color: 'text-status-planned' },
  { value: 'viewer', label: 'Viewer', icon: Eye, color: 'text-muted-foreground' },
];

export const RolesManagementView = () => {
  const { user } = useAuth();
  const { data: profiles = [] } = useGlobalProfiles();
  const { data: orgs = [] } = useOrganizations();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editUser, setEditUser] = useState<any>(null);
  const [editOrgId, setEditOrgId] = useState('');
  const [newRole, setNewRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [filterOrgId, setFilterOrgId] = useState<string>('all');

  const { data: allMembers = [] } = useQuery({
    queryKey: ['all_org_members'],
    queryFn: async () => {
      const { data, error } = await supabase.from('organization_members').select('*');
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const { data: superAdmins = [] } = useQuery({
    queryKey: ['super_admin_roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('*').eq('role', 'super_admin');
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const activeProfiles = profiles.filter((p: any) => !p.deleted_at);
  const superAdminIds = new Set(superAdmins.map((r: any) => r.user_id));

  const getOrgName = (orgId: string) => orgs.find(o => o.id === orgId)?.name || '—';
  const getProfileName = (userId: string) => {
    const p = activeProfiles.find((p: any) => p.user_id === userId);
    return p?.display_name || p?.first_name || '—';
  };
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase();
  };

  const membershipRows = allMembers.map((m: any) => ({
    ...m,
    profileName: getProfileName(m.user_id),
    orgName: getOrgName(m.organization_id),
    isSuperAdmin: superAdminIds.has(m.user_id),
  })).filter(r => filterOrgId === 'all' || r.organization_id === filterOrgId);

  const roleCounts = ORG_ROLES.map(r => ({
    ...r,
    count: allMembers.filter((m: any) => m.org_role === r.value).length,
  }));

  const openEdit = (membership: any) => {
    setEditUser(membership);
    setEditOrgId(membership.organization_id);
    setNewRole(membership.org_role);
  };

  const handleSaveRole = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      await supabase
        .from('organization_members')
        .update({ org_role: newRole } as any)
        .eq('user_id', editUser.user_id)
        .eq('organization_id', editOrgId);
      toast({ title: 'Zapisano', description: `Rola w firmie zmieniona na: ${newRole}` });
      setEditUser(null);
      qc.invalidateQueries({ queryKey: ['all_org_members'] });
    } catch (err: any) {
      toast({ title: 'Błąd', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold text-primary uppercase tracking-wider">Kontekst: System</p>
        <h1 className="text-2xl font-bold mt-1">Role i uprawnienia</h1>
        <p className="text-sm text-muted-foreground">Zarządzaj rolami użytkowników per firma.</p>
      </div>

      {/* Stat cards 2x2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {roleCounts.map(r => {
          const Icon = r.icon;
          return (
            <Card key={r.value} className={cn('card-hover cursor-pointer', r.count > 0 && 'border-primary/20')}>
              <CardContent className="pt-4 pb-4 px-4">
                <div className={cn('h-[30px] w-[30px] rounded-chip flex items-center justify-center mb-2', r.count > 0 ? 'bg-brand-bg' : 'bg-secondary')}>
                  <Icon className={cn('h-4 w-4', r.count > 0 ? r.color : 'text-muted-foreground')} />
                </div>
                {r.count > 0 ? (
                  <div className={cn('text-[26px] font-bold leading-tight', r.value === 'org_admin' ? 'text-primary' : 'text-foreground')}>{r.count}</div>
                ) : (
                  <Button variant="ghost" size="sm" className="text-primary gap-1 px-0 h-auto text-xs font-medium">
                    <Plus className="h-3 w-3" /> Dodaj
                  </Button>
                )}
                <p className="text-xs text-muted-foreground mt-1">{r.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Super Admins card */}
      {superAdmins.length > 0 && (
        <Card className="bg-primary text-primary-foreground border-0 overflow-hidden relative">
          <div className="absolute -right-5 -top-5 w-[100px] h-[100px] rounded-full bg-white/10" />
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" /> Super Adminowie
              <Badge className="bg-white/25 text-white border-0 ml-auto">{superAdmins.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {superAdmins.map((sa: any) => {
                const name = getProfileName(sa.user_id);
                return (
                  <div key={sa.user_id} className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-1.5">
                    <div className="h-[30px] w-[30px] rounded-full bg-white/30 flex items-center justify-center text-xs font-bold">
                      {getInitials(name)}
                    </div>
                    <span className="text-sm font-medium">{name}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-white/65 mt-3">Rola globalna — niezależna od firmy</p>
          </CardContent>
        </Card>
      )}

      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-semibold">Per firma</span>
        <div className="flex-1" />
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterOrgId('all')}
            className={cn(
              'px-3 py-1.5 rounded-chip text-xs font-medium transition-all duration-150',
              filterOrgId === 'all'
                ? 'bg-brand-bg text-primary border border-primary/30'
                : 'bg-secondary text-muted-foreground border border-transparent hover:bg-muted'
            )}
          >
            Wszystkie firmy
          </button>
          {orgs.map(o => (
            <button
              key={o.id}
              onClick={() => setFilterOrgId(o.id)}
              className={cn(
                'px-3 py-1.5 rounded-chip text-xs font-medium transition-all duration-150',
                filterOrgId === o.id
                  ? 'bg-brand-bg text-primary border border-primary/30'
                  : 'bg-secondary text-muted-foreground border border-transparent hover:bg-muted'
              )}
            >
              {o.name}
            </button>
          ))}
        </div>
      </div>

      {/* User list */}
      <Card>
        <CardContent className="p-0">
          {membershipRows.length === 0 ? (
            <div className="text-center text-muted-foreground py-12 px-4">
              <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm">Brak członków w wybranej firmie</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {membershipRows.map((m: any) => (
                <div
                  key={`${m.user_id}-${m.organization_id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[hsl(28,100%,97%)] transition-colors duration-100 cursor-pointer group"
                  onClick={() => openEdit(m)}
                >
                  <div className="h-[38px] w-[38px] rounded-full bg-brand-bg flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {getInitials(m.profileName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate">{m.profileName}</span>
                      {m.isSuperAdmin && <Badge className="text-[9px] px-1.5 py-0 h-4">SA</Badge>}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Building2 className="h-3 w-3" />
                      <span className="truncate">{m.orgName}</span>
                    </div>
                  </div>
                  <Badge className="bg-brand-bg text-primary border-0 text-xs shrink-0">{m.org_role}</Badge>
                  <span className="text-muted-foreground/40 text-sm group-hover:text-muted-foreground transition-colors">›</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editUser} onOpenChange={v => { if (!v) setEditUser(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Zmień rolę w firmie</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Użytkownik:</p>
              <p className="font-medium">{editUser?.profileName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Firma:</p>
              <p className="font-medium flex items-center gap-1">
                <Building2 className="h-3 w-3" /> {getOrgName(editOrgId)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Nowa rola:</p>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ORG_ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSaveRole} disabled={saving} className="w-full">
              {saving ? 'Zapisywanie...' : 'Zapisz rolę'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
