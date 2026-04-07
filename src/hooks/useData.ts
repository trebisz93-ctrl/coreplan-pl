import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import type { SeedProduct } from '@/data/seedProducts';

export interface DbClient {
  id: string;
  user_id: string;
  name: string;
  annual_budget: number;
  created_at: string;
  updated_at: string;
}

export interface DbProduct {
  id: string;
  user_id: string;
  client_id: string;
  name: string;
  ean: string | null;
  brand: string | null;
  category: string | null;
  subcategory: string | null;
  created_at: string;
  updated_at: string;
}

// ── (Packages removed – simplified model: Client → Activity → Elements) ──

// ── Profiles & Roles (admin) ──

export const useProfiles = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('display_name');
      if (error) throw error;
      return data as DbProfile[];
    },
    enabled: !!user,
  });
};

export const useUserRoles = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['user_roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('*');
      if (error) throw error;
      return data as DbUserRole[];
    },
    enabled: !!user,
  });
};

export const useMyRole = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my_role', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles').select('role').eq('user_id', user!.id);
      if (error) throw error;
      return data?.[0]?.role as 'super_admin' | 'org_admin' | 'admin' | 'manager' | 'user' | 'viewer' | undefined;
    },
    enabled: !!user,
  });
};

export const useSetUserRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'manager' | 'user' | 'viewer' }) => {
      // Upsert role
      const { error: delError } = await supabase.from('user_roles').delete().eq('user_id', userId);
      if (delError) throw delError;
      const { error } = await supabase.from('user_roles').insert({ user_id: userId, role } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user_roles'] }),
  });
};
