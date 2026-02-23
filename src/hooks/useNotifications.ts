import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';

export interface Notification {
  id: string;
  user_id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  category: 'system' | 'activity' | 'account' | 'budget';
  title: string;
  description: string | null;
  entity_id: string | null;
  is_read: boolean;
  cta_path: string | null;
  created_at: string;
}

export const useNotifications = (category?: string) => {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['notifications', category],
    queryFn: async () => {
      let q = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (category && category !== 'all') {
        q = q.eq('category', category);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!session,
  });
};

export const useUnreadCount = () => {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!session,
  });

  // Realtime subscription
  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session, queryClient]);

  return query;
};

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
};

export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
};
