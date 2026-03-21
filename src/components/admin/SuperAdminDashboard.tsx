import { useOrganizations, useGlobalProfiles, useSystemLogs, useTrashCount } from '@/hooks/useSuperAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, ScrollText, Activity, Trash2, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const SuperAdminDashboard = () => {
  const { data: orgs = [] } = useOrganizations();
  const { data: profiles = [] } = useGlobalProfiles();
  const { data: logs = [] } = useSystemLogs(10);
  const { data: trashCount = 0 } = useTrashCount();

  const activeOrgs = orgs.filter(o => o.status === 'active' && !o.deleted_at).length;
  const configuringOrgs = orgs.filter(o => o.status === 'configuring' && !o.deleted_at).length;
  const activeUsers = profiles.filter((p: any) => (p.status === 'approved' || p.status === 'active') && !p.deleted_at).length;
  const pendingUsers = profiles.filter((p: any) => p.status === 'pending' && !p.deleted_at).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Panel Super Admina</h1>
        <p className="text-muted-foreground">Zarządzaj firmami, użytkownikami i monitoruj system.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Firmy</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeOrgs}</div>
            <div className="flex gap-2 mt-1">
              {configuringOrgs > 0 && <Badge variant="secondary" className="text-xs">{configuringOrgs} w konfiguracji</Badge>}
              <span className="text-xs text-muted-foreground">{orgs.filter(o => !o.deleted_at).length} łącznie</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Użytkownicy</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsers}</div>
            <div className="flex gap-2 mt-1">
              {pendingUsers > 0 && <Badge variant="secondary" className="text-xs">{pendingUsers} oczekujących</Badge>}
              <span className="text-xs text-muted-foreground">{profiles.filter((p: any) => !p.deleted_at).length} łącznie</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Kosz</CardTitle>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trashCount}</div>
            <p className="text-xs text-muted-foreground">elementów do przywrócenia</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">Online</div>
            <p className="text-xs text-muted-foreground">system działa poprawnie</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Szybkie akcje</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link to="/admin/organizations">
            <Button variant="outline" className="gap-2">
              <Plus className="h-4 w-4" /> Utwórz firmę
            </Button>
          </Link>
          <Link to="/admin/users">
            <Button variant="outline" className="gap-2">
              <Users className="h-4 w-4" /> Zarządzaj użytkownikami
            </Button>
          </Link>
          <Link to="/admin/trash">
            <Button variant="outline" className="gap-2">
              <Trash2 className="h-4 w-4" /> Kosz
            </Button>
          </Link>
          <Link to="/admin/logs">
            <Button variant="outline" className="gap-2">
              <ScrollText className="h-4 w-4" /> Przeglądaj logi
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Recent Logs */}
      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ostatnie zdarzenia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {logs.map((log: any) => (
                <div key={log.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <span className="text-sm font-medium">{log.event_type}</span>
                    <p className="text-xs text-muted-foreground">{log.description}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString('pl-PL')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
