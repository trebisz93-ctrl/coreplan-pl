import { useSystemLogs } from '@/hooks/useSuperAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const SystemLogsView = () => {
  const { data: logs = [], isLoading } = useSystemLogs(100);

  const eventColor = (type: string) => {
    if (type === 'error') return 'destructive' as const;
    if (type === 'login' || type === 'logout') return 'secondary' as const;
    return 'default' as const;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Logi systemowe</h1>
        <p className="text-muted-foreground">Historia zdarzeń systemowych, logowań i błędów.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ostatnie zdarzenia ({logs.length})</CardTitle>
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
