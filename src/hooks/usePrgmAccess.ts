import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';

// Sprawdza, czy zalogowany użytkownik ma uprawnienie PRGM (kontroling) —
// dostęp do zakładki "Estymacje sprzedaży", sekcji estymacji w formularzu
// aktywności i cennika produktów.
//
// WAŻNE (poprawka): admin firmy ma dostęp automatycznie — sprawdzamy
// organization_members.org_role === 'org_admin', czyli TĘ SAMĄ rolę, którą
// wszędzie indziej w aplikacji rozumiemy jako "admin firmy" (patrz useIsAdmin
// w useRole.ts). Wcześniej ten hook sprawdzał tylko globalną rolę
// user_roles.role === 'admin' — to inne, rzadziej nadawane pojęcie (bliższe
// "adminowi platformy" niż "adminowi konkretnej firmy"), przez co realny
// admin firmy bez tej dodatkowej, globalnej roli nie widział opcji cennika
// ani estymacji, mimo że powinien mieć do nich dostęp.
export const usePrgmAccess = () => {
  const { user } = useAuth();
  const { orgId, isSuperAdmin } = useOrganization();
  return useQuery({
    queryKey: ['prgm-access', user?.id, orgId, isSuperAdmin],
    queryFn: async () => {
      if (isSuperAdmin) return true;

      if (orgId) {
        const { data: member, error: memberError } = await supabase
          .from('organization_members')
          .select('org_role')
          .eq('user_id', user!.id)
          .eq('organization_id', orgId)
          .maybeSingle();
        if (memberError) throw memberError;
        if (member?.org_role === 'org_admin') return true;
      }

      // Albo dedykowana rola PRGM nadana przez admina firmy — patrz grant_prgm_role.
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id);
      if (rolesError) throw rolesError;
      return roles.some(r => (r.role as string) === 'prgm' || r.role === 'super_admin');
    },
    enabled: !!user,
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
