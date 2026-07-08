import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import type { ProductPrice } from '@/types/estimations';

const mapRow = (row: any): ProductPrice => ({
  id: row.id,
  productId: row.product_id,
  organizationId: row.organization_id,
  price: Number(row.price),
  effectiveFrom: row.effective_from,
  createdAt: row.created_at,
  userId: row.user_id,
});

// Pełna historia cen danego produktu, najnowsze pierwsze — do wyświetlenia
// w sekcji "Cennik" w edycji produktu.
export const useProductPriceHistory = (productId?: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['product_prices', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_prices' as any)
        .select('*')
        .eq('product_id', productId!)
        .order('effective_from', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapRow);
    },
    enabled: !!user && !!productId,
  });
};

// Aktualnie obowiązująca cena (najnowszy wiersz z effective_from <= dziś).
// To ta wartość jest zamrażana w estymacji w momencie jej tworzenia.
export const useCurrentProductPrice = (productId?: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['product_prices', 'current', productId],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('product_prices' as any)
        .select('*')
        .eq('product_id', productId!)
        .lte('effective_from', today)
        .order('effective_from', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ? mapRow(data) : null;
    },
    enabled: !!user && !!productId,
  });
};

// Wersja zbiorcza — aktualna cena dla wielu produktów jednym zapytaniem.
// Używana tam, gdzie liczba produktów jest dynamiczna (np. przy zapisie
// estymacji dla wszystkich produktów aktywności naraz) — hooki nie mogą
// być wywoływane w pętli, więc to jedno zapytanie zastępuje N osobnych.
export const useCurrentProductPrices = (productIds: string[]) => {
  const { user } = useAuth();
  const sortedIds = [...productIds].sort();
  return useQuery({
    queryKey: ['product_prices', 'current-bulk', sortedIds],
    queryFn: async (): Promise<Record<string, ProductPrice | null>> => {
      if (sortedIds.length === 0) return {};
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('product_prices' as any)
        .select('*')
        .in('product_id', sortedIds)
        .lte('effective_from', today)
        .order('effective_from', { ascending: false });
      if (error) throw error;
      const result: Record<string, ProductPrice | null> = {};
      (data || []).forEach((row: any) => {
        // Pierwszy napotkany wiersz dla danego produktu jest najnowszy
        // dzięki sortowaniu malejąco po effective_from.
        if (!(row.product_id in result)) result[row.product_id] = mapRow(row);
      });
      sortedIds.forEach(id => { if (!(id in result)) result[id] = null; });
      return result;
    },
    enabled: !!user && sortedIds.length > 0,
  });
};

// Dodanie nowej ceny — ZAWSZE insert nowego wiersza, nigdy update istniejącego.
// Stare ceny zostają nietknięte w historii.
export const useAddProductPrice = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { orgId } = useOrganization();
  return useMutation({
    mutationFn: async ({ productId, price, effectiveFrom }: { productId: string; price: number; effectiveFrom: string }) => {
      const { data, error } = await supabase
        .from('product_prices' as any)
        .insert({ product_id: productId, organization_id: orgId, price, effective_from: effectiveFrom, user_id: user!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return mapRow(data);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['product_prices', variables.productId] });
      qc.invalidateQueries({ queryKey: ['product_prices', 'current', variables.productId] });
    },
  });
};
