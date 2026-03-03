import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useMyRole } from '@/hooks/useData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldCheck, ShieldOff, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export const MfaSetup = () => {
  const { refreshAal } = useAuth();
  const { data: myRole } = useMyRole();
  const isAdmin = myRole === 'admin';

  const [factors, setFactors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [enrollFactorId, setEnrollFactorId] = useState('');
  const [copied, setCopied] = useState(false);

  const loadFactors = async () => {
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      setFactors(data?.totp || []);
    } catch {
      setFactors([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadFactors(); }, []);

  const hasTotp = factors.length > 0;

  const handleEnroll = async () => {
    setEnrolling(true);
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'CorePlan',
    });
    if (error) {
      toast.error('Błąd podczas konfiguracji 2FA: ' + error.message);
      setEnrolling(false);
      return;
    }
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setEnrollFactorId(data.id);
  };

  const handleVerifyEnroll = async () => {
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: enrollFactorId,
    });
    if (challengeError) {
      toast.error('Błąd: ' + challengeError.message);
      return;
    }
    const { error } = await supabase.auth.mfa.verify({
      factorId: enrollFactorId,
      challengeId: challengeData.id,
      code: verifyCode,
    });
    if (error) {
      toast.error('Nieprawidłowy kod: ' + error.message);
      return;
    }
    toast.success('2FA zostało aktywowane!');
    setEnrolling(false);
    setQrCode('');
    setSecret('');
    setVerifyCode('');
    setEnrollFactorId('');
    await refreshAal();
    await loadFactors();
  };

  const handleUnenroll = async () => {
    if (isAdmin) {
      toast.error('Administrator nie może wyłączyć 2FA.');
      return;
    }
    const factor = factors[0];
    if (!factor) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    if (error) {
      toast.error('Błąd: ' + error.message);
      return;
    }
    toast.success('2FA zostało wyłączone.');
    await refreshAal();
    await loadFactors();
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-4 w-4" /> Uwierzytelnianie dwuskładnikowe (2FA)
        </CardTitle>
        <CardDescription>
          Zabezpiecz swoje konto kodem TOTP (Google Authenticator, 1Password itp.)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasTotp && !enrolling && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium">2FA jest aktywne</span>
              <Badge variant="secondary">TOTP</Badge>
            </div>
            {isAdmin ? (
              <p className="text-xs text-muted-foreground">
                Jako administrator nie możesz wyłączyć 2FA — jest obowiązkowe.
              </p>
            ) : (
              <Button variant="destructive" size="sm" onClick={handleUnenroll}>
                <ShieldOff className="h-4 w-4 mr-2" />
                Wyłącz 2FA
              </Button>
            )}
          </div>
        )}

        {!hasTotp && !enrolling && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ShieldOff className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">2FA nie jest aktywne</span>
            </div>
            {isAdmin && (
              <p className="text-xs text-destructive font-medium">
                ⚠️ Jako administrator musisz włączyć 2FA.
              </p>
            )}
            <Button onClick={handleEnroll}>
              <Shield className="h-4 w-4 mr-2" />
              Włącz 2FA
            </Button>
          </div>
        )}

        {enrolling && qrCode && (
          <div className="space-y-4">
            <div className="text-sm font-medium">Krok 1: Zeskanuj kod QR</div>
            <div className="flex justify-center bg-white rounded-lg p-4">
              <img src={qrCode} alt="QR Code" className="w-48 h-48" />
            </div>
            <div className="text-sm text-muted-foreground">
              Lub wpisz klucz ręcznie:
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-muted px-3 py-2 rounded font-mono break-all">
                {secret}
              </code>
              <Button variant="outline" size="sm" onClick={copySecret}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <div className="text-sm font-medium mt-4">Krok 2: Wpisz kod z aplikacji</div>
            <div className="space-y-2">
              <Label htmlFor="enroll-code">Kod weryfikacyjny (6 cyfr)</Label>
              <Input
                id="enroll-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={verifyCode}
                onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="text-center text-lg tracking-widest font-mono"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleVerifyEnroll} disabled={verifyCode.length !== 6}>
                Aktywuj 2FA
              </Button>
              <Button variant="outline" onClick={() => {
                setEnrolling(false);
                setQrCode('');
                setSecret('');
                setVerifyCode('');
                if (enrollFactorId) {
                  supabase.auth.mfa.unenroll({ factorId: enrollFactorId });
                }
              }}>
                Anuluj
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              ⚠️ Zapisz klucz tajny w bezpiecznym miejscu. W przypadku utraty dostępu do aplikacji uwierzytelniającej będziesz mógł go użyć do odzyskania konta.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
