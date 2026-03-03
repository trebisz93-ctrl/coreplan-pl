import { Link } from 'react-router-dom';
import { CalendarDays, BarChart3, Shield, FileText, Users, Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import corePlanLogo from '@/assets/core-plan-logo.png';

const features = [
  {
    icon: CalendarDays,
    title: 'Planowanie kampanii',
    desc: 'Widok kalendarza i Gantta z pełną kontrolą nad harmonogramem, kanałami i budżetem.',
  },
  {
    icon: BarChart3,
    title: 'Kontrola budżetu',
    desc: 'Automatyczne sumowanie wydatków, porównywanie z budżetem rocznym i wizualne alerty.',
  },
  {
    icon: FileText,
    title: 'Raporty PDF i CSV',
    desc: 'Jednym kliknięciem generujesz profesjonalne zestawienia dla klientów i zarządu.',
  },
  {
    icon: Users,
    title: 'Zarządzanie klientami',
    desc: 'Baza klientów z przypisanymi produktami, markami i budżetami w jednym panelu.',
  },
  {
    icon: Zap,
    title: 'Automatyzacja workflow',
    desc: 'Status kampanii aktualizuje się automatycznie. Powiadomienia email o zmianach.',
  },
  {
    icon: Shield,
    title: 'Bezpieczeństwo danych',
    desc: '2FA, szyfrowanie, automatyczne backupy i pełny audit log każdej operacji.',
  },
];

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={corePlanLogo} alt="CorePlan logo" className="h-9 object-contain" />
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground">
              <a href="#funkcje">Funkcje</a>
            </Button>
            <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground">
              <a href="#bezpieczenstwo">Bezpieczeństwo</a>
            </Button>
            <Button asChild className="bg-gradient-to-r from-copper-light to-copper-dark text-primary-foreground hover:opacity-90 transition-opacity">
              <Link to="/auth">Zaloguj się</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--copper)/0.06),transparent_60%)]" />
        <div className="max-w-6xl mx-auto px-6 py-24 md:py-32 relative">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1]">
              CRM do mediaplanu
              <br />
              <span className="text-primary">i budżetu marketingowego</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
              Planowanie kampanii, kontrola budżetu i raportowanie — w jednym miejscu. Koniec z arkuszami i rozproszeniem.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Button size="lg" asChild className="bg-gradient-to-r from-copper-light to-copper-dark text-primary-foreground hover:opacity-90 transition-opacity text-base px-8 h-12">
                <Link to="/auth">
                  Zaloguj się
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="border-primary/30 text-primary hover:bg-primary/5 text-base px-8 h-12">
                <a href="mailto:kontakt@coreplan.pl">Umów demo</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="funkcje" className="py-24 bg-secondary/30">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">Wszystko czego potrzebujesz</h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
              Jeden system zamiast wielu narzędzi. CorePlan łączy planowanie, budżetowanie i raportowanie.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-card rounded-xl p-6 border border-border hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="bezpieczenstwo" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="bg-charcoal rounded-2xl p-10 md:p-16 flex flex-col md:flex-row items-center gap-10">
            <div className="flex-shrink-0">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-copper-light to-copper-dark flex items-center justify-center">
                <Shield className="h-10 w-10 text-primary-foreground" />
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-4">
                Twoje dane są bezpieczne
              </h2>
              <p className="text-primary-foreground/70 text-base leading-relaxed mb-6">
                Uwierzytelnianie dwuskładnikowe (2FA), szyfrowanie danych w spoczynku i w transporcie,
                automatyczne backupy z checksumą SHA-256 oraz pełny audit log każdej operacji w systemie.
              </p>
              <div className="flex flex-wrap gap-3">
                {['2FA / TOTP', 'Szyfrowanie E2E', 'Automatyczne backupy', 'Audit log'].map((tag) => (
                  <span key={tag} className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary-foreground/10 text-primary-foreground/80 border border-primary-foreground/10">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-secondary/30">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Gotowy na lepszy media plan?
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-10">
            Dołącz do zespołów, które już kontrolują swoje kampanie i budżety z CorePlan.
          </p>
          <div className="flex justify-center gap-4">
            <Button size="lg" asChild className="bg-gradient-to-r from-copper-light to-copper-dark text-primary-foreground hover:opacity-90 transition-opacity text-base px-8 h-12">
              <Link to="/auth">
                Rozpocznij teraz
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-charcoal py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src={corePlanLogo} alt="CorePlan" className="h-7 object-contain" />
            </div>
            <p className="text-primary-foreground/40 text-sm">
              © 2026 CorePlan. All your marketing. In one place.
            </p>
          </div>
        </div>
      </footer>

      {/* SEO content */}
      <article className="max-w-4xl mx-auto px-6 py-12 text-muted-foreground/50 text-xs leading-relaxed space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground/60">CorePlan – CRM do mediaplanu i budżetu marketingowego</h2>
        <p>
          CorePlan to nowoczesny <strong>CRM mediowy</strong> stworzony z myślą o zespołach marketingowych, agencjach reklamowych i media plannerach.
          Nasz <strong>system do mediaplanu</strong> pozwala w jednym miejscu planować kampanie, kontrolować budżet i generować raporty —
          bez potrzeby żonglowania arkuszami kalkulacyjnymi i wieloma narzędziami.
        </p>
        <p>
          Dzięki intuicyjnemu widokowi kalendarza i tablicy Gantta, CorePlan umożliwia <strong>planowanie kampanii marketingowych</strong> online i offline
          z pełną kontrolą nad harmonogramem, kanałami i budżetem. Twórz mediaplany dla wielu klientów jednocześnie, przypisuj produkty do aktywności
          i śledź statusy realizacji w czasie rzeczywistym.
        </p>
        <p>
          <strong>Zarządzanie budżetem marketingowym</strong> nigdy nie było prostsze. CorePlan automatycznie sumuje wydatki na kampanie,
          porównuje je z rocznym budżetem klienta i wizualizuje wykorzystanie środków w przejrzystych wykresach.
          Koniec z przekraczaniem budżetu — system ostrzega, gdy zbliżasz się do limitu.
        </p>
        <p>
          Generuj profesjonalne raporty PDF i CSV jednym kliknięciem. <strong>Media plan CRM</strong> CorePlan agreguje dane z wielu kampanii
          i klientów, tworząc spójne zestawienia obejmujące kanały, typy kampanii, produkty i koszty.
          Eksportuj dane do dalszej analizy lub prezentacji zarządczych.
        </p>
        <p>
          CorePlan to nie tylko <strong>CRM marketingowy</strong> — to kompletny ekosystem do zarządzania relacjami z klientami.
          Prowadź bazę klientów z przypisanymi produktami, markami i budżetami. Definiuj pakiety usług, zarządzaj uprawnieniami zespołu
          i utrzymuj porządek w całym procesie planowania mediów. Wypróbuj CorePlan i odkryj, jak prosty może być
          <strong>system do mediaplanu</strong> nowej generacji.
        </p>
      </article>
    </div>
  );
};

export default LandingPage;
