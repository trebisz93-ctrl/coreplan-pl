import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export const useIsSuperAdmin = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['is_super_admin', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id)
        .eq('role', 'super_admin');
      if (error) throw error;
      return (data?.length ?? 0) > 0;
    },
    enabled: !!user,
  });
};

export interface OrgSummary {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  member_count?: number;
  deleted_at?: string | null;
  email?: string | null;
  phone?: string | null;
  nip?: string | null;
  onboarding_completed?: boolean;
}

export const useOrganizations = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as OrgSummary[];
    },
    enabled: !!user,
  });
};

export const useSystemLogs = (limit = 50) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['system_logs', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useGlobalProfiles = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['global_profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('display_name');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useTrashCount = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['trash_count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('trash_registry')
        .select('*', { count: 'exact', head: true })
        .is('restored_at', null);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });
};
