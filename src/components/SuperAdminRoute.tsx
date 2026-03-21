import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useIsSuperAdmin } from '@/hooks/useSuperAdmin';

export const SuperAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const { data: isSuperAdmin, isLoading } = useIsSuperAdmin();

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isSuperAdmin) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
};
