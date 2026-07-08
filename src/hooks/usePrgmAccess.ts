import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

// Sprawdza, czy zalogowany użytkownik ma uprawnienie PRGM (kontroling) —
// dostęp do zakładki "Estymacje sprzedaży" i sekcji estymacji w formularzu aktywności.
// Admin i super_admin mają dostęp automatycznie, bez konieczności nadawania osobnej roli.
export const usePrgmAccess = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['user_roles', user?.id, 'prgm-access'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    select: (data) => data.some(r => (r.role as string) === 'prgm' || r.role === 'admin' || r.role === 'super_admin'),
  });
};
