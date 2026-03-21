import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useAppSetting = (key: string) => {
  return useQuery({
    queryKey: ['app_settings', key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', key)
        .maybeSingle();
      if (error) throw error;
      return data?.value ?? null;
    },
  });
};

export const useUpdateAppSetting = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      // Try update first
      const { data, error } = await supabase
        .from('app_settings')
        .update({ value, updated_at: new Date().toISOString() })
        .eq('key', key)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        // Insert if not exists
        const { error: insertErr } = await supabase
          .from('app_settings')
          .insert({ key, value });
        if (insertErr) throw insertErr;
      }
    },
    onSuccess: (_, { key }) => {
      qc.invalidateQueries({ queryKey: ['app_settings', key] });
    },
  });
};

export const useDemoRequests = () => {
  return useQuery({
    queryKey: ['demo_requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('demo_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
};

export const useMarkDemoRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('demo_requests')
        .update({ is_read: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['demo_requests'] });
    },
  });
};
