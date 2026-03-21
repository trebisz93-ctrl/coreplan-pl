import { useState } from 'react';
import { useOrganizations } from '@/hooks/useSuperAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Building2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

export const OrganizationsView = () => {
  const { data: orgs = [], isLoading } = useOrganizations();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [creating, setCreating] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const handleCreate = async () => {
    if (!name.trim() || !slug.trim()) return;
    setCreating(true);
    try {
      const { error } = await supabase.from('organizations').insert({
        name: name.trim(),
        slug: slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        created_by: user!.id,
      } as any);
      if (error) throw error;
      toast({ title: 'Firma utworzona', description: `Firma "${name}" została dodana.` });
      setName('');
      setSlug('');
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['organizations'] });
    } catch (err: any) {
      toast({ title: 'Błąd', description: err.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const toggleStatus = async (orgId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const { error } = await supabase
      .from('organizations')
      .update({ status: newStatus } as any)
      .eq('id', orgId);
    if (error) {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    } else {
      qc.invalidateQueries({ queryKey: ['organizations'] });
    }
  };

  const statusColor = (s: string) => {
    if (s === 'active') return 'default';
    if (s === 'suspended') return 'destructive';
    return 'secondary';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Firmy</h1>
          <p className="text-muted-foreground">Zarządzaj firmami w systemie CorePlan.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Utwórz firmę</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nowa firma</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Nazwa firmy</Label>
                <Input value={name} onChange={e => { setName(e.target.value); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-')); }} placeholder="Nazwa firmy" />
              </div>
              <div>
                <Label>Slug (URL)</Label>
                <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="nazwa-firmy" />
              </div>
              <Button onClick={handleCreate} disabled={creating || !name.trim()} className="w-full">
                {creating ? 'Tworzenie...' : 'Utwórz firmę'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orgs.map(org => (
            <Card key={org.id}>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">{org.name}</CardTitle>
                </div>
                <Badge variant={statusColor(org.status)}>{org.status}</Badge>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">Slug: {org.slug}</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Utworzono: {new Date(org.created_at).toLocaleDateString('pl-PL')}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleStatus(org.id, org.status)}
                >
                  {org.status === 'active' ? 'Zawieś' : 'Aktywuj'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
