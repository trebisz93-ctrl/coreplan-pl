import { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Shield } from 'lucide-react';
import corePlanLogo from '@/assets/core-plan-logo.png';

const MfaScreen = ({ factorId, challengeId, setChallengeId, refreshAal }: {
  factorId: string; challengeId: string; setChallengeId: (id: string) => void; refreshAal: () => Promise<void>;
}) => {
  const [mfaCode, setMfaCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId || !challengeId) {
      toast.error('Błąd konfiguracji 2FA. Spróbuj wylogować się i zalogować ponownie.');
      return;
    }
    setIsSubmitting(true);
    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code: mfaCode });
    setIsSubmitting(false);
    if (error) {
      toast.error('Nieprawidłowy kod 2FA: ' + error.message);
      try {
        const { data: newChallenge } = await supabase.auth.mfa.challenge({ factorId });
        if (newChallenge) setChallengeId(newChallenge.id);
      } catch {}
      setMfaCode('');
    } else {
      await refreshAal();
    }
  };

  return (
    <Card className="w-full max-w-md shadow-xl border-border/50">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">Weryfikacja 2FA</CardTitle>
        <CardDescription>Wprowadź 6-cyfrowy kod z aplikacji uwierzytelniającej</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleMfaVerify} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mfa-code">Kod TOTP</Label>
            <Input id="mfa-code" type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
              value={mfaCode} onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))}
              required placeholder="000000" className="text-center text-2xl tracking-widest font-mono" autoFocus />
          </div>
          <Button type="submit" className="w-full bg-gradient-to-r from-copper-light to-copper-dark text-primary-foreground hover:opacity-90" disabled={isSubmitting || mfaCode.length !== 6}>
            {isSubmitting ? 'Weryfikacja...' : 'Zweryfikuj'}
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={() => supabase.auth.signOut()}>
            Wyloguj się
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

const Auth = () => {
  const { user, loading, signIn, signUp, resetPassword, currentAal, nextAal, refreshAal } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [factorId, setFactorId] = useState('');
  const [challengeId, setChallengeId] = useState('');

  const needsMfa = !!user && currentAal === 'aal1' && nextAal === 'aal2';

  useEffect(() => {
    if (needsMfa) {
      (async () => {
        try {
          const { data } = await supabase.auth.mfa.listFactors();
          const totp = data?.totp?.[0];
          if (totp) {
            setFactorId(totp.id);
            const { data: challengeData } = await supabase.auth.mfa.challenge({ factorId: totp.id });
            if (challengeData) setChallengeId(challengeData.id);
          }
        } catch (e) {
          console.error('MFA factor loading error:', e);
        }
      })();
    }
  }, [needsMfa]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (user && !needsMfa) return <Navigate to="/app" replace />;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { error } = await signIn(email, password);
    setIsSubmitting(false);
    if (error) toast.error(error.message);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { error } = await signUp(email, password);
    setIsSubmitting(false);
    if (error) toast.error(error.message);
    else toast.success('Rejestracja udana! Administrator musi zatwierdzić Twoje konto. Sprawdź e-mail.');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { error } = await resetPassword(resetEmail);
    setIsSubmitting(false);
    if (error) toast.error(error.message);
    else { toast.success('Link do resetowania hasła został wysłany na e-mail.'); setShowReset(false); }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navbar */}
      <nav className="bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={corePlanLogo} alt="CorePlan logo" className="h-9 object-contain" />
          </Link>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center p-4">
        {needsMfa ? (
          <MfaScreen factorId={factorId} challengeId={challengeId} setChallengeId={setChallengeId} refreshAal={refreshAal} />
        ) : showReset ? (
          <Card className="w-full max-w-md shadow-xl border-border/50">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Resetowanie hasła</CardTitle>
              <CardDescription>Podaj adres e-mail, aby zresetować hasło</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">E-mail</Label>
                  <Input id="reset-email" type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required placeholder="twoj@email.com" />
                </div>
                <Button type="submit" className="w-full bg-gradient-to-r from-copper-light to-copper-dark text-primary-foreground hover:opacity-90" disabled={isSubmitting}>
                  {isSubmitting ? 'Wysyłanie...' : 'Wyślij link resetujący'}
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => setShowReset(false)}>
                  Wróć do logowania
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full max-w-md shadow-xl border-border/50">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <img src={corePlanLogo} alt="CorePlan logo" className="h-10 object-contain" />
              </div>
              <CardDescription>Zaloguj się lub utwórz konto</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Logowanie</TabsTrigger>
                  <TabsTrigger value="register">Rejestracja</TabsTrigger>
                </TabsList>
                <TabsContent value="login">
                  <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">E-mail</Label>
                      <Input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="twoj@email.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Hasło</Label>
                      <Input id="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
                    </div>
                    <Button type="submit" className="w-full bg-gradient-to-r from-copper-light to-copper-dark text-primary-foreground hover:opacity-90" disabled={isSubmitting}>
                      {isSubmitting ? 'Logowanie...' : 'Zaloguj się'}
                    </Button>
                    <Button type="button" variant="link" className="w-full text-primary" onClick={() => setShowReset(true)}>
                      Zapomniałem hasła
                    </Button>
                  </form>
                </TabsContent>
                <TabsContent value="register">
                  <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-email">E-mail</Label>
                      <Input id="reg-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="twoj@email.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-password">Hasło</Label>
                      <Input id="reg-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min. 6 znaków" minLength={6} />
                    </div>
                    <Button type="submit" className="w-full bg-gradient-to-r from-copper-light to-copper-dark text-primary-foreground hover:opacity-90" disabled={isSubmitting}>
                      {isSubmitting ? 'Rejestracja...' : 'Zarejestruj się'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Auth;
