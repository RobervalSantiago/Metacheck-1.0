
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Goal } from '../types';
import { Save, AlertTriangle, CheckCircle2, DollarSign, Target, ChevronLeft, ChevronRight, Camera, Wand2, Eraser, Database, Settings, Smartphone, Share, LogOut, BarChart3, Plus, X, Upload, Download, Trash2, AlertCircle } from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { getTrustedDate } from '../services/timeService';

interface ProfileProps {
  user: User;
  onUpdateUser: (user: User) => void;
  goal?: Goal;
  onUpdateGoal: (goal: Goal) => void;
  onResetData: () => void;
}

export const Profile: React.FC<ProfileProps> = ({ user, onUpdateUser, goal, onUpdateGoal, onResetData }) => {
  const { state, restoreData, installPrompt, isIOS, isStandalone } = useStore();
  const { signOut, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'planning' | 'account'>('planning');
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [userCode, setUserCode] = useState(user.userCode || '');
  const [avatar, setAvatar] = useState(user.avatar);
  const [mix, setMix] = useState(user.mix || 'MIX 2');
  const [workingDates, setWorkingDates] = useState<string[]>(user.workingDates || []);
  const [salesTarget, setSalesTarget] = useState<number>(0);
  const [activationTarget, setActivationTarget] = useState<number>(0);
  const [industryTargets, setIndustryTargets] = useState<Record<string, number>>({});
  const [industryCoverageTargets, setIndustryCoverageTargets] = useState<Record<string, number>>({});
  const [industries, setIndustries] = useState<string[]>(user.industries || []);
  const [industryColors, setIndustryColors] = useState<Record<string, string>>(user.industryColors || {});
  const [newIndustry, setNewIndustry] = useState('');
  const [newIndustryColor, setNewIndustryColor] = useState('#4f46e5');
  const [showResetModal, setShowResetModal] = useState(false);
  
  const [viewDate, setViewDate] = useState(() => {
    const d = getTrustedDate();
    if (d.getDate() >= 20) d.setMonth(d.getMonth() + 1);
    return d;
  });

  const currentCycleKey = useMemo(() => {
    return `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`;
  }, [viewDate]);

  useEffect(() => {
    if (goal) {
      setSalesTarget(goal.salesTarget);
      setActivationTarget(goal.activationTarget);
      setIndustryTargets(goal.industryTargets || {});
      setIndustryCoverageTargets(goal.industryCoverageTargets || {});
    } else {
      setSalesTarget(0);
      setActivationTarget(0);
      setIndustryTargets({});
      setIndustryCoverageTargets({});
    }
  }, [goal, currentCycleKey]);

  const isPlanningValid = useMemo(() => {
    if (activeTab !== 'planning') return true;
    return activationTarget > 0 && workingDates.length > 0 && industries.length > 0;
  }, [activeTab, activationTarget, workingDates, industries]);


  const handleSave = async () => {
    // Update local state
    onUpdateUser({ ...user, name, email, avatar, mix, userCode, workingDates, industries, industryColors });
    onUpdateGoal({
        userId: user.id,
        month: currentCycleKey,
        salesTarget,
        activationTarget,
        industryTargets,
        industryCoverageTargets
    });

    // Persist profile to Supabase
    try {
      await updateProfile({
        name,
        avatar,
        mix,
        userCode,
        workingDates,
        industries,
        industryColors,
      });
      alert('Planejamento do Ciclo salvo com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar perfil no Supabase:', err);
      alert('Planejamento salvo localmente, mas houve um erro ao sincronizar com o servidor.');
    }
  };

  const addIndustry = () => {
    if (newIndustry && !industries.includes(newIndustry)) {
      setIndustries([...industries, newIndustry]);
      setIndustryColors(prev => ({ ...prev, [newIndustry]: newIndustryColor }));
      setNewIndustry('');
    }
  };

  const removeIndustry = (ind: string) => setIndustries(industries.filter(i => i !== ind));

  const toggleDate = (dateStr: string) => {
    setWorkingDates(prev => prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr].sort());
  };

  const handleDragStart = (dateStr: string) => toggleDate(dateStr);
  const handleAutoFill = () => {
    const targetYear = viewDate.getFullYear();
    const targetMonth = viewDate.getMonth();
    const startDate = new Date(targetYear, targetMonth - 1, 20);
    const endDate = new Date(targetYear, targetMonth, 19);
    const updatedDates = new Set(workingDates);
    let iterator = new Date(startDate);
    while (iterator <= endDate) {
        if (iterator.getDay() !== 0 && iterator.getDay() !== 6) {
            updatedDates.add(`${iterator.getFullYear()}-${String(iterator.getMonth() + 1).padStart(2, '0')}-${String(iterator.getDate()).padStart(2, '0')}`);
        }
        iterator.setDate(iterator.getDate() + 1);
    }
    setWorkingDates(Array.from(updatedDates).sort());
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setViewDate(newDate);
  };

  const { days, firstDay, year, month } = useMemo(() => {
    const d = viewDate;
    return { 
        days: new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(),
        firstDay: new Date(d.getFullYear(), d.getMonth(), 1).getDay(),
        year: d.getFullYear(),
        month: d.getMonth()
    };
  }, [viewDate]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-1">
        <div className="flex items-center gap-4 sm:gap-5 w-full">
           <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[1.5rem] sm:rounded-[2rem] bg-brand-600 text-white flex items-center justify-center font-black text-2xl sm:text-3xl shadow-2xl shadow-brand-500/30 border-4 border-white dark:border-slate-800 shrink-0">
              {user.name.charAt(0)}
           </div>
           <div className="min-w-0 flex-1">
             <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none truncate">{user.name}</h2>
             <div className="flex items-center gap-2 mt-2">
                <span className="text-[9px] sm:text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500 px-3 py-1 rounded-full uppercase tracking-widest truncate max-w-full">{user.email}</span>
             </div>
           </div>
        </div>
        <button 
          onClick={handleSave} 
          disabled={!isPlanningValid} 
          className="w-full md:w-auto bg-brand-600 hover:bg-brand-700 disabled:opacity-30 text-white px-8 py-4 rounded-[1.5rem] font-black shadow-xl shadow-brand-500/20 flex items-center justify-center gap-3 transition-all active:scale-95 text-[10px] sm:text-xs uppercase tracking-widest"
        >
           <Save size={18} strokeWidth={3} /> Salvar Planejamento
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-[1.75rem] mx-1">
         <button 
           onClick={() => setActiveTab('planning')} 
           className={`flex-1 py-3.5 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'planning' ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-xl' : 'text-slate-500 hover:text-slate-700'}`}
         >
           <Target size={16} /> Planejamento
         </button>
         <button 
           onClick={() => setActiveTab('account')} 
           className={`flex-1 py-3.5 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'account' ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-xl' : 'text-slate-500 hover:text-slate-700'}`}
         >
           <Settings size={16} /> Conta e App
         </button>
      </div>

      {activeTab === 'planning' ? (
        <div className="space-y-6 px-1">
            {/* Global Targets */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 sm:p-8 border border-slate-100 dark:border-slate-800 shadow-sm text-center sm:text-left">
                <h3 className="font-black text-[10px] sm:text-xs text-slate-400 mb-6 sm:mb-8 uppercase tracking-[0.2em]">Metas Globais do Ciclo</h3>
                <div className="grid grid-cols-1 gap-6 sm:gap-8">
                    <div className="space-y-3">
                       <label className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight ml-1">Meta Cobertura</label>
                        <div className="relative group">
                           <div className="absolute inset-0 bg-brand-500/5 rounded-2xl sm:rounded-3xl blur-xl group-focus-within:bg-brand-500/10 transition-all opacity-0 group-focus-within:opacity-100"></div>
                           <span className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-300 font-black text-[11px] uppercase tracking-[0.2em] pointer-events-none select-none">PDVs</span>
                           <input 
                             type="number" 
                             placeholder="0"
                             value={activationTarget || ''} 
                             onChange={e => setActivationTarget(parseInt(e.target.value) || 0)} 
                             className="relative w-full px-10 h-16 sm:h-24 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 focus:border-brand-500 rounded-[1.5rem] sm:rounded-[2rem] font-black text-3xl sm:text-5xl outline-none transition-all tabular-nums tracking-tighter shadow-sm text-slate-900 dark:text-white" 
                           />
                        </div>
                    </div>
                </div>
            </div>

            {/* Industry Specifics */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
                   <h3 className="font-black text-xs text-slate-400 uppercase tracking-[0.2em]">Desdobramento por Indústria</h3>
                   <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
                       <div className="flex gap-2 flex-1">
                          <input 
                            type="text" 
                            value={newIndustry} 
                            onChange={e => setNewIndustry(e.target.value.toUpperCase())} 
                            placeholder="CADASTRAR CATEGORIA" 
                            className="flex-1 px-5 h-12 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                          />
                          <input 
                            type="color"
                            value={newIndustryColor}
                            onChange={e => setNewIndustryColor(e.target.value)}
                            className="w-12 h-12 p-1 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800 rounded-2xl cursor-pointer"
                            title="Escolha a cor da indústria"
                          />
                       </div>
                       <button onClick={addIndustry} className="w-full sm:w-12 h-12 bg-slate-900 text-white rounded-2xl hover:bg-black transition-all flex items-center justify-center shrink-0 shadow-lg active:scale-90">
                          <Plus size={20} strokeWidth={3} />
                       </button>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {industries.length > 0 ? (
                        industries.map(ind => (
                            <div key={ind} className="bg-slate-50 dark:bg-slate-950/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 space-y-4 group transition-all hover:border-brand-200">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                       <div 
                                         className="w-4 h-4 rounded-full shadow-sm border border-white/20" 
                                         style={{ backgroundColor: industryColors[ind] || '#4f46e5' }}
                                       ></div>
                                       <span className="font-black text-[11px] text-slate-900 dark:text-white uppercase tracking-widest">{ind}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                       <input 
                                         type="color"
                                         value={industryColors[ind] || '#4f46e5'}
                                         onChange={e => setIndustryColors(prev => ({ ...prev, [ind]: e.target.value }))}
                                         className="w-6 h-6 p-0.5 bg-transparent border-none rounded-md cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                                       />
                                       <button onClick={() => removeIndustry(ind)} className="p-2 text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                           <Trash2 size={16} />
                                       </button>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 gap-3">
                                        <div className="space-y-2">
                                            <span className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Meta de Cobertura</span>
                                            <div className="relative group">
                                                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 font-black text-[8px] uppercase tracking-widest pointer-events-none">PDVs</span>
                                                <input 
                                                    type="number" 
                                                    placeholder="0"
                                                    value={industryCoverageTargets[ind] || ''} 
                                                    onChange={e => setIndustryCoverageTargets(prev => ({ ...prev, [ind]: parseInt(e.target.value) || 0 }))} 
                                                    className="w-full h-14 px-6 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 focus:border-brand-500 rounded-2xl font-black text-xl tabular-nums outline-none transition-all text-slate-900 dark:text-white" 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full py-16 bg-slate-50 dark:bg-slate-950/20 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center">
                             <Target size={40} className="text-slate-200 mb-4" />
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Defina metas para marcas ou categorias</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Field Calendar */}
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
                   <h3 className="font-black text-xs text-slate-400 uppercase tracking-[0.2em]">Dias de Operação no Ciclo</h3>
                   <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950 p-2 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <button onClick={() => changeMonth(-1)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-brand-600 transition-all rounded-xl active:scale-90 bg-white dark:bg-slate-900 shadow-sm"><ChevronLeft size={20} /></button>
                      <span className="font-black text-[11px] w-28 text-center uppercase tracking-[0.15em] text-slate-800 dark:text-white tabular-nums">{viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                      <button onClick={() => changeMonth(1)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-brand-600 transition-all rounded-xl active:scale-90 bg-white dark:bg-slate-900 shadow-sm"><ChevronRight size={20} /></button>
                   </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-8">
                    <button onClick={handleAutoFill} className="flex items-center gap-2 px-6 py-4 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-sm"><Wand2 size={16} /> Preencher Dias Úteis</button>
                    <button onClick={() => setWorkingDates([])} className="flex items-center gap-2 px-6 py-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-sm"><Eraser size={16} /> Limpar Tudo</button>
                </div>

                <div className="grid grid-cols-7 gap-2">
                   {['DOM','SEG','TER','QUA','QUI','SEX','SAB'].map((d, i) => <div key={i} className="text-center text-[9px] font-black text-slate-300 py-2 tracking-tighter">{d}</div>)}
                   {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`}></div>)}
                   {Array.from({ length: days }).map((_, i) => {
                      const day = i + 1;
                      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const isSelected = workingDates.includes(dateStr);
                      return (
                        <button 
                            key={day} 
                            onClick={() => toggleDate(dateStr)} 
                            className={`aspect-square rounded-2xl flex flex-col items-center justify-center transition-all relative group shadow-sm ${isSelected ? 'bg-brand-600 text-white shadow-brand-500/20 scale-95 ring-4 ring-brand-500/10' : 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 border border-transparent hover:border-brand-500/30'}`}
                        >
                           <span className="text-sm font-black tabular-nums">{day}</span>
                           {isSelected && <div className="w-1 h-1 bg-white rounded-full mt-1"></div>}
                        </button>
                      );
                   })}
                </div>
            </div>
        </div>
      ) : (
        <div className="space-y-6 px-1">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm space-y-8">
                <h3 className="font-black text-xs text-slate-400 uppercase tracking-[0.2em]">Configurações da Conta</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Nome Completo</label>
                       <input value={name} onChange={e => setName(e.target.value)} className="w-full h-14 px-5 bg-slate-50 dark:bg-slate-950 border border-transparent rounded-2xl font-black text-sm outline-none focus:ring-2 focus:ring-brand-500" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">E-mail Corporativo</label>
                       <input value={email} onChange={e => setEmail(e.target.value)} className="w-full h-14 px-5 bg-slate-50 dark:bg-slate-950 border border-transparent rounded-2xl font-black text-sm outline-none focus:ring-2 focus:ring-brand-500" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Código do Usuário</label>
                       <input 
                         value={userCode} 
                         onChange={e => setUserCode(e.target.value.replace(/\D/g, ''))} 
                         placeholder="SOMENTE NÚMEROS"
                         className="w-full h-14 px-5 bg-slate-50 dark:bg-slate-950 border border-transparent rounded-2xl font-black text-sm outline-none focus:ring-2 focus:ring-brand-500" 
                       />
                    </div>
                </div>

                <div className="pt-8 border-t border-slate-50 dark:border-slate-800 flex flex-col gap-3">
                    <button onClick={() => signOut()} className="w-full h-16 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-[1.25rem] font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all">
                       <LogOut size={20} /> Encerrar Sessão
                    </button>
                    <button 
                        onClick={() => setShowResetModal(true)} 
                        className="w-full h-16 bg-slate-900 dark:bg-black text-white rounded-[1.25rem] font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all"
                    >
                       <Trash2 size={20} /> Resetar Dados do Ciclo
                    </button>
                </div>
            </div>


        </div>
      )}
      {/* Modal de Reset de Dados */}
      {showResetModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 border border-white/5 text-center">
             <div className="w-24 h-24 bg-red-600 text-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-red-500/30 transform -rotate-6">
                <AlertTriangle size={48} strokeWidth={2.5} />
             </div>
             
             <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">RESET TOTAL?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-6 font-bold uppercase tracking-widest leading-relaxed">
                Isso apagará todas as vendas e <br/>
                positivações do ciclo atual. <br/>
                <span className="text-red-500 block mt-2">AÇÃO IRREVERSÍVEL</span>
              </p>

              <div className="grid grid-cols-1 gap-3 mt-10">
                <button 
                    onClick={() => { onResetData(); setShowResetModal(false); alert('Dados resetados com sucesso.'); }}
                    className="w-full h-16 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-red-500/20 active:scale-95 transition-all"
                >
                   Confirmar Reset
                </button>
                <button 
                  onClick={() => setShowResetModal(false)} 
                  className="w-full h-16 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] active:scale-95 transition-all"
                >
                  Cancelar
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
