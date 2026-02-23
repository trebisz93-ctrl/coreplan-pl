import { useMyRole } from '@/hooks/useData';

export const useCanEdit = () => {
  const { data: role } = useMyRole();
  return role !== 'viewer';
};

export const useIsAdmin = () => {
  const { data: role } = useMyRole();
  return role === 'admin';
};
