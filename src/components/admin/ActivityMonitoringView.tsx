import { useState } from 'react';
import { useActivityFeed, useOrganizations } from '@/hooks/useSuperAdmin';
import { useGlobalProfiles } from '@/hooks/useSuperAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

export const ActivityMonitoringView = () => {
  const [orgFilter, setOrgFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: feed = [], isLoading } = useActivityFeed(200, {
    organizationId: orgFilter,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });
  const { data: orgs = [] } = useOrganizations();
  const { data: profiles = [] } = useGlobalProfiles();
  const activeOrgs = orgs.filter(o => !o.deleted_at);

  const getUserName = (userId: string | null) => {
    if (!userId) return '—';
    const p = profiles.find((p: any) => p.user_id === userId);
    return p?.display_name || p?.first_name || userId.slice(0, 8);
  };

  const getOrgName = (orgId: string | null) => {
    if (!orgId) return '—';
    const org = orgs.find(o => o.id === orgId);
    return org?.name || '—';
  };

  const sourceColor = (source: string) => {
    return source === 'system_log' ? 'secondary' as const : 'outline' as const;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Monitoring aktywności</h1>
        <p className="text-muted-foreground">Przegląd aktywności użytkowników i zdarzeń systemowych.</p>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Firma</label>
              <Select value={orgFilter} onValueChange={setOrgFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie</SelectItem>
                  {activeOrgs.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Od daty</label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Do daty</label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <Button variant="ghost" onClick={() => { setOrgFilter('all'); setDateFrom(''); setDateTo(''); }}>
              <RotateCcw className="h-4 w-4 mr-2" /> Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aktywność ({feed.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : feed.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Brak aktywności.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Źródło</TableHead>
                  <TableHead>Akcja</TableHead>
                  <TableHead>Użytkownik</TableHead>
                  <TableHead>Firma</TableHead>
                  <TableHead>Szczegóły</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feed.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell><Badge variant={sourceColor(item.source)}>{item.source === 'system_log' ? 'System' : 'Audyt'}</Badge></TableCell>
                    <TableCell className="font-medium">{item.action}</TableCell>
                    <TableCell>{getUserName(item.user_id)}</TableCell>
                    <TableCell>{getOrgName(item.organization_id)}</TableCell>
                    <TableCell className="max-w-xs truncate text-sm">{item.details || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(item.timestamp).toLocaleString('pl-PL')}
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
