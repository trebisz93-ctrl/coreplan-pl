import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, currentAal, nextAal } = useAuth();

  if (loading) {
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

  return <>{children}</>;
};
