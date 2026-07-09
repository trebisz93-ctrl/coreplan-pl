import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Cookie, X } from 'lucide-react';
import { useCookieConsent } from '@/hooks/useCookieConsent';

export const CookieConsent = () => {
  const { consent, save, acceptAll, rejectNonEssential } = useCookieConsent();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [functional, setFunctional] = useState(true);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    if (consent) {
      setFunctional(consent.functional);
      setAnalytics(consent.analytics);
    }
  }, [consent]);

  useEffect(() => {
    const handler = () => setSettingsOpen(true);
    window.addEventListener('coreplan:open-cookie-settings', handler);
    return () => window.removeEventListener('coreplan:open-cookie-settings', handler);
  }, []);

  const showBanner = !consent && !settingsOpen;

  return (
    <>
      {showBanner && (
        <div
          role="dialog"
          aria-live="polite"
          aria-label="Zgoda na pliki cookie"
          className="fixed bottom-0 left-0 right-0 z-[100] p-3 sm:p-4"
        >
          <div className="mx-auto max-w-4xl rounded-2xl border border-border/60 bg-card shadow-2xl p-5 sm:p-6">
            <div className="flex items-start gap-3 mb-3">
              <div className="rounded-full bg-primary/10 p-2 shrink-0">
                <Cookie className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-semibold text-foreground">Twoja prywatność ma znaczenie</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Używamy niezbędnych plików (logowanie, bezpieczeństwo, zapamiętanie interfejsu) — te są zawsze aktywne.
                  O pozostałych decydujesz Ty. Więcej w{' '}
                  <Link to="/polityka-prywatnosci" className="underline text-primary hover:text-primary/80">
                    Polityce Prywatności
                  </Link>
                  .
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => setSettingsOpen(true)} className="sm:order-1">
                Ustawienia
              </Button>
              <Button variant="outline" onClick={rejectNonEssential} className="sm:order-2">
                Odrzuć niekonieczne
              </Button>
              <Button onClick={acceptAll} className="sm:order-3">
                Akceptuj wszystkie
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
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
            <Button variant="outline" onClick={() => { rejectNonEssential(); setSettingsOpen(false); }}>
              Odrzuć niekonieczne
            </Button>
            <Button variant="outline" onClick={() => { save(functional, analytics); setSettingsOpen(false); }}>
              Zapisz wybór
            </Button>
            <Button onClick={() => { acceptAll(); setSettingsOpen(false); }}>
              Akceptuj wszystkie
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CookieConsent;