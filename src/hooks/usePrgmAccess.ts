import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
    select: (data) => data.some(r => r.role === 'prgm' || r.role === 'admin' || r.role === 'super_admin'),
  });
};

// Które user_id w organizacji mają dziś rolę PRGM — do wyświetlenia stanu
// przełącznika przy każdym użytkowniku w UsersView. Korzysta z istniejącej
// polityki "org_admin_view_roles", więc admin firmy widzi tu role członków
// swojej organizacji bez żadnych dodatkowych uprawnień.
export const usePrgmMembers = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['user_roles', 'prgm-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'prgm');
      if (error) throw error;
      return new Set((data || []).map((r) => r.user_id as string));
    },
    enabled: !!user,
  });
};

// Nadanie roli PRGM — wąski wyjątek: wywołuje funkcję SECURITY DEFINER,
// która pozwala TYLKO na rolę 'prgm' i TYLKO w obrębie własnej organizacji
// (patrz migracja 20260708080000_prgm_grant_wyjatek.sql). Zwykły INSERT do
// user_roles nie zadziała dla admina firmy — jest celowo zablokowany
// (patrz migracja 20260418215310, deny_role_writes_non_admin).
export const useGrantPrgmRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (targetUserId: string) => {
      const { error } = await supabase.rpc('grant_prgm_role', { _target_user_id: targetUserId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user_roles', 'prgm-members'] }),
  });
};

export const useRevokePrgmRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (targetUserId: string) => {
      const { error } = await supabase.rpc('revoke_prgm_role', { _target_user_id: targetUserId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user_roles', 'prgm-members'] }),
  });
};
