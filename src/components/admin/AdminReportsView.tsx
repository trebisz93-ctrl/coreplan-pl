import { useOrganizations, useGlobalProfiles } from '@/hooks/useSuperAdmin';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, Building2, Users, Package, ShoppingCart } from 'lucide-react';

export const AdminReportsView = () => {
  const { user } = useAuth();
  const { data: orgs = [] } = useOrganizations();
  const { data: profiles = [] } = useGlobalProfiles();

  const activeOrgs = orgs.filter(o => !o.deleted_at);

  // Fetch counts per org
  const { data: orgStats = [] } = useQuery({
    queryKey: ['admin_org_stats'],
    queryFn: async () => {
      const stats = [];
      for (const org of activeOrgs) {
        const [members, clients, products, packages, activities] = await Promise.all([
          supabase.from('organization_members').select('id', { count: 'exact', head: true }).eq('organization_id', org.id),
          supabase.from('organization_clients').select('id', { count: 'exact', head: true }).eq('organization_id', org.id),
          supabase.from('products').select('id', { count: 'exact', head: true }).eq('organization_id', org.id).is('deleted_at', null),
          supabase.from('packages').select('id', { count: 'exact', head: true }).eq('organization_id', org.id).is('deleted_at', null),
          supabase.from('activities').select('id', { count: 'exact', head: true }).eq('organization_id', org.id).is('deleted_at', null),
        ]);
        stats.push({
          id: org.id,
          name: org.name,
          status: org.status,
          members: members.count || 0,
          clients: clients.count || 0,
          products: products.count || 0,
          packages: packages.count || 0,
          activities: activities.count || 0,
        });
      }
      return stats;
    },
    enabled: !!user && activeOrgs.length > 0,
  });

  const totalMembers = orgStats.reduce((s, o) => s + o.members, 0);
  const totalClients = orgStats.reduce((s, o) => s + o.clients, 0);
  const totalProducts = orgStats.reduce((s, o) => s + o.products, 0);
  const totalActivities = orgStats.reduce((s, o) => s + o.activities, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Raporty globalne</h1>
        <p className="text-muted-foreground">Podsumowanie danych ze wszystkich firm w systemie.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Użytkownicy</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalMembers}</div><p className="text-xs text-muted-foreground">we wszystkich firmach</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Klienci</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalClients}</div><p className="text-xs text-muted-foreground">powiązań firma-klient</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Produkty</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalProducts}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Aktywności</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalActivities}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Raport per firma</CardTitle></CardHeader>
        <CardContent>
          {orgStats.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Brak danych.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Firma</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Użytkownicy</TableHead>
                  <TableHead className="text-right">Klienci</TableHead>
                  <TableHead className="text-right">Produkty</TableHead>
                  <TableHead className="text-right">Pakiety</TableHead>
                  <TableHead className="text-right">Aktywności</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgStats.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.name}</TableCell>
                    <TableCell><Badge variant={o.status === 'active' ? 'default' : 'secondary'}>{o.status}</Badge></TableCell>
                    <TableCell className="text-right">{o.members}</TableCell>
                    <TableCell className="text-right">{o.clients}</TableCell>
                    <TableCell className="text-right">{o.products}</TableCell>
                    <TableCell className="text-right">{o.packages}</TableCell>
                    <TableCell className="text-right">{o.activities}</TableCell>
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
