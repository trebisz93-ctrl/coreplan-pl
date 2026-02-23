import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { Activity, Channel, ActivityStatus } from '@/types/mediaplan';
import { useClients, DbClient } from '@/hooks/useData';
import { useActivities, useActivitiesMulti, dbToActivity } from '@/hooks/useActivities';
import { useIsAdmin } from '@/hooks/useRole';
import { useMyRole } from '@/hooks/useData';
import { useMyClientAssignments } from '@/hooks/useClientAssignments';

interface ClientBudget {
  client: DbClient;
  budgetUsed: number;
  budgetPlanned: number;
  budgetCompleted: number;
}

interface AppContextType {
  clients: DbClient[];
  clientsLoading: boolean;
  selectedClientId: string;
  setSelectedClientId: (id: string) => void;

  multiClientMode: boolean;
  setMultiClientMode: (m: boolean) => void;
  selectedClientIds: string[];
  setSelectedClientIds: (ids: string[]) => void;
  multiClientBudgets: ClientBudget[];

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
  const { data: myRole } = useMyRole();
  const isAdmin = myRole === 'admin';
  const { data: myAssignments = [] } = useMyClientAssignments();

  const [selectedClientId, setSelectedClientId] = useState('');
  const [multiClientMode, setMultiClientModeState] = useState(false);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [channelFilter, setChannelFilter] = useState<'all' | Channel>('all');
  const [productFilter, setProductFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<ActivityStatus[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter clients based on role: admin sees all, manager/user sees assigned (if any assignments exist)
  const visibleClients = useMemo(() => {
    if (isAdmin) return dbClients;
    if (myAssignments.length === 0) return dbClients; // No restrictions if no assignments
    const assignedIds = new Set(myAssignments.map(a => a.client_id));
    return dbClients.filter(c => assignedIds.has(c.id));
  }, [dbClients, isAdmin, myAssignments]);

  const effectiveMultiMode = multiClientMode && isAdmin;
  const effectiveClientId = selectedClientId || visibleClients[0]?.id || '';
  const selectedClient = useMemo(() => visibleClients.find(c => c.id === effectiveClientId), [visibleClients, effectiveClientId]);

  // Single client activities
  const { data: singleDbActivities = [] } = useActivities(
    !effectiveMultiMode ? (effectiveClientId || undefined) : undefined,
    !effectiveMultiMode,
  );
  // Multi client activities
  const { data: multiDbActivities = [] } = useActivitiesMulti(
    effectiveMultiMode ? selectedClientIds : [],
  );

  const dbActivities = effectiveMultiMode ? multiDbActivities : singleDbActivities;
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

  // Per-client budgets for multi mode
  const multiClientBudgets = useMemo<ClientBudget[]>(() => {
    if (!effectiveMultiMode) return [];
    return selectedClientIds.map(cid => {
      const client = visibleClients.find(c => c.id === cid);
      if (!client) return null;
      const clientActs = dbActivities.filter(d => d.client_id === cid);
      return {
        client,
        budgetUsed: clientActs.filter(a => a.status !== 'cancelled').reduce((s, a) => s + Number(a.price), 0),
        budgetPlanned: clientActs.filter(a => a.status === 'planned' || a.status === 'in_progress').reduce((s, a) => s + Number(a.price), 0),
        budgetCompleted: clientActs.filter(a => a.status === 'completed').reduce((s, a) => s + Number(a.price), 0),
      };
    }).filter(Boolean) as ClientBudget[];
  }, [effectiveMultiMode, selectedClientIds, dbActivities, visibleClients]);

  const handleClientChange = useCallback((id: string) => {
    setSelectedClientId(id);
  }, []);

  const handleMultiModeChange = useCallback((m: boolean) => {
    setMultiClientModeState(m);
    if (m && effectiveClientId) {
      setSelectedClientIds(prev => prev.length === 0 ? [effectiveClientId] : prev);
    }
  }, [effectiveClientId]);

  return (
    <AppContext.Provider value={{
      clients: visibleClients, clientsLoading,
      selectedClientId: effectiveClientId, setSelectedClientId: handleClientChange,
      multiClientMode: effectiveMultiMode, setMultiClientMode: handleMultiModeChange,
      selectedClientIds, setSelectedClientIds,
      multiClientBudgets,
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
