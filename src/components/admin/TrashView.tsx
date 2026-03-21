import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RotateCcw, Trash2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const typeLabels: Record<string, string> = {
  organization: 'Firma',
  user: 'Użytkownik',
  client: 'Klient',
  product: 'Produkt',
  package: 'Pakiet',
};

const typeColors: Record<string, string> = {
  organization: 'default',
  user: 'secondary',
  client: 'outline',
  product: 'outline',
  package: 'outline',
};

export const TrashView = () => {
  const [filter, setFilter] = useState('all');
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['trash_registry', filter],
    queryFn: async () => {
      let q = supabase
        .from('trash_registry')
        .select('*')
        .is('restored_at', null)
        .order('deleted_at', { ascending: false });

      if (filter !== 'all') {
        q = q.eq('record_type', filter);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const handleRestore = async (item: any) => {
    try {
      // Restore in source table
      if (item.record_type === 'organization') {
        await supabase.from('organizations').update({ deleted_at: null, deleted_by: null, purge_at: null, status: 'active' } as any).eq('id', item.record_id);
      } else if (item.record_type === 'user') {
        await supabase.from('profiles').update({ deleted_at: null, deleted_by: null, purge_at: null, status: 'active' } as any).eq('user_id', item.record_id);
      } else if (item.record_type === 'client') {
        await supabase.from('clients').update({ deleted_at: null, deleted_by: null, purge_at: null } as any).eq('id', item.record_id);
      } else if (item.record_type === 'product') {
        await supabase.from('products').update({ deleted_at: null, deleted_by: null, purge_at: null } as any).eq('id', item.record_id);
      } else if (item.record_type === 'package') {
        await supabase.from('packages').update({ deleted_at: null, deleted_by: null, purge_at: null } as any).eq('id', item.record_id);
      }

      // Mark as restored in trash_registry
      await supabase.from('trash_registry').update({ restored_at: new Date().toISOString() } as any).eq('id', item.id);

      toast({ title: 'Przywrócono', description: `${typeLabels[item.record_type]} "${item.record_name}" został przywrócony.` });
      qc.invalidateQueries({ queryKey: ['trash_registry'] });
      qc.invalidateQueries({ queryKey: ['organizations'] });
      qc.invalidateQueries({ queryKey: ['global_profiles'] });
    } catch (err: any) {
      toast({ title: 'Błąd', description: err.message, variant: 'destructive' });
    }
  };

  const handlePermanentDelete = async (item: any) => {
    try {
      // Hard delete from source
      if (item.record_type === 'organization') {
        await supabase.from('organizations').delete().eq('id', item.record_id);
      } else if (item.record_type === 'user') {
        await supabase.from('profiles').delete().eq('user_id', item.record_id);
      } else if (item.record_type === 'client') {
        await supabase.from('clients').delete().eq('id', item.record_id);
      } else if (item.record_type === 'product') {
        await supabase.from('products').delete().eq('id', item.record_id);
      } else if (item.record_type === 'package') {
        await supabase.from('packages').delete().eq('id', item.record_id);
      }

      await supabase.from('trash_registry').delete().eq('id', item.id);

      toast({ title: 'Usunięto trwale', description: `${typeLabels[item.record_type]} "${item.record_name}" został trwale usunięty.` });
      qc.invalidateQueries({ queryKey: ['trash_registry'] });
    } catch (err: any) {
      toast({ title: 'Błąd', description: err.message, variant: 'destructive' });
    }
  };

  const getDaysRemaining = (purgeAt: string) => {
    const days = Math.ceil((new Date(purgeAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kosz</h1>
        <p className="text-muted-foreground">Usunięte elementy — przechowywane przez 180 dni przed trwałym usunięciem.</p>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">Wszystkie</TabsTrigger>
          <TabsTrigger value="organization">Firmy</TabsTrigger>
          <TabsTrigger value="user">Użytkownicy</TabsTrigger>
          <TabsTrigger value="client">Klienci</TabsTrigger>
          <TabsTrigger value="product">Produkty</TabsTrigger>
          <TabsTrigger value="package">Pakiety</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Elementy w koszu ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Trash2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Kosz jest pusty</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Typ</TableHead>
                  <TableHead>Nazwa</TableHead>
                  <TableHead>Usunięto</TableHead>
                  <TableHead>Dni do usunięcia</TableHead>
                  <TableHead className="text-right">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant={typeColors[item.record_type] as any}>{typeLabels[item.record_type]}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{item.record_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(item.deleted_at).toLocaleDateString('pl-PL')}
                    </TableCell>
                    <TableCell>
                      <span className={getDaysRemaining(item.purge_at) < 30 ? 'text-destructive font-medium' : ''}>
                        {getDaysRemaining(item.purge_at)} dni
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleRestore(item)} className="gap-1">
                          <RotateCcw className="h-3 w-3" /> Przywróć
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" className="gap-1">
                              <Trash2 className="h-3 w-3" /> Usuń trwale
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-destructive" />
                                Trwałe usunięcie
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Czy na pewno chcesz trwale usunąć {typeLabels[item.record_type].toLowerCase()} „{item.record_name}"?
                                Tej operacji nie można cofnąć.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Anuluj</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handlePermanentDelete(item)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Usuń trwale
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
