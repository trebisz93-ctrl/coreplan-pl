import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Cookie } from 'lucide-react';
import { useCookieConsent } from '@/hooks/useCookieConsent';

// Panel ustawień (Dialog + Switch + ich zależności Radix) ładuje się
// dopiero po kliknięciu "Ustawienia" — sam banner zostaje lekki i eager,
// bo to jedyna część, którą widzi ~99% odwiedzających.
const CookieConsentSettings = lazy(() => import('./CookieConsentSettings'));

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
          role="region"
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

      {settingsOpen && (
        <Suspense fallback={null}>
          <CookieConsentSettings
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            functional={functional}
            setFunctional={setFunctional}
            analytics={analytics}
            setAnalytics={setAnalytics}
            onReject={() => { rejectNonEssential(); setSettingsOpen(false); }}
            onSave={() => { save(functional, analytics); setSettingsOpen(false); }}
            onAcceptAll={() => { acceptAll(); setSettingsOpen(false); }}
          />
        </Suspense>
      )}
    </>
  );
};

export default CookieConsent;