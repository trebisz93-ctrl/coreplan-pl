export type Channel = 'online' | 'offline';
export type ActivityStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';
export type CampaignType = 'display' | 'social' | 'search' | 'video' | 'print' | 'outdoor' | 'radio' | 'tv' | 'event' | 'email';

export interface Client {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  clientId: string;
}

export interface PackageItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface MediaPackage {
  id: string;
  name: string;
  description: string;
  defaultPrice: number;
  items: PackageItem[];
}

export interface Confirmation {
  id: string;
  imageUrl: string;
  link?: string;
  isCover: boolean;
}

export interface Activity {
  id: string;
  planId: string;
  clientId?: string;
  name: string;
  channel: Channel;
  campaignType: CampaignType;
  startDate: string;
  endDate: string;
  productIds: string[];
  packageId?: string;
  price: number;
  status: ActivityStatus;
  note?: string;
  confirmations: Confirmation[];
}

export interface MediaPlan {
  id: string;
  clientId: string;
  name: string;
  year: number;
  version: string;
  annualBudget: number;
  onlineBudget?: number;
  offlineBudget?: number;
}

export const campaignColors: Record<CampaignType, string> = {
  display: 'hsl(221, 83%, 53%)',
  social: 'hsl(271, 81%, 56%)',
  search: 'hsl(142, 71%, 45%)',
  video: 'hsl(0, 84%, 60%)',
  print: 'hsl(25, 95%, 53%)',
  outdoor: 'hsl(38, 92%, 50%)',
  radio: 'hsl(330, 81%, 60%)',
  tv: 'hsl(263, 70%, 50%)',
  event: 'hsl(173, 58%, 39%)',
  email: 'hsl(220, 9%, 46%)',
};

export const statusLabels: Record<ActivityStatus, string> = {
  planned: 'Zaplanowane',
  in_progress: 'W trakcie',
  completed: 'Zrealizowane',
  cancelled: 'Anulowane',
};

export const campaignTypeLabels: Record<CampaignType, string> = {
  display: 'Display',
  social: 'Social Media',
  search: 'Search / SEM',
  video: 'Video',
  print: 'Prasa',
  outdoor: 'Outdoor',
  radio: 'Radio',
  tv: 'TV',
  event: 'Event',
  email: 'E-mail',
};
