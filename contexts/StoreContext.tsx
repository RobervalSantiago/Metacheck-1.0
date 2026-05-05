
import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { AppState, User, Client, Goal, ActivationLog, UserRole, ClientUIState, View, SaleLog, PED } from '../types';
import { getInitialState, persistState } from '../services/dataService';
import { getTrustedISOString, getTrustedDate, getPeriodKey, getCycleKey } from '../services/timeService';
import { fetchClients, addClientToDb, updateClientInDb, deleteClientFromDb } from '../services/clientService';
import { fetchPEDs, addPEDToDb, updatePEDInDb, deletePEDFromDb } from '../services/pedService';
import { negotiationService } from '../services/negotiationService';
import { useAuth } from './AuthContext';

interface StoreContextType {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  currentView: View;
  setCurrentView: (view: View) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  addActivationLog: (logData: Omit<ActivationLog, 'id'>) => void;
  addClient: (clientData: Omit<Client, 'id'>) => void;
  updateClient: (client: Client) => void;
  removeClient: (clientId: string) => void;
  updateGoal: (newGoal: Goal) => void;
  updateUser: (updatedUser: User) => void;
  updateClientUIState: (clientId: string, updates: Partial<ClientUIState>) => void;
  addPED: (name: string, items: string[], period: PED['period']) => void;
  updatePED: (id: string, updates: Partial<PED>) => void;
  removePED: (id: string) => void;
  toggleActivePED: (id: string) => void;
  togglePEDTask: (clientId: string, pedId: string, label: string) => void;
  addNegotiationLog: (logData: Omit<NegotiationLog, 'id'>) => void;
  addSellOutLog: (logData: Omit<SellOutLog, 'id'>) => void;
  resetPEDData: () => void;
  resetMonthlyData: () => void;
  restoreData: (backupData: any) => void;
  currentGoal?: Goal;
  userSales: SaleLog[];
  userActivations: ActivationLog[];
  userClientStates: Record<string, ClientUIState>;
  installPrompt: any;
  isIOS: boolean;
  isStandalone: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user: authUser } = useAuth();
  const [state, setState] = useState<AppState>(getInitialState());
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // Sync currentUser from AuthContext
  useEffect(() => {
    setState(prev => ({ ...prev, currentUser: authUser }));
  }, [authUser]);

  // Load initial user data (clients, peds, logs) from Supabase when user is authenticated
  useEffect(() => {
    if (!authUser?.id) return;
    let cancelled = false;

    const loadUserData = async () => {
      const [clients, peds, negLogs, sellOutLogs] = await Promise.all([
        fetchClients(authUser.id),
        fetchPEDs(authUser.id),
        negotiationService.getNegotiationLogs(authUser.id),
        negotiationService.getSellOutLogs(authUser.id)
      ]);
      
      if (!cancelled) {
        setState(prev => ({ 
          ...prev, 
          clients: clients.length > 0 ? clients : prev.clients,
          peds: peds.length > 0 ? peds : prev.peds,
          negotiationLogs: negLogs,
          sellOutLogs: sellOutLogs
        }));
      }
    };

    loadUserData();
    return () => { cancelled = true; };
  }, [authUser?.id]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('metacheck_theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      if (next) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
      localStorage.setItem('metacheck_theme', next ? 'dark' : 'light');
      return next;
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => persistState(state), 1000);
    return () => clearTimeout(timer);
  }, [state]);

  const currentGoal = useMemo(() => {
    if (!state.currentUser) return undefined;
    const now = getTrustedDate();
    const day = now.getDate();
    let month = now.getMonth();
    let year = now.getFullYear();

    if (day >= 20) {
      month++;
      if (month > 11) {
        month = 0;
        year++;
      }
    }
    
    const cycleKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    return state.goals.find(g => g.userId === state.currentUser?.id && g.month === cycleKey);
  }, [state.goals, state.currentUser]);

  const addActivationLog = (logData: Omit<ActivationLog, 'id'>) => {
    const timestamp = getTrustedISOString();
    const id = `l${Date.now()}`;
    setState(prev => ({ ...prev, activationLogs: [...prev.activationLogs, { ...logData, id, timestamp }] }));
  };

  const addClient = (c: Omit<Client, 'id'>) => {
    const id = `c${Date.now()}`;
    const newClient: Client = { ...c, id, createdAt: getTrustedISOString() };
    setState(prev => ({ ...prev, clients: [...prev.clients, newClient] }));
    // Persist to Supabase in background
    if (authUser?.id) {
      addClientToDb(authUser.id, c).then(dbClient => {
        if (dbClient) {
          // Sync the DB-generated ID back
          setState(prev => ({
            ...prev,
            clients: prev.clients.map(cl => cl.id === id ? { ...cl, id: dbClient.id } : cl)
          }));
        }
      });
    }
  };

  const updateClient = (c: Client) => {
    setState(prev => ({ ...prev, clients: prev.clients.map(cl => cl.id === c.id ? c : cl) }));
    updateClientInDb(c);
  };

  const removeClient = (id: string) => {
    setState(prev => ({ ...prev, clients: prev.clients.filter(c => c.id !== id) }));
    deleteClientFromDb(id);
  };
  
  const updateGoal = (g: Goal) => {
    setState(prev => {
        const filtered = prev.goals.filter(goal => !(goal.userId === g.userId && goal.month === g.month));
        return { ...prev, goals: [...filtered, g] };
    });
  };

  const updateUser = (u: User) => setState(prev => ({ 
    ...prev, 
    users: prev.users.map(us => us.id === u.id ? u : us), 
    currentUser: prev.currentUser?.id === u.id ? u : prev.currentUser 
  }));

  const updateClientUIState = (id: string, up: Partial<ClientUIState>) => setState(prev => {
    const key = `${prev.currentUser?.id}_${id}`;
    const currentCycle = getCycleKey();
    
    // If updating standard tasks, also sync to cycle history
    if (up.tasks) {
      const existing = prev.clientStates[key] || { clientId: id, isExpanded: false, isSaved: false, tasks: [], industryTasks: {} };
      return { 
        ...prev, 
        clientStates: { 
          ...prev.clientStates, 
          [key]: { 
            ...existing, 
            ...up,
            industryTasks: {
              ...(existing.industryTasks || {}),
              [currentCycle]: up.tasks
            }
          } 
        } 
      };
    }

    return { ...prev, clientStates: { ...prev.clientStates, [key]: { ...(prev.clientStates[key] || { clientId: id, isExpanded: false, isSaved: false, tasks: [] }), ...up } } };
  });

  const addPED = (name: string, items: string[], period: PED['period']) => {
    const newPED: PED = {
      id: `ped_${Date.now()}`,
      name,
      period,
      items,
      createdAt: getTrustedISOString()
    };
    
    setState(prev => ({ ...prev, peds: [...prev.peds, newPED], activePedIds: [...prev.activePedIds, newPED.id] }));

    if (authUser?.id) {
      addPEDToDb(authUser.id, newPED);
    }
  };

  const updatePED = (id: string, up: Partial<PED>) => {
    setState(prev => {
      const updatedPeds = prev.peds.map(p => p.id === id ? { ...p, ...up } : p);
      const updatedPed = updatedPeds.find(p => p.id === id);
      if (updatedPed) {
        updatePEDInDb(updatedPed);
      }
      return { ...prev, peds: updatedPeds };
    });
  };

  const removePED = (id: string) => {
    setState(prev => ({
      ...prev,
      peds: prev.peds.filter(p => p.id !== id),
      activePedIds: prev.activePedIds.filter(pid => pid !== id)
    }));
    deletePEDFromDb(id);
  };

  const toggleActivePED = (id: string) => setState(prev => {
    const next = prev.activePedIds.includes(id)
      ? prev.activePedIds.filter(pid => pid !== id)
      : [...prev.activePedIds, id];
    return { ...prev, activePedIds: next };
  });

  const togglePEDTask = (clientId: string, pedId: string, label: string) => setState(prev => {
    const key = `${prev.currentUser?.id}_${clientId}`;
    const clientState = prev.clientStates[key] || { clientId, isExpanded: false, isSaved: false, tasks: [], pedTasks: {} };
    const ped = prev.peds.find(p => p.id === pedId);
    if (!ped) return prev;

    const periodKey = getPeriodKey(ped.period);
    const pedTasks = clientState.pedTasks || {};
    const pedEntry = pedTasks[pedId] || {};
    const currentChecked = pedEntry[periodKey] || [];
    
    const nextChecked = currentChecked.includes(label)
      ? currentChecked.filter(l => l !== label)
      : [...currentChecked, label];
      
    return {
      ...prev,
      clientStates: {
        ...prev.clientStates,
        [key]: {
          ...clientState,
          pedTasks: {
            ...pedTasks,
            [pedId]: {
              ...pedEntry,
              [periodKey]: nextChecked
            }
          }
        }
      }
    };
  });

  const addNegotiationLog = async (logData: Omit<NegotiationLog, 'id'>) => {
    if (!authUser?.id) return;
    const dbLog = await negotiationService.addNegotiationLog(logData, authUser.id);
    if (dbLog) {
      setState(prev => ({ ...prev, negotiationLogs: [dbLog, ...(prev.negotiationLogs || [])] }));
    }
  };

  const addSellOutLog = async (logData: Omit<SellOutLog, 'id'>) => {
    if (!authUser?.id) return;
    const dbLog = await negotiationService.addSellOutLog(logData, authUser.id);
    if (dbLog) {
      setState(prev => ({ ...prev, sellOutLogs: [dbLog, ...(prev.sellOutLogs || [])] }));
    }
  };

  const resetPEDData = () => {
    setState(prev => {
      const newClientStates = { ...prev.clientStates };
      Object.keys(newClientStates).forEach(clientId => {
        newClientStates[clientId] = {
          ...newClientStates[clientId],
          tasks: [],
          pedTasks: {}
        };
      });
      return { ...prev, clientStates: newClientStates };
    });
  };

  const resetMonthlyData = () => {
    setState(prev => {
        // 1. Coleta todas as vendas acumuladas nos estados de UI do usuário atual
        const currentActivations: ActivationLog[] = [];
        const userId = prev.currentUser?.id;

        Object.keys(prev.clientStates).forEach(key => {
            if (key.startsWith(`${userId}_`)) {
                const uiState = prev.clientStates[key];
                const clientId = key.split('_')[1];
                const client = prev.clients.find(c => c.id === clientId);
                
                if (uiState.saleValue && parseFloat(uiState.saleValue) > 0 && client) {
                    // Cria um log de ativação final para este ciclo caso tenha havido venda
                    currentActivations.push({
                        id: `cycle-end-${Date.now()}-${clientId}`,
                        userId: userId!,
                        timestamp: getTrustedISOString(),
                        clientName: client.name,
                        location: null,
                        checklist: uiState.tasks?.filter(t => t.checked).map(t => t.label) || [],
                        saleValue: parseFloat(uiState.saleValue),
                        saleValuePalm: parseFloat(uiState.saleValuePalm || '0'),
                        saleValueSite: parseFloat(uiState.saleValueSite || '0'),
                        notes: 'Fechamento de Ciclo'
                    });
                }
            }
        });

        return { 
            ...prev, 
            activationLogs: [...prev.activationLogs, ...currentActivations],
            clientStates: {} // RESETA O ROTEIRO (checklist e vendas do dia somem da tela de LogActions)
        };
    });
    alert("Ciclo finalizado com sucesso!");
  };

  const restoreData = (d: any) => { setState(d); persistState(d); };

  const userSales = useMemo(() => state.salesLogs.filter(l => l.userId === state.currentUser?.id), [state.salesLogs, state.currentUser?.id]);
  const userActivations = useMemo(() => state.activationLogs.filter(l => l.userId === state.currentUser?.id), [state.activationLogs, state.currentUser?.id]);
  const userClientStates = useMemo(() => {
    const res: Record<string, ClientUIState> = {};
    Object.keys(state.clientStates).forEach(k => { 
        if (k.startsWith(`${state.currentUser?.id}_`)) {
            res[k.split('_')[1]] = state.clientStates[k]; 
        }
    });
    return res;
  }, [state.clientStates, state.currentUser?.id]);

  return (
    <StoreContext.Provider value={{
      state, setState, currentView, setCurrentView, isDarkMode, toggleTheme,
      addActivationLog, addClient, updateClient, removeClient, 
      updateGoal, updateUser, updateClientUIState, addPED, updatePED, removePED, toggleActivePED, togglePEDTask, addNegotiationLog, addSellOutLog, resetPEDData, resetMonthlyData, restoreData,
      currentGoal, userSales, userActivations, userClientStates, installPrompt, isIOS, isStandalone
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const c = useContext(StoreContext);
  if (!c) throw new Error('StoreProvider missing');
  return c;
};
