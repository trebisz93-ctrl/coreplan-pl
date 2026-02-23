import { Activity, MediaPlan } from '@/types/mediaplan';

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
