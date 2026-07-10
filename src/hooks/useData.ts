import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { toast } from 'sonner';
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

export interface DbProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  job_role: string | null;
  onboarding_completed: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface DbUserRole {
  id: string;
  user_id: string;
  role: 'super_admin' | 'org_admin' | 'admin' | 'manager' | 'user' | 'viewer' | 'prgm';
}

// ── Clients ──

export const useClients = () => {
  const { user } = useAuth();
  const { orgId } = useOrganization();
  return useQuery({
    queryKey: ['clients', user?.id, orgId],
    queryFn: async () => {
      if (!orgId) {
        // No org context — return empty (super_admin should pick an org first)
        const { data, error } = await supabase.from('clients').select('*').is('deleted_at', null).order('name');
        if (error) throw error;
        return data as DbClient[];
      }
      // Fetch only clients linked to current organization
      const { data: orgClients, error: ocError } = await supabase
        .from('organization_clients')
        .select('client_id')
        .eq('organization_id', orgId);
      if (ocError) throw ocError;
      if (!orgClients || orgClients.length === 0) return [];
      const clientIds = orgClients.map(oc => oc.client_id);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .in('id', clientIds)
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      return data as DbClient[];
    },
    enabled: !!user,
  });
};

export const useCreateClient = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { orgId } = useOrganization();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('clients').insert({ name, user_id: user!.id }).select().single();
      if (error) throw error;
      if (orgId) {
        const { error: linkErr } = await supabase
          .from('organization_clients')
          .insert({ organization_id: orgId, client_id: data.id });
        if (linkErr) throw linkErr;
      }
      return data as DbClient;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      qc.invalidateQueries({ queryKey: ['organization_clients'] });
    },
  });
};

export const useUpdateClient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('clients').update({ name }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });
};

export const useUpdateClientBudget = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, annual_budget }: { id: string; annual_budget: number }) => {
      const { error } = await supabase.from('clients').update({ annual_budget } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });
};

export const useDeleteClient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clients').update({ deleted_at: new Date().toISOString() } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

// ── Products ──

export const useProducts = (clientId?: string) => {
  const { user } = useAuth();
  const { orgId } = useOrganization();
  return useQuery({
    queryKey: ['products', user?.id, clientId, orgId],
    queryFn: async () => {
      let query = supabase.from('products').select('*').is('deleted_at', null).order('name');
      if (orgId) query = query.eq('organization_id', orgId);
      if (clientId) query = query.or(`client_id.eq.${clientId},client_id.is.null`);
      const { data, error } = await query;
      if (error) throw error;
      return data as DbProduct[];
    },
    enabled: !!user,
  });
};

export const useCreateProduct = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { orgId } = useOrganization();
  return useMutation({
    mutationFn: async ({ name, clientId, ean, category, subcategory, brand }: { name: string; clientId?: string; ean?: string; category?: string; subcategory?: string; brand?: string }) => {
      const { data, error } = await supabase
        .from('products').insert({ name, client_id: clientId || null, user_id: user!.id, organization_id: orgId, ean: ean || null, category: category || null, subcategory: subcategory || null, brand: brand || null } as any).select().single();
      if (error) throw error;
      return data as DbProduct;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
};

export const useUpdateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name, ean, category, subcategory, brand }: { id: string; name: string; ean?: string; category?: string; subcategory?: string; brand?: string }) => {
      const { error } = await supabase.from('products').update({ name, ean: ean || null, category: category || null, subcategory: subcategory || null, brand: brand || null } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
};

export const useDeleteProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').update({ deleted_at: new Date().toISOString() } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
};

export const useSeedProducts = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { orgId } = useOrganization();
  return useMutation({
    mutationFn: async ({ clientId, products }: { clientId: string; products: SeedProduct[] }) => {
      const rows = products.map(p => ({ name: p.name, ean: p.ean, client_id: clientId, user_id: user!.id, organization_id: orgId }));
      const { error } = await supabase.from('products').insert(rows as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
};

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

// useSetUserRole removed — role changes are managed server-side only (super_admin via edge functions)
