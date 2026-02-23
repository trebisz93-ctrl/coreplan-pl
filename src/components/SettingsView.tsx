import { useAuth } from '@/context/AuthContext';
import { useProfiles, useUserRoles, useMyRole, useSetUserRole } from '@/hooks/useData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Mail, Shield, Users } from 'lucide-react';
import { toast } from 'sonner';

const roleLabels: Record<string, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  user: 'Użytkownik',
  viewer: 'Viewer (tylko podgląd)',
};

export const SettingsView = () => {
  const { user } = useAuth();
  const { data: myRole } = useMyRole();
  const { data: profiles = [] } = useProfiles();
  const { data: roles = [] } = useUserRoles();
  const setUserRole = useSetUserRole();

  const isAdmin = myRole === 'admin';

  const handleRoleChange = async (userId: string, role: 'admin' | 'manager' | 'user' | 'viewer') => {
    try {
      await setUserRole.mutateAsync({ userId, role: role as any });
      toast.success('Rola zaktualizowana');
    } catch (e: any) { toast.error('Nie udało się zmienić roli: ' + (e.message || 'Nieznany błąd')); }
  };

  const getUserRole = (userId: string) => roles.find(r => r.user_id === userId)?.role ?? 'user';

  return (
    <div className="space-y-6 max-w-3xl">
      <h2 className="text-xl font-bold">Ustawienia</h2>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" /> Konto
          </CardTitle>
          <CardDescription>Informacje o Twoim koncie</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">E-mail</p>
              <p className="text-sm text-muted-foreground">{user?.email ?? '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Rola</p>
              <Badge variant={isAdmin ? 'default' : 'secondary'}>{roleLabels[myRole || 'user'] || myRole}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" /> Zarządzanie użytkownikami
            </CardTitle>
            <CardDescription>Zarządzaj kontami i rolami użytkowników</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {profiles.map(profile => {
                const role = getUserRole(profile.user_id);
                const isSelf = profile.user_id === user?.id;
                return (
                  <div key={profile.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{profile.display_name || 'Bez nazwy'}</p>
                        <p className="text-xs text-muted-foreground">{profile.user_id.slice(0, 8)}...</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isSelf && <Badge variant="outline" className="text-xs">Ty</Badge>}
                      <Select
                        value={role}
                        onValueChange={v => handleRoleChange(profile.user_id, v as any)}
                        disabled={isSelf}
                      >
                        <SelectTrigger className="w-44 h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrator</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="user">Użytkownik</SelectItem>
                          <SelectItem value="viewer">Viewer (tylko podgląd)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
              {profiles.length === 0 && (
                <p className="text-sm text-muted-foreground">Brak użytkowników.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aplikacja</CardTitle>
          <CardDescription>Informacje o aplikacji</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>MediaPlan CRM v1.0</p>
          <p>© 2026 MediaPlan CRM. Wszelkie prawa zastrzeżone.</p>
        </CardContent>
      </Card>
    </div>
  );
};
