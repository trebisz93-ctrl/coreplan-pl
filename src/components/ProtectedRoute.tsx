import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useMyProfileStatus } from '@/hooks/useProfileStatus';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, LogOut } from 'lucide-react';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, currentAal, nextAal, signOut } = useAuth();
  const { data: profileStatus, isLoading: statusLoading } = useMyProfileStatus();

  if (loading || (user && statusLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // User has MFA enrolled but hasn't completed verification
  if (currentAal === 'aal1' && nextAal === 'aal2') {
    return <Navigate to="/auth" replace />;
  }

  // User is pending approval
  if (profileStatus === 'pending') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Konto oczekuje na zatwierdzenie</CardTitle>
            <CardDescription>
              Administrator musi zatwierdzić Twoje konto. Powiadomimy Cię mailowo, gdy konto zostanie aktywowane.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => signOut()} className="gap-2">
              <LogOut className="h-4 w-4" /> Wyloguj się
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User is rejected
  if (profileStatus === 'rejected') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-xl text-destructive">Konto odrzucone</CardTitle>
            <CardDescription>
              Twoje konto zostało odrzucone przez administratora. Skontaktuj się z administratorem, aby uzyskać więcej informacji.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => signOut()} className="gap-2">
              <LogOut className="h-4 w-4" /> Wyloguj się
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
