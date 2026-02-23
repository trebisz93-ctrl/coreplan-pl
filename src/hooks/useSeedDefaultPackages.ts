import { useEffect } from 'react';
import { usePackages, useCreatePackage } from '@/hooks/useData';
import { DEFAULT_PACKAGES } from '@/data/defaultPackages';

/**
 * Auto-seeds the 6 default packages for the current user if they have none.
 * Runs once when packages are loaded and empty.
 */
export const useSeedDefaultPackages = () => {
  const { data: packages, isSuccess } = usePackages();
  const createPackage = useCreatePackage();

  useEffect(() => {
    if (!isSuccess || !packages) return;
    if (packages.length > 0) return; // already has packages

    const seed = async () => {
      for (const pkg of DEFAULT_PACKAGES) {
        try {
          await createPackage.mutateAsync(pkg);
        } catch (e) {
          console.error('Failed to seed package:', pkg.name, e);
        }
      }
    };
    seed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, packages?.length]);
};
