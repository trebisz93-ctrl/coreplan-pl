import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import type { ActivityProductEstimation, EstimationPeriod, EstimationUnit } from '@/types/estimations';

const mapPeriodRow = (row: any) => ({
  id: row.id,
  estimationId: row.estimation_id,
  period: row.period as EstimationPeriod,
  periodStart: row.period_start,
  periodEnd: row.period_end,
  units: row.units !== null ? Number(row.units) : null,
  unitPriceSnapshot: row.unit_price_snapshot !== null ? Number(row.unit_price_snapshot) : null,
  unitPriceEffectiveFrom: row.unit_price_effective_from,
  value: Number(row.value),
});

// Wszystkie estymacje (per produkt) dla danej aktywności, każda z 3 okresami.
// Widoczne tylko dla PRGM/admina/super_admina — reszta dostanie pustą tablicę
// dzięki RLS, bez błędu (zapytanie po prostu nie zwróci żadnych wierszy).
export const useActivityEstimations = (activityId?: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['activity_product_estimations', activityId],
    queryFn: async (): Promise<ActivityProductEstimation[]> => {
      const { data: parents, error: parentsError } = await supabase
        .from('activity_product_estimations')
        .select('*')
        .eq('activity_id', activityId!);
      if (parentsError) throw parentsError;
      if (!parents || parents.length === 0) return [];

      const parentIds = parents.map((p: any) => p.id);
      const { data: periods, error: periodsError } = await supabase
        .from('activity_estimation_periods')
        .select('*')
        .in('estimation_id', parentIds);
      if (periodsError) throw periodsError;

      return parents.map((p: any) => ({
        id: p.id,
        activityId: p.activity_id,
        productId: p.product_id,
        organizationId: p.organization_id,
        unit: p.unit as EstimationUnit,
        periods: (periods || []).filter((per: any) => per.estimation_id === p.id).map(mapPeriodRow),
      }));
    },
    enabled: !!user && !!activityId,
  });
};

export interface SaveEstimationPeriodInput {
  period: EstimationPeriod;
  periodStart: string;
  periodEnd: string;
  units: number | null; // null gdy unit === 'value'
  value: number;        // zawsze wypełnione — podane wprost albo units × cena
}

export interface SaveEstimationInput {
  activityId: string;
  productId: string;
  unit: EstimationUnit;
  unitPriceSnapshot: number | null;       // zamrożona cena z cennika (gdy unit === 'units')
  unitPriceEffectiveFrom: string | null;  // data obowiązywania tej ceny — do wglądu w raportach
  periods: SaveEstimationPeriodInput[];   // dokładnie 3: before / during / after
}

// Zapisuje (tworzy albo aktualizuje) komplet estymacji dla pary aktywność+produkt.
// Rodzic i 3 wiersze okresów w jednej operacji — upsert po unikalnych kluczach
// (activity_id, product_id) i (estimation_id, period).
export const useSaveActivityEstimation = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { orgId } = useOrganization();
  return useMutation({
    mutationFn: async (input: SaveEstimationInput) => {
      const { data: parent, error: parentError } = await supabase
        .from('activity_product_estimations')
        .upsert(
          {
            activity_id: input.activityId,
            product_id: input.productId,
            organization_id: orgId,
            unit: input.unit,
            user_id: user!.id,
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: 'activity_id,product_id' }
        )
        .select()
        .single();
      if (parentError) throw parentError;

      const periodRows = input.periods.map((p) => ({
        estimation_id: (parent as any).id,
        organization_id: orgId,
        period: p.period,
        period_start: p.periodStart,
        period_end: p.periodEnd,
        units: p.units,
        unit_price_snapshot: input.unitPriceSnapshot,
        unit_price_effective_from: input.unitPriceEffectiveFrom,
        value: p.value,
        user_id: user!.id,
        updated_at: new Date().toISOString(),
      }));

      const { error: periodsError } = await supabase
        .from('activity_estimation_periods')
        .upsert(periodRows as any, { onConflict: 'estimation_id,period' });
      if (periodsError) throw periodsError;

      return parent;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['activity_product_estimations', variables.activityId] });
    },
  });
};

const mapReportRow = (row: any): import('@/types/estimations').EstimationReportRow => ({
  estimationId: row.estimation_id,
  activityId: row.activity_id,
  activityName: row.activity_name,
  clientId: row.client_id,
  productId: row.product_id,
  productName: row.product_name,
  unit: row.unit,
  organizationId: row.organization_id,
  userId: row.user_id,
  userDisplayName: row.user_display_name ?? null,
  createdAt: row.created_at,
  beforeStart: row.before_start,
  beforeEnd: row.before_end,
  beforeUnits: row.before_units !== null ? Number(row.before_units) : null,
  beforeValue: row.before_value !== null ? Number(row.before_value) : null,
  duringStart: row.during_start,
  duringEnd: row.during_end,
  duringUnits: row.during_units !== null ? Number(row.during_units) : null,
  duringValue: row.during_value !== null ? Number(row.during_value) : null,
  afterStart: row.after_start,
  afterEnd: row.after_end,
  afterUnits: row.after_units !== null ? Number(row.after_units) : null,
  afterValue: row.after_value !== null ? Number(row.after_value) : null,
  unitPriceSnapshot: row.unit_price_snapshot !== null ? Number(row.unit_price_snapshot) : null,
  unitPriceEffectiveFrom: row.unit_price_effective_from,
  growthDuringPct: row.growth_during_pct !== null ? Number(row.growth_during_pct) : null,
  growthAfterPct: row.growth_after_pct !== null ? Number(row.growth_after_pct) : null,
});

// Płaskie dane z widoku raportowego — do zakładki "Estymacje sprzedaży" i eksportu Excela.
// RLS widoku jest dziedziczone (security_invoker) z tabel źródłowych, więc zwykły
// użytkownik bez uprawnienia PRGM/admin dostanie po prostu pustą listę.
export const useEstimationsReport = (filters?: { clientId?: string; dateFrom?: string; dateTo?: string }) => {
  const { user } = useAuth();
  const { orgId } = useOrganization();
  return useQuery({
    queryKey: ['view_activity_estimations_report', orgId, filters],
    queryFn: async () => {
      let query = supabase
        .from('view_activity_estimations_report')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (filters?.clientId) query = query.eq('client_id', filters.clientId);
      if (filters?.dateFrom) query = query.gte('during_start', filters.dateFrom);
      if (filters?.dateTo) query = query.lte('during_end', filters.dateTo);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(mapReportRow);
    },
    enabled: !!user && !!orgId,
  });
};
