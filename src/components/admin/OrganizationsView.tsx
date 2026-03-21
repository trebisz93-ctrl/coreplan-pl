import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganizations } from '@/hooks/useSuperAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Building2, Trash2, ExternalLink } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { CreateOrganizationWizard } from './CreateOrganizationWizard';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export const OrganizationsView = () => {
  const { data: orgs = [], isLoading } = useOrganizations();
  const [wizardOpen, setWizardOpen] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { switchToOrg } = useOrganization();
  const navigate = useNavigate();

  const activeOrgs = orgs.filter(o => !o.deleted_at);

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

  const softDeleteOrg = async (org: any) => {
    try {
      const now = new Date().toISOString();
      const purgeAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();

      await supabase.from('organizations').update({
        deleted_at: now,
        deleted_by: user!.id,
        purge_at: purgeAt,
        status: 'deleted',
      } as any).eq('id', org.id);

      await supabase.from('trash_registry').insert({
        record_type: 'organization',
        record_id: org.id,
        record_name: org.name,
        deleted_by: user!.id,
        organization_id: org.id,
      } as any);

      // Soft-delete org members' profiles
      const { data: members } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', org.id);

      if (members && members.length > 0) {
        for (const m of members) {
          await supabase.from('profiles').update({
            deleted_at: now,
            deleted_by: user!.id,
            purge_at: purgeAt,
            status: 'deleted',
          } as any).eq('user_id', m.user_id);
        }
      }

      toast({ title: 'Przeniesiono do kosza', description: `Firma "${org.name}" została przeniesiona do kosza.` });
      qc.invalidateQueries({ queryKey: ['organizations'] });
    } catch (err: any) {
      toast({ title: 'Błąd', description: err.message, variant: 'destructive' });
    }
  };

  const handleEnterOrg = (org: any) => {
    switchToOrg(org);
    navigate('/app');
  };

  const statusColor = (s: string) => {
    if (s === 'active') return 'default';
    if (s === 'configuring') return 'secondary';
    if (s === 'suspended') return 'destructive';
    return 'outline';
  };

  const statusLabel = (s: string) => {
    if (s === 'active') return 'Aktywna';
    if (s === 'configuring') return 'W konfiguracji';
    if (s === 'suspended') return 'Zawieszona';
    return s;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Firmy</h1>
          <p className="text-muted-foreground">Zarządzaj firmami w systemie CorePlan.</p>
        </div>
        <Button onClick={() => setWizardOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Utwórz firmę
        </Button>
      </div>

      <CreateOrganizationWizard open={wizardOpen} onOpenChange={setWizardOpen} />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeOrgs.map(org => (
            <Card key={org.id} className="group hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleEnterOrg(org)}>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">{org.name}</CardTitle>
                </div>
                <Badge variant={statusColor(org.status) as any}>{statusLabel(org.status)}</Badge>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-1">Slug: {org.slug}</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Utworzono: {new Date(org.created_at).toLocaleDateString('pl-PL')}
                </p>
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <Button variant="outline" size="sm" onClick={() => handleEnterOrg(org)} className="gap-1">
                    <ExternalLink className="h-3 w-3" /> Wejdź
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleStatus(org.id, org.status)}
                  >
                    {org.status === 'active' ? 'Zawieś' : 'Aktywuj'}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Usuń firmę</AlertDialogTitle>
                        <AlertDialogDescription>
                          Firma „{org.name}" zostanie przeniesiona do kosza na 180 dni.
                          Jej użytkownicy zostaną dezaktywowani. Możesz ją przywrócić z kosza.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Anuluj</AlertDialogCancel>
                        <AlertDialogAction onClick={() => softDeleteOrg(org)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Przenieś do kosza
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
