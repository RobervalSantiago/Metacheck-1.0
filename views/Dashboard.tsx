
import React, { useEffect, useState, useMemo } from 'react';
import { User, Goal, SaleLog, ActivationLog, Client, ClientUIState } from '../types';
import { useStore } from '../contexts/StoreContext';
import { DollarSign, Copy, FileText, Smartphone, Globe, TrendingUp, Calendar, ArrowRight, X, Check, CheckCircle2, Zap, Target, Activity, Users, BarChart3, Layers, LayoutGrid, CalendarRange, AlertCircle, Building2, Package, ShoppingBag, MapPin, Flame, ChevronRight, Info, RefreshCw, Award } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Cell, ComposedChart } from 'recharts';
import confetti from 'canvas-confetti';
import { getTrustedISOString, getTrustedDate, getTrustedLocalDateString, getCycleKey, getPeriodKey } from '../services/timeService';

interface DashboardProps {
  user: User;
  clients: Client[];
  goal?: Goal;
  sales: SaleLog[];
  activations: ActivationLog[];
  clientStates: Record<string, ClientUIState>;
}

const getLogDateKey = (ts: string) => {
    if (!ts) return '';
    if (ts.length >= 10 && ts.includes('-')) return ts.substring(0, 10);
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const Dashboard: React.FC<DashboardProps> = ({ user, clients, goal, sales, activations, clientStates }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { state } = useStore();

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate data fetch
    setTimeout(() => {
      setIsRefreshing(false);
      confetti({
        particleCount: 40,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#a855f7', '#ec4899']
      });
    }, 1200);
  };
  const { 
    currentCycleIndex, 
    cycleWorkingDates,
    remainingWorkingDays, 
    todayStr, 
    todayDayName,
    todayIso,
    isTodayWorkDay
  } = useMemo(() => {
    const todayDate = getTrustedDate();
    const todayDayCurrent = todayDate.getDate();
    const todayMonth = todayDate.getMonth();
    const todayYear = todayDate.getFullYear();
    const todayStr = getTrustedLocalDateString();
    
    const todayIso = `${todayYear}-${String(todayMonth + 1).padStart(2, '0')}-${String(todayDayCurrent).padStart(2, '0')}`;
    
    const todayDayName = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'][todayDate.getDay()];
    const currentCycleIndex = todayDayCurrent >= 20 ? (todayYear * 12 + todayMonth + 1) : (todayYear * 12 + todayMonth);
    
    const cycleWorkingDates = (user.workingDates || []).filter(dateStr => {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dateMonthIndex = m - 1; 
      const dateCycleIndex = d >= 20 ? (y * 12 + dateMonthIndex + 1) : (y * 12 + dateMonthIndex);
      return dateCycleIndex === currentCycleIndex;
    }).sort();

    const remainingWorkingDays = cycleWorkingDates.filter(d => d >= todayIso).length;
    const isTodayWorkDay = cycleWorkingDates.includes(todayIso);

    return { currentCycleIndex, cycleWorkingDates, remainingWorkingDays, todayStr, todayIso, todayDayName, isTodayWorkDay };
  }, [user.workingDates, user.id]);

  const { cycleSales, cycleActivations } = useMemo(() => {
    const filterByCycle = (timestamp: string) => {
      try {
        let y, m, day;
        if (timestamp.length === 10 && timestamp.includes('-')) {
            const parts = timestamp.split('-').map(Number);
            y = parts[0];
            m = parts[1] - 1;
            day = parts[2];
        } else {
            const d = new Date(timestamp);
            if (isNaN(d.getTime())) return false;
            [y, m, day] = [d.getFullYear(), d.getMonth(), d.getDate()];
        }
        const dateCycleIdx = day >= 20 ? (y * 12 + m + 1) : (y * 12 + m);
        return dateCycleIdx === currentCycleIndex;
      } catch (e) {
        return false;
      }
    };
    
    // Mix historical logs with current session states
    const historicalSales = sales.filter(s => filterByCycle(s.timestamp));
    const historicalActivations = activations.filter(a => filterByCycle(a.timestamp));

    // Convert ClientUIStates to "virtual" activations for real-time
    const sessionActivations: ActivationLog[] = [];
    Object.keys(clientStates).forEach(clientId => {
        const cs = clientStates[clientId];
        const client = clients.find(c => c.id === clientId);
        if (client && (cs.tasks?.some(t => t.checked) || parseFloat(cs.saleValue || '0') > 0)) {
            sessionActivations.push({
                id: `session-${clientId}`,
                userId: user.id,
                clientName: client.name,
                timestamp: todayIso, // Treat as today for cycle filtering
                checklist: cs.tasks?.filter(t => t.checked).map(t => t.label) || [],
                saleValue: parseFloat(cs.saleValue || '0'),
                saleValuePalm: parseFloat(cs.saleValuePalm || '0'),
                saleValueSite: parseFloat(cs.saleValueSite || '0'),
                location: null,
                notes: 'Sessão em tempo real'
            });
        }
    });

    // Merge ensuring uniqueness per client (session overrides history for today)
    const mergedActivations = [...historicalActivations];
    sessionActivations.forEach(sa => {
        const saDate = getLogDateKey(sa.timestamp);
        const idx = mergedActivations.findIndex(ma => ma.clientName === sa.clientName && getLogDateKey(ma.timestamp) === saDate);
        if (idx >= 0) mergedActivations[idx] = sa;
        else mergedActivations.push(sa);
    });

    return {
      cycleSales: historicalSales,
      cycleActivations: mergedActivations
    };
  }, [sales, activations, clientStates, currentCycleIndex, clients, user.id, todayIso]);

  const { 
    totalSales, 
    totalActivations, 
    salesUntilYesterday, 
    activationsUntilYesterday 
  } = useMemo(() => {
    const sTotal = cycleSales.reduce((acc, curr) => acc + curr.amount, 0);
    const aTotal = cycleActivations.reduce((acc, curr) => acc + (curr.saleValue || 0), 0);
    
    const uniqueActivations = new Set(cycleActivations.filter(a => 
      (a.checklist && a.checklist.length > 0) || (a.saleValue || 0) > 0
    ).map(a => a.clientName)).size;

    // Stable goal calculation needs progress until YESTERDAY
    const sUntilYesterday = cycleSales.filter(s => getLogDateKey(s.timestamp) < todayIso).reduce((acc, curr) => acc + curr.amount, 0);
    const aUntilYesterdayLogs = cycleActivations.filter(a => getLogDateKey(a.timestamp) < todayIso);
    const aValueUntilYesterday = aUntilYesterdayLogs.reduce((acc, curr) => acc + (curr.saleValue || 0), 0);
    
    const totalSalesUntilYesterday = sUntilYesterday + aValueUntilYesterday;
    const totalActivationsUntilYesterday = new Set(aUntilYesterdayLogs.filter(a => 
         (a.checklist && a.checklist.length > 0) || (a.saleValue || 0) > 0
    ).map(a => a.clientName)).size;

    return { 
        totalSales: sTotal + aTotal, 
        totalActivations: uniqueActivations,
        salesUntilYesterday: totalSalesUntilYesterday,
        activationsUntilYesterday: totalActivationsUntilYesterday
    };
  }, [cycleSales, cycleActivations, todayIso]);

  const salesTarget = goal?.salesTarget || 0; 
  const salesPercent = salesTarget > 0 ? (totalSales / salesTarget) * 100 : 0;
  const actTarget = goal?.activationTarget || 0;
  const activationPercent = actTarget > 0 ? (totalActivations / actTarget) * 100 : 0;

  const amountRemaining = Math.max(0, salesTarget - totalSales);

  // Smarter Daily Goal:
  // We use the remaining target at the START of the day, divided by remaining working days (including today).
  // This keeps the goal stable for the whole today.
  const amountRemainingAtStart = Math.max(0, salesTarget - salesUntilYesterday);
  const salesGoalToday = remainingWorkingDays > 0 
    ? amountRemainingAtStart / remainingWorkingDays 
    : (isTodayWorkDay ? 0 : amountRemainingAtStart);

  const actRemainingAtStart = Math.max(0, actTarget - activationsUntilYesterday);
  const activationsGoalToday = remainingWorkingDays > 0 
    ? Math.ceil(actRemainingAtStart / remainingWorkingDays) 
    : (isTodayWorkDay ? 0 : actRemainingAtStart);
  
  // Progress status (Ahead/Behind)
  const totalPlannedDays = cycleWorkingDates.length;
  const daysPassedIncludingToday = cycleWorkingDates.filter(d => d <= todayIso).length;
  
  const expectedActivationsLinear = totalPlannedDays > 0 ? (actTarget / totalPlannedDays) * daysPassedIncludingToday : 0;
  const coverageStatus = totalActivations >= expectedActivationsLinear ? 'ahead' : 'behind';

  // --- PED Progress Calculation ---
  const pedsProgress = useMemo(() => {
    const activePeds = state.peds.filter(p => state.activePedIds.includes(p.id));
    if (activePeds.length === 0 || clients.length === 0) return [];

    return activePeds.map(ped => {
       const periodKey = getPeriodKey(ped.period);
       let completedClients = 0;
       const totalClients = clients.length;

       clients.forEach(c => {
          const uiState = clientStates[c.id] || {};
          const checked = (uiState.pedTasks?.[ped.id] as any)?.[periodKey] || [];
          if (ped.items.length > 0 && checked.length >= ped.items.length) {
             completedClients++;
          }
       });

       const percent = totalClients > 0 ? (completedClients / totalClients) * 100 : 0;
       return { 
           ped, 
           percent, 
           completed: completedClients, 
           total: totalClients 
       };
    });
  }, [state.peds, state.activePedIds, clients, clientStates]);
  
  const industryCoverageData = useMemo(() => {
    if (!goal || !goal.industryCoverageTargets) return [];
    
    // Filter to only show industries currently selected by the user
    const activeIndustries = user.industries || [];
    
    return Object.entries(goal.industryCoverageTargets)
      .filter(([industry]) => activeIndustries.includes(industry))
      .map(([industry, targetVal]) => {
        const target = Number(targetVal) || 0;
        const industryUpper = industry.toUpperCase();
        
        const realized = new Set(cycleActivations
          .filter(a => a.checklist?.some(item => item.toUpperCase() === industryUpper))
          .map(a => a.clientName)
        ).size;
        
        return {
          name: industry,
          realizado: realized,
          meta: target,
          percent: target > 0 ? Math.min(100, (realized / target) * 100) : 0
        };
      }).sort((a, b) => b.percent - a.percent);
  }, [goal, cycleActivations, user.industries]);

  const { todaySalesTotal, todayCoverageCount } = useMemo(() => {
    const isToday = (timestamp: string) => {
        const key = getLogDateKey(timestamp);
        return key === todayIso;
    };

    const tSales = cycleSales.filter(s => isToday(s.timestamp));
    const tActs = cycleActivations.filter(a => isToday(a.timestamp));
    
    const salesTotal = tSales.reduce((acc, curr) => acc + curr.amount, 0) + tActs.reduce((acc, curr) => acc + (curr.saleValue || 0), 0);
    const coverageCount = new Set(tActs.filter(a => (a.checklist && a.checklist.length > 0) || (a.saleValue || 0) > 0).map(a => a.clientName)).size;
    
    return { todaySalesTotal: salesTotal, todayCoverageCount: coverageCount };
  }, [cycleSales, cycleActivations, todayIso]);

  const dailyIndustryCoverage = useMemo(() => {
    if (!goal || !goal.industryCoverageTargets) return [];

    // Filter to only show industries currently selected by the user
    const activeIndustries = user.industries || [];

    return Object.entries(goal.industryCoverageTargets)
      .filter(([industry]) => activeIndustries.includes(industry))
      .map(([industry, targetVal]) => {
      const targetTotal = Number(targetVal) || 0;
      const industryUpper = industry.toUpperCase();

      // Realized until yesterday
      const realizedUntilYesterday = new Set(cycleActivations
        .filter(a => {
           const logDate = getLogDateKey(a.timestamp);
           return logDate < todayIso && a.checklist?.some(item => item.toUpperCase() === industryUpper);
        })
        .map(a => a.clientName)
      ).size;

      const remainingTarget = Math.max(0, targetTotal - realizedUntilYesterday);
      const dailyGoal = remainingWorkingDays > 0 
        ? Math.ceil(remainingTarget / remainingWorkingDays) 
        : (isTodayWorkDay ? 0 : remainingTarget);

      // Realized today
      const realizedToday = new Set(cycleActivations
        .filter(a => {
           const logDate = getLogDateKey(a.timestamp);
           return logDate === todayIso && a.checklist?.some(item => item.toUpperCase() === industryUpper);
        })
        .map(a => a.clientName)
      ).size;

      return {
        name: industry,
        todayRealized: realizedToday,
        todayGoal: dailyGoal
      };
    }).filter(item => item.todayGoal > 0 || item.todayRealized > 0);
  }, [goal, cycleActivations, todayIso, remainingWorkingDays, isTodayWorkDay, user.industries]);

  const ScorecardRow = ({ label, realized, target, color }: { label: string, realized: number, target: number, color?: string, key?: string | number }) => {
     const percent = target > 0 ? (realized / target) * 100 : 0;
     const isMet = realized >= target && target > 0;
     const barColor = color || (isMet ? '#10b981' : '#6366f1');
     
     return (
        <div className="space-y-2.5 group/row">
           <div className="flex justify-between items-end">
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                 <div className="flex items-center gap-1.5">
                    {color && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }}></div>}
                    <span className="text-[9px] font-black text-slate-400 dark:text-white/30 uppercase tracking-[0.15em] truncate">{label}</span>
                 </div>
                 <div className="flex items-baseline gap-2">
                    <span className={`text-base sm:text-xl font-black tabular-nums transition-all ${isMet ? 'text-emerald-600 dark:text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]' : 'text-slate-900 dark:text-white'}`}>
                      {realized}
                    </span>
                    <span className="text-[9px] sm:text-[11px] font-bold text-slate-300 dark:text-white/10 uppercase tracking-widest">Alvo: {target}</span>
                 </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                 <div className="flex items-center gap-1.5">
                    {isMet && <div className="w-3.5 h-3.5 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/30">
                       <Check size={8} className="text-emerald-600 dark:text-emerald-400" strokeWidth={5} />
                    </div>}
                    <span className={`text-[10px] sm:text-xs font-black tabular-nums tracking-tight ${isMet ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-white/40'}`}>
                      {Math.round(percent)}%
                    </span>
                 </div>
                 {isMet && <span className="text-[7px] font-black text-emerald-500/50 dark:text-emerald-400/50 uppercase tracking-widest leading-none">META ATINGIDA</span>}
              </div>
           </div>
           <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden border border-slate-200/60 dark:border-white/5 relative">
              <div 
                className={`h-full transition-all duration-1000 ease-out z-10 relative`} 
                style={{ 
                  width: `${Math.min(100, (realized / (target || 1)) * 100)}%`,
                  backgroundColor: barColor,
                  boxShadow: isMet ? `0 0 15px ${barColor}66` : 'none'
                }}
              ></div>
           </div>
        </div>
     );
  }
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      
      {/* Welcome Header */}
      <div className="px-1 pt-2 flex justify-between items-start">
         <div className="flex-1">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1">
               Olá, {user.name.split(' ')[0]}!
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{todayDayName}, {todayStr}</p>
         </div>
         <button 
           onClick={handleRefresh}
           disabled={isRefreshing}
           className={`p-3 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 text-slate-500 transition-all active:scale-90 shadow-sm ${isRefreshing ? 'opacity-50' : 'hover:border-brand-500/20 hover:text-brand-500'}`}
         >
            <RefreshCw size={18} className={`${isRefreshing ? 'animate-spin' : ''}`} />
         </button>
      </div>

      {/* Main Action Board: Target Progress & Daily Industry Necessity */}
      <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-6 sm:p-10 shadow-xl dark:shadow-2xl relative overflow-hidden group border border-slate-100 dark:border-white/5">
         <div className="absolute -top-12 -right-12 p-8 opacity-5 group-hover:opacity-10 transition-all duration-700 group-hover:scale-110 rotate-12">
            <TrendingUp size={240} className="text-brand-500" />
         </div>
         
         <div className="relative z-10 flex flex-col gap-10">
            {/* Header with Cycle Progress */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
               <div className="lg:col-span-5 space-y-8">
                  <div className="flex justify-between items-center mb-2">
                     <span className="text-[10px] font-black text-slate-400 dark:text-white/50 uppercase tracking-[0.3em]">Progresso do Ciclo</span>
                     <div className={`px-3 py-1.5 rounded-full border flex items-center gap-2 transition-all ${coverageStatus === 'ahead' ? 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.05)] dark:shadow-[0_0_15px_rgba(245,158,11,0.1)]'}`}>
                        <div className={`h-1.5 w-1.5 rounded-full animate-pulse ${coverageStatus === 'ahead' ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-amber-500 dark:bg-amber-400'}`}></div>
                        <span className="text-[9px] font-black uppercase tracking-widest">{coverageStatus === 'ahead' ? 'No Ritmo' : 'Abaixo da Meta'}</span>
                     </div>
                  </div>

                  <div className="space-y-6">
                     <div className="flex justify-between items-end">
                        <div className="space-y-2">
                           <h2 className="text-6xl sm:text-7xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter leading-none flex items-baseline">
                              {activationPercent.toFixed(0)}<span className="text-2xl sm:text-3xl text-slate-300 dark:text-white/30 ml-1">%</span>
                           </h2>
                           <p className="text-[11px] font-black text-slate-400 dark:text-white/40 uppercase tracking-[0.15em]">{totalActivations} de {actTarget} PDVs Cobertos</p>
                        </div>
                     </div>
                     <div className="h-5 w-full bg-slate-100 dark:bg-black/40 rounded-full overflow-hidden p-1.5 border border-slate-200/50 dark:border-white/5 shadow-inner">
                        <div 
                           className="h-full bg-gradient-to-r from-brand-600 via-brand-500 to-indigo-500 rounded-full transition-all duration-1000 shadow-[0_0_20px_rgba(99,102,241,0.3)] dark:shadow-[0_0_25px_rgba(99,102,241,0.5)]"
                           style={{ width: `${Math.min(100, activationPercent)}%` }}
                        ></div>
                     </div>
                  </div>

                  {/* Individual PED Progress */}
                  {pedsProgress.length > 0 && (
                     <div className="pt-8 border-t border-slate-100 dark:border-white/5 space-y-6">
                        <div className="flex justify-between items-center mb-4">
                           <span className="text-[10px] font-black text-slate-400 dark:text-white/50 uppercase tracking-[0.3em] flex items-center gap-1.5"><Layers size={12} className="text-brand-500"/> Seus Programas (PEDs)</span>
                        </div>
                        
                        <div className="space-y-6">
                           {pedsProgress.map((prog, idx) => (
                              <div key={prog.ped.id} className="space-y-2">
                                 <div className="flex justify-between items-end">
                                    <div className="space-y-1">
                                       <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{prog.ped.name}</h3>
                                       <p className="text-[9px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-[0.1em]">{prog.completed} de {prog.total} {prog.total === 1 ? 'Cliente' : 'Clientes'}</p>
                                    </div>
                                    <span className="text-lg font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">
                                       {prog.percent.toFixed(0)}<span className="text-xs text-slate-400 dark:text-white/40 ml-0.5">%</span>
                                    </span>
                                 </div>
                                 <div className="h-3 w-full bg-slate-100 dark:bg-black/40 rounded-full overflow-hidden border border-slate-200/50 dark:border-white/5 shadow-inner">
                                    <div 
                                       className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000"
                                       style={{ width: `${Math.min(100, prog.percent)}%` }}
                                    ></div>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                  )}

               </div>

               {/* Right Column: Daily Industry Necessity Breakdown */}
               <div className="lg:col-span-7 bg-slate-50 dark:bg-black/40 rounded-[2.5rem] p-6 sm:p-8 border border-slate-100 dark:border-white/5 backdrop-blur-sm relative overflow-hidden flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-8">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-500/10 rounded-xl flex items-center justify-center text-brand-600 dark:text-brand-400 border border-brand-500/20">
                           <Target size={18} strokeWidth={2.5} />
                        </div>
                        <div>
                           <h3 className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-[0.2em]">Necessidade Dia</h3>
                           <p className="text-[8px] font-bold text-slate-400 dark:text-white/30 uppercase tracking-widest mt-0.5">Foco por Indústria</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <span className="text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-[0.2em] px-3 py-1 bg-brand-500/5 dark:bg-brand-500/10 rounded-full border border-brand-500/10 dark:border-brand-500/20 shadow-sm dark:shadow-[0_0_15px_rgba(99,102,241,0.1)]">HOJE</span>
                     </div>
                  </div>

                  <div className="space-y-10">
                     {/* Primary General Coverage Goal for Today */}
                     <div className="pb-8 border-b border-slate-100 dark:border-white/5">
                        <ScorecardRow 
                           label="COBERTURA GERAL (PDVs)"
                           realized={todayCoverageCount}
                           target={activationsGoalToday}
                        />
                     </div>

                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-10 pb-2">
                        {dailyIndustryCoverage.length > 0 ? (
                           dailyIndustryCoverage.map(ind => (
                                 <ScorecardRow 
                                    key={ind.name}
                                    label={ind.name}
                                    realized={ind.todayRealized}
                                    target={ind.todayGoal}
                                    color={user.industryColors?.[ind.name]}
                                 />
                           ))
                        ) : (
                           <div className="col-span-2 flex flex-col items-center justify-center py-6 text-center space-y-3 opacity-40">
                              <CheckCircle2 size={32} className="text-emerald-500/50" />
                              <p className="text-[10px] font-black text-slate-400 dark:text-white uppercase tracking-widest">Metas do Dia Concluídas</p>
                           </div>
                        )}
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>



      {/* Badges Conquistadas */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 sm:p-7 border-2 border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
         <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
               <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <Award size={16} strokeWidth={3} />
               </div>
               <h3 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Badges de Ciclo</h3>
            </div>
            <div className="flex flex-col items-end">
                <span className="text-lg font-black text-slate-900 dark:text-white leading-none">
                    {industryCoverageData.filter(ind => ind.realizado >= ind.meta && ind.meta > 0).length}
                </span>
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-[0.1em]">CONCLUÍDAS</span>
            </div>
         </div>

         <div className="flex flex-wrap items-center gap-4">
            {industryCoverageData.map(ind => {
               const isMet = ind.realizado >= ind.meta && ind.meta > 0;
               return (
                  <div 
                     key={ind.name}
                     className="group relative"
                  >
                     <div 
                        className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-500 border-2 ${
                           isMet 
                           ? 'border-white dark:border-slate-800 shadow-lg scale-105 z-10 text-white' 
                           : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 text-slate-400/30'
                        }`}
                        style={isMet ? { 
                          background: `linear-gradient(135deg, ${user.industryColors?.[ind.name] || '#10b981'}ee, ${user.industryColors?.[ind.name] || '#059669'})`,
                          boxShadow: `0 10px 20px ${(user.industryColors?.[ind.name] || '#10b981')}33`
                        } : {}}
                     >
                        <span className={`text-xs sm:text-sm font-black ${isMet ? 'opacity-100' : 'opacity-40 font-bold'}`}>{ind.name.charAt(0).toUpperCase()}</span>
                     </div>
                     {/* Tooltip simple */}
                     <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20 shadow-xl border border-white/10">
                        {ind.name}: {ind.realizado}/{ind.meta}
                     </div>
                  </div>
               );
            })}
            {industryCoverageData.length === 0 && (
               <div className="flex items-center gap-2 py-2">
                  <div className="w-2 h-2 rounded-full bg-slate-300 animate-pulse"></div>
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Nenhuma indústria ativa</span>
               </div>
            )}
         </div>
      </div>


    </div>
  );
};
