import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Client, PED } from '../types';
import { 
  Building2, Plus, Search, MapPin, Trash2, X, Pencil, CheckCircle2, 
  AlertCircle, Star, Sparkles, Crosshair, Loader2, 
  Fingerprint, SearchCode, Navigation, 
  ChevronDown, ClipboardCheck, Check, LayoutGrid, Info, TrendingUp, ArrowLeft
} from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import { motion, AnimatePresence } from 'motion/react';
import { getPeriodKey, getCycleKey } from '../services/timeService';

interface ClientsProps {
  clients: Client[];
  onAddClient: (client: Omit<Client, 'id'>) => void;
  onRemoveClient: (id: string) => void;
}

type ClientSegment = 'all' | 'vip' | 'risk' | 'churn' | 'new' | 'route';

export const Clients: React.FC<ClientsProps> = ({ clients, onAddClient, onRemoveClient }) => {
  const { updateClient, updateClientUIState, userClientStates, state, togglePEDTask } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean, client: Client | null }>({ isOpen: false, client: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSegment, setActiveSegment] = useState<ClientSegment>('all');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [expandedPedClientId, setExpandedPedClientId] = useState<string | null>(null);
  const [toast, setToast] = useState<{type: 'success' | 'error', msg: string} | null>(null);
  const [isSearchingCnpj, setIsSearchingCnpj] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [longPressedClientId, setLongPressedClientId] = useState<string | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isThresholdMet = useRef<boolean>(false);

  // Clear long press state when clicking elsewhere
  useEffect(() => {
    const handleClick = () => setLongPressedClientId(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleTouchStart = (clientId: string) => {
    isThresholdMet.current = false;
    longPressTimer.current = setTimeout(() => {
      setLongPressedClientId(clientId);
      isThresholdMet.current = true;
      if (navigator.vibrate) navigator.vibrate(50);
    }, 600);
  };

  const handleTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    // If it was a long press, prevent the default click (expansion)
    if (isThresholdMet.current) {
      e.stopPropagation();
    }
  };

  const handleTouchMove = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const [cnpj, setCnpj] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [visitDay, setVisitDay] = useState('Segunda-feira');
  const [frequency, setFrequency] = useState<'weekly' | 'odd_week' | 'even_week'>('weekly');
  const [lat, setLat] = useState<string>('');
  const [lng, setLng] = useState<string>('');
  
  const daysOfWeek = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCnpjSearch = async () => {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) {
      showToast('error', 'CNPJ inválido');
      return;
    }
    setIsSearchingCnpj(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
      if (!response.ok) throw new Error('CNPJ não encontrado');
      const data = await response.json();
      setName(data.razao_social || data.nome_fantasia || '');
      setCity(`${data.municipio}/${data.uf}`);
      if (!code) setCode(cleanCnpj.substring(10));
      showToast('success', 'Dados importados!');
    } catch (err: any) {
      showToast('error', 'Erro ao consultar CNPJ');
    } finally {
      setIsSearchingCnpj(false);
    }
  };

  const handleCollectLocation = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!navigator.geolocation) {
      showToast('error', 'Sem suporte GPS no navegador.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(7));
        setLng(pos.coords.longitude.toFixed(7));
        setIsLocating(false);
        showToast('success', 'Localização capturada!');
      },
      (err) => {
        setIsLocating(false);
        showToast('error', 'Erro ao capturar GPS: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const activePeds = useMemo(() => {
    return state.peds.filter(p => state.activePedIds.includes(p.id));
  }, [state.peds, state.activePedIds]);

  const getClientHistory = (clientName: string) => {
    const legacySales = state.salesLogs.filter(s => s.clientName === clientName).map(s => ({ date: s.timestamp, amount: s.amount, type: 'Histórico' }));
    const appSales = state.activationLogs.filter(a => a.clientName === clientName && (a.saleValue || 0) > 0).map(a => ({ date: a.timestamp, amount: a.saleValue || 0, type: a.saleValuePalm ? 'Palm' : 'Site' }));
    return [...legacySales, ...appSales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const getClientStats = (clientName: string, createdAt?: string) => {
    const allSales = getClientHistory(clientName);

    let daysSinceLastPurchase = -1;
    let avgTicket = 0;
    if (allSales.length > 0) {
        daysSinceLastPurchase = Math.ceil(Math.abs(new Date().getTime() - new Date(allSales[0].date).getTime()) / (1000 * 60 * 60 * 24));
        avgTicket = allSales.reduce((acc, curr) => acc + curr.amount, 0) / allSales.length;
    }

    let status: 'vip' | 'risk' | 'churn' | 'new' | 'active' = 'active';
    if (allSales.length === 0) {
        const created = createdAt ? new Date(createdAt) : null;
        const daysSinceCreation = created ? Math.ceil(Math.abs(new Date().getTime() - created.getTime()) / (1000 * 60 * 60 * 24)) : 999;
        status = daysSinceCreation < 30 ? 'new' : 'active';
    } else {
        if (daysSinceLastPurchase > 90) status = 'churn';
        else if (daysSinceLastPurchase > 45) status = 'risk';
        else if (avgTicket > 1500) status = 'vip';
    }
    return { daysSinceLastPurchase, avgTicket, status };
  };

  const openNewClientModal = () => {
    setEditingClient(null);
    setCnpj(''); setCode(''); setName(''); setCity(''); setVisitDay('Segunda-feira'); setFrequency('weekly'); setLat(''); setLng('');
    setIsModalOpen(true);
  };

  const openEditClientModal = (e: React.MouseEvent, client: Client) => {
    e.stopPropagation();
    setEditingClient(client);
    setCnpj(''); setCode(client.code); setName(client.name); setCity(client.city); setVisitDay(client.visitDay || 'Segunda-feira');
    setFrequency(client.frequency || 'weekly');
    setLat(client.lat ? client.lat.toString() : '');
    setLng(client.lng ? client.lng.toString() : '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name || !city) return;
    const latNum = lat ? parseFloat(lat) : undefined;
    const lngNum = lng ? parseFloat(lng) : undefined;
    if (editingClient) {
      updateClient({ ...editingClient, code: code.trim(), name: name.trim(), city: city.trim(), visitDay, frequency, lat: latNum, lng: lngNum });
      showToast('success', 'PDV atualizado');
    } else {
      onAddClient({ code: code.trim(), name: name.trim(), city: city.trim(), visitDay, frequency, lat: latNum, lng: lngNum });
      showToast('success', 'PDV cadastrado');
    }
    setIsModalOpen(false);
  };

  const clientsWithStats = useMemo(() => {
    return clients.map(c => {
      const stats = getClientStats(c.name, c.createdAt);
      
      return { 
        ...c, 
        ...stats 
      };
    });
  }, [clients, state.salesLogs, state.activationLogs, userClientStates]);

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    return Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2));
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          showToast('success', 'Localização atualizada');
        },
        (err) => {
          showToast('error', 'Erro ao obter localização: ' + err.message);
        },
        { enableHighAccuracy: true }
      );
    }
  };

  const filteredClients = clientsWithStats.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.code.includes(searchTerm) || c.city.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeSegment === 'all') return matchesSearch;
    if (activeSegment === 'route') {
      const today = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(new Date());
      // Adjust because Intl might return "segunda-feira" and we store "Segunda-feira"
      const todayNormalized = today.charAt(0).toUpperCase() + today.slice(1);
      return matchesSearch && c.visitDay === todayNormalized;
    }
    
    return matchesSearch && c.status === activeSegment;
  }).sort((a, b) => {
    if (activeSegment === 'route' && userCoords) {
      const distA = a.lat && a.lng ? getDistance(userCoords.lat, userCoords.lng, a.lat, a.lng) : Infinity;
      const distB = b.lat && b.lng ? getDistance(userCoords.lat, userCoords.lng, b.lat, b.lng) : Infinity;
      return distA - distB;
    }
    
    if (activeSegment === 'route') {
      // Ordena por cidade primeiro, depois por endereço/bairro para agrupar proximidade
      const cityCompare = (a.city || '').localeCompare(b.city || '');
      if (cityCompare !== 0) return cityCompare;
      
      const addressCompare = (a.address || '').localeCompare(b.address || '');
      if (addressCompare !== 0) return addressCompare;
    }
    return a.name.localeCompare(b.name);
  });

  const groupedClients = useMemo(() => {
    return [{ key: 'all', items: filteredClients }];
  }, [filteredClients]);

  const toggleExpand = (clientId: string) => {
    setExpandedClientId(prev => prev === clientId ? null : clientId);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-7xl mx-auto pb-32 px-4 md:px-8">
      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[110] px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10 dark:border-slate-200 animate-in slide-in-from-top-8">
           {toast.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-400" /> : <AlertCircle size={18} className="text-red-400" />}
           <span className="text-[11px] font-black uppercase tracking-widest">{toast.msg}</span>
        </div>
      )}
      {/* Premium Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-10">
        <div>
          <div className="inline-flex items-center gap-2 bg-brand-500/10 px-3 py-1 rounded-full border border-brand-500/20 mb-4">
            <Building2 size={12} className="text-brand-500" />
            <span className="text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-[0.2em]">REDE DE PARCEIROS</span>
          </div>
          <h2 className="text-5xl font-black text-slate-950 dark:text-white tracking-tighter leading-none">
            CARTEIRA <span className="text-brand-600">CLIENTES</span>
          </h2>
          <div className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-[0.1em] mt-4 flex items-center gap-3">
             <span className="flex -space-x-2">
                {[1,2,3].map(i => <div key={i} className={`w-6 h-6 rounded-full border-2 border-white dark:border-slate-950 bg-slate-${i*100+100}`} />)}
             </span>
             {clients.length} PDVs ATIVOS NO CICLO
          </div>
        </div>
        
        <button 
          onClick={openNewClientModal} 
          className="group relative h-16 px-8 bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded-[2rem] font-black text-[13px] uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all overflow-hidden flex items-center justify-center gap-3"
        >
          <div className="absolute inset-0 bg-brand-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          <Plus size={20} strokeWidth={3} className="relative z-10" />
          <span className="relative z-10">Novo PDV</span>
        </button>
      </div>

      {/* Control Center: Search & Logic Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        <div className="lg:col-span-7 relative group">
          <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
            <Search size={20} className="text-slate-300 group-focus-within:text-brand-500 transition-colors" />
          </div>
          <input 
            type="text" 
            placeholder="PESQUISAR POR PDV, CÓDIGO OU CIDADE..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full pl-16 pr-12 h-20 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[2.5rem] text-[13px] font-black uppercase tracking-[0.2em] outline-none focus:ring-8 focus:ring-brand-500/5 focus:border-brand-500/20 shadow-2xl transition-all placeholder:text-slate-300" 
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-6 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={16} strokeWidth={3} />
            </button>
          )}
        </div>

        <div className="lg:col-span-5 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
           {[
             { id: 'all', label: 'Todos', icon: LayoutGrid, color: 'text-slate-950 dark:text-white' },
             { id: 'route', label: 'Rota', icon: Navigation, color: 'text-brand-500' },
           ].map(seg => (
             <button 
               key={seg.id} 
               onClick={() => setActiveSegment(seg.id as ClientSegment)} 
               className={`shrink-0 flex items-center gap-3 h-16 px-6 rounded-[2rem] border-2 transition-all ${activeSegment === seg.id 
                 ? 'bg-white dark:bg-slate-800 border-brand-500/30 shadow-xl shadow-brand-500/10' 
                 : 'bg-transparent border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'}`}
             >
                <seg.icon size={16} className={activeSegment === seg.id ? seg.color : 'text-slate-400'} strokeWidth={3} />
                <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${activeSegment === seg.id ? 'text-slate-950 dark:text-white' : 'text-slate-400'}`}>
                  {seg.label}
                </span>
             </button>
           ))}

           {activeSegment === 'route' && (
             <button 
               onClick={getUserLocation}
               className={`shrink-0 flex items-center gap-3 h-16 px-6 rounded-[2rem] border-2 transition-all ${userCoords
                 ? 'bg-brand-500 text-white border-brand-600 shadow-xl shadow-brand-500/30' 
                 : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
             >
                <Crosshair size={16} strokeWidth={3} className={userCoords ? 'animate-pulse' : ''} />
                <span className="text-[10px] font-black uppercase tracking-[0.15em]">
                  {userCoords ? 'Localização Ativa' : 'Ordenar GPS'}
                </span>
             </button>
           )}
        </div>
      </div>

      {/* Main List */}
      <div className="space-y-8 mt-2">
        {groupedClients.map((group) => (
          <div key={group.key} className="space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {group.items.map((client) => {
                const isExpanded = expandedClientId === client.id;
                const statusStyles = {
                  vip: { accent: 'bg-purple-600', color: 'text-purple-600', ring: 'ring-purple-500/20', shadow: 'shadow-purple-500/20' },
                  risk: { accent: 'bg-orange-500', color: 'text-orange-500', ring: 'ring-orange-500/20', shadow: 'shadow-orange-500/20' },
                  churn: { accent: 'bg-red-500', color: 'text-red-500', ring: 'ring-red-500/20', shadow: 'shadow-red-500/20' },
                  new: { accent: 'bg-blue-600', color: 'text-blue-600', ring: 'ring-blue-500/20', shadow: 'shadow-blue-500/20' },
                  active: { accent: 'bg-brand-600', color: 'text-brand-600', ring: 'ring-brand-500/20', shadow: 'shadow-brand-500/20' }
                };
                
                const style = statusStyles[client.status as keyof typeof statusStyles] || statusStyles.active;
                const isLongPressed = longPressedClientId === client.id;
                
                return (
                  <div 
                    key={client.id} 
                    onClick={(e) => {
                      if (isThresholdMet.current) return;
                      toggleExpand(client.id);
                    }}
                    onTouchStart={() => handleTouchStart(client.id)}
                    onTouchEnd={handleTouchEnd}
                    onTouchMove={handleTouchMove}
                    onMouseDown={() => {
                      // Desktop long press optional but helpful for testing
                      handleTouchStart(client.id);
                    }}
                    onMouseUp={handleTouchEnd}
                    className={`group relative bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-800 transition-all duration-500 cursor-pointer overflow-hidden ${isExpanded ? 'ring-4 ring-brand-500/10 border-brand-500/30 shadow-2xl z-20 scale-[1.02]' : 'hover:border-brand-500/20 hover:shadow-xl active:scale-[0.98]'} ${isLongPressed ? 'border-brand-500/50 shadow-2xl' : ''}`}
                  >
                      {/* Top Action Visual Header */}
                      <div className="px-5 sm:px-8 py-5 sm:py-8 flex items-center justify-between gap-6">
                         <div className="flex items-center gap-4 sm:gap-6 flex-1 min-w-0">
                            <button 
                              onClick={(e) => {
                                 e.stopPropagation();
                                 updateClientUIState(client.id, { isSaved: !userClientStates[client.id]?.isSaved });
                              }}
                              className={`relative w-14 h-14 sm:w-20 sm:h-20 rounded-2xl sm:rounded-[2rem] flex items-center justify-center text-white font-black text-xl sm:text-3xl shadow-2xl ${style.accent} transform transition-all active:scale-95 group-hover:rotate-3 shrink-0 border-4 border-white/10`}
                            >
                               {client.name.charAt(0)}
                               {userClientStates[client.id]?.isSaved && (
                                  <div className="absolute -top-1.5 -right-1.5 w-6 h-6 sm:w-8 sm:h-8 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-md border-2 border-amber-100">
                                     <Star size={14} className="text-amber-500" fill="currentColor"/>
                                  </div>
                               )}
                            </button>
                            <div className="min-w-0 flex-1 flex flex-col justify-center">
                               <div className="flex items-center gap-2 mb-1.5">
                                  <div className={`h-1.5 w-1.5 rounded-full ${style.accent} animate-pulse shrink-0`}></div>
                                  <span className="text-[8px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] leading-none">CÓDIGO #{client.code}</span>
                               </div>
                               <h3 className="font-black text-slate-900 dark:text-white text-sm sm:text-2xl tracking-tight truncate uppercase leading-none mb-1.5">
                                  {client.name}
                                </h3>
                               <div className="flex items-center gap-1.5 opacity-50">
                                  <MapPin size={10} strokeWidth={3} className="text-slate-400 shrink-0" />
                                  <p className="text-[8px] sm:text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate leading-none">
                                     {client.city}
                                  </p>
                               </div>
                            </div>

                            {/* Action overlay (Mobile: Long-press, Desktop: Hover) */}
                            <div className={`absolute top-0 right-0 p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-bl-[2rem] shadow-2xl z-50 transition-all duration-300 flex gap-2 ${isLongPressed ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none md:group-hover:opacity-100 md:group-hover:translate-y-0 md:group-hover:pointer-events-auto'}`}>
                              <button 
                                onClick={(e) => {
                                   e.stopPropagation();
                                   openEditClientModal(e, client);
                                   setLongPressedClientId(null);
                                }}
                                className="p-3 bg-brand-500 text-white rounded-2xl shadow-lg active:scale-90 transition-all hover:bg-brand-600"
                                title="Editar"
                              >
                                 <Pencil size={18} strokeWidth={3} />
                              </button>
                              <button 
                                onClick={(e) => {
                                   e.stopPropagation();
                                   setDeleteConfirmation({ isOpen: true, client });
                                   setLongPressedClientId(null);
                                }}
                                className="p-3 bg-red-500 text-white rounded-2xl shadow-lg active:scale-90 transition-all hover:bg-red-600"
                                title="Excluir"
                              >
                                 <Trash2 size={18} strokeWidth={3} />
                              </button>
                              {isLongPressed && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLongPressedClientId(null);
                                  }}
                                  className="p-3 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl active:scale-90 md:hidden"
                                >
                                  <X size={18} strokeWidth={3} />
                                </button>
                              )}
                            </div>
                         </div>
                         <div className="flex flex-col items-end justify-center gap-2 shrink-0 border-l border-slate-100 dark:border-slate-800/50 pl-4 sm:pl-6">
                            {/* Industry indicators always visible */}
                            <div className="flex gap-1 sm:gap-1.5 items-center p-1.5 sm:p-2 bg-slate-50/80 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm leading-none">
                               {(state.currentUser?.industries && state.currentUser.industries.length > 0 ? state.currentUser.industries : []).map(ind => {
                                  const currentCycle = getCycleKey();
                                  const cycleTasks = (userClientStates[client.id] as any)?.industryTasks?.[currentCycle] || userClientStates[client.id]?.tasks || [];
                                  const isChecked = cycleTasks.find((t: any) => t.label === ind)?.checked;
                                  const industryColor = state.currentUser?.industryColors?.[ind];
                                  
                                  return (
                                    <div 
                                      key={ind}
                                      title={ind}
                                      className={`w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[5px] sm:text-[8px] font-black border border-white dark:border-slate-900 shadow-sm transition-all ${
                                        isChecked 
                                          ? `text-white scale-105 z-10 shadow-md` 
                                          : 'bg-slate-100 dark:bg-slate-800 text-slate-300 opacity-20'
                                      }`}
                                      style={isChecked && industryColor ? { backgroundColor: industryColor } : (isChecked ? { backgroundColor: '#6366f1' } : {})}
                                    >
                                      {ind.charAt(0)}
                                    </div>
                                  );
                               })}
                            </div>

                            {activePeds.length > 0 && (
                               <div className="flex flex-col items-end mt-0.5">
                                  <div className="flex items-center gap-1.5">
                                     <div className="w-10 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-emerald-500 transition-all duration-500"
                                          style={{ 
                                            width: `${activePeds.reduce((acc, ped) => {
                                              const uiState = userClientStates[client.id] || { pedTasks: {} };
                                              const periodKey = getPeriodKey(ped.period);
                                              const checkedItems = (uiState.pedTasks?.[ped.id] as any)?.[periodKey] || [];
                                              return acc + (ped.items.length > 0 ? (checkedItems.length / ped.items.length) : 0);
                                            }, 0) / activePeds.length * 100}%` 
                                          }}
                                        ></div>
                                     </div>
                                     <span className="text-[8px] sm:text-[10px] font-black text-emerald-600 tabular-nums">
                                        {activePeds.filter(ped => {
                                          const uiState = userClientStates[client.id] || { pedTasks: {} };
                                          const periodKey = getPeriodKey(ped.period);
                                          const checkedItems = (uiState.pedTasks?.[ped.id] as any)?.[periodKey] || [];
                                          return ped.items.length > 0 && checkedItems.length === ped.items.length;
                                        }).length}/{activePeds.length}
                                     </span>
                                  </div>
                                  <p className="text-[6px] sm:text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5">PEDs</p>
                               </div>
                            )}
                         </div>
                      </div>


                      {/* Expandable Details Area */}
                      {isExpanded && (
                        <div className="bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800 p-5 sm:p-8 space-y-6 sm:space-y-8 animate-in slide-in-from-top-4 duration-500">
                           {/* Industry Checklist Integration */}
                           {(() => {
                             const industries = state.currentUser?.industries && state.currentUser.industries.length > 0 
                               ? state.currentUser.industries 
                               : [];
                             
                             return (
                               <div className="space-y-4 bg-white/50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                                  <div className="flex items-center justify-between">
                                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                                       <Building2 size={14} className="text-brand-600" /> Indústrias do Planejamento
                                     </h4>
                                  </div>
                                  <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-2">
                                     {industries.map((ind) => {
                                        const currentTasks = userClientStates[client.id]?.tasks || [];
                                        const task = currentTasks.find(t => t.label === ind);
                                        const isChecked = task?.checked || false;
                                        
                                        return (
                                           <button 
                                             key={ind} 
                                             onClick={(e) => {
                                                e.stopPropagation();
                                                const newTasks = [...currentTasks];
                                                const idx = newTasks.findIndex(t => t.label === ind);
                                                if (idx >= 0) {
                                                  newTasks[idx] = { ...newTasks[idx], checked: !newTasks[idx].checked };
                                                } else {
                                                  newTasks.push({ label: ind, checked: true });
                                                }
                                                updateClientUIState(client.id, { tasks: newTasks });
                                             }}
                                             className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                                               isChecked 
                                                 ? 'bg-brand-50 dark:bg-brand-900/10 border-brand-100 dark:border-brand-800/30 text-brand-700 dark:text-brand-400' 
                                                 : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/50 text-slate-400'
                                             }`}
                                           >
                                              <div className={`w-8 h-8 rounded-xl border flex items-center justify-center mb-2 transition-all ${
                                                isChecked 
                                                  ? 'bg-brand-500 border-brand-400 text-white' 
                                                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-black text-[10px]'
                                              }`}>
                                                 {isChecked ? <Check size={14} strokeWidth={4} /> : ind.charAt(0).toUpperCase()}
                                              </div>
                                              <span className="text-[8px] font-black uppercase tracking-wider text-center line-clamp-1">
                                                 {ind}
                                              </span>
                                           </button>
                                        );
                                     })}
                                  </div>
                               </div>
                             );
                           })()}

                            {/* PED Checklist Integration */}
                            {activePeds.map(ped => {
                               const uiState = userClientStates[client.id] || { pedTasks: {} };
                               const periodKey = getPeriodKey(ped.period);
                               const checkedItems = (uiState.pedTasks?.[ped.id] as any)?.[periodKey] || [];
                               const progress = ped.items.length > 0 ? (checkedItems.length / ped.items.length) * 100 : 0;
                               const pedKey = `${client.id}_${ped.id}`;
                               const isPedExpanded = expandedPedClientId === pedKey;

                               return (
                                 <div key={ped.id} className={`space-y-4 bg-white/50 dark:bg-slate-900/50 p-6 rounded-3xl border transition-all duration-300 ${isPedExpanded ? 'border-emerald-200 dark:border-emerald-800/50 shadow-lg shadow-emerald-500/5' : 'border-slate-100 dark:border-slate-800 shadow-sm'}`}>
                                    <button 
                                       onClick={(e) => {
                                          e.stopPropagation();
                                          setExpandedPedClientId(isPedExpanded ? null : pedKey);
                                       }}
                                       className="w-full flex items-center justify-between group/ped"
                                    >
                                       <div className="flex items-center gap-3">
                                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isPedExpanded ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-emerald-500/10 text-emerald-600'}`}>
                                             <ClipboardCheck size={16} />
                                          </div>
                                          <div className="text-left">
                                             <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest leading-none">PED: {ped.name}</h4>
                                             <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mt-1">
                                                {checkedItems.length} / {ped.items.length} ITENS CONCLUÍDOS
                                             </p>
                                          </div>
                                       </div>
                                       <div className="flex items-center gap-3">
                                          <div className="h-4 w-10 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden hidden xs:block">
                                             <div 
                                               className="h-full bg-emerald-500 transition-all duration-500"
                                               style={{ width: `${progress}%` }}
                                             ></div>
                                          </div>
                                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${isPedExpanded ? 'bg-emerald-50 text-emerald-500 rotate-180' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}>
                                             <ChevronDown size={14} strokeWidth={3} />
                                          </div>
                                       </div>
                                    </button>
                                    
                                    <AnimatePresence>
                                       {isPedExpanded && (
                                          <motion.div
                                             initial={{ height: 0, opacity: 0 }}
                                             animate={{ height: 'auto', opacity: 1 }}
                                             exit={{ height: 0, opacity: 0 }}
                                             className="overflow-hidden"
                                          >
                                             <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {ped.items.map((item) => {
                                                   const isChecked = checkedItems.includes(item);
                                                   return (
                                                      <button 
                                                        key={item} 
                                                        onClick={(e) => {
                                                           e.stopPropagation();
                                                           togglePEDTask(client.id, ped.id, item);
                                                        }}
                                                        className={`flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${
                                                          isChecked 
                                                            ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/30' 
                                                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/50'
                                                        }`}
                                                      >
                                                         <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                                                           isChecked 
                                                             ? 'bg-emerald-500 border-emerald-400 text-white' 
                                                             : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                                                         }`}>
                                                            {isChecked && <Check size={12} strokeWidth={4} />}
                                                         </div>
                                                         <span className={`text-[9px] font-black uppercase tracking-widest flex-1 truncate ${isChecked ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500'}`}>
                                                            {item}
                                                         </span>
                                                      </button>
                                                   );
                                                })}
                                             </div>
                                          </motion.div>
                                       )}
                                    </AnimatePresence>
                                 </div>
                               );
                            })}
                        </div>
                      )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        
        {filteredClients.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
             <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center text-slate-300 mb-6 shadow-inner shadow-slate-200/50">
                <Search size={48} strokeWidth={1} />
             </div>
             <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Nada por aqui...</h4>
             <p className="text-sm text-slate-500 mt-2 max-w-[240px] leading-relaxed">Tente remover os filtros ou buscar por outro termo para encontrar o PDV desejado.</p>
             <button onClick={() => { setSearchTerm(''); setActiveSegment('all'); }} className="mt-8 text-brand-600 font-extrabold text-xs uppercase tracking-[0.2em] bg-brand-50 dark:bg-brand-900/30 px-8 py-4 rounded-full border border-brand-100 dark:border-brand-800 hover:bg-brand-100 transition-all">Resetar Busca</button>
          </div>
        )}
      </div>

      {/* PDV Management Modal (Unified Creation & Editing) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl h-full sm:h-auto sm:max-h-[90vh] sm:rounded-[4rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/10 dark:border-slate-800/50 overflow-hidden flex flex-col animate-in zoom-in-95 sm:slide-in-from-bottom-10">
            {/* Modal Header */}
            <div className="relative pt-14 pb-6 px-6 sm:p-10 bg-slate-950 overflow-hidden shrink-0 border-b border-white/5">
              <div className="absolute top-0 right-0 p-4 opacity-5 translate-x-1/4 -translate-y-1/4 shrink-0 text-white pointer-events-none"><Building2 size={300} /></div>
              <div className="relative z-10 flex items-center justify-between text-white">
                <div className="flex items-center gap-5">
                   <button 
                     onClick={() => setIsModalOpen(false)} 
                     className="w-12 h-12 bg-white text-slate-950 hover:bg-brand-500 hover:text-white rounded-2xl flex items-center justify-center transition-all shrink-0 active:scale-90 shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
                     title="Voltar"
                     type="button"
                   >
                      <ArrowLeft size={24} strokeWidth={3} />
                   </button>
                   <div>
                      <div className="flex items-center gap-2 mb-1.5 leading-none">
                         <div className="h-1 w-6 bg-brand-600 rounded-full"></div>
                         <span className="text-[8px] font-black uppercase tracking-[0.4em] text-brand-500">CADASTRO</span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tighter leading-none">
                        {editingClient ? 'EDITAR' : 'NOVO'} <span className="text-brand-600">CLIENTE</span>
                      </h3>
                   </div>
                </div>
              </div>
            </div>
            
            {/* Form Area */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-12 space-y-8 sm:space-y-12 bg-slate-50 dark:bg-slate-900/50">
              
              {/* Legal Block */}
              <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                   <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                      <Fingerprint size={16} className="text-brand-600" /> FISCAL & IDENTIFICAÇÃO
                   </h4>
                </div>
 
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {!editingClient && (
                    <div className="md:col-span-2 group relative">
                       <input 
                         type="text" 
                         placeholder="CNPJ DO ESTABELECIMENTO" 
                         value={cnpj} 
                         onChange={(e) => setCnpj(e.target.value)} 
                         className="w-full h-16 sm:h-20 pl-6 sm:pl-8 pr-20 sm:pr-24 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-3xl sm:rounded-[2rem] text-sm font-black uppercase tracking-widest outline-none focus:border-brand-500/30 focus:ring-8 focus:ring-brand-500/5 transition-all shadow-xl placeholder:text-slate-300" 
                       />
                       <button 
                         type="button" 
                         onClick={handleCnpjSearch} 
                         disabled={isSearchingCnpj} 
                         className="absolute right-2 top-2 bottom-2 w-12 sm:w-14 bg-slate-950 dark:bg-brand-600 text-white rounded-2xl flex items-center justify-center active:scale-90 disabled:opacity-50 transition-all shadow-xl"
                       >
                         {isSearchingCnpj ? <Loader2 size={20} className="animate-spin" /> : <SearchCode size={20} />}
                       </button>
                    </div>
                  )}
                  
                  <div className="md:col-span-2">
                    <input 
                      required 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      placeholder="RAZÃO SOCIAL / NOME FANTASIA" 
                      className="w-full h-16 px-6 sm:px-8 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-3xl sm:rounded-[2rem] text-sm font-black uppercase tracking-widest outline-none focus:border-brand-500/30 transition-all placeholder:text-slate-300" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 md:col-span-2">
                    <div>
                      <input 
                        required 
                        value={code} 
                        onChange={(e) => setCode(e.target.value)} 
                        placeholder="CÓDIGO ERP" 
                        className="w-full h-16 px-6 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-3xl text-sm font-black uppercase tracking-widest outline-none focus:border-brand-500/30 transition-all placeholder:text-slate-300" 
                      />
                    </div>

                    <div>
                      <input 
                        required 
                        value={city} 
                        onChange={(e) => setCity(e.target.value)} 
                        placeholder="CIDADE / UF" 
                        className="w-full h-16 px-6 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-3xl text-sm font-black uppercase tracking-widest outline-none focus:border-brand-500/30 transition-all placeholder:text-slate-300" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Operations Block */}
              <div className="space-y-6">
                 <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3 px-2">
                    <Navigation size={16} className="text-brand-600" /> Operação & Rota
                 </h4>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                       <select 
                         value={visitDay} 
                         onChange={(e) => setVisitDay(e.target.value)} 
                         className="w-full h-16 px-6 sm:px-8 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-3xl text-xs font-black uppercase tracking-widest outline-none focus:border-brand-500/30 transition-all appearance-none cursor-pointer"
                       >
                          {daysOfWeek.map(d => <option key={d} value={d}>{d}</option>)}
                       </select>
                       <ChevronDown size={18} className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    <div className="relative">
                       <select 
                         value={frequency} 
                         onChange={(e) => setFrequency(e.target.value as any)} 
                         className="w-full h-16 px-6 sm:px-8 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-3xl text-xs font-black uppercase tracking-widest outline-none focus:border-brand-500/30 transition-all appearance-none cursor-pointer"
                       >
                          <option value="weekly">Semanal (Loop 1)</option>
                          <option value="odd_week">Quinzenal Ímpar</option>
                          <option value="even_week">Quinzenal Par</option>
                       </select>
                       <ChevronDown size={18} className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    <div className="md:col-span-2 pt-4">
                        <button 
                            type="button" 
                            onClick={handleCollectLocation}
                            disabled={isLocating}
                            className="group relative w-full h-[88px] bg-slate-950 dark:bg-slate-800 text-white rounded-[2.25rem] overflow-hidden transition-all active:scale-[0.98] shadow-2xl border-4 border-white dark:border-slate-800"
                        >
                            <div className="absolute inset-0 bg-brand-600 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                            <div className="relative z-10 flex items-center justify-center gap-5 px-8">
                               {isLocating ? <Loader2 size={24} className="animate-spin text-brand-500" /> : <Crosshair size={24} className="group-hover:rotate-180 transition-transform duration-700 shrink-0" />}
                               <div className="text-center">
                                  <p className="text-[13px] font-black uppercase tracking-[0.2em] leading-tight">Captura de Coordenadas GPS</p>
                               </div>
                            </div>
                        </button>
                        
                        {(lat || lng) && (
                           <div className="flex gap-4 mt-6 animate-in zoom-in-95 duration-500">
                               <div className="flex-1 bg-white dark:bg-slate-800 p-4 rounded-[1.5rem] border-2 border-slate-50 dark:border-slate-800 flex items-center gap-4">
                                   <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/40 text-brand-600 flex items-center justify-center font-black text-[10px]">LAT</div>
                                   <p className="text-[14px] font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">{lat}</p>
                               </div>
                               <div className="flex-1 bg-white dark:bg-slate-800 p-4 rounded-[1.5rem] border-2 border-slate-50 dark:border-slate-800 flex items-center gap-4">
                                   <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/40 text-purple-600 flex items-center justify-center font-black text-[10px]">LNG</div>
                                   <p className="text-[14px] font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">{lng}</p>
                               </div>
                           </div>
                        )}
                    </div>
                 </div>
              </div>

              {/* Action Bar Modal Sticky */}
              <div className="pt-8 md:pt-10 pb-4">
                <button 
                  type="submit" 
                  className="w-full h-[92px] bg-brand-600 text-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(37,99,235,0.3)] active:scale-[0.98] transition-all text-base font-black uppercase tracking-[0.2em] flex items-center justify-center gap-5 border-t-2 border-white/20 px-8"
                >
                    <span className="flex-1 text-center">{editingClient ? 'Confirmar Ajustes' : 'Cadastrar Cliente'}</span>
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                       <TrendingUp size={24} />
                    </div>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialogs: Delete */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-2xl animate-in fade-in duration-500">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[4rem] p-12 shadow-2xl animate-in zoom-in-95 border border-white/5 text-center">
             <div className="relative w-32 h-32 mx-auto mb-10">
                <div className="absolute inset-0 bg-red-500/20 rounded-[3rem] animate-ping duration-1000"></div>
                <div className="relative w-32 h-32 bg-red-600 text-white rounded-[3rem] flex items-center justify-center shadow-2xl transform hover:rotate-12 transition-transform">
                   <Trash2 size={56} strokeWidth={2.5} />
                </div>
             </div>
             
             <h3 className="text-4xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none">REMOVER?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-6 font-bold uppercase tracking-widest leading-relaxed">
                Confirma a exclusão de <br/>
                <span className="text-slate-950 dark:text-white block mt-2">{deleteConfirmation.client?.name}</span>
              </p>

              <div className="grid grid-cols-1 gap-3 mt-12">
                <button 
                  onClick={() => { if(deleteConfirmation.client) { onRemoveClient(deleteConfirmation.client.id); showToast('success', 'PDV REMOVIDO COM SUCESSO'); setDeleteConfirmation({ isOpen: false, client: null }); } }} 
                  className="w-full h-20 bg-red-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-red-500/40 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  <Trash2 size={16} /> Confirmar
                </button>
                <button 
                  onClick={() => setDeleteConfirmation({ isOpen: false, client: null })} 
                  className="w-full h-20 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] active:scale-95 transition-all"
                >
                  Cancelar Operação
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
