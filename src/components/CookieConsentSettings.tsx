import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';

interface CookieConsentSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  functional: boolean;
  setFunctional: (v: boolean) => void;
  analytics: boolean;
  setAnalytics: (v: boolean) => void;
  onReject: () => void;
  onSave: () => void;
  onAcceptAll: () => void;
}

const CookieConsentSettings = ({
  open,
  onOpenChange,
  functional,
  setFunctional,
  analytics,
  setAnalytics,
  onReject,
  onSave,
  onAcceptAll,
}: CookieConsentSettingsProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Ustawienia plików cookie</DialogTitle>
        <DialogDescription>
          Wybierz, które kategorie chcesz włączyć. Możesz zmienić te ustawienia w każdej chwili.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">
        <div className="flex items-start justify-between gap-4 rounded-lg border border-border/60 p-4">
          <div className="flex-1">
            <div className="font-medium text-foreground">Niezbędne</div>
            <p className="text-sm text-muted-foreground mt-1">
              Wymagane do logowania, bezpieczeństwa sesji i podstawowego działania interfejsu. Nie można ich wyłączyć.
            </p>
          </div>
          <Switch checked disabled aria-label="Niezbędne — zawsze włączone" />
        </div>

        <div className="flex items-start justify-between gap-4 rounded-lg border border-border/60 p-4">
          <div className="flex-1">
            <div className="font-medium text-foreground">Funkcjonalne</div>
            <p className="text-sm text-muted-foreground mt-1">
              Zapamiętują Twoje preferencje: wybranego klienta, ustawienia filtrów i widoków. Ułatwiają codzienną pracę.
            </p>
          </div>
          <Switch checked={functional} onCheckedChange={setFunctional} aria-label="Funkcjonalne" />
        </div>

        <div className="flex items-start justify-between gap-4 rounded-lg border border-border/60 p-4">
          <div className="flex-1">
            <div className="font-medium text-foreground">Analityczne</div>
            <p className="text-sm text-muted-foreground mt-1">
              Obecnie nie zbieramy żadnych danych analitycznych. Ten przełącznik przygotowuje ustawienia na przyszłość — jeżeli kiedykolwiek uruchomimy analitykę, będziemy respektować Twoją decyzję już teraz.
            </p>
          </div>
          <Switch checked={analytics} onCheckedChange={setAnalytics} aria-label="Analityczne" />
        </div>
      </div>

      <DialogFooter className="gap-2 sm:gap-2">
        <Button variant="outline" onClick={onReject}>
          Odrzuć niekonieczne
        </Button>
        <Button variant="outline" onClick={onSave}>
          Zapisz wybór
        </Button>
        <Button onClick={onAcceptAll}>
          Akceptuj wszystkie
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default CookieConsentSettings;