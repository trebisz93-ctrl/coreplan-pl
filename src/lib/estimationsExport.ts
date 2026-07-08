import type ExcelJSType from 'exceljs';
import type { EstimationReportRow } from '@/types/estimations';

// Ta sama zasada leniwego ładowania co w excelTemplate.ts — exceljs (~900KB)
// pobiera się dopiero w momencie kliknięcia "Eksportuj", nie przy wejściu na stronę.
type ExcelJSModule = typeof ExcelJSType;
let exceljsPromise: Promise<ExcelJSModule> | null = null;
const loadExcelJS = (): Promise<ExcelJSModule> => {
  if (!exceljsPromise) {
    exceljsPromise = import('exceljs').then(
      (m) => ((m as unknown as { default?: ExcelJSModule }).default ?? (m as unknown as ExcelJSModule)),
    );
  }
  return exceljsPromise;
};

async function downloadWorkbook(wb: ExcelJSType.Workbook, fileName: string) {
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const COLUMNS = [
  'Aktywność', 'Produkt', 'Jednostka',
  'Przed od', 'Przed do', 'Przed (szt.)', 'Przed (wartość)',
  'W trakcie od', 'W trakcie do', 'W trakcie (szt.)', 'W trakcie (wartość)',
  'Po od', 'Po do', 'Po (szt.)', 'Po (wartość)',
  'Cena jednostkowa użyta', 'Cena obowiązuje od',
  'Wzrost w trakcie vs przed (%)', 'Wzrost po vs przed (%)',
  'Wpisał', 'Data wpisu',
];

export async function exportEstimationsToExcel(rows: EstimationReportRow[], fileName = 'estymacje-sprzedazy.xlsx') {
  const ExcelJS = await loadExcelJS();
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Estymacje sprzedaży');

  sheet.addRow(COLUMNS).font = { bold: true };

  rows.forEach((r) => {
    sheet.addRow([
      r.activityName,
      r.productName,
      r.unit === 'units' ? 'Sztuki' : 'Wartość',
      r.beforeStart, r.beforeEnd, r.beforeUnits, r.beforeValue,
      r.duringStart, r.duringEnd, r.duringUnits, r.duringValue,
      r.afterStart, r.afterEnd, r.afterUnits, r.afterValue,
      r.unitPriceSnapshot,
      r.unitPriceEffectiveFrom,
      r.growthDuringPct,
      r.growthAfterPct,
      // TODO: r.userId to surowe UUID — warto zmapować na profiles.display_name
      // przy okazji rozbudowy widoku (join z tabelą profiles po stronie widoku SQL).
      r.userId,
      r.createdAt?.slice(0, 10),
    ]);
  });

  sheet.columns.forEach((col) => { col.width = 18; });

  await downloadWorkbook(wb, fileName);
}
