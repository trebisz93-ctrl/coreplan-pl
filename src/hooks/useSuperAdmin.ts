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
  address?: string | null;
  internal_note?: string | null;
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

export interface SystemLogFilters {
  eventType?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  organizationId?: string;
}

export const useSystemLogs = (limit = 50, filters?: SystemLogFilters) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['system_logs', limit, filters],
    queryFn: async () => {
      let query = supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (filters?.eventType && filters.eventType !== 'all') {
        query = query.eq('event_type', filters.eventType);
      }
      if (filters?.search) {
        query = query.ilike('description', `%${filters.search}%`);
      }
      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('created_at', `${filters.dateTo}T23:59:59`);
      }
      if (filters?.organizationId && filters.organizationId !== 'all') {
        query = query.eq('organization_id', filters.organizationId);
      }

      const { data, error } = await query;
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

export const useActivityFeed = (limit = 100, filters?: { organizationId?: string; dateFrom?: string; dateTo?: string }) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['activity_feed', limit, filters],
    queryFn: async () => {
      // Fetch system_logs
      let logsQ = supabase.from('system_logs').select('*').order('created_at', { ascending: false }).limit(limit);
      if (filters?.organizationId && filters.organizationId !== 'all') logsQ = logsQ.eq('organization_id', filters.organizationId);
      if (filters?.dateFrom) logsQ = logsQ.gte('created_at', filters.dateFrom);
      if (filters?.dateTo) logsQ = logsQ.lte('created_at', `${filters.dateTo}T23:59:59`);

      // Fetch audit_log
      let auditQ = supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(limit);
      if (filters?.organizationId && filters.organizationId !== 'all') auditQ = auditQ.eq('organization_id', filters.organizationId);
      if (filters?.dateFrom) auditQ = auditQ.gte('created_at', filters.dateFrom);
      if (filters?.dateTo) auditQ = auditQ.lte('created_at', `${filters.dateTo}T23:59:59`);

      const [logsRes, auditRes] = await Promise.all([logsQ, auditQ]);

      const logs = (logsRes.data || []).map((l: any) => ({
        id: l.id,
        timestamp: l.created_at,
        user_id: l.user_id,
        organization_id: l.organization_id,
        action: l.event_type,
        details: l.description || '',
        source: 'system_log' as const,
      }));

      const audits = (auditRes.data || []).map((a: any) => ({
        id: a.id,
        timestamp: a.created_at,
        user_id: a.user_id,
        organization_id: a.organization_id,
        action: `${a.action} (${a.table_name})`,
        details: a.record_id ? `Record: ${a.record_id}` : '',
        source: 'audit_log' as const,
      }));

      return [...logs, ...audits].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
    },
    enabled: !!user,
  });
};
