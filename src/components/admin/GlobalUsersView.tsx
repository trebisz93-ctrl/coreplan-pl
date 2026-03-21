import { useGlobalProfiles } from '@/hooks/useSuperAdmin';
import { useUserRoles } from '@/hooks/useData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export const GlobalUsersView = () => {
  const { data: profiles = [], isLoading } = useGlobalProfiles();
  const { data: roles = [] } = useUserRoles();
  const { user } = useAuth();
  const { impersonateUser } = useOrganization();
  const qc = useQueryClient();
  const { toast } = useToast();

  const activeProfiles = profiles.filter((p: any) => !p.deleted_at);

  const getRole = (userId: string) => {
    const r = roles.find((r: any) => r.user_id === userId);
    return r?.role || 'user';
  };

  const statusVariant = (s: string) => {
    if (s === 'approved' || s === 'active') return 'default' as const;
    if (s === 'pending' || s === 'invited') return 'secondary' as const;
    if (s === 'blocked') return 'destructive' as const;
    return 'outline' as const;
  };

  const softDeleteUser = async (profile: any) => {
    try {
      const now = new Date().toISOString();
      const purgeAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();

      await supabase.from('profiles').update({
        deleted_at: now,
        deleted_by: user!.id,
        purge_at: purgeAt,
        status: 'deleted',
      } as any).eq('user_id', profile.user_id);

      await supabase.from('trash_registry').insert({
        record_type: 'user',
        record_id: profile.user_id,
        record_name: profile.display_name || profile.first_name || 'Nieznany',
        deleted_by: user!.id,
        organization_id: profile.organization_id,
      } as any);

      toast({ title: 'Przeniesiono do kosza', description: `Użytkownik został przeniesiony do kosza.` });
      qc.invalidateQueries({ queryKey: ['global_profiles'] });
    } catch (err: any) {
      toast({ title: 'Błąd', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Użytkownicy globalni</h1>
        <p className="text-muted-foreground">Wszyscy użytkownicy w systemie CorePlan.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista użytkowników ({activeProfiles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nazwa</TableHead>
                  <TableHead>Imię</TableHead>
                  <TableHead>Nazwisko</TableHead>
                  <TableHead>Rola</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dołączył</TableHead>
                  <TableHead className="text-right">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeProfiles.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.display_name || '—'}</TableCell>
                    <TableCell>{p.first_name || '—'}</TableCell>
                    <TableCell>{p.last_name || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getRole(p.user_id)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString('pl-PL')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {getRole(p.user_id) !== 'super_admin' && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => impersonateUser(p.user_id, p.display_name || p.first_name || 'Użytkownik')} className="h-8 w-8 p-0">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Usuń użytkownika</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Użytkownik „{p.display_name || p.first_name}" zostanie przeniesiony do kosza na 180 dni.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => softDeleteUser(p)} className="bg-destructive text-destructive-foreground">
                                    Przenieś do kosza
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
