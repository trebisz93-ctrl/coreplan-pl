import { useState } from 'react';
import { useGlobalProfiles, useOrganizations } from '@/hooks/useSuperAdmin';
import { useUserRoles } from '@/hooks/useData';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Pencil } from 'lucide-react';

const ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'org_admin', label: 'Admin Firmy' },
  { value: 'manager', label: 'Manager' },
  { value: 'user', label: 'Użytkownik' },
  { value: 'viewer', label: 'Viewer' },
];

export const RolesManagementView = () => {
  const { data: profiles = [] } = useGlobalProfiles();
  const { data: roles = [] } = useUserRoles();
  const { data: orgs = [] } = useOrganizations();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editUser, setEditUser] = useState<any>(null);
  const [newRole, setNewRole] = useState('');
  const [saving, setSaving] = useState(false);

  const activeProfiles = profiles.filter((p: any) => !p.deleted_at);

  const getRole = (userId: string) => {
    const r = roles.find((r: any) => r.user_id === userId);
    return r?.role || 'user';
  };

  const getOrgName = (orgId: string | null) => {
    if (!orgId) return '—';
    const org = orgs.find(o => o.id === orgId);
    return org?.name || '—';
  };

  const openEdit = (profile: any) => {
    setEditUser(profile);
    setNewRole(getRole(profile.user_id));
  };

  const handleSaveRole = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      const existingRole = roles.find((r: any) => r.user_id === editUser.user_id);
      if (existingRole) {
        await supabase.from('user_roles').update({ role: newRole } as any).eq('user_id', editUser.user_id);
      } else {
        await supabase.from('user_roles').insert({ user_id: editUser.user_id, role: newRole } as any);
      }

      // Also update org_role if user is in an org
      if (editUser.organization_id && newRole !== 'super_admin') {
        await supabase.from('organization_members')
          .update({ org_role: newRole } as any)
          .eq('user_id', editUser.user_id)
          .eq('organization_id', editUser.organization_id);
      }

      toast({ title: 'Zapisano', description: `Rola zmieniona na: ${newRole}` });
      setEditUser(null);
      qc.invalidateQueries({ queryKey: ['user_roles'] });
    } catch (err: any) {
      toast({ title: 'Błąd', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const roleVariant = (role: string) => {
    if (role === 'super_admin') return 'default' as const;
    if (role === 'org_admin') return 'secondary' as const;
    return 'outline' as const;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Role i uprawnienia</h1>
        <p className="text-muted-foreground">Zarządzaj rolami użytkowników w systemie.</p>
      </div>

      {/* Role summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {ROLES.map(r => {
          const count = roles.filter((ur: any) => ur.role === r.value).length;
          return (
            <Card key={r.value}>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold">{count}</div>
                <p className="text-xs text-muted-foreground mt-1">{r.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editUser} onOpenChange={v => { if (!v) setEditUser(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Zmień rolę użytkownika</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Użytkownik:</p>
              <p className="font-medium">{editUser?.display_name || editUser?.first_name || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Nowa rola:</p>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
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
        <CardHeader><CardTitle>Użytkownicy i role</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nazwa</TableHead>
                <TableHead>Firma</TableHead>
                <TableHead>Rola globalna</TableHead>
                <TableHead className="text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeProfiles.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.display_name || p.first_name || '—'}</TableCell>
                  <TableCell className="text-sm">{getOrgName(p.organization_id)}</TableCell>
                  <TableCell><Badge variant={roleVariant(getRole(p.user_id))}>{getRole(p.user_id)}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(p)} className="gap-1">
                      <Pencil className="h-3 w-3" /> Zmień rolę
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
