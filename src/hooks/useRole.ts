import { useMyRole } from '@/hooks/useData';

export const useCanEdit = () => {
  const { data: role } = useMyRole();
  return role !== 'viewer';
};

export const useIsAdmin = () => {
  const { data: role } = useMyRole();
  return role === 'admin' || role === 'super_admin' || role === 'org_admin';
};

export const useIsSuperAdminRole = () => {
  const { data: role } = useMyRole();
  return role === 'super_admin';
};
