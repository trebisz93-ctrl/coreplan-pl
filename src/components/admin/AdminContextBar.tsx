import { useOrganization } from '@/context/OrganizationContext';
import { useNavigate } from 'react-router-dom';
import { Building2, Eye, X, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const AdminContextBar = () => {
  const { viewMode, currentOrg, impersonatedUserName, switchToGlobal, stopImpersonation } = useOrganization();

  if (viewMode === 'global') return null;

  const isImpersonating = viewMode === 'impersonate';

  return (
    <div className={cn(
      'flex items-center justify-between px-4 py-2 text-sm font-medium border-b',
      isImpersonating
        ? 'bg-destructive/10 text-destructive border-destructive/20'
        : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
    )}>
      <div className="flex items-center gap-2">
        {isImpersonating ? (
          <>
            <Eye className="h-4 w-4" />
            <span>Podgląd jako: <strong>{impersonatedUserName}</strong></span>
            {currentOrg && <span className="text-xs opacity-70">({currentOrg.name})</span>}
          </>
        ) : (
          <>
            <Building2 className="h-4 w-4" />
            <span>Kontekst firmy: <strong>{currentOrg?.name}</strong></span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        {isImpersonating && (
          <Button variant="ghost" size="sm" onClick={stopImpersonation} className="h-7 gap-1 text-xs">
            <X className="h-3 w-3" /> Zakończ podgląd
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={switchToGlobal} className="h-7 gap-1 text-xs">
          <Globe className="h-3 w-3" /> Widok globalny
        </Button>
      </div>
    </div>
  );
};
