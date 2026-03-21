import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface Organization {
  id: string;
  name: string;
  slug: string;
  status: string;
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
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('global');
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(null);
  const [impersonatedUserName, setImpersonatedUserName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setCurrentOrgState(null);
      setOrganizations([]);
      setIsSuperAdmin(false);
      setLoading(false);
      return;
    }

    const init = async () => {
      try {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        const superAdmin = roles?.some(r => r.role === 'super_admin') ?? false;
        setIsSuperAdmin(superAdmin);

        if (superAdmin) {
          const { data: orgs } = await supabase
            .from('organizations')
            .select('*')
            .is('deleted_at', null)
            .order('name');
          setOrganizations((orgs as Organization[]) || []);
        } else {
          const { data: memberships } = await supabase
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', user.id);

          if (memberships && memberships.length > 0) {
            const orgIds = memberships.map(m => m.organization_id);
            const { data: orgs } = await supabase
              .from('organizations')
              .select('*')
              .in('id', orgIds)
              .is('deleted_at', null);
            setOrganizations((orgs as Organization[]) || []);
          }
        }
      } catch (err) {
        console.error('OrganizationContext init error:', err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [user]);

  useEffect(() => {
    if (!currentOrg && organizations.length > 0 && !isSuperAdmin) {
      const saved = localStorage.getItem('coreplan_org_id');
      const found = saved ? organizations.find(o => o.id === saved) : null;
      setCurrentOrgState(found || organizations[0]);
      setViewMode('org');
    }
  }, [organizations, currentOrg, isSuperAdmin]);

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
