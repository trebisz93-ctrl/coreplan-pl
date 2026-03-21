import { useOrganization } from '@/context/OrganizationContext';
import { useClients } from '@/hooks/useData';
import { useProducts } from '@/hooks/useData';
import { usePackages } from '@/hooks/useData';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Users, Building2, Package, Layers, CheckCircle2, ArrowRight, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface OnboardingStep {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  count: number;
  done: boolean;
  path: string;
  cta: string;
}

export const OrgOnboarding = () => {
  const { currentOrg, orgId } = useOrganization();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: clients = [] } = useClients();
  const { data: products = [] } = useProducts();
  const { data: packages = [] } = usePackages();

  const { data: memberCount = 0 } = useQuery({
    queryKey: ['org_members_count', orgId],
    queryFn: async () => {
      if (!orgId) return 0;
      const { count, error } = await supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!orgId,
  });

  if (!currentOrg || currentOrg.onboarding_completed) return null;

  const steps: OnboardingStep[] = [
    {
      id: 'users',
      label: 'Użytkownicy',
      description: 'Dodaj członków zespołu do firmy',
      icon: Users,
      count: memberCount,
      done: memberCount > 1,
      path: '/users',
      cta: 'Dodaj użytkownika',
    },
    {
      id: 'clients',
      label: 'Klienci',
      description: 'Dodaj klientów / kontrahentów firmy',
      icon: Building2,
      count: clients.length,
      done: clients.length > 0,
      path: '/clients',
      cta: 'Dodaj klienta',
    },
    {
      id: 'products',
      label: 'Produkty',
      description: 'Dodaj produkty lub usługi',
      icon: Package,
      count: products.length,
      done: products.length > 0,
      path: '/products',
      cta: 'Dodaj produkt',
    },
    {
      id: 'packages',
      label: 'Pakiety',
      description: 'Skonfiguruj pakiety usług (opcjonalnie)',
      icon: Layers,
      count: packages.length,
      done: packages.length > 0,
      path: '/packages',
      cta: 'Dodaj pakiet',
    },
  ];

  const completedCount = steps.filter(s => s.done).length;
  const allDone = completedCount >= 3; // packages optional
  const progress = Math.round((completedCount / steps.length) * 100);

  const handleFinish = async () => {
    if (!orgId) return;
    const { error } = await supabase
      .from('organizations')
      .update({ onboarding_completed: true } as any)
      .eq('id', orgId);
    if (error) {
      toast.error('Błąd: ' + error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ['organizations'] });
    toast.success('Konfiguracja firmy zakończona!');
  };

  return (
    <div className="space-y-6 mb-8">
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl border border-primary/20 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Rocket className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Pierwsze kroki — {currentOrg.name}</h2>
            <p className="text-sm text-muted-foreground">
              Skonfiguruj firmę, aby w pełni korzystać z systemu
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 mb-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>{completedCount} z {steps.length} kroków ukończonych</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map(step => (
            <Card
              key={step.id}
              className={`relative overflow-hidden transition-all hover:shadow-md cursor-pointer ${
                step.done ? 'border-primary/30 bg-primary/5' : 'border-border'
              }`}
              onClick={() => navigate(step.path)}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                    step.done ? 'bg-primary/20' : 'bg-muted'
                  }`}>
                    {step.done ? (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    ) : (
                      <step.icon className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  {step.count > 0 && (
                    <Badge variant="secondary" className="text-xs">{step.count}</Badge>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{step.label}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                </div>
                <Button variant={step.done ? 'ghost' : 'default'} size="sm" className="w-full gap-1 text-xs">
                  {step.done ? 'Zarządzaj' : step.cta}
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Finish button */}
        {allDone && (
          <div className="mt-6 flex justify-center">
            <Button onClick={handleFinish} size="lg" className="gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Zakończ konfigurację
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
