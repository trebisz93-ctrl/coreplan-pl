import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useOrganizations } from '@/hooks/useSuperAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShoppingCart } from 'lucide-react';

export const GlobalClientsView = () => {
  const { user } = useAuth();
  const { data: orgs = [] } = useOrganizations();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['global_clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: orgClients = [] } = useQuery({
    queryKey: ['all_org_clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_clients')
        .select('*');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const getClientOrgs = (clientId: string) => {
    const links = orgClients.filter((oc: any) => oc.client_id === clientId);
    return links.map((l: any) => {
      const org = orgs.find(o => o.id === l.organization_id);
      return org?.name || l.organization_id.slice(0, 8);
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Klienci globalni</h1>
        <p className="text-muted-foreground">Wszyscy klienci w systemie i ich powiązania z firmami.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Łącznie klientów</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{clients.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Powiązania</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{orgClients.length}</div><p className="text-xs text-muted-foreground">relacji firma–klient</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Współdzieleni</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clients.filter(c => getClientOrgs(c.id).length > 1).length}
            </div>
            <p className="text-xs text-muted-foreground">klienci w wielu firmach</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Lista klientów</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : clients.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Brak klientów.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nazwa</TableHead>
                  <TableHead>Budżet roczny</TableHead>
                  <TableHead>Waluta</TableHead>
                  <TableHead>Powiązane firmy</TableHead>
                  <TableHead>Utworzono</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((c: any) => {
                  const linkedOrgs = getClientOrgs(c.id);
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{Number(c.annual_budget).toLocaleString('pl-PL')}</TableCell>
                      <TableCell>{c.currency}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {linkedOrgs.length === 0 ? (
                            <span className="text-muted-foreground text-sm">—</span>
                          ) : linkedOrgs.map((name, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{name}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString('pl-PL')}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
