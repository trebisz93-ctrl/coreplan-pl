// Typy związane z cennikiem produktów i estymacjami sprzedaży (poziom PRGM / kontroling).
// Zasada: cennik jest insert-only (nowa cena = nowy wiersz), a estymacja zamraża
// użytą cenę w unit_price_snapshot — nigdy nie przelicza się wstecz po zmianie cennika.

export interface ProductPrice {
  id: string;
  productId: string;
  organizationId: string;
  price: number;
  effectiveFrom: string; // YYYY-MM-DD
  createdAt: string;
  userId: string;
}

export type EstimationUnit = 'units' | 'value';
export type EstimationPeriod = 'before' | 'during' | 'after';

export interface ActivityEstimationPeriodData {
  id: string;
  estimationId: string;
  period: EstimationPeriod;
  periodStart: string;
  periodEnd: string;
  units: number | null;
  unitPriceSnapshot: number | null;
  unitPriceEffectiveFrom: string | null;
  value: number;
}

export interface ActivityProductEstimation {
  id: string;
  activityId: string;
  productId: string;
  organizationId: string;
  unit: EstimationUnit;
  periods: ActivityEstimationPeriodData[];
}

// Płaski wiersz z widoku raportowego view_activity_estimations_report —
// jeden wiersz na parę (aktywność, produkt), okresy jako kolumny.
export interface EstimationReportRow {
  estimationId: string;
  activityId: string;
  activityName: string;
  clientId: string | null;
  productId: string;
  productName: string;
  unit: EstimationUnit;
  organizationId: string;
  userId: string;
  createdAt: string;
  beforeStart: string | null;
  beforeEnd: string | null;
  beforeUnits: number | null;
  beforeValue: number | null;
  duringStart: string | null;
  duringEnd: string | null;
  duringUnits: number | null;
  duringValue: number | null;
  afterStart: string | null;
  afterEnd: string | null;
  afterUnits: number | null;
  afterValue: number | null;
  unitPriceSnapshot: number | null;
  unitPriceEffectiveFrom: string | null;
  growthDuringPct: number | null;
  growthAfterPct: number | null;
}

// Oblicza % wzrostu w bezpieczny sposób (bez dzielenia przez zero).
// Zwraca null, gdy nie da się policzyć — UI pokazuje wtedy "—", nie 0% ani błąd.
export const calculateGrowthPct = (before: number | null, current: number | null): number | null => {
  if (before === null || current === null || before === 0) return null;
  return Math.round(((current - before) / before) * 100);
};
