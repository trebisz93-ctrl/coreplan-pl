import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';

export interface DbClientAssignment {
  id: string;
  user_id: string;
  client_id: string;
  created_at: string;
}

export const useClientAssignments = (userId?: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['client_assignments', userId],
    queryFn: async () => {
      let query = supabase.from('client_assignments').select('*');
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query;
      if (error) throw error;
      return data as DbClientAssignment[];
    },
    enabled: !!user,
  });
};

export const useMyClientAssignments = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['client_assignments', 'mine', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_assignments')
        .select('*')
        .eq('user_id', user!.id);
      if (error) throw error;
      return data as DbClientAssignment[];
    },
    enabled: !!user,
  });
};

export const useSetClientAssignments = () => {
  const qc = useQueryClient();
  const { orgId } = useOrganization();
  return useMutation({
    mutationFn: async ({ userId, clientIds }: { userId: string; clientIds: string[] }) => {
      // Delete existing
      const { error: delError } = await supabase
        .from('client_assignments')
        .delete()
        .eq('user_id', userId);
      if (delError) throw delError;
      // Insert new with organization_id
      if (clientIds.length > 0) {
        const rows = clientIds.map(cid => ({ user_id: userId, client_id: cid, organization_id: orgId }));
        const { error } = await supabase.from('client_assignments').insert(rows as any);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client_assignments'] }),
  });
};
