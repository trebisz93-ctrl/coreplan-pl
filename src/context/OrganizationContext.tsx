import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface Organization {
  id: string;
  name: string;
  slug: string;
  status: string;
}

interface OrganizationContextType {
  currentOrg: Organization | null;
  orgId: string | null;
  organizations: Organization[];
  setCurrentOrg: (org: Organization | null) => void;
  isSuperAdmin: boolean;
  loading: boolean;
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
        // Check if super_admin
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        const superAdmin = roles?.some(r => r.role === 'super_admin') ?? false;
        setIsSuperAdmin(superAdmin);

        if (superAdmin) {
          // Super admin sees all orgs
          const { data: orgs } = await supabase
            .from('organizations')
            .select('*')
            .order('name');
          setOrganizations((orgs as Organization[]) || []);
        } else {
          // Regular user sees own orgs via membership
          const { data: memberships } = await supabase
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', user.id);

          if (memberships && memberships.length > 0) {
            const orgIds = memberships.map(m => m.organization_id);
            const { data: orgs } = await supabase
              .from('organizations')
              .select('*')
              .in('id', orgIds);
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

  // Auto-select first org if none selected
  useEffect(() => {
    if (!currentOrg && organizations.length > 0) {
      const saved = localStorage.getItem('coreplan_org_id');
      const found = saved ? organizations.find(o => o.id === saved) : null;
      setCurrentOrgState(found || organizations[0]);
    }
  }, [organizations, currentOrg]);

  const setCurrentOrg = (org: Organization | null) => {
    setCurrentOrgState(org);
    if (org) {
      localStorage.setItem('coreplan_org_id', org.id);
    } else {
      localStorage.removeItem('coreplan_org_id');
    }
  };

  return (
    <OrganizationContext.Provider value={{
      currentOrg,
      orgId: currentOrg?.id || null,
      organizations,
      setCurrentOrg,
      isSuperAdmin,
      loading,
    }}>
      {children}
    </OrganizationContext.Provider>
  );
};
