import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Database, Download, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useOrganizations } from '@/hooks/useSuperAdmin';
import { useState } from 'react';

export const AdminBackupsView = () => {
  const { user } = useAuth();
  const { data: orgs = [] } = useOrganizations();
  const [creating, setCreating] = useState(false);

  const { data: backups = [], isLoading, refetch } = useQuery({
    queryKey: ['admin_backups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('backup_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const getOrgName = (orgId: string | null) => {
    if (!orgId) return 'Globalny';
    const org = orgs.find(o => o.id === orgId);
    return org?.name || orgId.slice(0, 8);
  };

  const statusIcon = (s: string) => {
    if (s === 'success') return <CheckCircle2 className="h-4 w-4 text-primary" />;
    return <XCircle className="h-4 w-4 text-destructive" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const triggerBackup = async () => {
    setCreating(true);
    try {
      const res = await supabase.functions.invoke('scheduled-backup', {
        body: { manual: true },
      });
      if (res.error) throw res.error;
      toast.success('Backup uruchomiony');
      setTimeout(() => refetch(), 3000);
    } catch (err: any) {
      toast.error('Błąd: ' + (err.message || 'Nieznany błąd'));
    } finally {
      setCreating(false);
    }
  };

  const successCount = backups.filter((b: any) => b.status === 'success').length;
  const failedCount = backups.filter((b: any) => b.status !== 'success').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Backupy</h1>
          <p className="text-muted-foreground">Historia kopii zapasowych wszystkich firm.</p>
        </div>
        <Button onClick={triggerBackup} disabled={creating} className="gap-2">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
          Uruchom backup
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Łącznie</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{backups.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Udane</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{successCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Błędne</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{failedCount}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Historia backupów</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : backups.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Brak backupów.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Firma</TableHead>
                  <TableHead>Rozmiar</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((b: any) => (
                  <TableRow key={b.id}>
                    <TableCell>{statusIcon(b.status)}</TableCell>
                    <TableCell><Badge variant="outline">{b.type}</Badge></TableCell>
                    <TableCell className="text-sm">{getOrgName(b.organization_id)}</TableCell>
                    <TableCell className="text-sm">{formatSize(b.size_bytes)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(b.created_at).toLocaleString('pl-PL')}
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
