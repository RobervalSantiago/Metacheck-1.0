
import { User, Goal, SaleLog, ActivationLog, UserRole, AppState, Client } from '../types';
import { cacheService } from './cacheService';

// Bumping version to v33 (Clean Slate Protocol) to force a check and ignore corrupted v30/v31/v32 data
const STORAGE_KEY = 'salesforce_pro_data_v33'; 
const CACHE_KEYS = {
  CLIENTS: 'clients_data',
  GOALS: 'goals_data'
};

export const getInitialState = (): AppState => {
  // 1. Try to load from Granular Cache first (Faster/Optimized)
  const cachedClients = cacheService.get<Client[]>(CACHE_KEYS.CLIENTS);
  const cachedGoals = cacheService.get<Goal[]>(CACHE_KEYS.GOALS);

  const stored = localStorage.getItem(STORAGE_KEY);
  let parsed: any = {};

  if (stored) {
    try {
      parsed = JSON.parse(stored);
      
      // CRITICAL VALIDATION: If the stored data is garbage (e.g. users is not an array),
      // we must treat it as empty/invalid to avoid White Screen of Death on load.
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.users)) {
         console.warn("Storage corrupted. Resetting to empty state.");
         parsed = {};
      }

    } catch (e) {
      console.error("Failed to parse stored state", e);
      parsed = {};
    }
  }

  // 2. Assemble State with Safety Defaults
  // Ensuring arrays are ALWAYS arrays, never undefined/null
  return {
    currentUser: parsed.currentUser || null,
    users: Array.isArray(parsed.users) ? parsed.users : [], 
    clients: cachedClients || (Array.isArray(parsed.clients) ? parsed.clients : []),
    goals: cachedGoals || (Array.isArray(parsed.goals) ? parsed.goals : []),
    salesLogs: Array.isArray(parsed.salesLogs) ? parsed.salesLogs : [], 
    activationLogs: Array.isArray(parsed.activationLogs) ? parsed.activationLogs : [],
    clientStates: (parsed.clientStates && typeof parsed.clientStates === 'object') ? parsed.clientStates : {},
    peds: Array.isArray(parsed.peds) ? parsed.peds : (
      (Array.isArray(parsed.pedTemplate) && parsed.pedTemplate.length > 0) 
        ? [{ 
            id: 'legacy-ped', 
            name: parsed.pedName || 'MEU PROGRAMA DE EXCELÊNCIA', 
            items: parsed.pedTemplate, 
            createdAt: new Date().toISOString() 
          }] 
        : []
    ),
    activePedIds: Array.isArray(parsed.activePedIds) 
      ? parsed.activePedIds 
      : (parsed.activePedId ? [parsed.activePedId] : (Array.isArray(parsed.pedTemplate) && parsed.pedTemplate.length > 0 ? ['legacy-ped'] : [])),
    negotiationLogs: Array.isArray(parsed.negotiationLogs) ? parsed.negotiationLogs : [],
    sellOutLogs: Array.isArray(parsed.sellOutLogs) ? parsed.sellOutLogs : [],
  };
};

export const persistState = (state: AppState) => {
  try {
    // 1. Update Monolithic Backup (Legacy/Full Restore)
    const json = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, json);

    // 2. Update Granular Cache (Fast Access)
    cacheService.set(CACHE_KEYS.CLIENTS, state.clients);
    cacheService.set(CACHE_KEYS.GOALS, state.goals);
  } catch (e) {
    console.error("Failed to persist state (Quota exceeded?)", e);
  }
};
