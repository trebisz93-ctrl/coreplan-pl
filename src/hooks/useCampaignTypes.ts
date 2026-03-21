import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';

export interface DbCampaignType {
  id: string;
  user_id: string;
  name: string;
  label: string;
  created_at: string;
}

export const useCampaignTypes = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['campaign_types', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_types')
        .select('*')
        .order('label');
      if (error) throw error;
      return data as DbCampaignType[];
    },
    enabled: !!user,
  });
};

export const useCreateCampaignType = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { orgId } = useOrganization();
  return useMutation({
    mutationFn: async ({ name, label }: { name: string; label: string }) => {
      const { data, error } = await supabase
        .from('campaign_types')
        .insert({ name, label, user_id: user!.id, organization_id: orgId } as any)
        .select()
        .single();
      if (error) throw error;
      return data as DbCampaignType;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaign_types'] }),
  });
};

export const useUpdateCampaignType = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name, label }: { id: string; name: string; label: string }) => {
      const { error } = await supabase
        .from('campaign_types')
        .update({ name, label } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaign_types'] }),
  });
};

export const useDeleteCampaignType = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('campaign_types')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaign_types'] }),
  });
};
