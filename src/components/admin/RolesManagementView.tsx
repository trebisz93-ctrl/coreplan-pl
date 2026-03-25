import { useState } from 'react';
import { useGlobalProfiles, useOrganizations } from '@/hooks/useSuperAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Building2, Filter } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const ORG_ROLES = [
  { value: 'org_admin', label: 'Admin Firmy' },
  { value: 'manager', label: 'Manager' },
  { value: 'user', label: 'Użytkownik' },
  { value: 'viewer', label: 'Viewer' },
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

  // Fetch all organization_members for the roles view
  const { data: allMembers = [] } = useQuery({
    queryKey: ['all_org_members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_members')
        .select('*');
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  // Fetch super_admins from user_roles
  const { data: superAdmins = [] } = useQuery({
    queryKey: ['super_admin_roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('role', 'super_admin');
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const activeProfiles = profiles.filter((p: any) => !p.deleted_at);
  const superAdminIds = new Set(superAdmins.map((r: any) => r.user_id));

  const getOrgName = (orgId: string) => {
    const org = orgs.find(o => o.id === orgId);
    return org?.name || '—';
  };

  const getProfileName = (userId: string) => {
    const p = activeProfiles.find((p: any) => p.user_id === userId);
    return p?.display_name || p?.first_name || '—';
  };

  // Build rows: one row per membership (user + org + role)
  const membershipRows = allMembers.map((m: any) => ({
    ...m,
    profileName: getProfileName(m.user_id),
    orgName: getOrgName(m.organization_id),
    isSuperAdmin: superAdminIds.has(m.user_id),
  })).filter(r => filterOrgId === 'all' || r.organization_id === filterOrgId);

  // Role summary per org
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

  const roleVariant = (role: string) => {
    if (role === 'org_admin') return 'default' as const;
    if (role === 'manager') return 'secondary' as const;
    return 'outline' as const;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Role i uprawnienia</h1>
        <p className="text-muted-foreground">Zarządzaj rolami użytkowników per firma. Role są przypisane w kontekście konkretnej organizacji.</p>
      </div>

      {/* Role summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {roleCounts.map(r => (
          <Card key={r.value}>
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold">{r.count}</div>
              <p className="text-xs text-muted-foreground mt-1">{r.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Super Admins section */}
      {superAdmins.length > 0 && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              🛡️ Super Adminowie <Badge variant="default">{superAdmins.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {superAdmins.map((sa: any) => (
                <Badge key={sa.user_id} variant="default" className="text-sm py-1">
                  {getProfileName(sa.user_id)}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Rola super_admin jest globalna — nie zależy od firmy.</p>
          </CardContent>
        </Card>
      )}

      {/* Filter by org */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filterOrgId} onValueChange={setFilterOrgId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Wszystkie firmy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie firmy</SelectItem>
            {orgs.map(o => (
              <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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

      <Card>
        <CardHeader><CardTitle>Role użytkowników per firma</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Użytkownik</TableHead>
                <TableHead>Firma</TableHead>
                <TableHead>Rola w firmie</TableHead>
                <TableHead className="text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {membershipRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Brak członków w wybranej firmie
                  </TableCell>
                </TableRow>
              ) : (
                membershipRows.map((m: any) => (
                  <TableRow key={`${m.user_id}-${m.organization_id}`}>
                    <TableCell className="font-medium">
                      {m.profileName}
                      {m.isSuperAdmin && <Badge variant="default" className="ml-2 text-[10px]">SA</Badge>}
                    </TableCell>
                    <TableCell className="text-sm flex items-center gap-1">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      {m.orgName}
                    </TableCell>
                    <TableCell><Badge variant={roleVariant(m.org_role)}>{m.org_role}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(m)} className="gap-1">
                        <Pencil className="h-3 w-3" /> Zmień
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
