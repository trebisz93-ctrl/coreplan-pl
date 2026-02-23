import { Client, Product, MediaPackage, Activity, MediaPlan } from '@/types/mediaplan';

export const clients: Client[] = [
  { id: 'c1', name: 'Pharma Group Polska' },
  { id: 'c2', name: 'TechNova Solutions' },
];

export const products: Product[] = [
  { id: 'p1', name: 'Cardio Plus', clientId: 'c1' },
  { id: 'p2', name: 'Vita Energy', clientId: 'c1' },
  { id: 'p3', name: 'Dermo Protect', clientId: 'c1' },
  { id: 'p4', name: 'Gastro Balance', clientId: 'c1' },
  { id: 'p5', name: 'Neuro Forte', clientId: 'c1' },
  { id: 'p6', name: 'CloudSync Pro', clientId: 'c2' },
  { id: 'p7', name: 'DataShield', clientId: 'c2' },
];

export const mediaPackages: MediaPackage[] = [
  {
    id: 'pkg1', name: 'MINI', description: 'Podstawowy pakiet reklamowy', defaultPrice: 15000,
    items: [
      { id: 'i1', name: 'Banner 300x250', quantity: 2, unitPrice: 3000 },
      { id: 'i2', name: 'Post Social Media', quantity: 4, unitPrice: 1500 },
      { id: 'i3', name: 'Newsletter', quantity: 1, unitPrice: 3000 },
    ],
  },
  {
    id: 'pkg2', name: 'STANDARD', description: 'Standardowy pakiet kampanii', defaultPrice: 45000,
    items: [
      { id: 'i4', name: 'Banner 300x250', quantity: 4, unitPrice: 3000 },
      { id: 'i5', name: 'Banner 728x90', quantity: 2, unitPrice: 4000 },
      { id: 'i6', name: 'Post Social Media', quantity: 8, unitPrice: 1500 },
      { id: 'i7', name: 'Artykuł sponsorowany', quantity: 1, unitPrice: 8000 },
    ],
  },
  {
    id: 'pkg3', name: 'CORE SOCIAL MEDIA', description: 'Pełna kampania social media', defaultPrice: 30000,
    items: [
      { id: 'i8', name: 'Post Facebook', quantity: 12, unitPrice: 1000 },
      { id: 'i9', name: 'Post Instagram', quantity: 8, unitPrice: 1200 },
      { id: 'i10', name: 'Story Instagram', quantity: 16, unitPrice: 500 },
    ],
  },
  {
    id: 'pkg4', name: 'KORZYSTNY', description: 'Pakiet z najlepszym ROI', defaultPrice: 80000,
    items: [
      { id: 'i11', name: 'Banner premium', quantity: 6, unitPrice: 5000 },
      { id: 'i12', name: 'Artykuł natywny', quantity: 3, unitPrice: 10000 },
      { id: 'i13', name: 'Video pre-roll', quantity: 4, unitPrice: 5000 },
    ],
  },
  {
    id: 'pkg5', name: 'TYDZIEŃ Z MARKĄ', description: 'Intensywna kampania tygodniowa', defaultPrice: 120000,
    items: [
      { id: 'i14', name: 'Takeover strony głównej', quantity: 7, unitPrice: 8000 },
      { id: 'i15', name: 'Branding sekcji', quantity: 7, unitPrice: 5000 },
      { id: 'i16', name: 'Artykuł redakcyjny', quantity: 2, unitPrice: 12000 },
    ],
  },
  {
    id: 'pkg6', name: 'WIDOCZNOŚĆ', description: 'Maksymalna ekspozycja marki', defaultPrice: 60000,
    items: [
      { id: 'i17', name: 'Billboard digital', quantity: 4, unitPrice: 8000 },
      { id: 'i18', name: 'Banner skyscraper', quantity: 6, unitPrice: 3000 },
      { id: 'i19', name: 'Pop-up', quantity: 2, unitPrice: 5000 },
    ],
  },
];

export const mediaPlans: MediaPlan[] = [
  { id: 'mp1', clientId: 'c1', name: 'Plan 2026', year: 2026, version: 'v1', annualBudget: 1200000, onlineBudget: 750000, offlineBudget: 450000 },
  { id: 'mp2', clientId: 'c1', name: 'Plan 2026 H2', year: 2026, version: 'v2', annualBudget: 600000, onlineBudget: 400000, offlineBudget: 200000 },
  { id: 'mp3', clientId: 'c2', name: 'Plan 2026', year: 2026, version: 'v1', annualBudget: 500000, onlineBudget: 400000, offlineBudget: 100000 },
];

export const activities: Activity[] = [
  { id: 'a1', planId: 'mp1', name: 'Launch Campaign Cardio', channel: 'online', campaignType: 'display', startDate: '2026-01-15', endDate: '2026-03-15', productIds: ['p1'], packageId: 'pkg2', price: 45000, status: 'completed', note: 'Kampania launchowa nowego produktu Cardio Plus', confirmations: [] },
  { id: 'a2', planId: 'mp1', name: 'Social Media Q1', channel: 'online', campaignType: 'social', startDate: '2026-01-05', endDate: '2026-03-31', productIds: ['p1', 'p2'], packageId: 'pkg3', price: 30000, status: 'completed', confirmations: [] },
  { id: 'a3', planId: 'mp1', name: 'Kampania prasowa wiosna', channel: 'offline', campaignType: 'print', startDate: '2026-03-01', endDate: '2026-05-30', productIds: ['p3'], price: 85000, status: 'in_progress', note: 'Reklamy w top 5 magazynach branżowych', confirmations: [] },
  { id: 'a4', planId: 'mp1', name: 'Video pre-roll Vita', channel: 'online', campaignType: 'video', startDate: '2026-04-01', endDate: '2026-06-30', productIds: ['p2'], packageId: 'pkg4', price: 80000, status: 'planned', confirmations: [] },
  { id: 'a5', planId: 'mp1', name: 'Outdoor billboardy lato', channel: 'offline', campaignType: 'outdoor', startDate: '2026-06-01', endDate: '2026-08-31', productIds: ['p1', 'p3'], price: 120000, status: 'planned', confirmations: [] },
  { id: 'a6', planId: 'mp1', name: 'Tydzień z Dermo Protect', channel: 'online', campaignType: 'display', startDate: '2026-05-10', endDate: '2026-05-17', productIds: ['p3'], packageId: 'pkg5', price: 120000, status: 'planned', confirmations: [] },
  { id: 'a7', planId: 'mp1', name: 'Search SEM jesień', channel: 'online', campaignType: 'search', startDate: '2026-09-01', endDate: '2026-11-30', productIds: ['p1', 'p2', 'p4'], price: 65000, status: 'planned', confirmations: [] },
  { id: 'a8', planId: 'mp1', name: 'Radio spot Gastro', channel: 'offline', campaignType: 'radio', startDate: '2026-07-01', endDate: '2026-09-15', productIds: ['p4'], price: 55000, status: 'planned', confirmations: [] },
  { id: 'a9', planId: 'mp1', name: 'Event medyczny Q4', channel: 'offline', campaignType: 'event', startDate: '2026-10-15', endDate: '2026-10-17', productIds: ['p1', 'p4', 'p5'], price: 95000, status: 'planned', confirmations: [] },
  { id: 'a10', planId: 'mp1', name: 'Email nurturing Neuro', channel: 'online', campaignType: 'email', startDate: '2026-02-01', endDate: '2026-12-31', productIds: ['p5'], packageId: 'pkg1', price: 15000, status: 'in_progress', confirmations: [] },
  { id: 'a11', planId: 'mp1', name: 'Social Media Q4', channel: 'online', campaignType: 'social', startDate: '2026-10-01', endDate: '2026-12-31', productIds: ['p2', 'p3'], packageId: 'pkg3', price: 30000, status: 'planned', confirmations: [] },
  { id: 'a12', planId: 'mp1', name: 'TV spot świąteczny', channel: 'offline', campaignType: 'tv', startDate: '2026-11-15', endDate: '2026-12-24', productIds: ['p1'], price: 180000, status: 'planned', confirmations: [] },
  { id: 'a13', planId: 'mp3', name: 'CloudSync Launch', channel: 'online', campaignType: 'display', startDate: '2026-02-01', endDate: '2026-04-30', productIds: ['p6'], packageId: 'pkg4', price: 80000, status: 'in_progress', confirmations: [] },
  { id: 'a14', planId: 'mp3', name: 'DataShield Awareness', channel: 'online', campaignType: 'social', startDate: '2026-03-15', endDate: '2026-06-15', productIds: ['p7'], packageId: 'pkg3', price: 30000, status: 'planned', confirmations: [] },
];
