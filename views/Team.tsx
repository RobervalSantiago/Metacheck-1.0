
import React, { useState, useMemo } from 'react';
import { Client, SaleLog, ActivationLog } from '../types';
import { Download, Trophy, MapPin, X, Calendar, Search, Medal, TrendingUp, DollarSign, Crown, Share2, Layers, ArrowUp, ArrowDown, Minus, Filter, Camera } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ClientRankingProps {
  clients: Client[];
  salesLogs: SaleLog[];
  activationLogs: ActivationLog[];
}

type RankingMode = 'revenue' | 'mix';
type TimeFilter = 'cycle' | 'accumulated';

export const ClientRanking: React.FC<ClientRankingProps> = ({ clients, salesLogs, activationLogs }) => {
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // New Features State
  const rankingMode: RankingMode = 'revenue';
  const timeFilter: TimeFilter = 'cycle';
  const [showShareModal, setShowShareModal] = useState(false);

  // --- 1. DATE LOGIC FOR CYCLES ---
  const { currentCycleStart, currentCycleEnd, prevCycleStart, prevCycleEnd } = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Definition: Cycle starts on day 20 of previous month
    let cStart, cEnd;
    
    if (currentDay >= 20) {
        cStart = new Date(currentYear, currentMonth, 20);
        cEnd = new Date(currentYear, currentMonth + 1, 19);
    } else {
        cStart = new Date(currentYear, currentMonth - 1, 20);
        cEnd = new Date(currentYear, currentMonth, 19);
    }
    // Set end of day for end dates
    cEnd.setHours(23, 59, 59, 999);

    // Previous Cycle
    const pStart = new Date(cStart);
    pStart.setMonth(pStart.getMonth() - 1);
    const pEnd = new Date(cStart);
    pEnd.setDate(pEnd.getDate() - 1);
    pEnd.setHours(23, 59, 59, 999);

    return { 
        currentCycleStart: cStart, 
        currentCycleEnd: cEnd,
        prevCycleStart: pStart,
        prevCycleEnd: pEnd
    };
  }, []);

  // --- 2. DATA CALCULATION HELPER ---
  const calculateStats = (start: Date | null, end: Date | null) => {
    return clients.map(client => {
      // Filter Logs by Date Range (if provided)
      const clientSalesLogs = salesLogs.filter(s => {
          if (!start || !end) return s.clientName === client.name;
          const d = new Date(s.timestamp);
          return s.clientName === client.name && d >= start && d <= end;
      });
      
      const clientActLogs = activationLogs.filter(a => {
          if (!start || !end) return a.clientName === client.name;
          const d = new Date(a.timestamp);
          return a.clientName === client.name && d >= start && d <= end;
      });

      // Revenue Calculation
      const historicalSales = clientSalesLogs.reduce((acc, curr) => acc + curr.amount, 0);
      const activationSales = clientActLogs.reduce((acc, curr) => acc + (curr.saleValue || 0), 0);
      const totalRevenue = historicalSales + activationSales;
      const purchaseCount = clientSalesLogs.length + clientActLogs.filter(a => (a.saleValue || 0) > 0).length;

      // Mix Calculation (Unique Industries)
      const industriesSet = new Set<string>();
      clientActLogs.forEach(log => {
          if (log.checklist) log.checklist.forEach(i => industriesSet.add(i));
      });
      const mixCount = industriesSet.size;

      return { 
          id: client.id,
          name: client.name,
          code: client.code,
          city: client.city,
          totalRevenue, 
          mixCount,
          purchaseCount
      };
    });
  };

  // --- 3. COMPUTE STATS & TRENDS ---
  const rankingData = useMemo(() => {
    // A. Calculate Current Stats based on Filter
    let currentStats;
    if (timeFilter === 'cycle') {
        currentStats = calculateStats(currentCycleStart, currentCycleEnd);
    } else {
        currentStats = calculateStats(null, null); // All time
    }

    // B. Calculate Previous Cycle Stats (For Trend)
    const prevStats = timeFilter === 'cycle' 
        ? calculateStats(prevCycleStart, prevCycleEnd)
        : calculateStats(null, null);

    // Sort Helper
    const sortFn = (a: any, b: any) => {
        if (rankingMode === 'revenue') return b.totalRevenue - a.totalRevenue;
        return b.mixCount - a.mixCount;
    };

    // 1. Get Current Ranks
    const sortedCurrent = [...currentStats].sort(sortFn);
    
    // 2. Get Previous Ranks
    const sortedPrev = [...prevStats].sort(sortFn);

    // 3. Merge & Classify
    const totalRevenueSum = sortedCurrent.reduce((acc, curr) => acc + curr.totalRevenue, 0);
    let runningTotal = 0;

    return sortedCurrent.map((client, index) => {
        const currentRank = index + 1;
        
        // Find prev rank
        const prevIndex = sortedPrev.findIndex(p => p.id === client.id);
        const prevRank = prevIndex === -1 ? 999 : prevIndex + 1;

        let trend: 'up' | 'down' | 'equal' = 'equal';
        if (prevRank > currentRank) trend = 'up';
        if (prevRank < currentRank) trend = 'down';
        if (prevIndex === -1 && client.totalRevenue > 0) trend = 'up'; // New entry

        // ABC Class (Revenue only)
        runningTotal += client.totalRevenue;
        const percentage = totalRevenueSum > 0 ? (runningTotal / totalRevenueSum) : 0;
        let abcClass: 'A' | 'B' | 'C' = 'C';
        if (percentage <= 0.80) abcClass = 'A';
        else if (percentage <= 0.95) abcClass = 'B';

        return {
            ...client,
            rank: currentRank,
            prevRank,
            trend,
            abcClass
        };
    });

  }, [clients, salesLogs, activationLogs, rankingMode, timeFilter, currentCycleStart, prevCycleStart]);

  const filteredData = rankingData.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.code.includes(searchTerm)
  );

  const top3 = filteredData.slice(0, 3);
  const restOfList = filteredData.slice(3);
  const totalInPeriod = rankingData.reduce((acc, curr) => acc + curr.totalRevenue, 0);
  const activeCount = rankingData.filter(c => c.totalRevenue > 0).length;

  const exportData = () => {
    const headers = ['Posição', 'Código', 'Cliente', 'Cidade', 'Total Comprado', 'Mix Qtd', 'Classificação', 'Tendência'];
    const rows = rankingData.map((c) => [c.rank, c.code, c.name, c.city, c.totalRevenue.toFixed(2), c.mixCount, c.abcClass, c.trend].join(','));
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `ranking_${timeFilter}_${rankingMode}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const getBadgeColor = (abc: string) => {
    switch(abc) {
        case 'A': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        case 'B': return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'C': return 'bg-slate-100 text-slate-600 border-slate-200';
        default: return 'bg-slate-100 text-slate-600';
    }
  };

  const renderPodiumCard = (client: any, position: number) => {
    if (!client || (client.totalRevenue === 0 && rankingMode === 'revenue')) return (
        <div className="flex flex-col items-center justify-end h-20 sm:h-32 opacity-30">
            <div className="w-6 h-6 sm:w-12 sm:h-12 bg-slate-200 rounded-full mb-1"></div>
            <div className="w-full h-1 sm:h-2 bg-slate-200 rounded"></div>
        </div>
    );
    
    let colorClass = '';
    let heightClass = '';
    let medalColor = '';

    if (position === 1) {
        colorClass = 'from-amber-200 to-amber-100 border-amber-300 text-amber-900';
        heightClass = 'h-24 sm:h-48 -mt-2 sm:-mt-6 z-10 scale-[1.02] sm:scale-105 shadow-xl';
        medalColor = 'text-amber-500';
    } else if (position === 2) {
        colorClass = 'from-slate-300 to-slate-200 border-slate-300 text-slate-800';
        heightClass = 'h-20 sm:h-36 shadow-lg mt-2';
        medalColor = 'text-slate-500';
    } else {
        colorClass = 'from-orange-200 to-orange-100 border-orange-300 text-orange-900';
        heightClass = 'h-16 sm:h-32 shadow-lg mt-4';
        medalColor = 'text-orange-600';
    }

    return (
        <div onClick={() => setSelectedClient(client)} className={`relative flex flex-col items-center justify-end p-1.5 rounded-t-xl border-t border-x bg-gradient-to-b w-full cursor-pointer transition-transform hover:-translate-y-1 ${colorClass} ${heightClass}`}>
            {position === 1 && <Crown size={position === 1 ? 16 : 14} className="absolute -top-5 sm:-top-8 text-amber-400 drop-shadow-md" fill="currentColor" />}
            
            <div className="absolute -top-2 sm:-top-3 w-7 h-7 sm:w-9 sm:h-9 rounded-full border border-white dark:border-slate-900 bg-white shadow-sm flex items-center justify-center font-black text-[8px] sm:text-xs text-slate-700 z-20">
                {client.name.charAt(0)}
            </div>

            <div className="text-center mb-0.5 w-full">
                <p className="font-black text-[6px] sm:text-[9px] truncate w-full px-1 uppercase leading-none">{client.name}</p>
            </div>
            
            <div className="bg-white/50 dark:bg-black/10 px-1 py-0.5 rounded-full mb-0.5">
                {rankingMode === 'revenue' ? (
                   <span className="font-black text-[7px] sm:text-[10px] tabular-nums">R$ {client.totalRevenue.toLocaleString('pt-BR', { notation: 'compact' })}</span>
                ) : (
                   <span className="font-black text-[7px] sm:text-[10px] tabular-nums flex items-center gap-1"><Layers size={8}/> {client.mixCount}</span>
                )}
            </div>

            <div className={`absolute bottom-0 text-xl sm:text-5xl font-black opacity-10 leading-none select-none ${medalColor}`}>{position}</div>
        </div>
    );
  };

  return (
    <div className="space-y-2.5 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300 px-0">
      
      {/* HEADER DE RANKING */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm items-center">
        <div>
           <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 tracking-tighter uppercase">
              <Trophy size={20} className="text-brand-500" /> Ranking
           </h2>
           <p className="text-slate-500 font-bold text-[8px] uppercase tracking-widest mt-0.5">
              {rankingMode === 'revenue' ? 'Performance de Faturamento' : 'Liderança de Mix'}
           </p>
        </div>
      </div>

      {/* PÓDIO - DESIGN RESPONSIVO PARA MOBILE */}
      {!searchTerm && top3.length > 0 && activeCount > 0 && (
          <div className="pt-4 sm:pt-8 pb-4">
            <div className="flex justify-center items-end gap-1 sm:gap-2 border-b-4 border-slate-100 dark:border-slate-800 px-2 sm:px-0">
                <div className="w-1/3">{renderPodiumCard(top3[1], 2)}</div>
                <div className="w-1/3">{renderPodiumCard(top3[0], 1)}</div>
                <div className="w-1/3">{renderPodiumCard(top3[2], 3)}</div>
            </div>
          </div>
      )}

      {/* LISTA DE RESULTADOS */}
      <div className="space-y-3">
        <div className="flex gap-2 sticky top-1 z-20 mx-0.5">
            <div className="relative flex-1">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Filtrar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-1 focus:ring-brand-500 outline-none text-[10px] font-black uppercase shadow-sm" />
            </div>
            <button onClick={exportData} className="bg-slate-950 dark:bg-slate-800 text-white p-2.5 rounded-xl active:scale-95 shadow-lg"><Download size={16} /></button>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm mx-0.5">
            <div className="grid grid-cols-12 px-4 py-3 bg-slate-50/50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                <div className="col-span-2">Rank</div>
                <div className="col-span-7">PDV</div>
                <div className="col-span-3 text-right">Valor</div>
            </div>
            
            <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {(searchTerm ? filteredData : restOfList).map((client) => (
                    <div key={client.id} onClick={() => setSelectedClient(client)} className="grid grid-cols-12 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors items-center group">
                        <div className="col-span-2 flex items-center gap-1">
                            <span className="font-black text-[10px] text-slate-400 tabular-nums">#{client.rank}</span>
                            {client.trend === 'up' && <ArrowUp size={8} className="text-emerald-500" strokeWidth={4} />}
                            {client.trend === 'down' && <ArrowDown size={8} className="text-red-500" strokeWidth={4} />}
                        </div>

                        <div className="col-span-7 pr-1">
                            <h3 className="font-black text-[10px] text-slate-900 dark:text-white uppercase tracking-tight truncate">{client.name}</h3>
                            <div className="flex items-center gap-1 text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                <span className="tabular-nums">#{client.code}</span>
                                <span>•</span>
                                <span className="truncate">{client.city}</span>
                            </div>
                        </div>
                        
                        <div className="col-span-3 text-right">
                            {rankingMode === 'revenue' ? (
                                <span className="font-black text-[10px] text-brand-600 dark:text-brand-400 tabular-nums">
                                    R$ {client.totalRevenue.toLocaleString('pt-BR', { notation: 'compact' })}
                                </span>
                            ) : (
                                <span className="font-black text-[8px] text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-md tabular-nums">
                                    {client.mixCount}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};
