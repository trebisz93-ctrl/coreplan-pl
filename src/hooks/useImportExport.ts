import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';

export interface ImportHistoryRow {
  id: string;
  user_id: string;
  organization_id: string | null;
  client_id: string | null;
  client_name: string;
  file_name: string;
  status: string;
  total_rows: number;
  imported_rows: number;
  error_count: number;
  errors: any[];
  created_at: string;
}

export const useImportHistory = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['import_history', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('import_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as unknown as ImportHistoryRow[];
    },
    enabled: !!user,
  });
};

export const useCreateImportHistory = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { orgId } = useOrganization();
  return useMutation({
    mutationFn: async (input: {
      client_id: string;
      client_name: string;
      file_name: string;
      status: string;
      total_rows: number;
      imported_rows: number;
      error_count: number;
      errors: any[];
    }) => {
      const { error } = await supabase.from('import_history').insert({
        ...input,
        user_id: user!.id,
        organization_id: orgId,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['import_history'] }),
  });
};
