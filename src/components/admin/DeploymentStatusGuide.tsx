import { AlertTriangle, CheckCircle2, Clock3, Globe2, RefreshCw, ShieldCheck, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const currentDeployment = [
  {
    label: 'Publikacja aplikacji',
    value: 'Publiczna',
    detail: 'Projekt ma aktywny adres publikacji i widoczność publiczną.',
    icon: CheckCircle2,
  },
  {
    label: 'Adres Lovable',
    value: 'coreplan-pl.lovable.app',
    detail: 'Adres produkcyjny jest skonfigurowany jako fallback niezależny od DNS domeny własnej.',
    icon: Globe2,
  },
  {
    label: 'Domeny własne',
    value: 'coreplan.pl, www.coreplan.pl',
    detail: 'Obie domeny powinny być sprawdzane oddzielnie, bo root i www mają osobne rekordy DNS.',
    icon: ShieldCheck,
  },
];

const blockedStatuses = [
  {
    status: 'Offline',
    tone: 'destructive',
    icon: WifiOff,
    message: 'Domena była aktywna, ale DNS przestał wskazywać na infrastrukturę aplikacji.',
    nextSteps: [
      'Sprawdź u operatora DNS rekord A dla domeny głównej oraz osobny rekord A dla www.',
      'Ustaw wartość rekordu A na 185.158.133.1 i usuń konfliktujące rekordy A/AAAA/CNAME dla tego samego hosta.',
      'Jeżeli używasz Cloudflare lub podobnego proxy, wróć do konfiguracji domeny i włącz tryb proxy zamiast klasycznego A-record setupu.',
      'Po zmianie DNS poczekaj na propagację; zwykle trwa kilkanaście minut, maksymalnie do 72 godzin.',
    ],
  },
  {
    status: 'Failed',
    tone: 'destructive',
    icon: AlertTriangle,
    message: 'DNS wskazuje poprawnie i własność domeny została potwierdzona, ale certyfikat SSL nie został wystawiony.',
    nextSteps: [
      'Sprawdź, czy rekordy CAA domeny pozwalają wystawić certyfikat przez Let’s Encrypt.',
      'Usuń stare lub sprzeczne rekordy SSL/CDN po poprzednim hostingu, jeśli nadal obsługują tę samą domenę.',
      'W ustawieniach domeny kliknij Retry po poprawieniu DNS/CAA.',
      'Jeżeli status wraca do Failed, przygotuj zrzut ustawień DNS i przekaż go do wsparcia razem z nazwą domeny.',
    ],
  },
  {
    status: 'Verifying',
    tone: 'secondary',
    icon: Clock3,
    message: 'System czeka, aż rekordy DNS rozpropagują się i potwierdzą własność domeny.',
    nextSteps: [
      'Nie publikuj wielokrotnie w pętli — ten status zależy głównie od DNS, nie od kolejnego deploya aplikacji.',
      'Zweryfikuj, czy rekord TXT _lovable oraz rekord A/CNAME dokładnie odpowiadają instrukcjom z konfiguracji domeny.',
      'Sprawdź osobno coreplan.pl i www.coreplan.pl, bo www nie jest dodawane automatycznie.',
      'Jeżeli po 72 godzinach status nadal nie zmieni się na Setting up lub Active, sprawdź konfliktujące rekordy i uruchom ponowną weryfikację.',
    ],
  },
];

export const DeploymentStatusGuide = () => (
  <div className="space-y-4">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Globe2 className="h-4 w-4" /> Status publikacji i domen
        </CardTitle>
        <CardDescription>
          Widok diagnostyczny dla publikacji produkcyjnej, DNS i certyfikatu SSL.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {currentDeployment.map((item) => (
          <div key={item.label} className="rounded-lg border p-3">
            <div className="mb-2 flex items-center gap-2">
              <item.icon className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">{item.label}</p>
            </div>
            <p className="break-words text-sm font-semibold">{item.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
          </div>
        ))}
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <RefreshCw className="h-4 w-4" /> Komunikaty blokad SSL/DNS
        </CardTitle>
        <CardDescription>
          Konkretne znaczenie statusów oraz następne działania, gdy domena nie przechodzi do Active.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {blockedStatuses.map((item) => (
          <div key={item.status} className="rounded-lg border p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-3">
                <item.icon className={item.tone === 'destructive' ? 'mt-0.5 h-5 w-5 text-destructive' : 'mt-0.5 h-5 w-5 text-muted-foreground'} />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{item.status}</p>
                    <Badge variant={item.tone === 'destructive' ? 'destructive' : 'secondary'}>
                      {item.tone === 'destructive' ? 'Blokada' : 'W toku'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{item.message}</p>
                </div>
              </div>
            </div>
            <ol className="mt-3 space-y-2 pl-5 text-sm text-muted-foreground">
              {item.nextSteps.map((step) => (
                <li key={step} className="list-decimal">{step}</li>
              ))}
            </ol>
          </div>
        ))}
      </CardContent>
    </Card>
  </div>
);