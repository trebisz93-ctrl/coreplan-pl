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
}

// ── Color helpers ──

function parseHsl(hsl: string): [number, number, number] | null {
  const m = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!m) return null;
  return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

function colorFromHsl(hsl: string): [number, number, number] {
  const parsed = parseHsl(hsl);
  if (!parsed) return [100, 100, 100];
  return hslToRgb(...parsed);
}

function lighten(rgb: [number, number, number], amt: number): [number, number, number] {
  return [
    Math.min(255, rgb[0] + amt),
    Math.min(255, rgb[1] + amt),
    Math.min(255, rgb[2] + amt),
  ];
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

// ── Main export function ──

export function exportMediaPlanPDF(options: ExportOptions) {
  const { dateFrom, dateTo, year, packageGroups, productMap, clientName, clientNames, multiClient } = options;

  // A3 landscape: 420 x 297 mm
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
  const pageW = pdf.internal.pageSize.getWidth();  // 420
  const pageH = pdf.internal.pageSize.getHeight(); // 297

  const margin = 10;
  const labelColW = 75;   // left column for names
  const chartX = margin + labelColW;
  const chartW = pageW - chartX - margin;

  // ── Font setup ──
  pdf.setFont('helvetica');

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

  // ── 1. HEADER ──
  let y = margin;

  // Title
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 30, 30);
  pdf.text('Media Plan', margin, y + 5);

  // Subtitle with metadata
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);

  const metaParts: string[] = [];
  metaParts.push(`Rok: ${year}`);
  metaParts.push(`Okres: ${dateFrom} — ${dateTo}`);
  if (multiClient && clientNames?.length) {
    metaParts.push(`Klienci: ${clientNames.join(', ')}`);
  } else if (clientName) {
    metaParts.push(`Klient: ${clientName}`);
  }
  const totalBudget = packageGroups.reduce((s, g) => s + g.activities.reduce((a, act) => a + act.price, 0), 0);
  metaParts.push(`Budżet: ${formatPLN(totalBudget)}`);
  const totalActs = packageGroups.reduce((s, g) => s + g.activities.length, 0);
  metaParts.push(`Aktywności: ${totalActs}`);

  pdf.text(metaParts.join('   |   '), margin, y + 10);

  // Generated date
  pdf.setFontSize(7);
  pdf.text(`Wygenerowano: ${new Date().toLocaleDateString('pl-PL')} ${new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`, pageW - margin, y + 5, { align: 'right' });

  // Separator line
  y += 15;
  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.5);
  pdf.line(margin, y, pageW - margin, y);
  y += 3;

  // ── 2. MONTH HEADER ──
  const headerH = 8;
  // Month header background
  pdf.setFillColor(245, 245, 248);
  pdf.rect(chartX, y, chartW, headerH, 'F');

  // Month labels & grid lines
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(80, 80, 80);

  for (let m = startMonth; m <= endMonth; m++) {
    const mStart = new Date(year, m, 1);
    const mEnd = new Date(year, m + 1, 0);
    const x1 = dateToX(mStart.toISOString().slice(0, 10));
    const x2 = dateToX(mEnd.toISOString().slice(0, 10), true);
    const cx = (x1 + x2) / 2;

    pdf.text(MONTHS_PL[m], cx, y + 5.5, { align: 'center' });

    // Vertical month grid line (thick)
    if (m > startMonth) {
      pdf.setDrawColor(160, 160, 170);
      pdf.setLineWidth(0.4);
      pdf.line(x1, y, x1, pageH - margin);
    }
  }

  // Label column header
  pdf.setFillColor(245, 245, 248);
  pdf.rect(margin, y, labelColW, headerH, 'F');
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(120, 120, 130);
  pdf.text('PAKIET / AKTYWNOŚĆ', margin + 3, y + 5.5);

  y += headerH;

  // Border under header
  pdf.setDrawColor(160, 160, 170);
  pdf.setLineWidth(0.5);
  pdf.line(margin, y, pageW - margin, y);

  // ── 3. ROWS ──
  const pkgRowH = 9;
  const actRowH = 7;
  const barH = 4.5;
  const subBarH = 3;

  packageGroups.forEach((group, gIdx) => {
    const accentHsl = PACKAGE_COLORS[gIdx % PACKAGE_COLORS.length];
    const accentRgb = colorFromHsl(accentHsl);
    const totalPrice = group.activities.reduce((s, a) => s + a.price, 0);

    // Check page overflow
    const estimatedH = pkgRowH + group.activities.length * actRowH;
    if (y + estimatedH > pageH - margin) {
      pdf.addPage('a3', 'landscape');
      y = margin;
      // Re-draw header on new page
      pdf.setFillColor(245, 245, 248);
      pdf.rect(chartX, y, chartW, headerH, 'F');
      pdf.rect(margin, y, labelColW, headerH, 'F');
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(80, 80, 80);
      for (let m = startMonth; m <= endMonth; m++) {
        const mStart = new Date(year, m, 1);
        const mEnd = new Date(year, m + 1, 0);
        const x1 = dateToX(mStart.toISOString().slice(0, 10));
        const x2 = dateToX(mEnd.toISOString().slice(0, 10), true);
        pdf.text(MONTHS_PL[m], (x1 + x2) / 2, y + 5.5, { align: 'center' });
        if (m > startMonth) {
          pdf.setDrawColor(160, 160, 170);
          pdf.setLineWidth(0.4);
          pdf.line(x1, y, x1, pageH - margin);
        }
      }
      pdf.setFontSize(7);
      pdf.setTextColor(120, 120, 130);
      pdf.text('PAKIET / AKTYWNOŚĆ', margin + 3, y + 5.5);
      y += headerH;
      pdf.setDrawColor(160, 160, 170);
      pdf.setLineWidth(0.5);
      pdf.line(margin, y, pageW - margin, y);
    }

    // ── Package group row ──
    pdf.setFillColor(240, 240, 245);
    pdf.rect(margin, y, pageW - 2 * margin, pkgRowH, 'F');

    // Accent bar (left)
    pdf.setFillColor(...accentRgb);
    pdf.rect(margin, y, 2, pkgRowH, 'F');

    // Package name
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(40, 40, 50);
    const pkgLabel = `${group.packageName}  (${group.activities.length} akt. • ${formatPLN(totalPrice)})`;
    pdf.text(pkgLabel, margin + 5, y + 6);

    // Package aggregate bar on timeline
    if (group.activities.length > 0) {
      const allStarts = group.activities.map(a => a.startDate).sort();
      const allEnds = group.activities.map(a => a.endDate).sort();
      const barX1 = dateToX(allStarts[0]);
      const barX2 = dateToX(allEnds[allEnds.length - 1], true);
      const barY = y + (pkgRowH - barH) / 2;

      // Solid bar (no gradient)
      const lightAccent = lighten(accentRgb, 80);
      pdf.setFillColor(...lightAccent);
      pdf.roundedRect(barX1, barY, Math.max(barX2 - barX1, 2), barH, 1.2, 1.2, 'F');
      pdf.setDrawColor(...accentRgb);
      pdf.setLineWidth(0.35);
      pdf.roundedRect(barX1, barY, Math.max(barX2 - barX1, 2), barH, 1.2, 1.2, 'S');
    }

    y += pkgRowH;

    // Row separator
    pdf.setDrawColor(200, 200, 210);
    pdf.setLineWidth(0.2);
    pdf.line(margin, y, pageW - margin, y);

    // ── Activity rows ──
    group.activities.forEach((act, aIdx) => {
      // Page overflow check
      if (y + actRowH > pageH - margin) {
        pdf.addPage('a3', 'landscape');
        y = margin;
      }

      const actColorHsl = ACT_COLORS[aIdx % ACT_COLORS.length];
      const actRgb = colorFromHsl(actColorHsl);
      const statusRgb = colorFromHsl(STATUS_COLORS[act.status] || STATUS_COLORS.planned);

      // Alternating bg
      if (aIdx % 2 === 1) {
        pdf.setFillColor(250, 250, 253);
        pdf.rect(margin, y, pageW - 2 * margin, actRowH, 'F');
      }

      // Status indicator (left strip)
      pdf.setFillColor(...statusRgb);
      pdf.rect(margin, y + 0.5, 1.2, actRowH - 1, 'F');

      // Activity name
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(50, 50, 60);
      const brandLabel = getBrandLabel(act, productMap);
      const nameText = `${act.name}${brandLabel ? ` [${brandLabel}]` : ''}`;
      pdf.text(truncate(nameText, 42), margin + 6, y + 4.8);

      // Status + type + channel label (small)
      pdf.setFontSize(5);
      pdf.setTextColor(130, 130, 140);
      const infoLine = `${statusLabels[act.status]} • ${campaignTypeLabels[act.campaignType]} • ${act.channel === 'online' ? 'ON' : 'OFF'}`;
      pdf.text(infoLine, margin + 6, y + 6.5);

      // Activity bar on timeline
      const barX1 = dateToX(act.startDate);
      const barX2 = dateToX(act.endDate, true);
      const barY = y + (actRowH - barH) / 2;
      const barWidth = Math.max(barX2 - barX1, 2);

      // Solid fill (no gradient)
      pdf.setFillColor(...actRgb);
      pdf.roundedRect(barX1, barY, barWidth, barH, 1, 1, 'F');

      // Bar label
      if (barWidth > 15) {
        pdf.setFontSize(5.5);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);
        const barLabel = `${brandLabel || act.name} • ${formatPLN(act.price)}`;
        pdf.text(truncate(barLabel, 50), barX1 + 1.5, barY + 3.2);
      }

      y += actRowH;

      // Row line
      pdf.setDrawColor(220, 220, 228);
      pdf.setLineWidth(0.15);
      pdf.line(margin, y, pageW - margin, y);
    });
  });

  // ── 4. LEGEND ──
  y += 5;
  if (y + 15 > pageH - margin) {
    pdf.addPage('a3', 'landscape');
    y = margin;
  }

  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.3);
  pdf.line(margin, y, pageW - margin, y);
  y += 4;

  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(80, 80, 80);
  pdf.text('LEGENDA STATUSÓW:', margin, y + 3);

  let lx = margin + 35;
  Object.entries(STATUS_COLORS).forEach(([status, hsl]) => {
    const rgb = colorFromHsl(hsl);
    pdf.setFillColor(...rgb);
    pdf.rect(lx, y, 3, 3, 'F');
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(70, 70, 70);
    pdf.text(statusLabels[status as keyof typeof statusLabels] || status, lx + 4.5, y + 2.5);
    lx += 28;
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
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}
