import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';

export interface OrgMember {
  id: string;
  user_id: string;
  organization_id: string;
  org_role: string;
  created_at: string;
}

/** Get all members of the current organization */
export const useOrgMembers = () => {
  const { user } = useAuth();
  const { orgId } = useOrganization();

  return useQuery({
    queryKey: ['org_members', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', orgId!);
      if (error) throw error;
      return data as OrgMember[];
    },
    enabled: !!user && !!orgId,
  });
};

/** Set a member's org_role within the current organization */
export const useSetOrgRole = () => {
  const qc = useQueryClient();
  const { orgId } = useOrganization();

  return useMutation({
    mutationFn: async ({ userId, orgRole }: { userId: string; orgRole: string }) => {
      if (!orgId) throw new Error('Brak aktywnej organizacji');

      const { error } = await supabase
        .from('organization_members')
        .update({ org_role: orgRole } as any)
        .eq('user_id', userId)
        .eq('organization_id', orgId);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org_members'] });
      qc.invalidateQueries({ queryKey: ['my_org_role'] });
    },
  });
};
