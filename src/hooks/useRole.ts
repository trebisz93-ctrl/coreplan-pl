import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';

/**
 * Returns the user's org_role in the CURRENT organization from organization_members.
 * For super_admin (determined via user_roles), returns 'super_admin'.
 */
export const useMyOrgRole = () => {
  const { user } = useAuth();
  const { orgId, isSuperAdmin } = useOrganization();

  return useQuery({
    queryKey: ['my_org_role', user?.id, orgId],
    queryFn: async () => {
      if (isSuperAdmin) return 'super_admin' as const;
      if (!orgId) return 'user' as const;

      const { data, error } = await supabase
        .from('organization_members')
        .select('org_role')
        .eq('user_id', user!.id)
        .eq('organization_id', orgId)
        .maybeSingle();

      if (error) throw error;
      return (data?.org_role as 'org_admin' | 'manager' | 'user' | 'viewer') || 'user';
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCanEdit = () => {
  const { data: role } = useMyOrgRole();
  return role !== 'viewer';
};

export const useIsAdmin = () => {
  const { data: role } = useMyOrgRole();
  return role === 'org_admin' || role === 'super_admin';
};

export const useIsSuperAdminRole = () => {
  const { isSuperAdmin } = useOrganization();
  return isSuperAdmin;
};
