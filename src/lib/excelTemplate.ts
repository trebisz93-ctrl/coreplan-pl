import * as XLSX from 'xlsx/xlsx.mjs';

function downloadWorkbook(wb: XLSX.WorkBook, fileName: string) {
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
import type { DbProduct } from '@/hooks/useData';

const TEMPLATE_COLUMNS = [
  'Produkt',
  'Nazwa aktywności',
  'Kanał',
  'Typ kampanii',
  'Data rozpoczęcia',
  'Data zakończenia',
  'Budżet',
  'Status',
  'Notatka',
  'Tagi',
];

const CHANNELS = ['online', 'offline'];
const STATUSES = ['planned', 'in_progress', 'completed', 'cancelled'];
const CAMPAIGN_TYPES = ['display', 'social', 'search', 'video', 'print', 'outdoor', 'radio', 'tv', 'event', 'email'];

export function generateTemplate(clientName: string, products: DbProduct[]) {
  const wb = XLSX.utils.book_new();

  // Main sheet with headers
  const wsData = [TEMPLATE_COLUMNS];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = [
    { wch: 30 }, // Produkt
    { wch: 35 }, // Nazwa
    { wch: 12 }, // Kanał
    { wch: 15 }, // Typ kampanii
    { wch: 15 }, // Data start
    { wch: 15 }, // Data end
    { wch: 12 }, // Budżet
    { wch: 14 }, // Status
    { wch: 30 }, // Notatka
    { wch: 25 }, // Tagi
  ];

  // Products sheet
  const prodData = [['ID produktu', 'Nazwa produktu']];
  products.forEach(p => prodData.push([p.id, p.name]));
  const wsProd = XLSX.utils.aoa_to_sheet(prodData);
  wsProd['!cols'] = [{ wch: 40 }, { wch: 40 }];

  // Słownik sheet for dropdowns reference
  const dictData = [['Kanały', 'Typy kampanii', 'Statusy']];
  const maxLen = Math.max(CHANNELS.length, CAMPAIGN_TYPES.length, STATUSES.length);
  for (let i = 0; i < maxLen; i++) {
    dictData.push([
      CHANNELS[i] || '',
      CAMPAIGN_TYPES[i] || '',
      STATUSES[i] || '',
    ]);
  }
  const wsDict = XLSX.utils.aoa_to_sheet(dictData);

  // Add data validations for main sheet
  const maxRows = 1000;
  const productNames = products.map(p => `"${p.name}"`).join(',');

  if (!ws['!dataValidation']) ws['!dataValidation'] = [];

  // Product dropdown (column A, rows 2-1000)
  if (products.length <= 50) {
    ws['!dataValidation'].push({
      type: 'list',
      sqref: `A2:A${maxRows}`,
      formula1: `"${products.map(p => p.name).join(',')}"`,
    });
  }

  // Channel dropdown
  ws['!dataValidation'].push({
    type: 'list',
    sqref: `C2:C${maxRows}`,
    formula1: `"${CHANNELS.join(',')}"`,
  });

  // Campaign type dropdown
  ws['!dataValidation'].push({
    type: 'list',
    sqref: `D2:D${maxRows}`,
    formula1: `"${CAMPAIGN_TYPES.join(',')}"`,
  });

  // Status dropdown
  ws['!dataValidation'].push({
    type: 'list',
    sqref: `H2:H${maxRows}`,
    formula1: `"${STATUSES.join(',')}"`,
  });

  XLSX.utils.book_append_sheet(wb, ws, 'Import');
  XLSX.utils.book_append_sheet(wb, wsProd, 'Produkty');
  XLSX.utils.book_append_sheet(wb, wsDict, 'Słownik');

  const fileName = `Szablon_Import_${clientName.replace(/\s+/g, '_')}.xlsx`;
  XLSX.writeFile(wb, fileName);
  return fileName;
}

export interface ImportValidationError {
  row: number;
  column: string;
  message: string;
  hint?: string;
}

export interface ImportResult {
  success: boolean;
  rows: ParsedRow[];
  errors: ImportValidationError[];
  totalRows: number;
}

export interface ParsedRow {
  productName: string;
  productId: string;
  name: string;
  channel: string;
  campaignType: string;
  startDate: string;
  endDate: string;
  price: number;
  status: string;
  note: string;
  tags: string[];
}

export function parseAndValidateImport(
  file: ArrayBuffer,
  products: DbProduct[],
): ImportResult {
  const errors: ImportValidationError[] = [];
  const rows: ParsedRow[] = [];

  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(file, { type: 'array' });
  } catch {
    return { success: false, rows: [], errors: [{ row: 0, column: '-', message: 'Nie udało się odczytać pliku. Upewnij się, że to plik .xlsx' }], totalRows: 0 };
  }

  // Check sheets
  if (!wb.SheetNames.includes('Import')) {
    errors.push({ row: 0, column: '-', message: 'Brak arkusza "Import". Użyj szablonu wygenerowanego przez system.' });
    return { success: false, rows: [], errors, totalRows: 0 };
  }
  if (!wb.SheetNames.includes('Produkty')) {
    errors.push({ row: 0, column: '-', message: 'Brak arkusza "Produkty". Użyj szablonu wygenerowanego przez system.' });
    return { success: false, rows: [], errors, totalRows: 0 };
  }

  const ws = wb.Sheets['Import'];
  const data = XLSX.utils.sheet_to_json<any>(ws, { header: 1 }) as any[][];

  if (data.length < 2) {
    errors.push({ row: 0, column: '-', message: 'Plik nie zawiera danych do importu.' });
    return { success: false, rows: [], errors, totalRows: 0 };
  }

  // Validate headers
  const headers = (data[0] || []).map((h: any) => String(h).trim());
  for (let i = 0; i < TEMPLATE_COLUMNS.length; i++) {
    if (headers[i] !== TEMPLATE_COLUMNS[i]) {
      errors.push({
        row: 1,
        column: TEMPLATE_COLUMNS[i],
        message: `Nieprawidłowa nazwa kolumny "${headers[i] || '(brak)'}". Oczekiwano: "${TEMPLATE_COLUMNS[i]}"`,
        hint: 'Nie zmieniaj nagłówków w szablonie.',
      });
    }
  }

  if (errors.length > 0) {
    return { success: false, rows: [], errors, totalRows: data.length - 1 };
  }

  // Build product lookup
  const productByName = new Map<string, DbProduct>();
  products.forEach(p => productByName.set(p.name.toLowerCase().trim(), p));

  const dataRows = data.slice(1).filter(r => r.some((c: any) => c !== undefined && c !== null && String(c).trim() !== ''));

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNum = i + 2; // Excel row number

    const productName = String(row[0] || '').trim();
    const activityName = String(row[1] || '').trim();
    const channel = String(row[2] || '').trim().toLowerCase();
    const campaignType = String(row[3] || '').trim().toLowerCase();
    const startDateRaw = row[4];
    const endDateRaw = row[5];
    const priceRaw = row[6];
    const status = String(row[7] || 'planned').trim().toLowerCase();
    const note = String(row[8] || '').trim();
    const tagsRaw = String(row[9] || '').trim();

    // Product validation
    if (!productName) {
      errors.push({ row: rowNum, column: 'Produkt', message: 'Brak nazwy produktu.', hint: 'Wybierz produkt z listy.' });
    } else {
      const product = productByName.get(productName.toLowerCase());
      if (!product) {
        errors.push({
          row: rowNum,
          column: 'Produkt',
          message: `Produkt "${productName}" nie istnieje w systemie.`,
          hint: 'Sprawdź nazwę lub dodaj produkt w zakładce Produkty.',
        });
      }
    }

    // Activity name
    if (!activityName) {
      errors.push({ row: rowNum, column: 'Nazwa aktywności', message: 'Brak nazwy aktywności.' });
    }

    // Channel
    if (channel && !CHANNELS.includes(channel)) {
      errors.push({ row: rowNum, column: 'Kanał', message: `Nieprawidłowy kanał "${channel}".`, hint: 'Dozwolone: online, offline' });
    }

    // Campaign type
    if (campaignType && !CAMPAIGN_TYPES.includes(campaignType)) {
      errors.push({ row: rowNum, column: 'Typ kampanii', message: `Nieprawidłowy typ kampanii "${campaignType}".`, hint: `Dozwolone: ${CAMPAIGN_TYPES.join(', ')}` });
    }

    // Dates
    const startDate = parseExcelDate(startDateRaw);
    const endDate = parseExcelDate(endDateRaw);

    if (!startDate) {
      errors.push({ row: rowNum, column: 'Data rozpoczęcia', message: 'Nieprawidłowy format daty.', hint: 'Oczekiwany: RRRR-MM-DD' });
    }
    if (!endDate) {
      errors.push({ row: rowNum, column: 'Data zakończenia', message: 'Nieprawidłowy format daty.', hint: 'Oczekiwany: RRRR-MM-DD' });
    }
    if (startDate && endDate && startDate > endDate) {
      errors.push({ row: rowNum, column: 'Data zakończenia', message: 'Data zakończenia jest przed datą rozpoczęcia.' });
    }

    // Price
    const price = Number(priceRaw);
    if (priceRaw !== undefined && priceRaw !== null && priceRaw !== '' && (isNaN(price) || price < 0)) {
      errors.push({ row: rowNum, column: 'Budżet', message: `Wartość "${priceRaw}" nie jest prawidłową liczbą.`, hint: 'Podaj wartość >= 0' });
    }

    // Status
    if (status && !['planned', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      errors.push({ row: rowNum, column: 'Status', message: `Nieprawidłowy status "${status}".`, hint: 'Dozwolone: planned, in_progress, completed, cancelled' });
    }

    const product = productByName.get(productName.toLowerCase());
    rows.push({
      productName,
      productId: product?.id || '',
      name: activityName,
      channel: channel || 'online',
      campaignType: campaignType || 'display',
      startDate: startDate || '',
      endDate: endDate || '',
      price: isNaN(price) ? 0 : price,
      status: status || 'planned',
      note,
      tags: tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [],
    });
  }

  return {
    success: errors.length === 0,
    rows,
    errors,
    totalRows: dataRows.length,
  };
}

function parseExcelDate(val: any): string | null {
  if (!val && val !== 0) return null;

  // Excel serial number
  if (typeof val === 'number') {
    const date = new Date((val - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }

  const str = String(val).trim();
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return str;
  }
  // Try DD.MM.YYYY or DD/MM/YYYY
  const match = str.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (match) {
    const d = `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
    if (!isNaN(new Date(d).getTime())) return d;
  }
  return null;
}

export function exportActivitiesToExcel(
  clientName: string,
  activities: any[],
  products: DbProduct[],
) {
  const wb = XLSX.utils.book_new();

  const productMap = new Map<string, string>();
  products.forEach(p => productMap.set(p.id, p.name));

  const headers = ['Nazwa aktywności', 'Produkt(y)', 'Kanał', 'Typ kampanii', 'Data rozpoczęcia', 'Data zakończenia', 'Budżet', 'Status', 'Notatka', 'Tagi'];
  const data = [headers];

  activities.forEach(a => {
    const productNames = (a.product_ids || a.productIds || [])
      .map((id: string) => productMap.get(id) || id)
      .join(', ');

    data.push([
      a.name,
      productNames,
      a.channel || a.channel,
      a.campaign_type || a.campaignType,
      a.start_date || a.startDate,
      a.end_date || a.endDate,
      String(a.price),
      a.status,
      a.note || '',
      (a.tags || []).join(', '),
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 35 }, { wch: 30 }, { wch: 12 }, { wch: 15 },
    { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 14 },
    { wch: 30 }, { wch: 25 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Aktywności');

  const fileName = `Eksport_${clientName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
  return fileName;
}
