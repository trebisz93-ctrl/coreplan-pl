import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface Organization {
  id: string;
  name: string;
  slug: string;
  status: string;
  onboarding_completed: boolean;
}

type ViewMode = 'global' | 'org' | 'impersonate';

interface OrganizationContextType {
  currentOrg: Organization | null;
  orgId: string | null;
  organizations: Organization[];
  setCurrentOrg: (org: Organization | null) => void;
  isSuperAdmin: boolean;
  loading: boolean;
  viewMode: ViewMode;
  impersonatedUserId: string | null;
  impersonatedUserName: string | null;
  switchToOrg: (org: Organization) => void;
  switchToGlobal: () => void;
  impersonateUser: (userId: string, userName: string) => void;
  stopImpersonation: () => void;
}

const OrganizationContext = createContext<OrganizationContextType | null>(null);

export const useOrganization = () => {
  const ctx = useContext(OrganizationContext);
  if (!ctx) throw new Error('useOrganization must be used within OrganizationProvider');
  return ctx;
};

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [currentOrg, setCurrentOrgState] = useState<Organization | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('global');
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(null);
  const [impersonatedUserName, setImpersonatedUserName] = useState<string | null>(null);

  // Single cached query for user roles — shared queryKey with useSuperAdmin hook
  const { data: roles } = useQuery({
    queryKey: ['user_roles', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const isSuperAdmin = useMemo(() => roles?.some(r => r.role === 'super_admin') ?? false, [roles]);

  // Fetch orgs — super admin gets all, regular user gets their memberships
  const { data: organizations = [], isLoading: orgsLoading } = useQuery({
    queryKey: isSuperAdmin ? ['organizations'] : ['my_organizations', user?.id],
    queryFn: async () => {
      if (isSuperAdmin) {
        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .is('deleted_at', null)
          .order('name');
        if (error) throw error;
        return (data as Organization[]) || [];
      } else {
        const { data: memberships } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user!.id);
        if (!memberships?.length) return [];
        const orgIds = memberships.map(m => m.organization_id);
        const { data: orgs, error } = await supabase
          .from('organizations')
          .select('*')
          .in('id', orgIds)
          .is('deleted_at', null);
        if (error) throw error;
        return (orgs as Organization[]) || [];
      }
    },
    enabled: !!user && roles !== undefined,
    staleTime: 2 * 60 * 1000,
  });

  const loading = !user ? false : (roles === undefined || orgsLoading);

  // Auto-select org for non-super-admins
  useEffect(() => {
    if (!currentOrg && organizations.length > 0 && !isSuperAdmin) {
      const saved = localStorage.getItem('coreplan_org_id');
      const found = saved ? organizations.find(o => o.id === saved) : null;
      setCurrentOrgState(found || organizations[0]);
      setViewMode('org');
    }
  }, [organizations, currentOrg, isSuperAdmin]);

  // Keep currentOrg in sync with the freshest organization data (e.g. after onboarding completes)
  useEffect(() => {
    if (!currentOrg) return;
    const fresh = organizations.find(o => o.id === currentOrg.id);
    if (fresh && (
      fresh.onboarding_completed !== currentOrg.onboarding_completed ||
      fresh.status !== currentOrg.status ||
      fresh.name !== currentOrg.name
    )) {
      setCurrentOrgState(fresh);
    }
  }, [organizations, currentOrg]);

  const logAction = useCallback(async (eventType: string, description: string, metadata?: any) => {
    if (!user) return;
    try {
      await supabase.from('system_logs').insert({
        user_id: user.id,
        event_type: eventType,
        description,
        metadata: metadata || {},
      } as any);
    } catch {}
  }, [user]);

  const setCurrentOrg = (org: Organization | null) => {
    setCurrentOrgState(org);
    if (org) {
      localStorage.setItem('coreplan_org_id', org.id);
    } else {
      localStorage.removeItem('coreplan_org_id');
    }
  };

  const switchToOrg = useCallback((org: Organization) => {
    setCurrentOrgState(org);
    setViewMode('org');
    setImpersonatedUserId(null);
    setImpersonatedUserName(null);
    localStorage.setItem('coreplan_org_id', org.id);
    logAction('context_switch', `Super Admin przełączył się na firmę: ${org.name}`, { organization_id: org.id });
  }, [logAction]);

  const switchToGlobal = useCallback(() => {
    setCurrentOrgState(null);
    setViewMode('global');
    setImpersonatedUserId(null);
    setImpersonatedUserName(null);
    localStorage.removeItem('coreplan_org_id');
    logAction('context_switch', 'Super Admin wrócił do widoku globalnego');
  }, [logAction]);

  const impersonateUser = useCallback((userId: string, userName: string) => {
    setImpersonatedUserId(userId);
    setImpersonatedUserName(userName);
    setViewMode('impersonate');
    logAction('impersonation_start', `Super Admin podszywa się pod użytkownika: ${userName}`, { impersonated_user_id: userId });
  }, [logAction]);

  const stopImpersonation = useCallback(() => {
    setImpersonatedUserId(null);
    setImpersonatedUserName(null);
    setViewMode(currentOrg ? 'org' : 'global');
    logAction('impersonation_stop', 'Super Admin zakończył podszywanie');
  }, [currentOrg, logAction]);

  return (
    <OrganizationContext.Provider value={{
      currentOrg,
      orgId: currentOrg?.id || null,
      organizations,
      setCurrentOrg,
      isSuperAdmin,
      loading,
      viewMode,
      impersonatedUserId,
      impersonatedUserName,
      switchToOrg,
      switchToGlobal,
      impersonateUser,
      stopImpersonation,
    }}>
      {children}
    </OrganizationContext.Provider>
  );
};
