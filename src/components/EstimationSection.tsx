import { useState, useEffect, useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCurrentProductPrice } from '@/hooks/useProductPrices';
import { calculateGrowthPct, type EstimationUnit } from '@/types/estimations';
import type { DbProduct } from '@/hooks/useData';

export interface ProductEstimationState {
  productId: string;
  unit: EstimationUnit;
  before: { start: string; end: string; amount: string };
  during: { amount: string };
  after: { start: string; end: string; amount: string };
}

interface Props {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  productIds: string[];
  products: DbProduct[];
  activityStartDate: string;
  activityEndDate: string;
  value: ProductEstimationState[];
  onChange: (states: ProductEstimationState[]) => void;
}

const formatPLN = (n: number) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(n);

const emptyPeriodState = (): ProductEstimationState['before'] => ({ start: '', end: '', amount: '' });

const defaultStateFor = (productId: string): ProductEstimationState => ({
  productId,
  unit: 'units',
  before: emptyPeriodState(),
  during: { amount: '' },
  after: emptyPeriodState(),
});

// Karta pojedynczego produktu — jednostka wybierana raz, obowiązuje we wszystkich
// trzech okresach. Cena z cennika i data jej obowiązywania zawsze widoczne wprost,
// żeby osoba wprowadzająca dane wiedziała, jaka cena zostanie użyta, zanim zapisze.
const ProductEstimationCard = ({
  product,
  state,
  activityStartDate,
  activityEndDate,
  onChange,
}: {
  product: DbProduct;
  state: ProductEstimationState;
  activityStartDate: string;
  activityEndDate: string;
  onChange: (next: ProductEstimationState) => void;
}) => {
  const { data: currentPrice } = useCurrentProductPrice(product.id);

  const toValue = (amount: string): number | null => {
    const n = parseFloat(amount);
    if (isNaN(n)) return null;
    return state.unit === 'units' && currentPrice ? n * currentPrice.price : n;
  };

  const beforeValue = toValue(state.before.amount);
  const duringValue = toValue(state.during.amount);
  const afterValue = toValue(state.after.amount);

  const growthDuring = calculateGrowthPct(beforeValue, duringValue);
  const growthAfter = calculateGrowthPct(beforeValue, afterValue);

  const setUnit = (unit: EstimationUnit) => {
    if (unit === state.unit) return;
    // Zmiana jednostki czyści wpisane liczby — inaczej zostałyby "brudne" dane
    // niezgodne z nowo wybraną jednostką.
    onChange({
      ...state,
      unit,
      before: { ...state.before, amount: '' },
      during: { amount: '' },
      after: { ...state.after, amount: '' },
    });
  };

  return (
    <div className="rounded-md bg-muted/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{product.name}</span>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setUnit('units')}
            className={`text-xs px-2.5 py-1 rounded-md border ${state.unit === 'units' ? 'bg-primary text-primary-foreground border-primary' : 'border-input text-muted-foreground'}`}
          >
            Sztuki
          </button>
          <button
            type="button"
            onClick={() => setUnit('value')}
            className={`text-xs px-2.5 py-1 rounded-md border ${state.unit === 'value' ? 'bg-primary text-primary-foreground border-primary' : 'border-input text-muted-foreground'}`}
          >
            Wartość
          </button>
        </div>
      </div>

      {state.unit === 'units' && (
        <div className="inline-block text-xs text-accent-foreground bg-accent px-2 py-0.5 rounded-md">
          {currentPrice
            ? `Cena z cennika: ${currentPrice.price} zł/szt. · obowiązuje od ${currentPrice.effectiveFrom}`
            : 'Brak ceny w cenniku dla tego produktu — dodaj ją w zakładce produktu'}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Przed akcją</Label>
          <div className="flex gap-1 mt-1 mb-1">
            <Input type="date" className="h-8 text-xs" value={state.before.start}
              onChange={e => onChange({ ...state, before: { ...state.before, start: e.target.value } })} />
            <Input type="date" className="h-8 text-xs" value={state.before.end}
              onChange={e => onChange({ ...state, before: { ...state.before, end: e.target.value } })} />
          </div>
          <Input type="number" placeholder="0" value={state.before.amount}
            onChange={e => onChange({ ...state, before: { ...state.before, amount: e.target.value } })} />
        </div>

        <div>
          <Label className="text-xs">W trakcie akcji</Label>
          <div className="text-[11px] text-muted-foreground mt-1 mb-1 py-1">
            {activityStartDate.slice(5)} – {activityEndDate.slice(5)} (z aktywności)
          </div>
          <Input type="number" placeholder="0" value={state.during.amount}
            onChange={e => onChange({ ...state, during: { amount: e.target.value } })} />
        </div>

        <div>
          <Label className="text-xs">Po akcji</Label>
          <div className="flex gap-1 mt-1 mb-1">
            <Input type="date" className="h-8 text-xs" value={state.after.start}
              onChange={e => onChange({ ...state, after: { ...state.after, start: e.target.value } })} />
            <Input type="date" className="h-8 text-xs" value={state.after.end}
              onChange={e => onChange({ ...state, after: { ...state.after, end: e.target.value } })} />
          </div>
          <Input type="number" placeholder="0" value={state.after.amount}
            onChange={e => onChange({ ...state, after: { ...state.after, amount: e.target.value } })} />
        </div>
      </div>

      <div className="flex gap-4 text-xs bg-background rounded-md px-3 py-2">
        <span>Wzrost w trakcie vs przed: <strong>{growthDuring === null ? '—' : `${growthDuring > 0 ? '+' : ''}${growthDuring}%`}</strong></span>
        <span>Wzrost po vs przed: <strong>{growthAfter === null ? '—' : `${growthAfter > 0 ? '+' : ''}${growthAfter}%`}</strong></span>
        {state.unit === 'units' && duringValue !== null && (
          <span className="ml-auto text-muted-foreground">≈ {formatPLN(duringValue)}</span>
        )}
      </div>
    </div>
  );
};

export const EstimationSection = ({
  enabled, onEnabledChange, productIds, products, activityStartDate, activityEndDate, value, onChange,
}: Props) => {
  // Dopełnia stan domyślnym wpisem dla każdego wybranego produktu, który
  // jeszcze go nie ma (np. produkt dopiero co dodany do aktywności).
  useEffect(() => {
    const missing = productIds.filter(pid => !value.some(v => v.productId === pid));
    if (missing.length > 0) {
      onChange([...value, ...missing.map(defaultStateFor)]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productIds]);

  const selectedProducts = useMemo(
    () => productIds.map(id => products.find(p => p.id === id)).filter(Boolean) as DbProduct[],
    [productIds, products]
  );

  return (
    <div className="space-y-3 border-t pt-4">
      <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
        <Checkbox checked={enabled} onCheckedChange={(c) => onEnabledChange(!!c)} />
        Estymacja
      </label>

      {enabled && (
        selectedProducts.length === 0 ? (
          <p className="text-xs text-muted-foreground">Wybierz przynajmniej jeden produkt, żeby dodać estymację.</p>
        ) : (
          <div className="space-y-3">
            {selectedProducts.map(product => {
              const state = value.find(v => v.productId === product.id) ?? defaultStateFor(product.id);
              return (
                <ProductEstimationCard
                  key={product.id}
                  product={product}
                  state={state}
                  activityStartDate={activityStartDate}
                  activityEndDate={activityEndDate}
                  onChange={(next) => onChange(
                    value.some(v => v.productId === next.productId)
                      ? value.map(v => v.productId === next.productId ? next : v)
                      : [...value, next]
                  )}
                />
              );
            })}
          </div>
        )
      )}
    </div>
  );
};
