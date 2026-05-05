import React, { useState } from 'react';
import { User, Goal } from '../types';
import { Save, Settings, Briefcase, Target, User as UserIcon, X, Plus } from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import { getTrustedDate } from '../services/timeService';

interface AdminProps {
  users: User[];
  goals: Goal[];
  onUpdateGoal: (goal: Goal) => void;
  onUpdateUser: (user: User) => void;
}

export const Admin: React.FC<AdminProps> = ({ users, goals, onUpdateGoal, onUpdateUser }) => {
  const { state } = useStore();
  const [selectedUserId, setSelectedUserId] = useState<string>(users[0]?.id || '');
  const [activationTarget, setActivationTarget] = useState<number>(0);
  const [industryTargets, setIndustryTargets] = useState<Record<string, number>>({});
  const [industryCoverageTargets, setIndustryCoverageTargets] = useState<Record<string, number>>({});
  const [industryColors, setIndustryColors] = useState<Record<string, string>>({});
  const [newIndustryColor, setNewIndustryColor] = useState('#4f46e5');
  const [userMix, setUserMix] = useState<string>('MIX 2');

  const currentCycleKey = React.useMemo(() => {
    const now = getTrustedDate();
    let month = now.getMonth();
    let year = now.getFullYear();
    if (now.getDate() >= 20) {
      month++;
      if (month > 11) { month = 0; year++; }
    }
    return `${year}-${String(month + 1).padStart(2, '0')}`;
  }, []);

  React.useEffect(() => {
    const goal = goals.find(g => g.userId === selectedUserId && g.month === currentCycleKey);
    if (goal) { 
      setActivationTarget(goal.activationTarget); 
      setIndustryTargets(goal.industryTargets || {}); 
      setIndustryCoverageTargets(goal.industryCoverageTargets || {});
    } 
    else { 
      setActivationTarget(0); 
      setIndustryTargets({}); 
      setIndustryCoverageTargets({});
    }
    const user = users.find(u => u.id === selectedUserId);
    if (user) { 
        setUserMix(user.mix || 'MIX 2'); 
        setIndustryColors(user.industryColors || {});
    }
  }, [selectedUserId, goals, users, currentCycleKey]);

  const handleSave = () => {
    onUpdateGoal({ 
      userId: selectedUserId, 
      month: currentCycleKey, 
      salesTarget: 0, 
      activationTarget, 
      industryTargets,
      industryCoverageTargets
    });
    const user = users.find(u => u.id === selectedUserId);
    if (user) { onUpdateUser({ ...user, mix: userMix, industryColors }); }
    alert('Configurações salvas.');
  };

  const handleIndustryTargetChange = (ind: string, valStr: string) => {
    const val = valStr === '' ? 0 : parseInt(valStr);
    if (!isNaN(val) && val >= 0) { setIndustryTargets(prev => ({ ...prev, [ind]: val })); }
  };

  const handleIndustryCoverageTargetChange = (ind: string, valStr: string) => {
    const val = valStr === '' ? 0 : parseInt(valStr);
    if (!isNaN(val) && val >= 0) { setIndustryCoverageTargets(prev => ({ ...prev, [ind]: val })); }
  };

  const selectedUser = users.find(u => u.id === selectedUserId);
  const userIndustries = selectedUser?.industries || [];

  return (
    <div className="max-w-5xl mx-auto space-y-3 pb-12 animate-in fade-in duration-300 px-0">
      <div>
         <h2 className="text-xl font-bold text-slate-900 dark:text-white">Configurações</h2>
         <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Painel Administrativo</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* User List */}
        <div className="md:col-span-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-3 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 text-[8px] font-bold text-slate-400 uppercase tracking-widest">
               Equipe
            </div>
            {users.map(user => (
              <button key={user.id} onClick={() => setSelectedUserId(user.id)} className={`w-full text-left px-4 py-2.5 flex items-center space-x-2 border-b border-slate-50 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${selectedUserId === user.id ? 'bg-slate-50 dark:bg-slate-800' : ''}`}>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${selectedUserId === user.id ? 'bg-brand-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                   {user.name.charAt(0)}
                </div>
                <div><span className={`block text-xs font-bold ${selectedUserId === user.id ? 'text-brand-700 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>{user.name}</span><span className="block text-[7px] font-medium text-slate-400 uppercase tracking-tighter">{user.mix}</span></div>
              </button>
            ))}
          </div>
        </div>

        {/* Configuration Panel */}
        <div className="md:col-span-8 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-4 shadow-sm">
             <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                <Settings size={14} className="text-slate-400"/>
                <h3 className="font-bold text-[9px] uppercase tracking-wider text-slate-500">Geral</h3>
             </div>
             
             <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 block">Mix</label>
                <select value={userMix} onChange={(e) => setUserMix(e.target.value)} className="w-full p-2 h-10 sm:h-12 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 text-xs font-black uppercase focus:ring-1 focus:ring-brand-500 outline-none">
                   <option value="MIX 1">MIX 1</option>
                   <option value="MIX 2">MIX 2</option>
                   <option value="MIX 3">MIX 3</option>
                   <option value="MIX 4">MIX 4</option>
                   <option value="MIX 5">MIX 5</option>
                   <option value="MIX 2/MIX 3">MIX 2 + MIX 3</option>
                </select>
             </div>

             <div className="grid grid-cols-1">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight ml-1">Meta Cobertura do Ciclo</label>
                    <div className="relative group">
                       <div className="absolute inset-0 bg-brand-500/5 rounded-2xl blur-xl group-focus-within:bg-brand-500/10 transition-all opacity-0 group-focus-within:opacity-100"></div>
                       <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 font-black text-[9px] uppercase tracking-widest pointer-events-none">PDVs</span>
                       <input 
                         type="number" 
                         placeholder="0"
                         value={activationTarget || ''} 
                         onChange={(e) => setActivationTarget(parseInt(e.target.value) || 0)} 
                         className="relative w-full px-5 h-14 sm:h-18 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 focus:border-brand-500 dark:focus:border-brand-500 rounded-xl font-black text-2xl outline-none transition-all tabular-nums tracking-tighter shadow-sm text-slate-900 dark:text-white" 
                       />
                    </div>
                </div>
             </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
             <div className="flex items-center gap-1.5 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                <Target size={14} className="text-slate-400"/>
                <h3 className="font-bold text-[9px] uppercase tracking-wider text-slate-500">Metas Indústria</h3>
             </div>
             
             <div className="space-y-4">
                {/* Industry Management */}
                <div className="flex gap-2">
                   <input 
                      id="new-industry-input"
                      type="text" 
                      placeholder="Nova Indústria" 
                      className="flex-1 p-2 h-10 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-brand-500"
                   />
                   <input 
                     type="color"
                     value={newIndustryColor}
                     onChange={e => setNewIndustryColor(e.target.value)}
                     className="w-10 h-10 p-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer shrink-0"
                   />
                   <button 
                      onClick={() => {
                         const input = document.getElementById('new-industry-input') as HTMLInputElement;
                         const val = input.value.trim().toUpperCase();
                         if (val && selectedUser && !selectedUser.industries.includes(val)) {
                            onUpdateUser({ 
                               ...selectedUser, 
                               industries: [...selectedUser.industries, val],
                               industryColors: { ...(selectedUser.industryColors || {}), [val]: newIndustryColor }
                            });
                            input.value = '';
                         }
                      }}
                      className="px-4 bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded-lg text-[9px] font-black uppercase"
                   >
                      Adicionar
                   </button>
                </div>

                {userIndustries.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {userIndustries.map(ind => (
                      <div key={ind} className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 group relative">
                         <button 
                            onClick={() => {
                               if (selectedUser) {
                                  onUpdateUser({ ...selectedUser, industries: selectedUser.industries.filter(i => i !== ind) });
                               }
                            }}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                         >
                            <X size={10} />
                         </button>
                         <div className="flex justify-between items-center mb-2">
                             <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full border border-white/20" 
                                  style={{ backgroundColor: (selectedUser?.industryColors?.[ind]) || '#4f46e5' }}
                                ></div>
                                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">{ind}</span>
                             </div>
                             <input 
                               type="color"
                               value={(selectedUser?.industryColors?.[ind]) || '#4f46e5'}
                               onChange={e => {
                                 if (selectedUser) {
                                   onUpdateUser({
                                     ...selectedUser,
                                     industryColors: { ...(selectedUser.industryColors || {}), [ind]: e.target.value }
                                   });
                                 }
                               }}
                               className="w-5 h-5 p-0.5 bg-transparent border-none rounded cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                             />
                          </div>
                         <div className="grid grid-cols-1 gap-3">
                            <div className="space-y-1.5">
                               <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Meta Cobertura</label>
                               <div className="relative group">
                                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-black text-[7px] uppercase tracking-widest pointer-events-none">PDVs</span>
                                  <input 
                                     type="number" 
                                     min="0" 
                                     placeholder="0"
                                     value={industryCoverageTargets[ind] !== undefined && industryCoverageTargets[ind] !== 0 ? industryCoverageTargets[ind] : ''} 
                                     onChange={(e) => handleIndustryCoverageTargetChange(ind, e.target.value)} 
                                     className="w-full h-12 px-4 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl focus:border-brand-500 outline-none font-black text-slate-900 dark:text-white text-base tabular-nums transition-all"
                                  />
                               </div>
                            </div>
                         </div>
                      </div>
                    ))}
                  </div>
                ) : <div className="text-center py-4 text-slate-400 text-[10px] italic bg-slate-50 rounded-lg uppercase font-bold tracking-widest">Nenhuma indústria</div>}
             </div>
          </div>

          <div className="flex justify-end">
             <button onClick={handleSave} className="w-full sm:w-auto bg-brand-600 text-white px-6 py-2.5 rounded-lg font-black shadow-lg shadow-brand-500/20 active:scale-95 flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-[0.1em]">
                <Save size={14} /> Salvar
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};
