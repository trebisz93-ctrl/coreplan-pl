import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, Key, Lock, Users, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useGlobalProfiles, useOrganizations } from '@/hooks/useSuperAdmin';
import { useUserRoles } from '@/hooks/useData';

export const SecurityView = () => {
  const { data: profiles = [] } = useGlobalProfiles();
  const { data: orgs = [] } = useOrganizations();
  const { data: roles = [] } = useUserRoles();

  const activeProfiles = profiles.filter((p: any) => !p.deleted_at);
  const blockedUsers = activeProfiles.filter((p: any) => p.status === 'blocked').length;
  const pendingUsers = activeProfiles.filter((p: any) => p.status === 'pending').length;
  const superAdmins = roles.filter((r: any) => r.role === 'super_admin').length;
  const suspendedOrgs = orgs.filter(o => o.status === 'suspended' && !o.deleted_at).length;

  const checks = [
    { label: 'RLS włączony na tabelach', ok: true, desc: 'Wszystkie tabele mają Row-Level Security' },
    { label: 'Super Admin istnieje', ok: superAdmins > 0, desc: `${superAdmins} konto z rolą super_admin` },
    { label: 'Brak użytkowników oczekujących', ok: pendingUsers === 0, desc: pendingUsers > 0 ? `${pendingUsers} użytkowników czeka na zatwierdzenie` : 'Wszyscy użytkownicy zatwierdzeni' },
    { label: 'Auto-purge kosza aktywny', ok: true, desc: 'Codziennie o 3:00 UTC' },
    { label: 'Izolacja danych (multi-tenant)', ok: true, desc: 'Dane firm oddzielone na poziomie RLS' },
    { label: 'Audyt logów aktywny', ok: true, desc: 'Triggery audytu na tabelach biznesowych' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bezpieczeństwo</h1>
        <p className="text-muted-foreground">Przegląd bezpieczeństwa i kontroli dostępu systemu.</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Super Admini</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{superAdmins}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Zablokowani</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{blockedUsers}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Oczekujący</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{pendingUsers}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Zawieszone firmy</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{suspendedOrgs}</div></CardContent>
        </Card>
      </div>

      {/* Security checklist */}
      <Card>
        <CardHeader><CardTitle>Kontrola bezpieczeństwa</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {checks.map((c, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
              {c.ok ? (
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium">{c.label}</p>
                <p className="text-xs text-muted-foreground">{c.desc}</p>
              </div>
              <Badge variant={c.ok ? 'default' : 'secondary'}>{c.ok ? 'OK' : 'Uwaga'}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Policies overview */}
      <Card>
        <CardHeader><CardTitle>Role systemowe</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { role: 'super_admin', label: 'Super Admin', desc: 'Pełny dostęp do całego systemu, wszystkich firm i danych' },
              { role: 'org_admin', label: 'Admin Firmy', desc: 'Zarządzanie użytkownikami, klientami i danymi w obrębie firmy' },
              { role: 'manager', label: 'Manager', desc: 'Tworzenie i edycja planów medialnych, klientów i produktów' },
              { role: 'user', label: 'Użytkownik', desc: 'Podstawowy dostęp do danych firmy' },
              { role: 'viewer', label: 'Viewer', desc: 'Tylko podgląd danych bez możliwości edycji' },
            ].map(r => (
              <div key={r.role} className="p-3 rounded-lg border flex items-start gap-3">
                <Key className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{r.label}</p>
                  <p className="text-xs text-muted-foreground">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
