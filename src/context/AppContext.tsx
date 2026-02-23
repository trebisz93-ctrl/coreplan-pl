import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { Activity, Channel, ActivityStatus } from '@/types/mediaplan';
import { useClients, DbClient } from '@/hooks/useData';
import { useActivities, dbToActivity } from '@/hooks/useActivities';

interface AppContextType {
  clients: DbClient[];
  clientsLoading: boolean;
  selectedClientId: string;
  setSelectedClientId: (id: string) => void;

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

  selectedClient: DbClient | undefined;
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
  const { data: dbClients = [], isLoading: clientsLoading } = useClients();
  const [selectedClientId, setSelectedClientId] = useState('');
  const [channelFilter, setChannelFilter] = useState<'all' | Channel>('all');
  const [productFilter, setProductFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<ActivityStatus[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const effectiveClientId = selectedClientId || dbClients[0]?.id || '';
  const selectedClient = useMemo(() => dbClients.find(c => c.id === effectiveClientId), [dbClients, effectiveClientId]);

  // Activities from DB
  const { data: dbActivities = [] } = useActivities(effectiveClientId || undefined);

  const allActivities: Activity[] = useMemo(() => dbActivities.map(dbToActivity), [dbActivities]);

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

  const handleClientChange = useCallback((id: string) => {
    setSelectedClientId(id);
  }, []);

  return (
    <AppContext.Provider value={{
      clients: dbClients, clientsLoading,
      selectedClientId: effectiveClientId, setSelectedClientId: handleClientChange,
      selectedClient,
      allActivities, filteredActivities, channelFilter, setChannelFilter,
      productFilter, setProductFilter, statusFilter, setStatusFilter,
      searchQuery, setSearchQuery,
      budgetUsed, budgetPlanned, budgetCompleted, onlineSpend, offlineSpend,
    }}>
      {children}
    </AppContext.Provider>
  );
};
