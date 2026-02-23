import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { Client, Product, Activity, MediaPlan, Channel, ActivityStatus } from '@/types/mediaplan';
import { activities as mockActivities, mediaPlans as mockPlans } from '@/data/mockData';

// Stub empty arrays since clients/products now come from DB
const mockClients: Client[] = [];
const mockProducts: Product[] = [];

interface AppContextType {
  clients: Client[];
  selectedClientId: string;
  setSelectedClientId: (id: string) => void;
  selectedPlanId: string;
  setSelectedPlanId: (id: string) => void;
  clientPlans: MediaPlan[];
  selectedPlan: MediaPlan | undefined;
  clientProducts: Product[];
  allActivities: Activity[];
  filteredActivities: Activity[];
  channelFilter: 'all' | Channel;
  setChannelFilter: (f: 'all' | Channel) => void;
  productFilter: string[];
  setProductFilter: (ids: string[]) => void;
  statusFilter: ActivityStatus[];
  setStatusFilter: (s: ActivityStatus[]) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  addActivity: (a: Activity) => void;
  updateActivity: (a: Activity) => void;
  budgetUsed: number;
  budgetPlanned: number;
  budgetCompleted: number;
  onlineSpend: number;
  offlineSpend: number;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedClientId, setSelectedClientId] = useState(mockClients[0]?.id ?? '');
  const [selectedPlanId, setSelectedPlanId] = useState(mockPlans[0]?.id ?? '');
  const [activitiesState, setActivities] = useState<Activity[]>(mockActivities);
  const [channelFilter, setChannelFilter] = useState<'all' | Channel>('all');
  const [productFilter, setProductFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<ActivityStatus[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const clientPlans = useMemo(() => mockPlans.filter(p => p.clientId === selectedClientId), [selectedClientId]);
  const selectedPlan = useMemo(() => mockPlans.find(p => p.id === selectedPlanId), [selectedPlanId]);
  const clientProducts = useMemo(() => mockProducts.filter(p => p.clientId === selectedClientId), [selectedClientId]);

  const allActivities = useMemo(() => activitiesState.filter(a => a.planId === selectedPlanId), [activitiesState, selectedPlanId]);

  const filteredActivities = useMemo(() => {
    return allActivities.filter(a => {
      if (channelFilter !== 'all' && a.channel !== channelFilter) return false;
      if (productFilter.length > 0 && !a.productIds.some(pid => productFilter.includes(pid))) return false;
      if (statusFilter.length > 0 && !statusFilter.includes(a.status)) return false;
      if (searchQuery && !a.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [allActivities, channelFilter, productFilter, statusFilter, searchQuery]);

  const budgetUsed = useMemo(() => allActivities.filter(a => a.status !== 'cancelled').reduce((s, a) => s + a.price, 0), [allActivities]);
  const budgetPlanned = useMemo(() => allActivities.filter(a => a.status === 'planned' || a.status === 'in_progress').reduce((s, a) => s + a.price, 0), [allActivities]);
  const budgetCompleted = useMemo(() => allActivities.filter(a => a.status === 'completed').reduce((s, a) => s + a.price, 0), [allActivities]);
  const onlineSpend = useMemo(() => allActivities.filter(a => a.channel === 'online' && a.status !== 'cancelled').reduce((s, a) => s + a.price, 0), [allActivities]);
  const offlineSpend = useMemo(() => allActivities.filter(a => a.channel === 'offline' && a.status !== 'cancelled').reduce((s, a) => s + a.price, 0), [allActivities]);

  const addActivity = useCallback((a: Activity) => setActivities(prev => [...prev, a]), []);
  const updateActivity = useCallback((a: Activity) => setActivities(prev => prev.map(x => x.id === a.id ? a : x)), []);

  const handleClientChange = useCallback((id: string) => {
    setSelectedClientId(id);
    const firstPlan = mockPlans.find(p => p.clientId === id);
    if (firstPlan) setSelectedPlanId(firstPlan.id);
  }, []);

  return (
    <AppContext.Provider value={{
      clients: mockClients, selectedClientId, setSelectedClientId: handleClientChange,
      selectedPlanId, setSelectedPlanId, clientPlans, selectedPlan, clientProducts,
      allActivities, filteredActivities, channelFilter, setChannelFilter,
      productFilter, setProductFilter, statusFilter, setStatusFilter,
      searchQuery, setSearchQuery, addActivity, updateActivity,
      budgetUsed, budgetPlanned, budgetCompleted, onlineSpend, offlineSpend,
    }}>
      {children}
    </AppContext.Provider>
  );
};
