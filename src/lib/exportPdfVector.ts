import jsPDF from 'jspdf';
import type { Activity } from '@/types/mediaplan';
import { statusLabels, campaignTypeLabels } from '@/types/mediaplan';

// ── Types ──

interface PackageGroup {
  packageId: string;
  packageName: string;
  activities: Activity[];
}

interface ProductInfo {
  id: string;
  name: string;
  brand: string | null;
}

interface ExportOptions {
  dateFrom: string;
  dateTo: string;
  year: number;
  packageGroups: PackageGroup[];
  productMap: Map<string, ProductInfo>;
  clientName?: string;
  clientNames?: string[];
  multiClient?: boolean;
  showPrices?: boolean;
}

// ── Color helpers ──

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

function colorFromHsl(hsl: string): [number, number, number] {
  const m = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!m) return [100, 100, 100];
  return hslToRgb(parseInt(m[1]), parseInt(m[2]), parseInt(m[3]));
}

function lighten(rgb: [number, number, number], amt: number): [number, number, number] {
  return [Math.min(255, rgb[0] + amt), Math.min(255, rgb[1] + amt), Math.min(255, rgb[2] + amt)];
}

// ── Constants ──

const MONTHS_PL = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];

const PACKAGE_COLORS = [
  'hsl(221, 70%, 55%)', 'hsl(142, 60%, 45%)', 'hsl(271, 65%, 55%)',
  'hsl(25, 80%, 50%)', 'hsl(0, 70%, 55%)', 'hsl(38, 80%, 48%)',
  'hsl(173, 50%, 42%)', 'hsl(330, 65%, 55%)',
];

const ACT_COLORS = [
  'hsl(221, 83%, 53%)', 'hsl(271, 81%, 56%)', 'hsl(142, 71%, 45%)',
  'hsl(0, 84%, 60%)', 'hsl(25, 95%, 53%)', 'hsl(38, 92%, 50%)',
  'hsl(330, 81%, 60%)', 'hsl(173, 58%, 39%)', 'hsl(263, 70%, 50%)',
  'hsl(200, 80%, 50%)', 'hsl(50, 90%, 45%)', 'hsl(290, 60%, 55%)',
];

const STATUS_COLORS: Record<string, string> = {
  planned: 'hsl(220, 9%, 64%)',
  in_progress: 'hsl(221, 83%, 53%)',
  completed: 'hsl(142, 71%, 45%)',
  cancelled: 'hsl(0, 84%, 60%)',
};

const formatPLN = (n: number) =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(n);

// ── Font loading ──

async function loadFont(url: string): Promise<string> {
  const resp = await fetch(url);
  const buf = await resp.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function setupFonts(pdf: jsPDF) {
  try {
    const [regularB64, boldB64] = await Promise.all([
      loadFont('/fonts/Roboto-Regular.ttf'),
      loadFont('/fonts/Roboto-Bold.ttf'),
    ]);

    pdf.addFileToVFS('Roboto-Regular.ttf', regularB64);
    pdf.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');

    pdf.addFileToVFS('Roboto-Bold.ttf', boldB64);
    pdf.addFont('Roboto-Bold.ttf', 'RobotoBold', 'normal');

    return { regular: 'Roboto', bold: 'RobotoBold' };
  } catch (e) {
    console.warn('Could not load Roboto font, falling back to helvetica', e);
    return { regular: 'helvetica', bold: 'helvetica' };
  }
}

// ── Main export function ──

export async function exportMediaPlanPDF(options: ExportOptions) {
  const { dateFrom, dateTo, year, packageGroups, productMap, clientName, clientNames, multiClient, showPrices = true } = options;

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  const fonts = await setupFonts(pdf);

  const margin = 10;
  const labelColW = 75;
  const chartX = margin + labelColW;
  const chartW = pageW - chartX - margin;

  // ── Date range ──
  const rangeStart = new Date(dateFrom).getTime();
  const rangeEnd = new Date(dateTo).getTime() + 86400000;
  const rangeDur = rangeEnd - rangeStart;
  const startMonth = parseInt(dateFrom.slice(5, 7)) - 1;
  const endMonth = parseInt(dateTo.slice(5, 7)) - 1;

  function dateToX(dateStr: string, isEnd = false): number {
    const t = new Date(dateStr).getTime() + (isEnd ? 86400000 : 0);
    const clamped = Math.max(rangeStart, Math.min(t, rangeEnd));
    return chartX + ((clamped - rangeStart) / rangeDur) * chartW;
  }

  // Track the bottom of chart content for grid line clamping
  let chartContentBottom = 0;

  // Helper to set font
  const setFont = (style: 'regular' | 'bold', size: number) => {
    pdf.setFont(style === 'bold' ? fonts.bold : fonts.regular, 'normal');
    pdf.setFontSize(size);
  };

  // ── Calculate total content height to know where grid ends ──
  const headerH = 8;
  const pkgRowH = 9;
  const actRowH = 7;
  const barH = 4.5;

  // ── 1. HEADER ──
  let y = margin;

  setFont('bold', 16);
  pdf.setTextColor(30, 30, 30);
  pdf.text('Media Plan', margin, y + 5);

  setFont('regular', 9);
  pdf.setTextColor(100, 100, 100);
  const metaParts: string[] = [];
  metaParts.push(`Rok: ${year}`);
  metaParts.push(`Okres: ${dateFrom} \u2014 ${dateTo}`);
  if (multiClient && clientNames?.length) {
    metaParts.push(`Klienci: ${clientNames.join(', ')}`);
  } else if (clientName) {
    metaParts.push(`Klient: ${clientName}`);
  }
  const totalBudget = packageGroups.reduce((s, g) => s + g.activities.reduce((a, act) => a + act.price, 0), 0);
  if (showPrices) metaParts.push(`Budżet: ${formatPLN(totalBudget)}`);
  const totalActs = packageGroups.reduce((s, g) => s + g.activities.length, 0);
  metaParts.push(`Aktywności: ${totalActs}`);
  pdf.text(metaParts.join('   |   '), margin, y + 10);

  setFont('regular', 7);
  const now = new Date();
  pdf.text(
    `Wygenerowano: ${now.toLocaleDateString('pl-PL')} ${now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`,
    pageW - margin, y + 5, { align: 'right' }
  );

  y += 15;
  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.5);
  pdf.line(margin, y, pageW - margin, y);
  y += 3;

  const gridTopY = y; // remember where grid starts

  // ── 2. MONTH HEADER ──
  pdf.setFillColor(245, 245, 248);
  pdf.rect(margin, y, pageW - 2 * margin, headerH, 'F');

  setFont('bold', 8);
  pdf.setTextColor(80, 80, 80);

  // Calculate month X positions for later grid drawing
  const monthXPositions: number[] = [];
  for (let m = startMonth; m <= endMonth; m++) {
    const mStart = new Date(year, m, 1);
    const mEnd = new Date(year, m + 1, 0);
    const x1 = dateToX(mStart.toISOString().slice(0, 10));
    const x2 = dateToX(mEnd.toISOString().slice(0, 10), true);
    pdf.text(MONTHS_PL[m], (x1 + x2) / 2, y + 5.5, { align: 'center' });
    if (m > startMonth) monthXPositions.push(x1);
  }

  // Label column header
  setFont('bold', 7);
  pdf.setTextColor(120, 120, 130);
  pdf.text('PAKIET / AKTYWNOŚĆ', margin + 3, y + 5.5);

  y += headerH;
  pdf.setDrawColor(160, 160, 170);
  pdf.setLineWidth(0.5);
  pdf.line(margin, y, pageW - margin, y);

  // ── 3. ROWS ──
  const drawMonthGridLines = (fromY: number, toY: number) => {
    pdf.setDrawColor(185, 185, 195);
    pdf.setLineWidth(0.35);
    monthXPositions.forEach(x => {
      pdf.line(x, fromY, x, toY);
    });
  };

  // Grid lines will be drawn AFTER all rows, clipped to content bottom

  // First pass: draw all rows, track y positions for grid
  const pageRows: { pageIdx: number; startY: number; endY: number }[] = [];
  let currentPageStart = y;
  let pageIdx = 0;

  const drawHeaderOnNewPage = () => {
    pdf.addPage('a3', 'landscape');
    pageIdx++;
    y = margin;

    pdf.setFillColor(245, 245, 248);
    pdf.rect(margin, y, pageW - 2 * margin, headerH, 'F');
    setFont('bold', 8);
    pdf.setTextColor(80, 80, 80);
    for (let m = startMonth; m <= endMonth; m++) {
      const mStart = new Date(year, m, 1);
      const mEnd = new Date(year, m + 1, 0);
      const x1 = dateToX(mStart.toISOString().slice(0, 10));
      const x2 = dateToX(mEnd.toISOString().slice(0, 10), true);
      pdf.text(MONTHS_PL[m], (x1 + x2) / 2, y + 5.5, { align: 'center' });
    }
    setFont('bold', 7);
    pdf.setTextColor(120, 120, 130);
    pdf.text('PAKIET / AKTYWNOŚĆ', margin + 3, y + 5.5);
    y += headerH;
    pdf.setDrawColor(160, 160, 170);
    pdf.setLineWidth(0.5);
    pdf.line(margin, y, pageW - margin, y);

    currentPageStart = y;
  };

  const checkPageBreak = (neededH: number) => {
    if (y + neededH > pageH - margin - 5) {
      // Save page row range
      pageRows.push({ pageIdx, startY: currentPageStart, endY: y });
      drawHeaderOnNewPage();
    }
  };

  packageGroups.forEach((group, gIdx) => {
    const accentHsl = PACKAGE_COLORS[gIdx % PACKAGE_COLORS.length];
    const accentRgb = colorFromHsl(accentHsl);
    const totalPrice = group.activities.reduce((s, a) => s + a.price, 0);

    const estimatedH = pkgRowH + group.activities.length * actRowH;
    checkPageBreak(Math.min(estimatedH, pkgRowH + actRowH * 2));

    // ── Package group row ──
    pdf.setFillColor(237, 237, 242);
    pdf.rect(margin, y, pageW - 2 * margin, pkgRowH, 'F');

    // Accent bar
    pdf.setFillColor(...accentRgb);
    pdf.rect(margin, y, 2, pkgRowH, 'F');

    // Package name
    setFont('bold', 8.5);
    pdf.setTextColor(35, 35, 45);
    const pkgLabel = showPrices
      ? `${group.packageName}  (${group.activities.length} akt. \u2022 ${formatPLN(totalPrice)})`
      : `${group.packageName}  (${group.activities.length} akt.)`;
    pdf.text(truncate(pkgLabel, 55), margin + 5, y + 6);

    // Package aggregate bar
    if (group.activities.length > 0) {
      const allStarts = group.activities.map(a => a.startDate).sort();
      const allEnds = group.activities.map(a => a.endDate).sort();
      const barX1 = dateToX(allStarts[0]);
      const barX2 = dateToX(allEnds[allEnds.length - 1], true);
      const barY = y + (pkgRowH - barH) / 2;
      const bw = Math.max(barX2 - barX1, 2);

      const lightAccent = lighten(accentRgb, 100);
      pdf.setFillColor(...lightAccent);
      pdf.roundedRect(barX1, barY, bw, barH, 1.2, 1.2, 'F');
      pdf.setDrawColor(...accentRgb);
      pdf.setLineWidth(0.4);
      pdf.roundedRect(barX1, barY, bw, barH, 1.2, 1.2, 'S');
    }

    y += pkgRowH;
    pdf.setDrawColor(200, 200, 210);
    pdf.setLineWidth(0.25);
    pdf.line(margin, y, pageW - margin, y);

    // ── Activity rows ──
    group.activities.forEach((act, aIdx) => {
      checkPageBreak(actRowH);

      const actColorHsl = ACT_COLORS[aIdx % ACT_COLORS.length];
      const actRgb = colorFromHsl(actColorHsl);
      const statusRgb = colorFromHsl(STATUS_COLORS[act.status] || STATUS_COLORS.planned);

      // Alternating bg
      if (aIdx % 2 === 1) {
        pdf.setFillColor(248, 248, 252);
        pdf.rect(margin, y, pageW - 2 * margin, actRowH, 'F');
      }

      // Status strip
      pdf.setFillColor(...statusRgb);
      pdf.rect(margin, y + 0.5, 1.2, actRowH - 1, 'F');

      // Activity name
      setFont('regular', 7);
      pdf.setTextColor(45, 45, 55);
      const brandLabel = getBrandLabel(act, productMap);
      const nameText = `${act.name}${brandLabel ? ` [${brandLabel}]` : ''}`;
      pdf.text(truncate(nameText, 45), margin + 6, y + 4.2);

      // Info line
      setFont('regular', 5.5);
      pdf.setTextColor(130, 130, 140);
      const infoLine = `${statusLabels[act.status]} \u2022 ${campaignTypeLabels[act.campaignType]} \u2022 ${act.channel === 'online' ? 'ON' : 'OFF'}`;
      pdf.text(infoLine, margin + 6, y + 6.3);

      // Activity bar
      const barX1 = dateToX(act.startDate);
      const barX2 = dateToX(act.endDate, true);
      const barY = y + (actRowH - barH) / 2;
      const barWidth = Math.max(barX2 - barX1, 2);

      pdf.setFillColor(...actRgb);
      pdf.roundedRect(barX1, barY, barWidth, barH, 1, 1, 'F');

      // Bar label (white text on bar)
      if (barWidth > 18) {
        setFont('bold', 5.5);
        pdf.setTextColor(255, 255, 255);
        const barLabel = showPrices
          ? `${brandLabel || act.name} \u2022 ${formatPLN(act.price)}`
          : `${brandLabel || act.name}`;
        pdf.text(truncate(barLabel, 50), barX1 + 1.5, barY + 3.2);
      }

      y += actRowH;
      pdf.setDrawColor(220, 220, 228);
      pdf.setLineWidth(0.15);
      pdf.line(margin, y, pageW - margin, y);
    });
  });

  // Save last page row range
  chartContentBottom = y;
  pageRows.push({ pageIdx, startY: currentPageStart, endY: chartContentBottom });

  // Now draw grid lines on top of row backgrounds but we need them BEHIND bars.
  // Since jsPDF draws in order, we redraw grid lines now on each page clipped to content.
  // We go back to each page and draw the lines.
  const totalPages = pdf.getNumberOfPages();
  for (const pr of pageRows) {
    pdf.setPage(pr.pageIdx + 1);
    drawMonthGridLines(pr.startY, pr.endY);
  }
  // Return to last page
  pdf.setPage(totalPages);

  // ── 4. LEGEND ──
  y = chartContentBottom + 5;
  if (y + 12 > pageH - margin) {
    pdf.addPage('a3', 'landscape');
    y = margin;
  }

  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.3);
  pdf.line(margin, y, pageW - margin, y);
  y += 4;

  setFont('bold', 7);
  pdf.setTextColor(80, 80, 80);
  pdf.text('LEGENDA STATUSÓW:', margin, y + 3);

  let lx = margin + 38;
  Object.entries(STATUS_COLORS).forEach(([status, hsl]) => {
    const rgb = colorFromHsl(hsl);
    pdf.setFillColor(...rgb);
    pdf.rect(lx, y + 0.5, 3, 3, 'F');
    setFont('regular', 6.5);
    pdf.setTextColor(60, 60, 70);
    pdf.text(statusLabels[status as keyof typeof statusLabels] || status, lx + 5, y + 3);
    lx += 32;
  });

  // ── Save ──
  pdf.save(`mediaplan-${year}-${dateFrom}_${dateTo}.pdf`);
}

// ── Helpers ──

function getBrandLabel(act: Activity, productMap: Map<string, ProductInfo>): string {
  const prods = act.productIds.map(pid => productMap.get(pid)).filter(Boolean) as ProductInfo[];
  const brands = [...new Set(prods.map(p => p.brand).filter(Boolean))] as string[];
  if (brands.length === 0) return '';
  if (brands.length === 1) return brands[0];
  return `${brands[0]} +${brands.length - 1}`;
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '\u2026' : s;
}
