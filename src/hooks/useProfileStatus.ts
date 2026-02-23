import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export const useMyProfileStatus = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['profile_status', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('status')
        .eq('user_id', user!.id)
        .single();
      if (error) throw error;
      return data?.status as string;
    },
    enabled: !!user,
  });
};

export const usePendingProfiles = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['pending_profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'pending')
        .order('created_at');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useApproveUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: 'active' | 'rejected' }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ status } as any)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pending_profiles'] });
      qc.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
};
