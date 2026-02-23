import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import type { Channel, CampaignType, ActivityStatus } from '@/types/mediaplan';

export interface DbActivity {
  id: string;
  user_id: string;
  client_id: string;
  plan_id: string | null;
  name: string;
  channel: Channel;
  campaign_type: CampaignType;
  start_date: string;
  end_date: string;
  product_ids: string[];
  package_id: string | null;
  price: number;
  status: ActivityStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbMediaPlan {
  id: string;
  user_id: string;
  client_id: string;
  name: string;
  year: number;
  version: string | null;
  created_at: string;
  updated_at: string;
}

/** Convert DB row to the Activity shape used by components */
export const dbToActivity = (row: DbActivity) => ({
  id: row.id,
  planId: row.plan_id || row.client_id,
  name: row.name,
  channel: row.channel,
  campaignType: row.campaign_type,
  startDate: row.start_date,
  endDate: row.end_date,
  productIds: row.product_ids || [],
  packageId: row.package_id || undefined,
  price: Number(row.price),
  status: row.status,
  note: row.note || undefined,
  confirmations: [] as any[],
});

// ── Activities ──

export const useActivities = (clientId?: string, queryEnabled = true) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['activities', user?.id, clientId],
    queryFn: async () => {
      let query = supabase.from('activities').select('*').order('start_date');
      if (clientId) query = query.eq('client_id', clientId);
      const { data, error } = await query;
      if (error) throw error;
      return (data as any[]) as DbActivity[];
    },
    enabled: !!user && queryEnabled,
  });
};

export const useActivitiesMulti = (clientIds: string[]) => {
  const { user } = useAuth();
  const key = JSON.stringify([...clientIds].sort());
  return useQuery({
    queryKey: ['activities', user?.id, 'multi', key],
    queryFn: async () => {
      if (clientIds.length === 0) return [];
      const { data, error } = await supabase
        .from('activities').select('*').in('client_id', clientIds).order('start_date');
      if (error) throw error;
      return (data as any[]) as DbActivity[];
    },
    enabled: !!user && clientIds.length > 0,
  });
};

export const useCreateActivity = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      client_id: string;
      plan_id?: string;
      name: string;
      channel: string;
      campaign_type: string;
      start_date: string;
      end_date: string;
      product_ids?: string[];
      package_id?: string;
      price: number;
      status?: string;
      note?: string;
    }) => {
      const { data, error } = await supabase
        .from('activities')
        .insert({
          ...input,
          user_id: user!.id,
          product_ids: input.product_ids || [],
          package_id: input.package_id || null,
          status: input.status || 'planned',
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as DbActivity;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activities'] }),
  });
};

export const useUpdateActivity = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase.from('activities').update(updates as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activities'] }),
  });
};

export const useDeleteActivity = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('activities').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activities'] }),
  });
};

// ── Media Plans ──

export const useMediaPlans = (clientId?: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['media_plans', user?.id, clientId],
    queryFn: async () => {
      let query = supabase.from('media_plans').select('*').order('year', { ascending: false });
      if (clientId) query = query.eq('client_id', clientId);
      const { data, error } = await query;
      if (error) throw error;
      return (data as any[]) as DbMediaPlan[];
    },
    enabled: !!user,
  });
};

export const useCreateMediaPlan = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { client_id: string; name: string; year?: number; version?: string }) => {
      const { data, error } = await supabase
        .from('media_plans')
        .insert({ ...input, user_id: user!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as DbMediaPlan;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['media_plans'] }),
  });
};
