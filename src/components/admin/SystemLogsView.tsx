import { useState } from 'react';
import { useSystemLogs, useOrganizations, type SystemLogFilters } from '@/hooks/useSuperAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

const EVENT_TYPES = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'error', label: 'Błąd' },
  { value: 'context_switch', label: 'Zmiana kontekstu' },
  { value: 'user_created', label: 'Utworzenie użytkownika' },
  { value: 'impersonation_start', label: 'Impersonacja' },
];

export const SystemLogsView = () => {
  const [filters, setFilters] = useState<SystemLogFilters>({});
  const { data: logs = [], isLoading } = useSystemLogs(200, filters);
  const { data: orgs = [] } = useOrganizations();

  const activeOrgs = orgs.filter(o => !o.deleted_at);

  const eventColor = (type: string) => {
    if (type === 'error') return 'destructive' as const;
    if (type === 'login' || type === 'logout') return 'secondary' as const;
    if (type === 'context_switch' || type === 'impersonation_start') return 'outline' as const;
    return 'default' as const;
  };

  const resetFilters = () => setFilters({});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Logi systemowe</h1>
        <p className="text-muted-foreground">Historia zdarzeń systemowych, logowań i błędów.</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Typ zdarzenia</label>
              <Select value={filters.eventType || 'all'} onValueChange={v => setFilters(f => ({ ...f, eventType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Firma</label>
              <Select value={filters.organizationId || 'all'} onValueChange={v => setFilters(f => ({ ...f, organizationId: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie</SelectItem>
                  {activeOrgs.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Od daty</label>
              <Input type="date" value={filters.dateFrom || ''} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value || undefined }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Do daty</label>
              <Input type="date" value={filters.dateTo || ''} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value || undefined }))} />
            </div>
            <div className="flex gap-2">
              <Input placeholder="Szukaj w opisie..." value={filters.search || ''} onChange={e => setFilters(f => ({ ...f, search: e.target.value || undefined }))} />
              <Button variant="ghost" size="icon" aria-label="Resetuj filtry" onClick={resetFilters} title="Resetuj filtry">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Zdarzenia ({logs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Brak zdarzeń do wyświetlenia.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Typ</TableHead>
                  <TableHead>Opis</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge variant={eventColor(log.event_type)}>{log.event_type}</Badge>
                    </TableCell>
                    <TableCell className="max-w-md truncate">{log.description || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('pl-PL')}
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
