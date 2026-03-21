import { useGlobalProfiles } from '@/hooks/useSuperAdmin';
import { useUserRoles } from '@/hooks/useData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const GlobalUsersView = () => {
  const { data: profiles = [], isLoading } = useGlobalProfiles();
  const { data: roles = [] } = useUserRoles();

  const getRole = (userId: string) => {
    const r = roles.find((r: any) => r.user_id === userId);
    return r?.role || 'user';
  };

  const statusVariant = (s: string) => {
    if (s === 'approved') return 'default' as const;
    if (s === 'pending') return 'secondary' as const;
    return 'destructive' as const;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Użytkownicy globalni</h1>
        <p className="text-muted-foreground">Wszyscy użytkownicy w systemie CorePlan.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista użytkowników ({profiles.length})</CardTitle>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((p: any) => (
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
