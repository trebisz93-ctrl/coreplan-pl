import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
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

export interface DbPackage {
  id: string;
  user_id: string;
  name: string;
  description: string;
  default_price: number;
  items: { id: string; name: string; quantity: number; unitPrice: number }[];
  created_at: string;
  updated_at: string;
}

export interface DbProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbUserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'manager' | 'user' | 'viewer';
}

// ── Clients ──

export const useClients = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['clients', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('*').order('name');
      if (error) throw error;
      return data as DbClient[];
    },
    enabled: !!user,
  });
};

export const useCreateClient = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('clients').insert({ name, user_id: user!.id }).select().single();
      if (error) throw error;
      return data as DbClient;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
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
      const { error } = await supabase.from('clients').delete().eq('id', id);
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
  return useQuery({
    queryKey: ['products', user?.id, clientId],
    queryFn: async () => {
      let query = supabase.from('products').select('*').order('name');
      if (clientId) query = query.eq('client_id', clientId);
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
  return useMutation({
    mutationFn: async ({ name, clientId, ean }: { name: string; clientId: string; ean?: string }) => {
      const { data, error } = await supabase
        .from('products').insert({ name, client_id: clientId, user_id: user!.id, ean: ean || null } as any).select().single();
      if (error) throw error;
      return data as DbProduct;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
};

export const useUpdateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name, ean }: { id: string; name: string; ean?: string }) => {
      const { error } = await supabase.from('products').update({ name, ean: ean || null } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
};

export const useDeleteProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
};

export const useSeedProducts = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ clientId, products }: { clientId: string; products: SeedProduct[] }) => {
      const rows = products.map(p => ({ name: p.name, ean: p.ean, client_id: clientId, user_id: user!.id }));
      const { error } = await supabase.from('products').insert(rows as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
};

// ── Packages ──

export const usePackages = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['packages', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('packages').select('*').order('name');
      if (error) throw error;
      return data as DbPackage[];
    },
    enabled: !!user,
  });
};

export const useCreatePackage = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (pkg: { name: string; description: string; default_price: number; items: any[] }) => {
      const { data, error } = await supabase
        .from('packages').insert({ ...pkg, user_id: user!.id } as any).select().single();
      if (error) throw error;
      return data as DbPackage;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['packages'] }),
  });
};

export const useUpdatePackage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...pkg }: { id: string; name?: string; description?: string; default_price?: number; items?: any[] }) => {
      const { error } = await supabase.from('packages').update(pkg as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['packages'] }),
  });
};

export const useDeletePackage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('packages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['packages'] }),
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
      return data?.[0]?.role as 'admin' | 'manager' | 'user' | 'viewer' | undefined;
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
