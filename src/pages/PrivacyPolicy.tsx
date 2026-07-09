import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import corePlanLogo from '@/assets/core-plan-logo.png';
import { openCookieSettings } from '@/hooks/useCookieConsent';

const PrivacyPolicy = () => {
  const today = '07.04.2026';

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <img src={corePlanLogo} alt="CorePlan" className="h-8 object-contain" />
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-primary mb-2">Polityka Prywatności</h1>
        <p className="text-muted-foreground mb-8">Aplikacja CorePlan — obowiązuje od {today}</p>
        <hr className="border-primary/30 mb-8" />

        <div className="prose prose-sm max-w-none space-y-8 text-foreground">
          <section>
            <h2 className="text-xl font-bold text-primary">1. Administrator danych</h2>
            <p>Administratorem danych osobowych przetwarzanych w aplikacji CorePlan jest podmiot, który zawarł umowę na korzystanie z platformy CorePlan (dalej: „Administrator"). Dane kontaktowe Administratora są dostępne w ustawieniach organizacji w aplikacji.</p>
            <p>CorePlan (dostępny pod adresem coreplan.pl) pełni rolę procesora danych na podstawie umowy powierzenia przetwarzania danych osobowych.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-primary">2. Jakie dane zbieramy</h2>
            <h3 className="text-lg font-semibold">2.1 Dane podawane przez użytkownika</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Adres e-mail (rejestracja i logowanie)</li>
              <li>Imię i nazwisko</li>
              <li>Nazwa stanowiska (opcjonalnie)</li>
              <li>Nazwa wyświetlana</li>
            </ul>
            <h3 className="text-lg font-semibold mt-4">2.2 Dane generowane automatycznie</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Adres IP i dane przeglądarki (logi systemowe)</li>
              <li>Identyfikator sesji</li>
              <li>Data i godzina logowania/wylogowania</li>
              <li>Historia działań w aplikacji (audit log)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-primary">3. Cele przetwarzania</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Zapewnienie dostępu do aplikacji i świadczenie usług (art. 6 ust. 1 lit. b RODO)</li>
              <li>Zapewnienie bezpieczeństwa systemu i danych (art. 6 ust. 1 lit. f RODO)</li>
              <li>Wysyłanie powiadomień systemowych i e-maili transakcyjnych (art. 6 ust. 1 lit. b RODO)</li>
              <li>Prowadzenie logów audytowych (art. 6 ust. 1 lit. f RODO)</li>
              <li>Tworzenie kopii zapasowych (art. 6 ust. 1 lit. f RODO)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-primary">4. Okres przechowywania danych</h2>
            <p>Dane osobowe są przechowywane przez okres obowiązywania umowy z Administratorem. Po zakończeniu umowy dane są usuwane w ciągu 30 dni, chyba że obowiązek ich przechowywania wynika z przepisów prawa.</p>
            <p>Dane z logów systemowych są przechowywane przez 90 dni. Kopie zapasowe są automatycznie usuwane po 30 dniach.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-primary">5. Udostępnianie danych</h2>
            <p>Dane mogą być udostępniane:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Dostawcom infrastruktury chmurowej (serwery w UE)</li>
              <li>Dostawcom usług e-mail (wysyłka e-maili transakcyjnych z domeny notify.coreplan.pl)</li>
              <li>Dostawcom usług DNS i CDN (Cloudflare)</li>
            </ul>
            <p>Dane nie są przekazywane do państw trzecich poza EOG, chyba że dostawca zapewnia odpowiednie zabezpieczenia (np. standardowe klauzule umowne).</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-primary">6. Prawa użytkowników</h2>
            <p>Każdy użytkownik ma prawo do:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Dostępu do swoich danych</li>
              <li>Sprostowania danych</li>
              <li>Usunięcia danych („prawo do bycia zapomnianym")</li>
              <li>Ograniczenia przetwarzania</li>
              <li>Przenoszenia danych</li>
              <li>Wniesienia sprzeciwu wobec przetwarzania</li>
              <li>Złożenia skargi do Prezesa UODO</li>
            </ul>
            <p>W celu skorzystania z praw należy skontaktować się z Administratorem organizacji lub wysłać wiadomość na adres kontaktowy dostępny w aplikacji.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-primary">7. Bezpieczeństwo danych</h2>
            <p>Stosujemy następujące środki ochrony danych:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Szyfrowanie transmisji (TLS/HTTPS)</li>
              <li>Uwierzytelnianie dwuskładnikowe (2FA/TOTP)</li>
              <li>System ról i uprawnień (RBAC) z izolacją danych organizacji</li>
              <li>Ochrona haseł przed wyciekami (integracja HIBP)</li>
              <li>Automatyczne kopie zapasowe</li>
              <li>Logi audytowe wszystkich operacji na danych</li>
              <li>Row Level Security (RLS) na poziomie bazy danych</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-primary">8. Pliki cookie</h2>
            <p>
              Aplikacja CorePlan korzysta wyłącznie z technologii przeglądarki (localStorage oraz plików cookie sesyjnych)
              niezbędnych do działania: utrzymania zalogowanej sesji, bezpieczeństwa oraz zapamiętania ustawień interfejsu.
              Opcjonalnie — za Twoją zgodą — zapamiętujemy również preferencje użytkownika (wybrany klient, filtry).
              Nie stosujemy plików cookie marketingowych ani narzędzi analitycznych firm trzecich.
            </p>
            <p className="mt-2">
              <button
                type="button"
                onClick={openCookieSettings}
                className="underline text-primary hover:text-primary/80"
              >
                Zarządzaj ustawieniami cookies
              </button>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-primary">9. Zmiany polityki</h2>
            <p>Zastrzegamy sobie prawo do zmiany niniejszej polityki. O istotnych zmianach użytkownicy zostaną poinformowani za pośrednictwem aplikacji lub drogą mailową.</p>
            <p className="text-muted-foreground text-sm mt-4">Data ostatniej aktualizacji: {today}</p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border/40 py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} CorePlan. Wszelkie prawa zastrzeżone.
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
