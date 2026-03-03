import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useMyRole } from '@/hooks/useData';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Upload, Database, History, Shield, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const actionLabels: Record<string, string> = {
  INSERT: 'Dodano',
  UPDATE: 'Zaktualizowano',
  DELETE: 'Usunięto',
  SOFT_DELETE: 'Usunięto (soft)',
  RESTORE: 'Przywrócono',
};

const tableLabels: Record<string, string> = {
  activities: 'Aktywności',
  clients: 'Klienci',
  products: 'Produkty',
  packages: 'Pakiety',
  media_plans: 'Media plany',
  confirmations: 'Potwierdzenia',
};

export const BackupSection = () => {
  const { user } = useAuth();
  const { data: myRole } = useMyRole();
  const isAdmin = myRole === 'admin';
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const { data: auditLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['audit_log', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const { data: deletedItems = [], refetch: refetchDeleted } = useQuery({
    queryKey: ['deleted_items', user?.id],
    queryFn: async () => {
      const tables = ['activities', 'clients', 'products', 'packages', 'media_plans'] as const;
      const results: { table: string; id: string; name: string; deleted_at: string }[] = [];
      for (const table of tables) {
        const { data } = await supabase
          .from(table)
          .select('id, name, deleted_at')
          .not('deleted_at', 'is', null)
          .order('deleted_at', { ascending: false })
          .limit(20);
        if (data) {
          results.push(...(data as any[]).map(r => ({ table, ...r })));
        }
      }
      return results.sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime());
    },
    enabled: !!user,
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/data-export`,
        { headers: { Authorization: `Bearer ${session?.access_token}` } }
      );
      if (!res.ok) throw new Error(await res.text());
      const blob = new Blob([await res.text()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup pobrany pomyślnie');
    } catch (e: any) {
      toast.error('Błąd eksportu: ' + e.message);
    }
    setExporting(false);
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setImporting(true);
      try {
        const text = await file.text();
        const backup = JSON.parse(text);
        if (!backup.tables) throw new Error('Nieprawidłowy format backupu');
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/data-import`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session?.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(backup),
          }
        );
        if (!res.ok) throw new Error(await res.text());
        const result = await res.json();
        const total = Object.values(result.results as Record<string, { inserted: number }>)
          .reduce((sum, r) => sum + r.inserted, 0);
        toast.success(`Zaimportowano ${total} rekordów`);
      } catch (e: any) {
        toast.error('Błąd importu: ' + e.message);
      }
      setImporting(false);
    };
    input.click();
  };

  const handleRestore = async (table: string, id: string) => {
    const { error } = await supabase.from(table as any).update({ deleted_at: null } as any).eq('id', id);
    if (error) {
      toast.error('Błąd przywracania: ' + error.message);
    } else {
      toast.success('Rekord przywrócony');
      refetchDeleted();
    }
  };

  return (
    <>
      {/* Backup & Restore */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4" /> Backup i przywracanie danych
          </CardTitle>
          <CardDescription>Eksportuj i importuj dane CRM w formacie JSON</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Button onClick={handleExport} disabled={exporting} className="gap-2">
              <Download className="h-4 w-4" />
              {exporting ? 'Eksportowanie...' : 'Pobierz backup'}
            </Button>
            {isAdmin && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={importing} className="gap-2">
                    <Upload className="h-4 w-4" />
                    {importing ? 'Importowanie...' : 'Importuj backup'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Importuj backup</AlertDialogTitle>
                    <AlertDialogDescription>
                      Import nadpisze istniejące dane (upsert). Czy na pewno chcesz kontynuować?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Anuluj</AlertDialogCancel>
                    <AlertDialogAction onClick={handleImport}>Importuj</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Backup zawiera: klientów, produkty, aktywności, media plany, pakiety, potwierdzenia, typy kampanii.
          </p>
        </CardContent>
      </Card>

      {/* Deleted items - restore */}
      {deletedItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RotateCcw className="h-4 w-4" /> Usunięte elementy
            </CardTitle>
            <CardDescription>Przywróć usunięte rekordy</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-60">
              <div className="space-y-2">
                {deletedItems.map((item) => (
                  <div key={`${item.table}-${item.id}`} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{tableLabels[item.table] || item.table}</Badge>
                      <span className="text-sm">{item.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.deleted_at).toLocaleDateString('pl-PL')}
                      </span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => handleRestore(item.table, item.id)} className="gap-1">
                      <RotateCcw className="h-3 w-3" /> Przywróć
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" /> Dziennik zmian (Audit Log)
          </CardTitle>
          <CardDescription>Ostatnie 50 operacji na danych</CardDescription>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <p className="text-sm text-muted-foreground">Ładowanie...</p>
          ) : auditLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Brak wpisów w dzienniku zmian.</p>
          ) : (
            <ScrollArea className="max-h-72">
              <div className="space-y-1.5">
                {auditLogs.map((log: any) => (
                  <div key={log.id} className="flex items-center gap-2 py-1 border-b border-border last:border-0 text-sm">
                    <Badge variant={
                      log.action === 'DELETE' || log.action === 'SOFT_DELETE' ? 'destructive'
                        : log.action === 'INSERT' ? 'default'
                        : log.action === 'RESTORE' ? 'secondary'
                        : 'outline'
                    } className="text-xs min-w-[90px] justify-center">
                      {actionLabels[log.action] || log.action}
                    </Badge>
                    <Badge variant="outline" className="text-xs">{tableLabels[log.table_name] || log.table_name}</Badge>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(log.created_at).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </>
  );
};
