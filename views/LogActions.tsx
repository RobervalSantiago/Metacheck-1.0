
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { User, ActivationLog, Client, ClientUIState, TaskState } from '../types';
import { ChevronDown, Search, MapPin, Sparkles, Info, History as HistoryIcon, RefreshCw, Navigation, Smartphone, Globe, Check, Compass, Ban, ArrowDownAZ, Navigation2, Flame, Snowflake, Loader2, Map as MapIcon, CalendarDays, CheckCircle2, LayoutGrid, Trash2, Plus, X, Package, DollarSign, Users } from 'lucide-react';
import { getTrustedISOString, getTrustedDate, getCycleKey } from '../services/timeService';
import { useStore } from '../contexts/StoreContext';

// Removemos o import problemático e usamos o L global injetado pelo script no index.html
declare var L: any;

interface LogActivationProps {
  user: User;
  clients: Client[];
  clientStates: Record<string, ClientUIState>;
  onUpdateClientState: (clientId: string, updates: Partial<ClientUIState>) => void;
  onSave: (log: Omit<ActivationLog, 'id'>) => void;
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const getWeekNumber = (date: Date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

const getClientHealth = (clientName: string, state: any) => {
    const historical = state.salesLogs?.filter((s: any) => s.clientName === clientName) || [];
    const recent = state.activationLogs?.filter((a: any) => a.clientName === clientName && (a.saleValue || 0) > 0) || [];
    const allSales = [...historical.map((h: any) => ({ d: h.timestamp, v: h.amount })), ...recent.map((r: any) => ({ d: r.timestamp, v: r.saleValue || 0 }))]
      .sort((a, b) => new Date(b.d).getTime() - new Date(a.d).getTime());

    if (allSales.length < 2) return { status: 'stable', trend: [] };
    const last = allSales[0].v;
    const avg = allSales.slice(1, 5).reduce((acc, curr) => acc + curr.v, 0) / (allSales.length > 5 ? 4 : allSales.length - 1);
    
    return {
      status: last > avg * 1.2 ? 'hot' : last < avg * 0.7 ? 'cold' : 'stable',
      trend: allSales.slice(0, 5).reverse().map(s => s.v)
    };
};

export const LogActivation: React.FC<LogActivationProps> = ({ 
  user, clients, clientStates, onUpdateClientState, onSave 
}) => {
  const { state } = useStore(); 
  const [searchTerm, setSearchTerm] = useState('');
  const calendarDays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const todayName = useMemo(() => calendarDays[new Date().getDay()], []);
  const [selectedDay, setSelectedDay] = useState<string | 'GERAL'>(todayName);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'done' | 'priority'>('all');
  const [sortMode, setSortMode] = useState<'name' | 'distance'>('distance');
  const [showMapModal, setShowMapModal] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isSyncingLocation, setIsSyncingLocation] = useState(false);
  
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const currentWeekNum = useMemo(() => getWeekNumber(new Date()), []);
  const isEvenWeek = currentWeekNum % 2 === 0;

  const syncLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setIsSyncingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsSyncingLocation(false);
      },
      () => setIsSyncingLocation(false),
      { enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => {
    syncLocation();
  }, [syncLocation]);

  const isClientPositivated = useCallback((clientId: string) => {
    const s = clientStates[clientId];
    if (!s) return false;
    const currentCycle = getCycleKey();
    const cycleTasks = (s as any).industryTasks?.[currentCycle] || s.tasks || [];
    return (cycleTasks.some((t: any) => t.checked) || parseFloat(s.saleValue || '0') > 0 || s.isSaved);
  }, [clientStates]);

  const filteredClients = useMemo(() => {
    return clients.filter(client => 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.code.includes(searchTerm)
    );
  }, [clients, searchTerm]);

  const groupedClients = useMemo(() => {
    return filteredClients.reduce((acc, client) => {
      const day = client.visitDay || 'Sem dia definido';
      if (client.frequency === 'odd_week' && isEvenWeek) return acc;
      if (client.frequency === 'even_week' && !isEvenWeek) return acc;
      if (!acc[day]) acc[day] = [];
      acc[day].push(client);
      return acc;
    }, {} as Record<string, Client[]>);
  }, [filteredClients, isEvenWeek]);

  const getLastPurchaseInfo = useCallback((clientName: string) => {
    const historyLogs = state.salesLogs?.filter(s => s.clientName === clientName).map(s => ({ date: s.timestamp, amount: s.amount })) || [];
    const recentLogs = state.activationLogs?.filter(a => a.clientName === clientName && (a.saleValue || 0) > 0).map(a => ({ date: a.timestamp, amount: a.saleValue || 0 })) || [];
    const allSales = [...historyLogs, ...recentLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (allSales.length === 0) return null;
    const lastSale = allSales[0];
    const diffDays = Math.ceil(Math.abs(new Date().getTime() - new Date(lastSale.date).getTime()) / (1000 * 60 * 60 * 24));
    const avg = allSales.reduce((acc, curr) => acc + curr.amount, 0) / allSales.length;
    
    return { amount: lastSale.amount, daysAgo: diffDays, average: avg };
  }, [state.salesLogs, state.activationLogs]);

  const selectedDayClientsTotal = useMemo(() => {
    if (selectedDay === 'GERAL') return filteredClients;
    return groupedClients[selectedDay] || [];
  }, [selectedDay, groupedClients, filteredClients]);

  const clientsWithLocation = useMemo(() => {
    return selectedDayClientsTotal.filter(c => c.lat && c.lng);
  }, [selectedDayClientsTotal]);

  const nextClient = useMemo(() => {
    if (!userLocation || selectedDayClientsTotal.length === 0) return null;
    const pending = selectedDayClientsTotal.filter(c => !isClientPositivated(c.id) && c.lat && c.lng);
    if (pending.length === 0) return null;
    
    return pending.reduce((prev, curr) => {
      const distPrev = calculateDistance(userLocation.lat, userLocation.lng, prev.lat!, prev.lng!);
      const distCurr = calculateDistance(userLocation.lat, userLocation.lng, curr.lat!, curr.lng!);
      return distPrev < distCurr ? prev : curr;
    });
  }, [userLocation, selectedDayClientsTotal, isClientPositivated]);

  const clientsToRender = useMemo(() => {
    let list = [...selectedDayClientsTotal];
    
    if (sortMode === 'distance' && userLocation) {
      list.sort((a, b) => {
        if (!a.lat || !a.lng) return 1;
        if (!b.lat || !b.lng) return -1;
        const distA = calculateDistance(userLocation.lat, userLocation.lng, a.lat, a.lng);
        const distB = calculateDistance(userLocation.lat, userLocation.lng, b.lat, b.lng);
        return distA - distB;
      });
    } else {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    if (statusFilter === 'pending') list = list.filter(c => !isClientPositivated(c.id));
    if (statusFilter === 'done') list = list.filter(c => isClientPositivated(c.id));
    if (statusFilter === 'priority') list = list.filter(c => {
      const info = getLastPurchaseInfo(c.name);
      return info && (info.daysAgo > 45 || info.amount > 2000);
    });
    return list;
  }, [selectedDayClientsTotal, statusFilter, sortMode, userLocation, isClientPositivated, getLastPurchaseInfo]);

  // Leaflet Logic
  useEffect(() => {
    if (showMapModal && mapContainerRef.current && !mapRef.current && typeof L !== 'undefined') {
      const initialView: [number, number] = clientsWithLocation.length > 0 
        ? [clientsWithLocation[0].lat!, clientsWithLocation[0].lng!] 
        : (userLocation ? [userLocation.lat, userLocation.lng] : [-23.5505, -46.6333]);

      mapRef.current = L.map(mapContainerRef.current).setView(initialView, 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapRef.current);

      const markersGroup = L.featureGroup().addTo(mapRef.current);

      if (userLocation) {
        L.marker([userLocation.lat, userLocation.lng], {
          icon: L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: #4f46e5; width: 15px; height: 15px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>`,
            iconSize: [15, 15],
            iconAnchor: [7, 7]
          })
        }).addTo(mapRef.current).bindPopup('Sua localização atual');
      }

      clientsWithLocation.forEach(c => {
        const isDone = isClientPositivated(c.id);
        const marker = L.marker([c.lat!, c.lng!], {
          icon: L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: ${isDone ? '#10b981' : '#4f46e5'}; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                   </div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          })
        }).addTo(markersGroup);

        marker.bindPopup(`
          <div style="padding: 5px;">
            <strong style="display: block; font-size: 14px; margin-bottom: 4px;">${c.name}</strong>
            <p style="margin: 0 0 8px 0; font-size: 12px; color: #666;">Cód: ${c.code} | Status: ${isDone ? 'Visitado' : 'Pendente'}</p>
            <button onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}')" style="width: 100%; background: #4f46e5; color: white; border: none; padding: 6px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 11px;">ABRIR GPS</button>
          </div>
        `);
      });

      if (clientsWithLocation.length > 0) {
        mapRef.current.fitBounds(markersGroup.getBounds().pad(0.1));
      }
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [showMapModal, clientsWithLocation, userLocation, isClientPositivated]);

  return (
    <div className="max-w-5xl mx-auto space-y-3 sm:space-y-4 pb-12 animate-in fade-in duration-500 px-0 sm:px-1">
      <div className="bg-white dark:bg-slate-900/80 backdrop-blur-md p-3 sm:p-5 rounded-xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 w-24 h-24 bg-brand-500/5 rounded-full -mr-12 -mt-12 blur-2xl"></div>
        <div className="flex justify-between items-center relative z-10 px-0.5">
           <div>
              <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight flex items-center gap-2">
                <CheckCircle2 size={18} className="text-brand-600 sm:w-6 sm:h-6" /> {selectedDay === 'GERAL' ? 'Carteira' : 'Roteiro'}
              </h2>
              <p className="text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1">
                {selectedDay === 'GERAL' ? (
                  <><LayoutGrid size={10} className="text-brand-500" /> Geral</>
                ) : (
                  <><CalendarDays size={10} className="text-brand-500" /> {selectedDay.split('-')[0]}</>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-1.5 sm:p-3 rounded-xl border border-slate-100 dark:border-slate-800">
               <div className="text-right">
                  <span className="text-xs sm:text-base font-black text-brand-600 dark:text-brand-400 tabular-nums">
                    {selectedDayClientsTotal.filter(c => isClientPositivated(c.id)).length}/{selectedDayClientsTotal.length}
                  </span>
                  <p className="text-[6px] sm:text-[8px] text-slate-400 font-black uppercase tracking-widest">Cobertura</p>
               </div>
            </div>
        </div>
      </div>

      {nextClient && (
        <div className="bg-brand-600 dark:bg-brand-500 p-5 rounded-[2rem] shadow-xl shadow-brand-500/20 flex items-center gap-4 animate-in slide-in-from-left-4 relative overflow-hidden group">
           <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
           <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20">
              <Compass size={24} className="text-white animate-spin-slow" />
           </div>
           <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-white/70 uppercase tracking-widest">Próxima Parada Recomendada</p>
              <h4 className="text-sm font-black text-white truncate">{nextClient.name}</h4>
           </div>
           <button 
             onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${nextClient.lat},${nextClient.lng}`)} 
             className="bg-white text-brand-600 p-3.5 rounded-2xl shadow-lg active:scale-90 transition-transform"
           >
              <Navigation size={20} />
           </button>
        </div>
      )}

      <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
         {calendarDays.map((day) => {
            const isActive = selectedDay === day;
            const count = (groupedClients[day] || []).length;
            return (
              <button 
                key={day} 
                onClick={() => setSelectedDay(day)} 
                className={`shrink-0 flex flex-col items-center justify-center min-w-[50px] h-[55px] sm:min-w-[75px] sm:h-[80px] rounded-xl sm:rounded-2xl border transition-all duration-300 ${isActive ? 'bg-indigo-900 text-white border-indigo-900 shadow-md scale-105' : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800'}`}
              >
                 <span className="text-[6px] sm:text-[9px] font-black uppercase">{day.substring(0, 3)}</span>
                 <span className="text-sm sm:text-lg font-black tracking-tighter">{count}</span>
                 {count > 0 && <div className={`w-0.5 h-0.5 rounded-full mt-0.5 ${isActive ? 'bg-white' : 'bg-brand-500'}`}></div>}
              </button>
            );
         })}
         <button 
           onClick={() => setSelectedDay('GERAL')} 
           className={`shrink-0 flex flex-col items-center justify-center min-w-[50px] h-[55px] sm:min-w-[75px] sm:h-[80px] rounded-xl sm:rounded-2xl border transition-all duration-300 ${selectedDay === 'GERAL' ? 'bg-emerald-600 text-white border-emerald-500 shadow-md scale-105' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'}`}
         >
            <LayoutGrid size={12} className="sm:w-[18px] sm:h-[18px]" />
            <span className="text-[6px] sm:text-[9px] font-black uppercase">Geral</span>
         </button>
      </div>

      <div className="sticky top-[3.75rem] lg:top-4 z-30 px-0.5">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-2 sm:p-5 rounded-xl sm:rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col lg:flex-row lg:items-center gap-2 sm:gap-4">
          <div className="flex flex-1 gap-2 items-center">
             <div className="relative flex-1 min-w-0">
               <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
               <input 
                type="text" 
                placeholder="Pesquisar..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full pl-9 pr-3 py-2 sm:py-4 bg-slate-100 dark:bg-slate-800 border-none rounded-lg sm:rounded-2xl text-[11px] sm:text-sm font-bold outline-none placeholder-slate-400 focus:ring-2 focus:ring-brand-500 transition-all shadow-inner" 
               />
             </div>
             <div className="flex gap-1.5 shrink-0">
               <button 
                onClick={() => { setSortMode(prev => prev === 'name' ? 'distance' : 'name'); if(sortMode === 'name') syncLocation(); }} 
                className={`p-2 sm:p-4 rounded-lg sm:rounded-2xl transition-all shadow-sm ${sortMode === 'distance' ? 'bg-brand-100 dark:bg-brand-900/50 text-brand-600' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}
               >
                  {sortMode === 'distance' ? <Navigation2 size={16} fill="currentColor" /> : <ArrowDownAZ size={16} />}
               </button>
               <button 
                  onClick={() => setShowMapModal(true)} 
                  className="p-2 sm:p-4 bg-brand-600 text-white rounded-lg sm:rounded-2xl shadow-lg active:scale-95 transition-all flex items-center gap-2"
               >
                  <MapIcon size={16}/>
               </button>
             </div>
          </div>
          <div className="flex overflow-x-auto pb-0.5 scrollbar-hide no-tap-highlight gap-1.5 shrink-0">
              {[
                {id: 'all', label: 'Tudo', icon: CheckCircle2}, 
                {id: 'priority', label: 'Críticos', icon: Flame}, 
                {id: 'pending', label: 'Pendente', icon: RefreshCw}, 
                {id: 'done', label: 'Feito', icon: Check}
              ].map(f => (
                <button 
                  key={f.id} 
                  onClick={() => setStatusFilter(f.id as any)} 
                  className={`px-3 py-1.5 sm:py-3.5 rounded-lg sm:rounded-2xl text-[8px] sm:text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1.5 shadow-sm whitespace-nowrap ${statusFilter === f.id ? 'bg-brand-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-500'}`}
                >
                  <f.icon size={11} /> {f.label}
                </button>
              ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {clientsToRender.length > 0 ? (
          clientsToRender.map((client) => {
            const uiState = clientStates[client.id];
            return (
              <ClientActivationCard 
                key={client.id} 
                client={client} 
                user={user}
                userLocation={userLocation}
                uiState={uiState}
                health={getClientHealth(client.name, state)}
                lastPurchaseInfo={getLastPurchaseInfo(client.name)}
                onUpdateState={(updates) => onUpdateClientState(client.id, updates)}
                onSave={onSave}
              />
            );
          })
        ) : (
          <div className="col-span-full py-24 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-slate-700">
              <Search className="text-slate-300 dark:text-slate-600" size={32} />
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">Nenhum cliente no filtro atual.</p>
          </div>
        )}
      </div>

      {showMapModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl h-full sm:h-[85vh] sm:rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
               <div>
                 <h3 className="font-black text-xl text-slate-900 dark:text-white uppercase tracking-tight">Mapa da Rota</h3>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedDay} • {clientsWithLocation.length} PDVs localizados</p>
               </div>
               <button onClick={() => setShowMapModal(false)} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full transition-transform active:scale-90"><X size={20}/></button>
            </div>
            
            <div className="flex-1 relative bg-slate-100 dark:bg-slate-950 overflow-hidden">
               <div ref={mapContainerRef} className="w-full h-full z-10" />
               
               {clientsWithLocation.length === 0 && (
                 <div className="absolute inset-0 z-20 flex items-center justify-center p-8 text-center bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-sm">
                   <div className="max-w-xs">
                     <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
                       <MapIcon size={32} />
                     </div>
                     <p className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Nenhum PDV desta rota possui coordenadas GPS cadastradas.</p>
                   </div>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ClientActivationCard: React.FC<{ 
  client: Client; user: User; uiState: ClientUIState | undefined; 
  userLocation: {lat: number, lng: number} | null;
  health: { status: string; trend: number[] }; 
  lastPurchaseInfo: any;
  onUpdateState: (updates: Partial<ClientUIState>) => void; onSave: (log: Omit<ActivationLog, 'id'>) => void;
}> = ({ client, user, uiState, userLocation, health, lastPurchaseInfo, onUpdateState, onSave }) => {
  const [currentSaleInput, setCurrentSaleInput] = useState('');
  
  const isExpanded = uiState?.isExpanded || false;
  const currentCycle = getCycleKey();
  const tasksForCycle = (uiState as any)?.industryTasks?.[currentCycle] || uiState?.tasks || [];
  const isPositivated = tasksForCycle.some((t: any) => t.checked) || parseFloat(uiState?.saleValue || '0') > 0 || uiState?.isSaved;
  const history = uiState?.history || [];

  const [showClearModal, setShowClearModal] = useState(false);
  const [showNoSaleModal, setShowNoSaleModal] = useState(false);
  const [noSaleReason, setNoSaleReason] = useState('');

  const noSaleOptions = [
    { id: 'fechado', label: 'Estabelecimento Fechado', icon: Ban },
    { id: 'estoque', label: 'Estoque Cheio', icon: Package },
    { id: 'financeiro', label: 'Problema Financeiro', icon: DollarSign },
    { id: 'proprietario', label: 'Proprietário Ausente', icon: Users },
    { id: 'outro', label: 'Outro Motivo', icon: Info },
  ];

  const handleNoSale = (reason: string) => {
    onSave({
      userId: user.id,
      clientName: client.name,
      timestamp: getTrustedISOString(),
      checklist: [],
      saleValue: 0,
      saleValuePalm: 0,
      saleValueSite: 0,
      location: userLocation,
      notes: `Não Venda: ${reason}`
    });
    setNoSaleReason(reason);
    setShowNoSaleModal(false);
    onUpdateState({ isSaved: true, isExpanded: false });
  };

  const industries = useMemo(() => {
    if (user.industries && user.industries.length > 0) return user.industries;
    return [];
  }, [user.industries]);
  const tasks = useMemo(() => {
    return industries.map((ind, i) => {
      const saved = tasksForCycle.find((t: any) => t.label === ind);
      return { id: `t-${i}`, label: ind, checked: saved?.checked || false };
    });
  }, [industries, tasksForCycle]);

  const toggleTask = (label: string) => {
    const newTasks = tasks.map(t => t.label === label ? { ...t, checked: !t.checked } : t);
    onUpdateState({ tasks: newTasks, isSaved: true });
  };

  const handleAddSale = (type: 'palm' | 'site') => {
    const val = parseFloat(currentSaleInput.replace(',', '.')) || 0;
    if (val <= 0) return;

    const currentPalm = parseFloat(uiState?.saleValuePalm || '0');
    const currentSite = parseFloat(uiState?.saleValueSite || '0');
    
    const newPalm = type === 'palm' ? currentPalm + val : currentPalm;
    const newSite = type === 'site' ? currentSite + val : currentSite;
    const newTotal = newPalm + newSite;

    const newOperation = { 
      palm: type === 'palm' ? val.toString() : '0', 
      site: type === 'site' ? val.toString() : '0' 
    };
    const newHistory = [...history, newOperation];

    onUpdateState({ 
      saleValuePalm: newPalm.toString(), 
      saleValueSite: newSite.toString(), 
      saleValue: newTotal.toString(),
      history: newHistory,
      isSaved: true
    });

    setCurrentSaleInput('');
  };

  const handleClearSales = () => {
    onUpdateState({ 
        saleValuePalm: '0', 
        saleValueSite: '0', 
        saleValue: '0',
        history: [],
        isSaved: false
    });
    setShowClearModal(false);
  };

  return (
    <div className={`bg-white dark:bg-slate-900 border rounded-xl sm:rounded-3xl overflow-hidden transition-all duration-300 relative ${isExpanded ? 'ring-2 ring-brand-500 shadow-xl z-20' : 'border-slate-200 dark:border-slate-800 shadow-sm'}`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors duration-500 ${isPositivated ? 'bg-emerald-500' : 'bg-slate-100 dark:bg-slate-800'}`}></div>
      
      <div className="p-3 sm:p-5 flex justify-between items-center cursor-pointer select-none" onClick={() => onUpdateState({ isExpanded: !isExpanded })}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5">
             <h4 className={`font-black text-[11px] sm:text-[15px] truncate uppercase tracking-tight transition-colors ${isPositivated ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>{client.name}</h4>
             {isPositivated && <CheckCircle2 size={11} className="text-emerald-500 shrink-0 sm:w-[14px] sm:h-[14px]" />}
          </div>
          <div className="flex items-center gap-x-2 text-[7px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0 overflow-hidden">
             <div className="flex items-center gap-1.5">
                <span className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[6px] sm:text-[9px] text-slate-500 shrink-0">#{client.code}</span>
                <span className="truncate max-w-[60px] sm:max-w-[100px]">{client.city}</span>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-3 mr-2">
           <button 
             onClick={(e) => { e.stopPropagation(); window.open(`https://www.google.com/maps/dir/?api=1&destination=${client.lat},${client.lng}`, '_blank'); }}
             className="w-7 h-7 sm:w-10 sm:h-10 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-brand-600 rounded-lg sm:rounded-xl flex items-center justify-center transition-all active:scale-90"
             title="Ver no Mapa"
           >
              <MapPin size={14} className="sm:w-5 sm:h-5" />
           </button>
           <button 
             onClick={(e) => { e.stopPropagation(); window.open(`tel:${client.phone || ''}`, '_blank'); }}
             className="w-7 h-7 sm:w-10 sm:h-10 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-emerald-600 rounded-lg sm:rounded-xl flex items-center justify-center transition-all active:scale-90"
             title="Ligar"
           >
              <Smartphone size={14} className="sm:w-5 sm:h-5" />
           </button>
           <button 
             onClick={(e) => { e.stopPropagation(); setShowNoSaleModal(true); }}
             className="w-7 h-7 sm:w-10 sm:h-10 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-red-600 rounded-lg sm:rounded-xl flex items-center justify-center transition-all active:scale-90"
             title="Não Venda"
           >
              <Ban size={14} className="sm:w-5 sm:h-5" />
           </button>
        </div>

        <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180 text-brand-500' : 'text-slate-300'}`}>
           <ChevronDown size={14} className="sm:w-6 sm:h-6"/>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-slate-50 dark:border-slate-800 animate-in slide-in-from-top-4">
            {/* Modal de Confirmação para Limpar Lançamentos */}
            {showClearModal && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-white dark:bg-slate-900 w-full max-w-xs rounded-[3rem] p-8 shadow-2xl animate-in zoom-in-95 border border-slate-100 dark:border-slate-800 text-center">
                   <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                      <Trash2 size={40} />
                   </div>
                   <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">LIMPAR DADOS?</h3>
                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-4 leading-relaxed">
                     Isso removerá todos os pedidos <br/> lançados nesta visita.
                   </p>
                   <div className="grid grid-cols-1 gap-2 mt-8">
                     <button onClick={handleClearSales} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95 transition-all">Limpar Tudo</button>
                     <button onClick={() => setShowClearModal(false)} className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">Cancelar</button>
                   </div>
                </div>
              </div>
            )}

            {/* Modal de Justificativa de Não Venda */}
            {showNoSaleModal && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[3rem] p-8 shadow-2xl animate-in zoom-in-95 border border-slate-100 dark:border-slate-800">
                   <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">MOTIVO NÃO VENDA</h3>
                      <button onClick={() => setShowNoSaleModal(false)} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full"><X size={20}/></button>
                   </div>
                   <div className="grid grid-cols-1 gap-2">
                      {noSaleOptions.map(opt => (
                         <button 
                           key={opt.id} 
                           onClick={() => handleNoSale(opt.label)}
                           className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-brand-500 transition-all text-left"
                         >
                            <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-slate-400">
                               <opt.icon size={20} />
                            </div>
                            <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wide">{opt.label}</span>
                         </button>
                      ))}
                   </div>
                </div>
              </div>
            )}
           <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
              <div className="p-3 sm:p-8">
                 <h5 className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 sm:mb-5">Ativação de Indústrias</h5>
                 <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
                    {tasks.map(t => {
                      const industryColor = user.industryColors?.[t.label] || '#4f46e5';
                      return (
                        <button 
                          key={t.id} 
                          onClick={() => toggleTask(t.label)} 
                          className={`p-2 sm:p-4 rounded-lg sm:rounded-2xl border font-black text-[8px] sm:text-[10px] uppercase transition-all flex items-center justify-center gap-1.5 ${t.checked ? 'text-white shadow-md border-transparent' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400'}`}
                          style={t.checked ? { backgroundColor: industryColor } : {}}
                        >
                           {t.checked && <Check size={10} className="sm:w-3.5 sm:h-3.5"/>} {t.label}
                        </button>
                      );
                    })}
                 </div>
              </div>

              <div className="p-3 sm:p-8 bg-slate-50/30 dark:bg-slate-900/50">
                 <div className="flex justify-between items-center mb-2 sm:mb-5">
                    <h5 className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Venda na Visita</h5>
                    <div className="text-sm sm:text-xl font-black text-brand-600 dark:text-brand-400 tabular-nums">
                      R$ {parseFloat(uiState?.saleValue || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                 </div>

                 <div className="flex gap-2 mb-2 sm:mb-5">
                    <input type="number" placeholder="0,00" value={currentSaleInput} onChange={e => setCurrentSaleInput(e.target.value)} className="flex-1 p-2 sm:p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg sm:rounded-2xl text-xs sm:text-base font-black outline-none focus:ring-2 focus:ring-brand-500" />
                 </div>

                 <div className="grid grid-cols-2 gap-1.5 sm:gap-3 mb-3 sm:mb-6">
                    <button onClick={() => handleAddSale('palm')} className="py-2.5 sm:py-4 bg-slate-900 text-white rounded-lg sm:rounded-2xl font-black text-[8px] sm:text-[10px] uppercase flex flex-col items-center gap-1 shadow-md active:scale-95 transition-transform">+ PALM</button>
                    <button onClick={() => handleAddSale('site')} className="py-2.5 sm:py-4 bg-brand-600 text-white rounded-lg sm:rounded-2xl font-black text-[8px] sm:text-[10px] uppercase flex flex-col items-center gap-1 shadow-md active:scale-95 transition-transform">+ SITE</button>
                 </div>

                 {history.length > 0 && (
                   <div className="space-y-2">
                     <div className="flex justify-between items-center mb-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase">Lançamentos</span>
                        <button onClick={() => setShowClearModal(true)} className="text-[9px] font-black text-red-500 uppercase hover:underline">Limpar</button>
                     </div>
                     <div className="max-h-32 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {history.map((op, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                             <span className="text-[10px] font-black text-slate-600 dark:text-slate-400">PEDIDO #{idx + 1} ({parseFloat(op.palm) > 0 ? 'PALM' : 'SITE'})</span>
                             <span className="text-[10px] font-black text-brand-600 dark:text-brand-400">R$ {parseFloat(parseFloat(op.palm) > 0 ? op.palm : op.site).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        ))}
                     </div>
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
