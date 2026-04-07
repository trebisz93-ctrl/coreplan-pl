import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import corePlanLogo from '@/assets/core-plan-logo.png';

const Terms = () => {
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
        <h1 className="text-3xl font-bold text-primary mb-2">Regulamin Aplikacji CorePlan</h1>
        <p className="text-muted-foreground mb-8">Obowiązuje od {today}</p>
        <hr className="border-primary/30 mb-8" />

        <div className="prose prose-sm max-w-none space-y-8 text-foreground">
          <section>
            <h2 className="text-xl font-bold text-primary">1. Postanowienia ogólne</h2>
            <p>Niniejszy regulamin określa zasady korzystania z aplikacji CorePlan dostępnej pod adresem coreplan.pl (dalej: „Aplikacja").</p>
            <p>Aplikacja jest platformą SaaS (Software as a Service) do planowania i zarządzania kampaniami mediowymi, budżetami klientów oraz produktami.</p>
            <p>Korzystanie z Aplikacji oznacza akceptację niniejszego Regulaminu oraz Polityki Prywatności.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-primary">2. Definicje</h2>
            <p><strong>Operator</strong> — podmiot udostępniający Aplikację CorePlan.</p>
            <p><strong>Administrator Organizacji (org_admin)</strong> — osoba zarządzająca kontem organizacji w Aplikacji.</p>
            <p><strong>Użytkownik</strong> — każda osoba posiadająca konto w Aplikacji, zaproszona przez Administratora Organizacji.</p>
            <p><strong>Organizacja</strong> — firma lub zespół, którego dane są zarządzane w ramach jednego konta organizacyjnego.</p>
            <p><strong>Super Admin</strong> — administrator globalny platformy, zarządzający strukturą organizacji.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-primary">3. Warunki korzystania</h2>
            <h3 className="text-lg font-semibold">3.1 Rejestracja i dostęp</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Dostęp do Aplikacji jest możliwy wyłącznie na zaproszenie Administratora Organizacji lub Super Admina.</li>
              <li>Każdy Użytkownik musi posiadać unikalne konto powiązane z adresem e-mail.</li>
              <li>Publiczna samodzielna rejestracja wymaga zatwierdzenia przez administratora.</li>
              <li>Użytkownik zobowiązany jest do ochrony swoich danych logowania.</li>
            </ul>

            <h3 className="text-lg font-semibold mt-4">3.2 Role i uprawnienia</h3>
            <p>System uprawnień oparty jest na hierarchii ról:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Super Admin — pełny dostęp globalny, zarządzanie organizacjami</li>
              <li>Administrator Organizacji (org_admin) — zarządzanie użytkownikami i danymi w ramach swojej organizacji</li>
              <li>Manager — rozszerzony dostęp do danych organizacji</li>
              <li>Użytkownik (user) — standardowy dostęp operacyjny</li>
              <li>Przeglądający (viewer) — dostęp tylko do odczytu</li>
            </ul>
            <p>Uprawnienia są przypisywane przez Administratora Organizacji i mogą być zmieniane w dowolnym momencie.</p>

            <h3 className="text-lg font-semibold mt-4">3.3 Izolacja danych</h3>
            <p>Dane każdej Organizacji są w pełni odizolowane. Użytkownicy jednej Organizacji nie mają dostępu do danych innej Organizacji.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-primary">4. Obowiązki Użytkownika</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Użytkownik zobowiązuje się do korzystania z Aplikacji zgodnie z prawem i niniejszym Regulaminem.</li>
              <li>Zabronione jest podejmowanie prób uzyskania nieautoryzowanego dostępu do danych innych Organizacji.</li>
              <li>Zabronione jest udostępnianie danych logowania osobom trzecim.</li>
              <li>Użytkownik ponosi odpowiedzialność za treści wprowadzane do Aplikacji.</li>
              <li>W przypadku podejrzenia naruszenia bezpieczeństwa Użytkownik powinien niezwłocznie poinformować Administratora Organizacji.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-primary">5. Obowiązki Operatora</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Zapewnienie dostępności Aplikacji (SLA ustalone indywidualnie z Organizacją).</li>
              <li>Ochrona danych zgodnie z RODO i najlepszymi praktykami bezpieczeństwa.</li>
              <li>Regularne tworzenie kopii zapasowych.</li>
              <li>Informowanie o planowanych przerwach technicznych z co najmniej 24-godzinnym wyprzedzeniem.</li>
              <li>Ciągłe doskonalenie i aktualizacja Aplikacji.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-primary">6. Dane i własność intelektualna</h2>
            <p>Dane wprowadzone do Aplikacji przez Organizację pozostają własnością Organizacji. Operator nie nabywa żadnych praw do tych danych.</p>
            <p>Aplikacja CorePlan, jej kod źródłowy, interfejs graficzny, dokumentacja oraz znak towarowy są własnością Operatora i są chronione prawem autorskim.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-primary">7. Odpowiedzialność</h2>
            <p>Operator nie ponosi odpowiedzialności za:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Szkody wynikające z nieprawidłowego korzystania z Aplikacji przez Użytkownika.</li>
              <li>Utratę danych spowodowaną działaniem siły wyższej.</li>
              <li>Przerwy w działaniu wynikające z awarii infrastruktury dostawców chmurowych.</li>
              <li>Treści wprowadzone do Aplikacji przez Użytkowników.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-primary">8. Usunięcie konta</h2>
            <p>Administrator Organizacji może dezaktywować konto Użytkownika w dowolnym momencie.</p>
            <p>Po zakończeniu umowy z Organizacją, dane są usuwane zgodnie z Polityką Prywatności (30 dni).</p>
            <p>Użytkownik może złożyć wniosek o usunięcie swoich danych do Administratora Organizacji.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-primary">9. Zmiany Regulaminu</h2>
            <p>Operator zastrzega sobie prawo do zmiany Regulaminu. O zmianach Użytkownicy zostaną poinformowani z co najmniej 14-dniowym wyprzedzeniem za pośrednictwem Aplikacji lub e-maila.</p>
            <p>Kontynuowanie korzystania z Aplikacji po wejściu zmian w życie oznacza ich akceptację.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-primary">10. Postanowienia końcowe</h2>
            <p>W sprawach nieuregulowanych niniejszym Regulaminem zastosowanie mają przepisy prawa polskiego.</p>
            <p>Wszelkie spory będą rozstrzygane przez sąd właściwy dla siedziby Operatora.</p>
            <p>Regulamin wchodzi w życie z dniem {today}.</p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border/40 py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} CorePlan. Wszelkie prawa zastrzeżone.
      </footer>
    </div>
  );
};

export default Terms;
