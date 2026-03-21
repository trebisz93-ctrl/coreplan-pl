import { Link } from 'react-router-dom';
import { CalendarDays, BarChart3, Shield, FileText, Users, Zap, ArrowRight, Mail, Clock, Database, CheckCircle2, Lock, ServerCrash, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import corePlanLogo from '@/assets/core-plan-logo.png';
import { HeroMockup } from '@/components/landing/HeroMockup';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { motion, useInView } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

const features = [
  {
    icon: CalendarDays,
    title: 'Planowanie kampanii',
    bullets: ['Widok kalendarza i Gantta', 'Harmonogram online & offline', 'Statusy w czasie rzeczywistym'],
  },
  {
    icon: BarChart3,
    title: 'Kontrola budżetu',
    bullets: ['Automatyczne sumowanie kosztów', 'Porównanie z budżetem rocznym', 'Wizualne alerty przekroczeń'],
  },
  {
    icon: FileText,
    title: 'Raporty PDF i CSV',
    bullets: ['Eksport jednym kliknięciem', 'Zestawienia po kanałach i typach', 'Gotowe do prezentacji zarządczej'],
  },
  {
    icon: Users,
    title: 'Zarządzanie klientami',
    bullets: ['Baza klientów i produktów', 'Przypisania marek i budżetów', 'Jeden panel dla całego zespołu'],
  },
  {
    icon: Zap,
    title: 'Automatyzacja workflow',
    bullets: ['Statusy zmieniają się same', 'Powiadomienia email i w aplikacji', 'Mniej ręcznej pracy'],
  },
  {
    icon: Shield,
    title: 'Bezpieczeństwo danych',
    bullets: ['Uwierzytelnianie 2FA / TOTP', 'Automatyczne backupy + audit log', 'Szyfrowanie danych w spoczynku'],
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

function AnimatedSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={fadeUp}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const LandingPage = () => {
  const [demoName, setDemoName] = useState('');
  const [demoEmail, setDemoEmail] = useState('');
  const [demoCompany, setDemoCompany] = useState('');

  const [demoLoading, setDemoLoading] = useState(false);

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoName || !demoEmail) {
      toast.error('Podaj imię i email');
      return;
    }
    setDemoLoading(true);
    try {
      // Save to database
      const { error: dbError } = await supabase.from('demo_requests').insert({
        name: demoName,
        email: demoEmail,
        company: demoCompany || null,
      });
      if (dbError) throw dbError;

      // Send notification email
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      await fetch(`https://${projectId}.supabase.co/functions/v1/send-demo-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: demoName, email: demoEmail, company: demoCompany || null }),
      });

      toast.success('Dziękujemy! Odezwiemy się w ciągu 24h.');
      setDemoName('');
      setDemoEmail('');
      setDemoCompany('');
    } catch (err: any) {
      console.error('Demo submit error:', err);
      toast.error('Coś poszło nie tak. Spróbuj ponownie.');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={corePlanLogo} alt="CorePlan logo" className="h-12 object-contain" />
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground hidden sm:inline-flex">
              <a href="#funkcje">Funkcje</a>
            </Button>
            <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground hidden sm:inline-flex">
              <a href="#bezpieczenstwo">Bezpieczeństwo</a>
            </Button>
            <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground hidden sm:inline-flex">
              <a href="#demo">Demo</a>
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
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <h1 className="text-4xl md:text-5xl lg:text-[3.25rem] font-extrabold tracking-tight text-foreground leading-[1.1]">
                CRM do mediaplanu
                <br />
                <span className="text-primary">i budżetu marketingowego</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
                Koniec z arkuszami kalkulacyjnymi. Planuj kampanie, kontroluj budżet
                i generuj raport PDF/CSV — <strong className="text-foreground">jednym kliknięciem</strong>.
              </p>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> Eliminuje arkusze</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> Raport na klik</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> Pełna kontrola budżetu</span>
              </div>
              <div className="mt-8 flex flex-wrap gap-4">
                <Button size="lg" asChild className="bg-gradient-to-r from-copper-light to-copper-dark text-primary-foreground hover:opacity-90 transition-opacity text-base px-8 h-12">
                  <a href="#demo">
                    Umów demo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button size="lg" variant="outline" asChild className="border-primary/30 text-primary hover:bg-primary/5 text-base px-8 h-12">
                  <Link to="/auth">Zaloguj się</Link>
                </Button>
              </div>
            </motion.div>
            <motion.div
              className="hidden lg:block"
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <HeroMockup />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="funkcje" className="py-24 bg-secondary/30">
        <div className="max-w-6xl mx-auto px-6">
          <AnimatedSection>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">Wszystko czego potrzebujesz</h2>
              <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
                Jeden system zamiast wielu narzędzi. CorePlan łączy planowanie, budżetowanie i raportowanie.
              </p>
            </div>
          </AnimatedSection>
          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
          >
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="bg-card rounded-xl p-6 border border-border hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <f.icon className="h-5 w-5 text-primary/70" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-3">{f.title}</h3>
                <ul className="space-y-1.5">
                  {f.bullets.map((b) => (
                    <li key={b} className="text-muted-foreground text-sm flex items-start gap-2">
                      <span className="mt-1.5 h-1 w-1 rounded-full bg-primary/40 flex-shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Security */}
      <section id="bezpieczenstwo" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <AnimatedSection>
            <div className="bg-charcoal rounded-2xl p-10 md:p-16 flex flex-col md:flex-row items-start gap-10">
              <div className="flex-shrink-0">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-copper-light to-copper-dark flex items-center justify-center">
                  <Shield className="h-10 w-10 text-primary-foreground" />
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-4">
                  Twoje dane są bezpieczne
                </h2>
                <p className="text-primary-foreground/70 text-base leading-relaxed mb-8">
                  Uwierzytelnianie dwuskładnikowe (2FA/TOTP), szyfrowanie danych w spoczynku i w transporcie (TLS),
                  automatyczne kopie zapasowe z weryfikacją integralności SHA-256 oraz pełny dziennik zmian.
                </p>
                <div className="grid sm:grid-cols-2 gap-6 mb-8">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-copper-light/10 flex items-center justify-center flex-shrink-0">
                      <Clock className="h-5 w-5 text-copper-light" />
                    </div>
                    <div>
                      <p className="text-primary-foreground text-sm font-semibold">Zaplanowane kopie zapasowe</p>
                      <p className="text-primary-foreground/50 text-sm mt-1">Automatyczna archiwizacja danych co 24h z walidacją checksum SHA-256. Retencja: 30 dni.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-copper-light/10 flex items-center justify-center flex-shrink-0">
                      <Eye className="h-5 w-5 text-copper-light" />
                    </div>
                    <div>
                      <p className="text-primary-foreground text-sm font-semibold">Dziennik audytu</p>
                      <p className="text-primary-foreground/50 text-sm mt-1">Pełna genealogia operacji — każdy INSERT, UPDATE i DELETE z migawką danych przed i po zmianie.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-copper-light/10 flex items-center justify-center flex-shrink-0">
                      <Lock className="h-5 w-5 text-copper-light" />
                    </div>
                    <div>
                      <p className="text-primary-foreground text-sm font-semibold">Szyfrowanie TLS / AES-256</p>
                      <p className="text-primary-foreground/50 text-sm mt-1">Dane szyfrowane w transporcie (TLS 1.3) i w spoczynku (AES-256). Certyfikaty odnawiane automatycznie.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-copper-light/10 flex items-center justify-center flex-shrink-0">
                      <ServerCrash className="h-5 w-5 text-copper-light" />
                    </div>
                    <div>
                      <p className="text-primary-foreground text-sm font-semibold">Disaster recovery</p>
                      <p className="text-primary-foreground/50 text-sm mt-1">Procedura przywracania danych z kopii zapasowej z weryfikacją integralności — RPO &lt; 24h.</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  {['2FA / TOTP', 'TLS 1.3', 'AES-256', 'SHA-256 checksum', 'Audit log', 'RPO < 24h'].map((tag) => (
                    <span key={tag} className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary-foreground/10 text-primary-foreground/80 border border-primary-foreground/10">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Demo form CTA */}
      <section id="demo" className="py-24 bg-secondary/30">
        <div className="max-w-6xl mx-auto px-6">
          <AnimatedSection>
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Gotowy na lepszy media plan?
              </h2>
              <p className="text-muted-foreground text-lg mb-10">
                Umów krótkie demo i sprawdź jak CorePlan usprawni Twoje kampanie.
              </p>
              <form onSubmit={handleDemoSubmit} className="bg-card border border-border rounded-xl p-6 md:p-8 shadow-sm">
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <Input
                    placeholder="Imię i nazwisko"
                    value={demoName}
                    onChange={(e) => setDemoName(e.target.value)}
                    className="h-11"
                  />
                  <Input
                    placeholder="Firma (opcjonalnie)"
                    value={demoCompany}
                    onChange={(e) => setDemoCompany(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Input
                    type="email"
                    placeholder="Twój email"
                    value={demoEmail}
                    onChange={(e) => setDemoEmail(e.target.value)}
                    className="h-11 flex-1"
                  />
                  <Button type="submit" size="lg" disabled={demoLoading} className="bg-gradient-to-r from-copper-light to-copper-dark text-primary-foreground hover:opacity-90 transition-opacity h-11 px-8">
                    <Mail className="mr-2 h-4 w-4" />
                    {demoLoading ? 'Wysyłanie...' : 'Umów demo'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Odezwiemy się w ciągu 24h. Bez spamu, obiecujemy.
                </p>
              </form>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-charcoal py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src={corePlanLogo} alt="CorePlan" className="h-10 object-contain" />
            </div>
            <p className="text-primary-foreground/40 text-sm">
              © {new Date().getFullYear()} CorePlan
            </p>
          </div>
        </div>
      </footer>

      {/* SEO content – visually hidden, accessible to crawlers */}
      <article className="sr-only" aria-hidden="true">
        <h2 className="text-sm font-semibold text-muted-foreground/60">CorePlan – CRM do mediaplanu i budżetu marketingowego</h2>
        <p>
          CorePlan to nowoczesny <strong>CRM mediowy</strong> stworzony z myślą o zespołach marketingowych, agencjach reklamowych i media plannerach.
          Nasz <strong>system do mediaplanu</strong> pozwala w jednym miejscu planować kampanie, kontrolować budżet i generować raporty.
        </p>
        <h3 className="text-xs font-semibold text-muted-foreground/60 pt-2">Planowanie kampanii online i offline</h3>
        <p>
          Dzięki intuicyjnemu widokowi kalendarza i tablicy Gantta, CorePlan umożliwia <strong>planowanie kampanii marketingowych</strong> online i offline
          z pełną kontrolą nad harmonogramem, kanałami i budżetem.
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Twórz mediaplany dla wielu klientów jednocześnie</li>
          <li>Przypisuj produkty do aktywności</li>
          <li>Śledź statusy realizacji w czasie rzeczywistym</li>
        </ul>
        <h3 className="text-xs font-semibold text-muted-foreground/60 pt-2">Kontrola budżetu marketingowego</h3>
        <p>
          <strong>Zarządzanie budżetem marketingowym</strong> nigdy nie było prostsze. CorePlan automatycznie sumuje wydatki na kampanie,
          porównuje je z rocznym budżetem klienta i wizualizuje wykorzystanie środków w przejrzystych wykresach.
        </p>
        <h3 className="text-xs font-semibold text-muted-foreground/60 pt-2">Raportowanie i eksport danych</h3>
        <p>
          Generuj profesjonalne raporty PDF i CSV jednym kliknięciem. <strong>Media plan CRM</strong> CorePlan agreguje dane z wielu kampanii
          i klientów, tworząc spójne zestawienia obejmujące kanały, typy kampanii, produkty i koszty.
        </p>
        <h3 className="text-xs font-semibold text-muted-foreground/60 pt-2">Kompletny ekosystem marketingowy</h3>
        <p>
          CorePlan to nie tylko <strong>CRM marketingowy</strong> — to kompletny ekosystem do zarządzania relacjami z klientami.
          Prowadź bazę klientów z przypisanymi produktami, markami i budżetami. Definiuj pakiety usług, zarządzaj uprawnieniami zespołu
          i utrzymuj porządek w całym procesie planowania mediów.
        </p>
      </article>
    </div>
  );
};

export default LandingPage;
