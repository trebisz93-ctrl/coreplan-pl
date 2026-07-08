import { useState } from 'react';
import { usePrgmAccess } from '@/hooks/usePrgmAccess';
import { useEstimationsReport } from '@/hooks/useActivityEstimations';
import { Button } from '@/components/ui/button';
import { FileDown, TrendingUp, Lock } from 'lucide-react';
import { toast } from 'sonner';
import type { EstimationReportRow } from '@/types/estimations';

const growthBadge = (pct: number | null) => {
  if (pct === null) return <span className="text-muted-foreground">—</span>;
  const positive = pct >= 0;
  return (
    <span className={positive ? 'text-green-700 dark:text-green-400 font-medium' : 'text-red-700 dark:text-red-400 font-medium'}>
      {positive ? '↑' : '↓'} {Math.abs(pct)}%
    </span>
  );
};

const EstimationCard = ({ row }: { row: EstimationReportRow }) => {
  const max = Math.max(row.beforeValue || 0, row.duringValue || 0, row.afterValue || 0, 1);
  const barWidth = (v: number | null) => Math.max(4, ((v || 0) / max) * 100);

  const bars: Array<[string, number | null, string]> = [
    ['Przed', row.beforeValue, 'bg-muted-foreground/40'],
    ['W trakcie', row.duringValue, 'bg-blue-500'],
    ['Po', row.afterValue, 'bg-emerald-600'],
  ];

  return (
    <div className="bg-card border rounded-xl p-4">
      <div className="flex justify-between items-baseline mb-3">
        <div>
          <span className="text-sm font-medium">{row.activityName}</span>
          <span className="text-xs text-muted-foreground ml-2">{row.productName}</span>
        </div>
        <div className="flex gap-4 text-sm">
          {growthBadge(row.growthDuringPct)}
          {growthBadge(row.growthAfterPct)}
        </div>
      </div>

      <div className="space-y-1.5 mb-2">
        {bars.map(([label, val, color]) => (
          <div key={label} className="flex items-center gap-2">
            <div className="w-20 text-xs text-muted-foreground">{label}</div>
            <div className="flex-1 bg-muted rounded h-2">
              <div className={`h-2 rounded ${color}`} style={{ width: `${barWidth(val)}%` }} />
            </div>
            <div className="w-16 text-right text-xs">{val ?? '—'}</div>
          </div>
        ))}
      </div>

      <div className="text-xs text-muted-foreground border-t pt-2">
        Wpisał: {row.userDisplayName ?? `${row.userId.slice(0, 8)}…`} · {row.createdAt?.slice(0, 10)}
        {row.unit === 'units' && row.unitPriceSnapshot && (
          <span> · cena: {row.unitPriceSnapshot} zł (od {row.unitPriceEffectiveFrom})</span>
        )}
      </div>
    </div>
  );
};

export const SalesEstimationsView = () => {
  const { data: canAccess, isLoading: accessLoading } = usePrgmAccess();
  const { data: rows = [], isLoading } = useEstimationsReport();
  const [exporting, setExporting] = useState(false);

  if (accessLoading) return null;

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
        <Lock className="h-8 w-8 mb-3" />
        <p>Nie masz uprawnień do tej zakładki.</p>
      </div>
    );
  }

  const handleExport = async () => {
    setExporting(true);
    try {
      const { exportEstimationsToExcel } = await import('@/lib/estimationsExport');
      await exportEstimationsToExcel(rows);
    } catch (e) {
      console.error('Estimations export error:', e);
      toast.error('Nie udało się wyeksportować danych');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5" /> Estymacje sprzedaży
        </h1>
        <Button size="sm" onClick={handleExport} disabled={exporting || rows.length === 0}>
          <FileDown className="h-4 w-4 mr-1.5" />
          {exporting ? 'Eksportowanie...' : 'Eksportuj do Excela'}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Wczytywanie…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Brak wprowadzonych estymacji. Zaznacz checkbox "Estymacja" przy tworzeniu aktywności, żeby zaczęły się tu pojawiać.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <EstimationCard key={row.estimationId} row={row} />
          ))}
        </div>
      )}
    </div>
  );
};
