import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Shield } from 'lucide-react';

export const SettingsView = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-bold">Ustawienia</h2>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Konto
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
              <Badge variant="secondary">Użytkownik</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

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
