import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tokenHash, setTokenHash] = useState<string | null>(null);
  const [tokenType, setTokenType] = useState<string | null>(null);
  const [hasExistingSession, setHasExistingSession] = useState(false);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    // WAŻNE — bezpieczeństwo przed skanerami linków (Proofpoint URL Defense,
    // Microsoft Safe Links itp.): NIE wolno zamieniać tokenu na sesję
    // (supabase.auth.verifyOtp) automatycznie przy samym wejściu na stronę.
    // Firmowe filtry pocztowe automatycznie "odwiedzają" (GET) każdy link
    // w mailu, żeby go zeskanować pod kątem phishingu — jeśli sama wizyta
    // na stronie zużywałaby token, skaner zdąży to zrobić, zanim prawdziwy
    // użytkownik kliknie link, i użytkownik dostanie "token wygasł" za
    // każdym razem.
    //
    // Dlatego tutaj TYLKO odczytujemy token_hash + type z query stringu
    // (samo odczytanie URL nic nie konsumuje) i czekamy z jego zużyciem
    // do chwili, gdy użytkownik faktycznie wypełni i wyśle formularz
    // ustawienia hasła — czego żaden automatyczny skaner nie robi.
    const params = new URLSearchParams(window.location.search);
    const th = params.get('token_hash');
    const type = params.get('type');

    if (th && type) {
      setTokenHash(th);
      setTokenType(type);
      setChecking(false);
      return;
    }

    // Brak token_hash w query stringu — sprawdź, czy może użytkownik ma już
    // aktywną sesję (np. wrócił na tę stronę będąc już zalogowanym).
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasExistingSession(!!session);
      if (!session) setInvalid(true);
      setChecking(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Hasło musi mieć co najmniej 8 znaków');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Hasła nie są identyczne');
      return;
    }

    setIsSubmitting(true);

    // Token jest zamieniany na sesję DOPIERO teraz — w momencie realnej
    // interakcji użytkownika, nie przy wejściu na stronę.
    if (tokenHash && tokenType) {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: tokenType as 'recovery' | 'invite' | 'email' | 'signup',
      });
      if (verifyError) {
        setIsSubmitting(false);
        toast.error('Link wygasł lub został już użyty. Poproś administratora o nowe zaproszenie.');
        setInvalid(true);
        setTokenHash(null);
        return;
      }
    }

    const { error } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Hasło zostało ustawione. Witaj w CorePlan!');
      navigate('/app');
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Ładowanie...</CardTitle>
            <CardDescription>Weryfikujemy Twój link</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invalid && !tokenHash && !hasExistingSession) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Link wygasł lub jest nieprawidłowy</CardTitle>
            <CardDescription>
              Skontaktuj się z administratorem, aby otrzymać nowe zaproszenie.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate('/auth')}>
              Przejdź do logowania
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Ustaw hasło</CardTitle>
          <CardDescription>Wprowadź nowe hasło, aby aktywować swoje konto CorePlan</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nowe hasło</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="Min. 8 znaków"
                minLength={8}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Powtórz hasło</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                placeholder="Powtórz hasło"
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Zapisywanie...' : 'Ustaw hasło i zaloguj'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
