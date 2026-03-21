import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plug, Webhook, Key, Globe } from 'lucide-react';

const integrations = [
  { name: 'API REST', desc: 'Dostęp do danych przez API REST z autoryzacją Bearer Token', status: 'available', icon: Globe },
  { name: 'Webhooks', desc: 'Powiadomienia o zdarzeniach w systemie do zewnętrznych serwisów', status: 'planned', icon: Webhook },
  { name: 'Klucze API', desc: 'Generowanie kluczy API dla integracji zewnętrznych', status: 'planned', icon: Key },
  { name: 'Import / Export', desc: 'Import i eksport danych w formacie CSV/JSON', status: 'available', icon: Plug },
];

export const IntegrationsView = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Integracje</h1>
        <p className="text-muted-foreground">Zarządzaj integracjami i połączeniami zewnętrznymi.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((item) => (
          <Card key={item.name}>
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <item.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">{item.name}</CardTitle>
              </div>
              <Badge variant={item.status === 'available' ? 'default' : 'secondary'}>
                {item.status === 'available' ? 'Dostępne' : 'Planowane'}
              </Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">
            Nowe integracje będą dodawane w kolejnych aktualizacjach systemu.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
